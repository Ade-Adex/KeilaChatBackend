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
   * Robust multi-tenant evaluation utilizing both vector similarity and text fallback matrices.
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

    // Loop through your crawled document domains
    for (const source of kb.crawledSources) {
      if (source.status !== 'scraped' || !source.chunks) continue

      for (const chunk of source.chunks) {
        let score = 0

        if (
          queryEmbedding &&
          Array.isArray(chunk.embedding) &&
          chunk.embedding.length > 0
        ) {
          const similarity = cosineSimilarity(queryEmbedding, chunk.embedding)

          // Boost score slightly if there's a strong direct text keyword overlap
          const lowerChunkText = chunk.text.toLowerCase()
          const words = cleanInput.split(/\s+/)
          const matchCount = words.filter(
            (word) => word.length > 3 && lowerChunkText.includes(word),
          ).length
          const keywordBonus = matchCount * 0.05

          score = Math.min(similarity + keywordBonus, 1)
        } else {
          // Fallback literal keyword text matching query if vectors are missing
          if (chunk.text.toLowerCase().includes(cleanInput)) {
            score = 0.65
          }
        }

        if (score > maxScore) {
          maxScore = score
          bestMatchText = chunk.text
        }
      }
    }

    // Dynamic scale limit for chunk responses
    if (maxScore >= 0.4 && bestMatchText) {
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
          if (Array.isArray(chunk.embedding) && chunk.embedding.length > 0) {
            const similarity = cosineSimilarity(queryEmbedding, chunk.embedding)

            // Apply keyword boost logic consistently
            const lowerChunkText = chunk.text.toLowerCase()
            const words = cleanInput.split(/\s+/)
            const matchCount = words.filter(
              (word) => word.length > 3 && lowerChunkText.includes(word),
            ).length
            const keywordBonus = matchCount * 0.05

            score = Math.min(similarity + keywordBonus, 1)
          } else {
            if (chunk.text.toLowerCase().includes(cleanInput)) score = 0.6
          }

          if (score > maxScore) {
            maxScore = score
            bestMatchText = chunk.text
          }
        }
      }
    }

    // Base context match threshold for page scraping vectors is more forgiving than static FAQs
    const minimumSandboxThreshold = Math.max(
      (kb.confidenceThreshold ?? 0.8) - 0.3,
      0.4,
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
      answer: `Match failed. Top vector candidate score (${Math.round(maxScore * 100)}%) fell beneath context threshold boundaries (${Math.round(minimumSandboxThreshold * 100)}%). Route drop triggered to human queue logs.`,
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