// /src/services/ai/ai.memory.ts

const memory = new Map()

export function setMemory(sessionId: string, data: any) {
  memory.set(sessionId, {
    ...memory.get(sessionId),
    ...data,
  })
}

export function getMemory(sessionId: string) {
  return memory.get(sessionId)
}
