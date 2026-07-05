// /src/types/knowledgeBase.types.ts

import type { Document, Types } from 'mongoose'

export type AiMode = 'disabled' | 'knowledge_only' | 'hybrid'
export type FallbackStrategy = 'human' | 'clarify' | 'fallback'
export type ScrapingStatus = 'pending' | 'scraped' | 'failed'

// 🎯 ADDED: Strongly-typed sub-document interface for vector chunks
export interface ICrawlChunk {
  _id?: Types.ObjectId
  text: string
  embedding: number[]
}

export interface ICrawledSource {
  _id?: Types.ObjectId
  url: string
  title?: string
  rawContent: string
  status: ScrapingStatus
  errorMessage?: string // 🎯 ADDED: Trace tracking logs safely
  lastScrapedAt?: Date
  chunks: ICrawlChunk[] // 🎯 ADDED: Direct strict chunk list reference
  createdAt?: Date
  updatedAt?: Date
}

export interface IFaqItem {
  _id?: Types.ObjectId
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