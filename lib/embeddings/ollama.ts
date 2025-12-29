/**
 * Embeddings Client (Stubbed)
 *
 * Embeddings are currently disabled. Functions return null/empty for graceful degradation.
 * EMBEDDING_DIMENSIONS is preserved for type compatibility.
 */

// Embedding dimensions for nomic-embed-text model (preserved for type compatibility)
export const EMBEDDING_DIMENSIONS = 768

/**
 * Generate embedding for a single text (stubbed)
 * @param _text - Text to generate embedding for
 * @returns null - embeddings are currently disabled
 */
export async function generateEmbedding(_text: string): Promise<number[] | null> {
  return null
}

/**
 * Generate embeddings for multiple texts (stubbed)
 * @param _texts - Array of texts to generate embeddings for
 * @returns empty array - embeddings are currently disabled
 */
export async function generateEmbeddings(_texts: string[]): Promise<number[][]> {
  return []
}
