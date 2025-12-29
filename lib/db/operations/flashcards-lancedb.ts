import { getDbConnection } from '@/lib/db/client'
import { generateEmbedding } from '@/lib/embeddings/ollama'

/**
 * LanceDB Flashcard Operations
 *
 * Handles flashcard embeddings in LanceDB for semantic search.
 *
 * MINIMAL APPROACH: LanceDB only stores id, userId, and embedding.
 * All other flashcard data is stored in PostgreSQL.
 */

/**
 * Sync a flashcard embedding to LanceDB
 */
export async function syncFlashcardToLanceDB(flashcard: {
  id: string
  userId: string
  question: string
}): Promise<void> {
  try {
    const embedding = await generateEmbedding(flashcard.question)

    if (!embedding) {
      console.warn(`[LanceDB] No embedding generated for flashcard ${flashcard.id}`)
      return
    }

    const db = await getDbConnection()
    const table = await db.openTable('flashcards')

    await table.add([
      {
        id: flashcard.id,
        userId: flashcard.userId,
        embedding,
      },
    ])

    console.log(`[LanceDB] Synced flashcard ${flashcard.id} with embedding`)
  } catch (error) {
    console.error(`[LanceDB] Failed to sync flashcard ${flashcard.id}:`, error)
  }
}

/**
 * Delete a flashcard embedding from LanceDB
 */
export async function deleteFlashcardFromLanceDB(flashcardId: string): Promise<void> {
  try {
    const db = await getDbConnection()
    const table = await db.openTable('flashcards')
    await table.delete(`id = '${flashcardId}'`)
    console.log(`[LanceDB] Deleted flashcard ${flashcardId}`)
  } catch (error) {
    console.error(`[LanceDB] Failed to delete flashcard ${flashcardId}:`, error)
  }
}

/**
 * Search flashcards by semantic similarity
 *
 * Returns flashcard IDs that match the query.
 * Caller should fetch full data from PostgreSQL.
 */
export async function searchSimilarFlashcardIds(
  queryText: string,
  userId: string,
  limit: number = 10
): Promise<string[]> {
  try {
    const queryEmbedding = await generateEmbedding(queryText)

    if (!queryEmbedding) {
      console.warn('[LanceDB] No embedding generated for query, returning empty results')
      return []
    }

    const db = await getDbConnection()
    const table = await db.openTable('flashcards')

    const results = await table
      .vectorSearch(queryEmbedding)
      .where(`userId = '${userId}'`)
      .limit(limit)
      .toArray()

    return results.map((r: any) => r.id)
  } catch (error) {
    console.error('[LanceDB] Flashcard semantic search failed:', error)
    return []
  }
}

/**
 * Search flashcards with similarity scores
 *
 * Returns flashcard IDs with their similarity scores (0-1, higher = more similar).
 * Caller should fetch full flashcard data from PostgreSQL using these IDs.
 */
export async function searchSimilarFlashcardsWithScores(
  queryText: string,
  userId: string,
  limit: number = 10
): Promise<Array<{ id: string; similarity: number }>> {
  try {
    const queryEmbedding = await generateEmbedding(queryText)

    if (!queryEmbedding) {
      console.warn('[LanceDB] No embedding generated for query, returning empty results')
      return []
    }

    const db = await getDbConnection()
    const table = await db.openTable('flashcards')

    const results = await table
      .vectorSearch(queryEmbedding)
      .where(`userId = '${userId}'`)
      .limit(limit)
      .toArray()

    // LanceDB returns _distance (lower = more similar)
    // Convert to similarity score (0-1, higher = more similar)
    return results.map((r: any) => ({
      id: r.id,
      similarity: 1 / (1 + r._distance), // Normalize distance to 0-1 range
    }))
  } catch (error) {
    console.error('[LanceDB] Flashcard semantic search with scores failed:', error)
    return []
  }
}
