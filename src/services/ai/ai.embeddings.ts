// /src/services/ai/ai.embeddings.ts

import { pipeline } from '@xenova/transformers'

let embedderPromise: Promise<any> | null = null

export async function getEmbedder() {
  if (!embedderPromise) {
    embedderPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
  }

  return embedderPromise
}

export async function createEmbedding(text: string): Promise<number[]> {
  const model = await getEmbedder()

  const output = await model(text, {
    pooling: 'mean',
    normalize: true,
  })

  return Array.from(output.data) as number[]
}