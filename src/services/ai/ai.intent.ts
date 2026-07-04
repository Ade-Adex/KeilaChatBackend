// /src/services/ai/ai.intent.ts


import { synonyms } from './ai.synonyms.js'
import { tokenize } from './ai.tokenizer.js'

export function detectIntent(input: string): string {
  const text = input.toLowerCase()

  const words = tokenize(text)

  for (const [intent, aliases] of Object.entries(synonyms)) {
    if (
      aliases.some((alias) => words.includes(alias) || text.includes(alias))
    ) {
      return intent
    }
  }

  return 'unknown'
}
