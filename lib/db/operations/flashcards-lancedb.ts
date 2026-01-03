import { getDbConnection } from '@/lib/db/client'
import { generateEmbedding } from '@/lib/embeddings'

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
  // Validate UUID format to prevent SQL injection
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(flashcardId)) {
    console.error(`[LanceDB] Invalid flashcard ID format: ${flashcardId}`)
    return
  }

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

    // Get all results without SQL filter (LanceDB has issues with WHERE on recent inserts)
    const allResults = await table
      .vectorSearch(queryEmbedding)
      .bypassVectorIndex() // Brute-force search to see all data including recent inserts
      .limit(100)
      .toArray()

    // Filter by userId in JavaScript
    return allResults
      .filter((r: { userId: string }) => r.userId === userId)
      .slice(0, limit)
      .map((r: any) => r.id)
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

    // Get all results without SQL filter (LanceDB has issues with WHERE on recent inserts)
    const allResults = await table
      .vectorSearch(queryEmbedding)
      .bypassVectorIndex() // Brute-force search to see all data including recent inserts
      .limit(100)
      .toArray()

    // Filter by userId in JavaScript
    const userResults = allResults.filter((r: { userId: string }) => r.userId === userId)

    // LanceDB returns _distance (lower = more similar)
    // Convert to similarity score (0-1, higher = more similar)
    return userResults.slice(0, limit).map((r: any) => ({
      id: r.id,
      similarity: 1 / (1 + r._distance), // Normalize distance to 0-1 range
    }))
  } catch (error) {
    console.error('[LanceDB] Flashcard semantic search with scores failed:', error)
    return []
  }
}

/**
 * Find similar flashcards above a similarity threshold
 *
 * Used for duplicate detection during flashcard creation.
 *
 * @param queryText - The flashcard question to check for duplicates
 * @param userId - User ID to scope the search
 * @param threshold - Minimum similarity score (0-1) to include in results
 * @param limit - Maximum number of results to return
 * @returns Array of similar flashcards with IDs and similarity scores
 */
export async function findSimilarFlashcardsWithThreshold(
  queryText: string,
  userId: string,
  threshold: number = 0.85,
  limit: number = 3
): Promise<Array<{ id: string; similarity: number }>> {
  try {
    const queryEmbedding = await generateEmbedding(queryText)

    if (!queryEmbedding) {
      console.warn('[LanceDB] No embedding generated for query, returning empty results')
      return []
    }

    const db = await getDbConnection()
    const table = await db.openTable('flashcards')

    // Get all results without SQL filter (LanceDB has issues with WHERE on recent inserts)
    // Then filter by userId in JavaScript
    const allResults = await table
      .vectorSearch(queryEmbedding)
      .bypassVectorIndex() // Brute-force search to see all data including recent inserts
      .limit(100) // Get more to ensure we capture matching userId
      .toArray()

    // Filter by userId in JavaScript
    const userResults = allResults.filter((r: { userId: string }) => r.userId === userId)

    // Convert distance to similarity and filter by threshold
    const similarItems = userResults
      .map((r: { id: string; _distance: number }) => ({
        id: r.id,
        similarity: 1 / (1 + r._distance),
      }))
      .filter((item) => item.similarity >= threshold)
      .slice(0, limit)

    return similarItems
  } catch (error) {
    console.error('[LanceDB] Flashcard threshold search failed:', error)
    return []
  }
}
