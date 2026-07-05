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
   * Execute a semantic simulation query against the stored FAQs
   */
  static async testSandboxQuery(
    accountId: string,
    propertyId: string,
    message: string,
  ): Promise<{
    matched: boolean
    answer: string
    confidenceScore: number
  }> {
    const kb = await this.getKnowledgeBase(accountId, propertyId)

    if (!kb.isAiEnabled || kb.aiMode === 'disabled') {
      return {
        matched: false,
        answer:
          'AI processing or active knowledge matching functions are offline.',
        confidenceScore: 0,
      }
    }

    const cleanInput = message.toLowerCase().trim()

    const detectedIntent = detectIntent(cleanInput)

    const queryEmbedding = await createEmbedding(cleanInput)

    let bestMatch: IFaqItem | null = null

    let bestScore = 0

    for (const faq of kb.faqs ?? []) {
      if (!faq.enabled) {
        continue
      }

      let semanticScore = 0
      let keywordScore = 0
      let textScore = 0
      let intentScore = 0

      /*
       * SEMANTIC MATCHING
       */
      if (faq.embedding && faq.embedding.length > 0) {
        semanticScore = cosineSimilarity(queryEmbedding, faq.embedding)
      }

      /*
       * KEYWORD MATCHING
       */
      if (faq.keywords && faq.keywords.length) {
        for (const keyword of faq.keywords) {
          if (cleanInput.includes(keyword.toLowerCase())) {
            keywordScore += 0.1
          }
        }
      }

      /*
       * DIRECT QUESTION OVERLAP
       */
      const faqQuestion = faq.question.toLowerCase()

      if (
        faqQuestion.includes(cleanInput) ||
        cleanInput.includes(faqQuestion)
      ) {
        textScore = 0.2
      }

      /*
       * INTENT BONUS
       */
      if (faq.intent && faq.intent === detectedIntent) {
        intentScore = 0.15
      }

      /*
       * FINAL CONFIDENCE
       *
       * semantic = 70%
       * keywords = 10%
       * direct text = 5%
       * intent = 15%
       */
      const confidence =
        semanticScore * 0.7 +
        keywordScore * 0.1 +
        textScore * 0.05 +
        intentScore * 0.15

      if (confidence > bestScore) {
        bestScore = confidence

        bestMatch = faq
      }
    }

    const threshold = kb.confidenceThreshold ?? 0.65

    if (bestMatch && bestScore >= threshold) {
      return {
        matched: true,
        answer: bestMatch.answer,
        confidenceScore: Number(bestScore.toFixed(4)),
      }
    }

    return {
      matched: false,
      answer:
        kb.fallbackMessage ||
        'Sorry, I could not find a clear match inside our data records.',
      confidenceScore: Number(bestScore.toFixed(4)),
    }
  }

  static async searchByIntent(
    propertyId: string,
    intent: string,
  ): Promise<IFaqItem[]> {
    const kb = await KnowledgeBase.findOne({
      propertyId: new mongoose.Types.ObjectId(propertyId),
    }).lean()

    if (!kb) {
      return []
    }

    const faqs = (kb.faqs ?? []).filter((faq) => faq.enabled)

    if (intent === 'unknown') {
      return faqs
    }

    return faqs.filter((faq) => faq.intent === intent)
  }

  /**
   * Scans scraped web sources for matching keyword contexts as a fallback resolution layers
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

    // Only inspect successfully scraped items
    const activeSources = kb.crawledSources.filter(
      (s) => s.status === 'scraped',
    )
    let bestChunk = ''
    let highestScore = 0

    // Break clean input into singular clean keyword tags for matching evaluation
    const keywords = cleanInput.split(/\s+/).filter((word) => word.length > 3)

    for (const source of activeSources) {
      if (!source.rawContent) continue

      // Break long content pages down into clean sentence strings
      const paragraphs = source.rawContent
        .split(/[.\n]+/)
        .map((p) => p.trim())
        .filter(Boolean)

      for (const paragraph of paragraphs) {
        let matchCount = 0
        const lowerParagraph = paragraph.toLowerCase()

        for (const word of keywords) {
          if (lowerParagraph.includes(word)) {
            matchCount++
          }
        }

        if (matchCount > 0) {
          // Calculate basic match density metric
          const score = matchCount / keywords.length
          if (score > highestScore) {
            highestScore = score
            bestChunk = paragraph
          }
        }
      }
    }

    // If we establish a strong contextual density match (e.g., > 30% keyword match overlap)
    if (highestScore >= 0.3 && bestChunk) {
      return {
        matched: true,
        answer: `${bestChunk.trim()}.`,
        confidenceScore: highestScore,
      }
    }

    return { matched: false, answer: '', confidenceScore: 0 }
  }
}
