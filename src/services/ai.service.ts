// /src/services/ai.service.ts

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
import { footballIntents } from './ai/ai.football.js'
import type { IMessage } from '../types/message.types.js'

const getRandomFallback = (): string => {
  const index = Math.floor(Math.random() * fallbackResponses.length)
  return fallbackResponses[index]!
}

export class AIService {
  static async generateReply(message: string, context: Partial<IMessage>[]) {
    try {
      const firstMessage = context.at(0)

      if (!firstMessage) {
        return createResponse(
          "Hello and welcome! I'm your virtual assistant. How may I assist you today?",
        )
      }

      const session = await ChatSession.findById(firstMessage.sessionId).lean()

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
      for (const enterpriseIntent of enterpriseIntents) {
        const matched = enterpriseIntent.patterns.some((pattern) => {
          const p = normalizeInput(pattern)
          const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          return new RegExp(`\\b${escaped}\\b`, 'i').test(cleanInput)
        })

        if (matched) {
          return createResponse(randomResponse(enterpriseIntent.responses))
        }
      }

      /* INTENT DETECTION */
      const intent = detectIntent(cleanInput)
      setMemory(sessionId, { lastIntent: intent })

      /* FOOTBALL INTENTS */
      if (intent === 'football') {
        for (const club of footballIntents) {
          const matched = club.patterns.some((pattern) => {
            const p = normalizeInput(pattern)
            const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            return new RegExp(`\\b${escaped}\\b`, 'i').test(cleanInput)
          })

          if (matched) {
            setMemory(sessionId, { lastTopic: 'football' })
            return createResponse(randomResponse(club.responses), 1, false)
          }
        }

        return createResponse(
          'I can provide basic information about football clubs, leagues, players, and competitions.',
          1,
          false,
        )
      }

      /* EMOTION DETECTION */
      if (angryWords.some((word) => cleanInput.includes(word))) {
        setMemory(sessionId, { lastEmotion: 'angry' })
        return createResponse(
          "I'm sorry this has been frustrating. Would you like me to connect you with a live support specialist right now? Please reply with \"Yes\" to confirm.",
          1,
          true,
        )
      }

      if (sadWords.some((word) => cleanInput.includes(word))) {
        setMemory(sessionId, { lastEmotion: 'sad' })
        return createResponse(
          "I'm sorry you're going through that. I'll do my best to help.",
        )
      }

      /* HUMAN ESCALATION KEYWORDS */
      // 🎯 FIX: Verify that intent matches or words are present, and ask clearly before escalating
      if (intent === 'human' || humanWords.some((word) => cleanInput.includes(word))) {
        const baseEscalationReply = randomResponse(escalationResponses)
        return createResponse(
          `${baseEscalationReply}\n\nWould you like me to transfer you to an agent? Please reply with "Yes" to confirm.`,
          1,
          true,
        )
      }

      /* ========================================================================== */
      /* 🎯 HYBRID KNOWLEDGE RETRIEVAL                                              */
      /* ========================================================================== */
      const settings = await KnowledgeBaseService.getKnowledgeBase(
        '',
        propertyId,
      )
      const threshold = settings?.confidenceThreshold ?? 0.8

      let knowledge = await KnowledgeBaseService.searchByIntent(
        propertyId,
        intent,
      )
      let bestFaqMatch: any = null

      if ((!knowledge || knowledge.length === 0) && intent === 'unknown') {
        const fullKb = await KnowledgeBaseService.getKnowledgeBase(
          '',
          propertyId,
        )
        if (fullKb && fullKb.faqs) {
          knowledge = fullKb.faqs
        }
      }

      const queryEmbedding: number[] = await createEmbedding(cleanInput)

      if (knowledge && knowledge.length > 0) {
        const ranked = await Promise.all(
          knowledge.map(async (item: any) => {
            if (!Array.isArray(item.embedding) || !item.embedding.length) {
              return { ...item, semanticScore: 0, confidence: 0 }
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

            return { ...item, semanticScore, confidence }
          }),
        )

        ranked.sort((a, b) => b.confidence - a.confidence)
        bestFaqMatch = ranked[0]

        if (bestFaqMatch && bestFaqMatch.confidence >= threshold) {
          setMemory(sessionId, {
            lastQuestion: message,
            lastAnswer: bestFaqMatch.answer,
            lastTopic: bestFaqMatch.intent,
          })

          const faqId = bestFaqMatch._id
          try {
            await KnowledgeBase.updateOne(
              { propertyId, 'faqs._id': faqId },
              {
                $inc: { 'faqs.$.usageCount': 1 },
                $set: { 'faqs.$.lastMatchedAt': new Date() },
              },
            )
          } catch (err) {
            logger.warn(
              { err, faqId },
              'Failed to update FAQ usage metrics (non-blocking)',
            )
          }

          return createResponse(
            bestFaqMatch.answer,
            bestFaqMatch.confidence,
            false,
          )
        }
      }

      /* 🌐 CRAWLED WEB CONTENT SEMANTIC SEARCH FALLBACK */
      const webFallback = await KnowledgeBaseService.searchWebContextFallback(
        propertyId,
        cleanInput,
        queryEmbedding,
      )

      if (webFallback.matched && webFallback.confidenceScore >= 0.45) {
        setMemory(sessionId, {
          lastQuestion: message,
          lastAnswer: webFallback.answer,
          lastTopic: 'website_scrape_match',
        })

        return createResponse(
          `Based on our website information:\n\n${webFallback.answer}`,
          webFallback.confidenceScore,
          false,
        )
      }

      /* HARD FALLBACK & HUMAN HANDOFF TRIAGE */
      const finalConfidence = Math.max(
        bestFaqMatch?.confidence ?? 0,
        webFallback?.confidenceScore ?? 0,
      )

      const activeFallbackPhrase = getRandomFallback()

      return createResponse(
        `${activeFallbackPhrase}\n\nWould you like me to connect you with one of our support specialists? Please reply with "Yes" to confirm.`,
        finalConfidence,
        true,
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

  static shouldEscalate(confidence: number, threshold = 0.8) {
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