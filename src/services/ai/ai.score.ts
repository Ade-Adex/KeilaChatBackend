// /src/services/ai/ai.score.ts

import { tokenize } from './ai.tokenizer.js'

export function scoreQuestion(input: string, keywords: string[]) {
  const words = tokenize(input)

  let score = 0

  for (const word of words) {
    if (keywords.includes(word)) {
      score += 10
    }
  }

  return score
}