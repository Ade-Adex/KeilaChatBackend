// /src/types/knowledgeBase.types.ts

import type { Document, Types } from 'mongoose'

export type AiMode = 'disabled' | 'knowledge_only' | 'hybrid'

export type FallbackStrategy = 'human' | 'clarify' | 'fallback'

export type ScrapingStatus = 'pending' | 'scraped' | 'failed'

// 🎯 ADDED: Type contract for the web scraped links sub-document
export interface ICrawledSource {
  _id?: Types.ObjectId
  url: string
  title?: string
  rawContent: string
  status: ScrapingStatus
  lastScrapedAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

export interface IFaqItem {
  question: string
  answer: string
  category: string
  enabled: boolean
  priority: number
  keywords: string[]
  intent?: string
  entities?: string[]
  embedding?: number[]
  embeddingModel?: string
  usageCount?: number
  lastMatchedAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

export interface IKnowledgeBase extends Document {
  accountId: Types.ObjectId
  propertyId: Types.ObjectId
  isAiEnabled: boolean
  aiMode: AiMode
  confidenceThreshold: number
  fallbackStrategy: FallbackStrategy
  humanHandoffEnabled: boolean
  fallbackMessage: string
  welcomeMessage: string
  maxResults: number
  categories: string[]
  lastIndexedAt?: Date
  faqs: IFaqItem[]

  crawledSources: ICrawledSource[]

  createdAt: Date
  updatedAt: Date
}