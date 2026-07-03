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

    // Using query casting and spreading data ensures all new refactored fields map cleanly
    const kb = (await KnowledgeBase.findOneAndUpdate(
      { propertyId: new mongoose.Types.ObjectId(propertyId) },
      {
        $set: {
          accountId: new mongoose.Types.ObjectId(accountId),
          ...data, // Automatically spreads and updates any properties passed from controller safely
        },
      },
      { new: true, upsert: true },
    )) as IKnowledgeBase | null

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
   * Execute a simulation query against the stored FAQs
   */
  static async testSandboxQuery(
    accountId: string,
    propertyId: string,
    message: string,
  ): Promise<{ matched: boolean; answer: string; confidenceScore: number }> {
    // Reuse your service's existing query engine to fetch configuration states
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
    let bestMatch = null
    let maxMatchCount = 0

    // Evaluate matches across enabled matrix records
    for (const faq of kb.faqs || []) {
      if (!faq.enabled) continue

      let score = 0

      // Check keyword array tags
      if (faq.keywords && faq.keywords.length > 0) {
        faq.keywords.forEach((kw) => {
          if (cleanInput.includes(kw.toLowerCase())) score += 2
        })
      }

      // Direct text phrase overlaps
      if (
        faq.question.toLowerCase().includes(cleanInput) ||
        cleanInput.includes(faq.question.toLowerCase())
      ) {
        score += 3
      }

      if (score > maxMatchCount) {
        maxMatchCount = score
        bestMatch = faq
      }
    }

    const fallbackThreshold = kb.confidenceThreshold ?? 0.8
    const simulatedScore =
      maxMatchCount > 0 ? Math.min(0.7 + maxMatchCount * 0.1, 0.98) : 0.0

    if (bestMatch && simulatedScore >= fallbackThreshold) {
      return {
        matched: true,
        answer: bestMatch.answer,
        confidenceScore: simulatedScore,
      }
    }

    return {
      matched: false,
      answer:
        kb.fallbackMessage ||
        'Sorry, I could not find a clear match inside our data records.',
      confidenceScore: simulatedScore,
    }
  }
}
