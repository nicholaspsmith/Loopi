/**
 * Jina AI Embeddings Client
 *
 * Uses Jina's embedding API to generate vector embeddings for text.
 * jina-embeddings-v3 produces 1024-dimensional vectors.
 */

import { env } from '@/lib/env'

// Embedding dimensions for jina-embeddings-v3 model
export const EMBEDDING_DIMENSIONS = 1024

const JINA_API_URL = 'https://api.jina.ai/v1/embeddings'
const JINA_MODEL = 'jina-embeddings-v3'

interface JinaEmbeddingResponse {
  data: Array<{ embedding: number[] }>
}

/**
 * Generate embedding for a single text
 * @param text - Text to generate embedding for
 * @returns Embedding vector or null on error
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (!text.trim()) {
    return null
  }

  try {
    const response = await fetch(JINA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.JINA_API_KEY}`,
      },
      body: JSON.stringify({
        model: JINA_MODEL,
        input: [text],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`[Jina] API error: ${response.status} - ${error}`)
      return null
    }

    const data: JinaEmbeddingResponse = await response.json()
    return data.data[0]?.embedding ?? null
  } catch (error) {
    console.error('[Jina] Failed to generate embedding:', error)
    return null
  }
}

/**
 * Generate embeddings for multiple texts
 * @param texts - Array of texts to generate embeddings for
 * @returns Array of embedding vectors (empty array on error)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const validTexts = texts.filter((t) => t.trim())
  if (validTexts.length === 0) {
    return []
  }

  try {
    const response = await fetch(JINA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.JINA_API_KEY}`,
      },
      body: JSON.stringify({
        model: JINA_MODEL,
        input: validTexts,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`[Jina] API error: ${response.status} - ${error}`)
      return []
    }

    const data: JinaEmbeddingResponse = await response.json()
    return data.data.map((d) => d.embedding)
  } catch (error) {
    console.error('[Jina] Failed to generate embeddings:', error)
    return []
  }
}
