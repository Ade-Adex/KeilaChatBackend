// /src/services/knowledgeBase.service.ts

import mongoose from 'mongoose'
import logger from '../bootstrap/logger.js'
import { AppError } from './appError.js'
import type {
  IFaqItem,
  IKnowledgeBase,
  AiMode,
  FallbackStrategy,
} from '../types/knowledgeBase.types.js'
import KnowledgeBase from '../models/KnowledgeBase.js'
import { detectIntent } from './ai/ai.intent.js'
import { createEmbedding } from './ai/ai.embeddings.js'
import { cosineSimilarity } from './ai/ai.cosine.js'

export class KnowledgeBaseService {
  /**
   * Get Knowledge Base by Property ID
   */
  static async getKnowledgeBase(
    accountId: string,
    propertyId: string,
  ): Promise<IKnowledgeBase> {
    if (!propertyId || !mongoose.Types.ObjectId.isValid(propertyId)) {
      throw new AppError('Invalid or missing Property ID.', 400)
    }

    logger.info({ accountId, propertyId }, 'Loading knowledge base settings')

    const kb = (await KnowledgeBase.findOne({
      propertyId: new mongoose.Types.ObjectId(propertyId),
    })) as IKnowledgeBase | null

    if (!kb) {
      logger.info(
        { accountId, propertyId },
        'No knowledge base found. Initializing defaults.',
      )

      const newKb = await KnowledgeBase.create({
        accountId: new mongoose.Types.ObjectId(accountId),
        propertyId: new mongoose.Types.ObjectId(propertyId),
        isAiEnabled: true,
        aiMode: 'knowledge_only',
        confidenceThreshold: 0.8,
        fallbackStrategy: 'human',
        humanHandoffEnabled: true,
        faqs: [],
      })

      return newKb as IKnowledgeBase
    }

    return kb
  }

  /**
   * Update or Upsert Knowledge Base Dataset Mappings
   */
  static async updateKnowledgeBase(
    accountId: string,
    propertyId: string,
    data: {
      isAiEnabled?: boolean
      aiMode?: AiMode
      confidenceThreshold?: number
      fallbackStrategy?: FallbackStrategy
      humanHandoffEnabled?: boolean
      fallbackMessage?: string
      welcomeMessage?: string
      maxResults?: number
      categories?: string[]
      faqs?: IFaqItem[]
    },
  ): Promise<IKnowledgeBase> {
    if (!propertyId || !mongoose.Types.ObjectId.isValid(propertyId)) {
      throw new AppError('Invalid or missing Property ID.', 400)
    }

    logger.info(
      { accountId, propertyId },
      'Syncing complete knowledge base rules matrix',
    )

    const normalizedFaqs =
      data.faqs?.map((faq) => ({
        question: faq.question,
        answer: faq.answer,
        category: faq.category ?? 'General',
        enabled: faq.enabled ?? true,
        priority: faq.priority ?? 1,
        keywords: faq.keywords ?? [],
        intent: faq.intent ?? 'unknown',
        entities: faq.entities ?? [],
        embedding: faq.embedding ?? [],
        embeddingModel: faq.embeddingModel ?? 'Xenova/all-MiniLM-L6-v2',
        usageCount: faq.usageCount ?? 0,
        lastMatchedAt: faq.lastMatchedAt,
      })) ?? []

    const kb = await KnowledgeBase.findOneAndUpdate(
      {
        propertyId: new mongoose.Types.ObjectId(propertyId),
      },
      {
        $set: {
          accountId: new mongoose.Types.ObjectId(accountId),
          ...data,
          faqs: normalizedFaqs,
        },
      },
      {
       returnDocument: 'after',
        upsert: true,
      },
    )

    if (!kb) {
      throw new AppError(
        'Failed to execute knowledge base operation sequence sync.',
        500,
      )
    }

    logger.info(
      { accountId, propertyId, faqCount: kb.faqs?.length || 0 },
      'Knowledge base synced successfully',
    )

    return kb
  }

