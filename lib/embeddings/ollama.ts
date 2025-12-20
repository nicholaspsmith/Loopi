/**
 * Ollama Embeddings Client
 *
 * Provides interface to Ollama's nomic-embed-text model for
 * generating vector embeddings of text content.
 *
 * Embeddings are used for semantic search capabilities.
 * All functions gracefully degrade by returning null on error.
 */

export const EMBEDDING_MODEL = 'nomic-embed-text'
export const EMBEDDING_DIMENSIONS = 768

/**
 * Get Ollama API URL (reads from env at runtime)
 */
function getOllamaUrl(): string {
  return process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
}

/**
 * Generate embedding for a single text using Ollama
 *
 * @param text - Text to generate embedding for
 * @returns Embedding vector (768 dims) or null on error
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    // Validate input
    const trimmed = text.trim()
    if (!trimmed) {
      return null
    }

    // Call Ollama API
    const response = await fetch(`${getOllamaUrl()}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        prompt: trimmed,
      }),
    })

    if (!response.ok) {
      console.error(`[Embeddings] Ollama API error: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()

    // Validate response
    if (!data.embedding || !Array.isArray(data.embedding)) {
      console.error('[Embeddings] Invalid response format from Ollama API')
      return null
    }

    const embedding = data.embedding

    // Validate embedding dimensions
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      console.error(
        `[Embeddings] Invalid embedding dimensions: expected ${EMBEDDING_DIMENSIONS}, got ${embedding.length}`
      )
      return null
    }

    return embedding
  } catch (error) {
    console.error('[Embeddings] Error generating embedding:', error)
    return null
  }
}

/**
 * Generate embeddings for multiple texts
 * Note: Ollama doesn't support batch embeddings, so we call sequentially
 *
 * @param texts - Array of texts to generate embeddings for
 * @returns Array of embedding vectors or empty array on error
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    // Filter out empty texts
    const validTexts = texts.map((t) => t.trim()).filter((t) => t.length > 0)

    if (validTexts.length === 0) {
      return []
    }

    // Generate embeddings sequentially
    const embeddings: number[][] = []
    for (const text of validTexts) {
      const embedding = await generateEmbedding(text)
      if (embedding) {
        embeddings.push(embedding)
      } else {
        // If any embedding fails, return empty array for consistency
        console.error('[Embeddings] Failed to generate embedding for text:', text.substring(0, 50))
        return []
      }
    }

    return embeddings
  } catch (error) {
    console.error('[Embeddings] Error generating embeddings:', error)
    return []
  }
}
