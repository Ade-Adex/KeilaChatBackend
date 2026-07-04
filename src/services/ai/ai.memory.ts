// /src/services/ai/ai.memory.ts

import type { AIMemory } from './ai.types.js'

const memory = new Map<string, AIMemory>()

export function setMemory(sessionId: string, data: Partial<AIMemory>) {
  const existing = memory.get(sessionId) || {}

  memory.set(sessionId, {
    ...existing,
    ...data,
  })
}

export function getMemory(sessionId: string): AIMemory {
  return (
    memory.get(sessionId) || {
      history: [],
    }
  )
}

export function addHistory(sessionId: string, message: string) {
  const current = getMemory(sessionId)

  current.history ??= []

  current.history.push(message)

  current.history = current.history.slice(-10)

  memory.set(sessionId, current)
}