// /src/services/ai/ai.utils.ts

export function normalizeInput(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?¿¡"']/g, '')
    .replace(/\s+/g, ' ')
}

export function randomResponse(
  responses: readonly string[],
  fallback = 'How may I assist you today?',
): string {
  if (!responses?.length) {
    return fallback
  }

  const index = Math.floor(Math.random() * responses.length)

  return responses[index] ?? fallback
}
