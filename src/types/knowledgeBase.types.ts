// /src/types/knowledgeBase.types.ts

import type { Document, Types } from 'mongoose'

export type AiMode = 'disabled' | 'knowledge_only' | 'hybrid'

export type FallbackStrategy = 'human' | 'clarify' | 'fallback'

export interface IFaqItem {
  question: string
  answer: string
  category: string
  enabled: boolean
  priority: number
  keywords: string[]
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

  createdAt: Date

  updatedAt: Date
}
