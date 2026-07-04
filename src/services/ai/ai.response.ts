// /src/services/ai/ai.response.ts

export function createResponse(
  reply: string,
  confidence = 1,
  shouldEscalate = false,
) {
  return {
    reply,
    confidence,
    shouldEscalate,
  }
}
