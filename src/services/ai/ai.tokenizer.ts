// /src/services/ai/ai.tokenizer.ts


const stopWords = new Set([
  'the',
  'is',
  'a',
  'an',
  'to',
  'do',
  'does',
  'what',
  'how',
  'in',
  'on',
  'of',
  'about',
  'for',
])

export function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((word) => word && !stopWords.has(word))
}
