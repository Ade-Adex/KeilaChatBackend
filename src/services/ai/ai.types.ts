// /src/services/ai/ai.types.ts

export interface AIResponse {
  reply: string
  confidence: number
  shouldEscalate: boolean
}

export interface AIIntent {
  patterns: string[]
  responses: string[]
}

export interface AIMemory {
  lastIntent?: string
  lastEmotion?: string
  lastTopic?: string
  lastQuestion?: string
  lastAnswer?: string
  history?: string[]
}

export interface KnowledgeCandidate {
  question: string
  answer: string
  intent: string
  keywords: string[]
  embedding?: number[]
  score?: number
}