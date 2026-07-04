// /src/services/ai.service.ts

import ChatSession from '../models/ChatSession.js'
import logger from '../bootstrap/logger.js'
import { AppError } from './appError.js'
import { EventService } from './event.service.js'
import { KnowledgeBaseService } from './knowledgeBase.service.js'

import { normalizeInput, randomResponse } from './ai/ai.utils.js'

import { enterpriseIntents } from './ai/ai.intents.js'
import { angryWords, sadWords } from './ai/ai.emotions.js'
import { humanWords, escalationResponses } from './ai/ai.escalation.js'
import { fallbackResponses } from './ai/ai.fallbacks.js'
import { createResponse } from './ai/ai.response.js'
import { detectIntent } from './ai/ai.intent.js'
import { scoreQuestion } from './ai/ai.score.js'
import { createEmbedding } from './ai/ai.embeddings.js'
import { cosineSimilarity } from './ai/ai.cosine.js'
import { addHistory, getMemory, setMemory } from './ai/ai.memory.js'
import KnowledgeBase from '../models/KnowledgeBase.js'

export class AIService {
  static async generateReply(message: string, context: any[]) {
    try {
      /* INITIAL GREETING */

      if (!context?.length) {
        return createResponse(
          "Hello and welcome! I'm your virtual assistant. How may I assist you today?",
        )
      }

      const session = await ChatSession.findById(context[0].sessionId).lean()

      if (!session) {
        return createResponse(
          "I couldn't establish your chat session properly. Let me connect you with support.",
          0,
          true,
        )
      }

      const sessionId = session._id.toString()

      const propertyId = session.propertyId.toString()

      const cleanInput = normalizeInput(message)

      addHistory(sessionId, cleanInput)

      const memory = getMemory(sessionId)

      /* STATIC ENTERPRISE INTENTS */

      for (const intent of enterpriseIntents) {
        const matched = intent.patterns.some(
          (pattern) =>
            cleanInput === pattern ||
            cleanInput.includes(pattern) ||
            pattern.includes(cleanInput),
        )

        if (matched) {
          return createResponse(randomResponse(intent.responses))
        }
      }

      /* EMOTION DETECTION */

      if (angryWords.some((word) => cleanInput.includes(word))) {
        setMemory(sessionId, {
          lastEmotion: 'angry',
        })

        return createResponse(
          "I'm sorry this has been frustrating. I'd be happy to connect you with a support specialist.",
          1,
          true,
        )
      }

      if (sadWords.some((word) => cleanInput.includes(word))) {
        setMemory(sessionId, {
          lastEmotion: 'sad',
        })

        return createResponse(
          "I'm sorry you're going through that. I'll do my best to help.",
        )
      }

      /* HUMAN ESCALATION */

      if (humanWords.some((word) => cleanInput.includes(word))) {
        return createResponse(randomResponse(escalationResponses), 1, true)
      }

      /* INTENT DETECTION */

      const intent = detectIntent(cleanInput)

      setMemory(sessionId, {
        lastIntent: intent,
      })

      /* KNOWLEDGE RETRIEVAL */

      const knowledge = await KnowledgeBaseService.searchByIntent(
        propertyId,
        intent,
      )

      if (!knowledge || !knowledge.length) {
        return createResponse(
          `${randomResponse(fallbackResponses)}

Would you like me to connect you with one of our support specialists?`,
          0,
        )
      }

      /* EMBEDDING */

      const queryEmbedding: number[] = await createEmbedding(cleanInput)

      /* RERANKING */

      const ranked = await Promise.all(
        knowledge.map(async (item: any) => {
          if (!Array.isArray(item.embedding) || !item.embedding.length) {
            return {
              ...item,
              semanticScore: 0,
              confidence: 0,
            }
          }

          const embedding = item.embedding as number[]

          const semanticScore = cosineSimilarity(queryEmbedding, embedding)

          const keywordScore = scoreQuestion(cleanInput, item.keywords ?? [])

          const intentScore = item.intent === intent ? 1 : 0

          const contextScore = memory?.lastIntent === item.intent ? 0.5 : 0

          const normalizedKeyword = Math.min(keywordScore / 50, 1)

          const confidence =
            semanticScore * 0.7 +
            normalizedKeyword * 0.15 +
            intentScore * 0.1 +
            contextScore * 0.05

          return {
            ...item,
            semanticScore,
            confidence,
          }
        }),
      )

      ranked.sort((a, b) => b.confidence - a.confidence)

      const best = ranked[0]

      if (best && best.semanticScore < 0.45) {
        return createResponse(
          `${randomResponse(fallbackResponses)}

Would you like me to connect you with one of our support specialists?`,
          best.semanticScore,
        )
      }

      const settings = await KnowledgeBaseService.getKnowledgeBase(
        '',
        propertyId,
      )

      const threshold = settings?.confidenceThreshold ?? 0.65

      if (best && best.confidence >= threshold) {
        setMemory(sessionId, {
          lastQuestion: message,
          lastAnswer: best.answer,
          lastTopic: best.intent,
        })

        const faqId = best._id

        // IMPORTANT: ensure we are updating a real DB record safely
        try {
          await KnowledgeBase.updateOne(
            {
              propertyId,
              'faqs._id': faqId,
            },
            {
              $inc: {
                'faqs.$.usageCount': 1,
              },
              $set: {
                'faqs.$.lastMatchedAt': new Date(),
              },
            },
          )
        } catch (err) {
          logger.warn(
            { err, faqId },
            'Failed to update FAQ usage metrics (non-blocking)',
          )
        }

        // local in-memory update (optional but correct)
        best.usageCount = (best.usageCount ?? 0) + 1
        best.lastMatchedAt = new Date()

        return createResponse(best.answer, best.confidence)
      }

      /* FALLBACK */

      return createResponse(
        `${randomResponse(fallbackResponses)}

Would you like me to connect you with one of our support specialists?`,
        best?.confidence ?? 0,
      )
    } catch (error) {
      logger.error(error, 'AI service error')

      return createResponse(
        'I am experiencing an internal communication issue. Let me connect you with our support team.',
        0,
        true,
      )
    }
  }

  static shouldEscalate(confidence: number, threshold = 0.65) {
    return confidence < threshold
  }

  static async updateSessionAutomationState(
    sessionId: string,
    aiEnabled: boolean,
  ) {
    const session = await ChatSession.findById(sessionId)

    if (!session) {
      throw new AppError('Target chat session could not be located.', 404)
    }

    session.aiEnabled = aiEnabled

    if (!aiEnabled) {
      session.aiHandled = false

      if (!session.assignedOperatorId) {
        session.status = 'queued'
      }
    } else {
      session.aiEscalated = false
    }

    await session.save()

    EventService.emitToProperty(
      session.propertyId.toString(),
      'dashboard_refresh_request',
      {},
    )

    return {
      sessionId: session._id,
      aiEnabled: session.aiEnabled,
      status: session.status,
    }
  }
}
