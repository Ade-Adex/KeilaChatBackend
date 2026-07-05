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
        new: true,
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
   * Scans crawled web page matrix elements to locate fallback answer patterns
   */
  static async searchWebContextFallback(
    propertyId: string,
    cleanInput: string,
  ): Promise<{ matched: boolean; answer: string; confidenceScore: number }> {
    const kb = await KnowledgeBase.findOne({
      propertyId: new mongoose.Types.ObjectId(propertyId),
    }).lean()

    if (!kb || !kb.crawledSources || kb.crawledSources.length === 0) {
      return { matched: false, answer: '', confidenceScore: 0 }
    }

    const queryEmbedding = await createEmbedding(cleanInput)
    let bestChunkText = ''
    let highestScore = 0

    for (const source of kb.crawledSources) {
      if (source.status !== 'scraped' || !source.chunks) continue

      for (const chunk of source.chunks) {
        const score = cosineSimilarity(queryEmbedding, chunk.embedding)
        if (score > highestScore) {
          highestScore = score
          bestChunkText = chunk.text
        }
      }
    }

    return {
      matched: highestScore >= 0.45,
      answer: bestChunkText,
      confidenceScore: highestScore,
    }
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

    const queryEmbedding = await createEmbedding(message)
    let bestMatchText = ''
    let highestSimilarity = 0
    const thresholdScale = (kb.confidenceThreshold ?? 0.8) * 100

    if (kb.crawledSources && Array.isArray(kb.crawledSources)) {
      for (const source of kb.crawledSources) {
        if (source.status !== 'scraped' || !source.chunks) continue

        for (const chunk of source.chunks) {
          const similarity = cosineSimilarity(queryEmbedding, chunk.embedding)
          const similarityPercentage = Math.round(similarity * 100)

          if (similarityPercentage > highestSimilarity) {
            highestSimilarity = similarityPercentage
            bestMatchText = chunk.text
          }
        }
      }
    }

    if (highestSimilarity >= thresholdScale && bestMatchText) {
      return {
        matched: true,
        answer: bestMatchText,
        confidenceScore: highestSimilarity / 100,
      }
    }

    return {
      matched: false,
      answer:
        'Match failed. Confidence index fell beneath threshold bounds. Route drop triggered to human queue logs.',
      confidenceScore: highestSimilarity / 100,
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
