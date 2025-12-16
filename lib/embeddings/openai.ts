/**
 * OpenAI Embeddings Client
 *
 * Provides interface to OpenAI's text-embedding-3-small model for
 * generating vector embeddings of text content.
 *
 * Embeddings are used for future semantic search capabilities.
 * All functions gracefully degrade by returning null on error.
 */

export const EMBEDDING_MODEL = 'text-embedding-3-small'
export const EMBEDDING_DIMENSIONS = 1536
const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings'

/**
 * Generate embedding for a single text
 *
 * @param text - Text to generate embedding for
 * @returns Embedding vector (1536 dims) or null on error
 */
export async function generateEmbedding(
  text: string
): Promise<number[] | null> {
  try {
    // Validate input
    const trimmed = text.trim()
    if (!trimmed) {
      return null
    }

    // Check for API key
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.warn('[Embeddings] OpenAI API key not configured - skipping embedding generation')
      return null
    }

    // Call OpenAI API
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: trimmed,
      }),
    })

    if (!response.ok) {
      console.error(
        `[Embeddings] OpenAI API error: ${response.status} ${response.statusText}`
      )
      return null
    }

    const data = await response.json()

    // Validate response
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      console.error('[Embeddings] Invalid response format from OpenAI API')
      return null
    }

    const embedding = data.data[0].embedding

    // Validate embedding dimensions
    if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
      console.error(
        `[Embeddings] Invalid embedding dimensions: expected ${EMBEDDING_DIMENSIONS}, got ${embedding?.length}`
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
 * Generate embeddings for multiple texts in a single API call
 *
 * @param texts - Array of texts to generate embeddings for
 * @returns Array of embedding vectors or empty array on error
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  try {
    // Filter out empty texts
    const validTexts = texts.map((t) => t.trim()).filter((t) => t.length > 0)

    if (validTexts.length === 0) {
      return []
    }

    // Check for API key
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.warn('[Embeddings] OpenAI API key not configured - skipping embedding generation')
      return []
    }

    // Call OpenAI API
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: validTexts,
      }),
    })

    if (!response.ok) {
      console.error(
        `[Embeddings] OpenAI API error: ${response.status} ${response.statusText}`
      )
      return []
    }

    const data = await response.json()

    // Validate response
    if (!data.data || !Array.isArray(data.data)) {
      console.error('[Embeddings] Invalid response format from OpenAI API')
      return []
    }

    // Extract embeddings
    const embeddings = data.data.map((item: any) => item.embedding)

    // Validate all embeddings
    for (const embedding of embeddings) {
      if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
        console.error(
          `[Embeddings] Invalid embedding dimensions: expected ${EMBEDDING_DIMENSIONS}, got ${embedding?.length}`
        )
        return []
      }
    }

    return embeddings
  } catch (error) {
    console.error('[Embeddings] Error generating embeddings:', error)
    return []
  }
}