  /**
   * Scans crawled web page matrix elements to locate fallback answer patterns.
   * Enhanced with a Heavy Keyword Boosting Matrix for short/single-word queries.
   */
  static async searchWebContextFallback(
    propertyId: string,
    cleanInput: string,
    queryEmbedding?: number[],
  ) {
    const kb = await KnowledgeBase.findOne({ propertyId })
    if (!kb || !kb.crawledSources) {
      return { matched: false, answer: '', confidenceScore: 0 }
    }

    let bestMatchText = ''
    let maxScore = 0
    const lowerInput = cleanInput.toLowerCase().trim()

    for (const source of kb.crawledSources) {
      if (source.status !== 'scraped' || !source.chunks) continue

      for (const chunk of source.chunks) {
        let score = 0
        const lowerChunkText = chunk.text.toLowerCase()

        // 1. Calculate base Vector Score if embedding exists
        if (
          queryEmbedding &&
          Array.isArray(chunk.embedding) &&
          chunk.embedding.length > 0
        ) {
          score = cosineSimilarity(queryEmbedding, chunk.embedding)
        }

        // 2. Apply Direct Keyword Boosting Matrix
        if (lowerChunkText.includes(lowerInput)) {
          // If it's a short/single word query (like "features"), give it a major priority jump
          const exactWordRegex = new RegExp(`\\b${lowerInput}\\b`, 'i')
          if (exactWordRegex.test(lowerChunkText)) {
            score = Math.max(score, 0.72) + 0.15 // Force-push it past the fallback floor
          } else {
            score = Math.max(score, 0.55) + 0.1
          }
        }

        // 3. Multi-word token match bonus
        const inputWords = lowerInput.split(/\s+/).filter((w) => w.length > 3)
        if (inputWords.length > 1) {
          const matchCount = inputWords.filter((word) =>
            lowerChunkText.includes(word),
          ).length
          score += (matchCount / inputWords.length) * 0.15
        }

        // Cap the maximum possible structural score at 1.00
        score = Math.min(score, 1)

        if (score > maxScore) {
          maxScore = score
          bestMatchText = chunk.text
        }
      }
    }

    if (maxScore >= 0.45 && bestMatchText) {
      return {
        matched: true,
        answer: bestMatchText,
        confidenceScore: maxScore,
      }
    }

    return { matched: false, answer: '', confidenceScore: 0 }
  }

  /**
   * Execute a sandbox semantic check query within the testing control panel drawer
   */
  static async testSandboxQuery(
    accountId: string,
    propertyId: string,
    message: string,
  ): Promise<{ matched: boolean; answer: string; confidenceScore: number }> {
    const kb = await KnowledgeBase.findOne({
      propertyId: new mongoose.Types.ObjectId(propertyId),
    })

    if (!kb) {
      return {
        matched: false,
        answer: 'Knowledge base profile context missing.',
        confidenceScore: 0,
      }
    }

    const cleanInput = message.toLowerCase().trim()
    const queryEmbedding = await createEmbedding(message)

    let bestMatchText = ''
    let maxScore = 0

    if (kb.crawledSources && Array.isArray(kb.crawledSources)) {
      for (const source of kb.crawledSources) {
        if (source.status !== 'scraped' || !source.chunks) continue

        for (const chunk of source.chunks) {
          let score = 0
          const lowerChunkText = chunk.text.toLowerCase()

          if (Array.isArray(chunk.embedding) && chunk.embedding.length > 0) {
            score = cosineSimilarity(queryEmbedding, chunk.embedding)
          }

          // Exact matching rules alignment for Sandbox Sync
          if (lowerChunkText.includes(cleanInput)) {
            const exactWordRegex = new RegExp(`\\b${cleanInput}\\b`, 'i')
            if (exactWordRegex.test(lowerChunkText)) {
              score = Math.max(score, 0.75) + 0.15
            } else {
              score = Math.max(score, 0.6) + 0.1
            }
          }

          score = Math.min(score, 1)

          if (score > maxScore) {
            maxScore = score
            bestMatchText = chunk.text
          }
        }
      }
    }

    // Give crawled text chunks a lower, more realistic boundary ceiling than strict FAQ configurations
    const minimumSandboxThreshold = Math.max(
      (kb.confidenceThreshold ?? 0.8) - 0.25,
      0.45,
    )

    if (maxScore >= minimumSandboxThreshold && bestMatchText) {
      return {
        matched: true,
        answer: bestMatchText,
        confidenceScore: maxScore,
      }
    }

    return {
      matched: false,
      answer: `Match failed. Top candidate score (${Math.round(maxScore * 100)}%) fell beneath context threshold bounds (${Math.round(minimumSandboxThreshold * 100)}%). Route drop triggered to human queue logs.`,
      confidenceScore: maxScore,
    }
  }

  /**
   * Existing index search method
   */
  static async searchByIntent(
    propertyId: string,
    intent: string,
  ): Promise<IFaqItem[]> {
    const kb = await KnowledgeBase.findOne({
      propertyId: new mongoose.Types.ObjectId(propertyId),
    }).lean()

    if (!kb) return []
    const faqs = (kb.faqs ?? []).filter((faq) => faq.enabled)
    if (intent === 'unknown') return faqs
    return faqs.filter((faq) => faq.intent === intent)
  }
}