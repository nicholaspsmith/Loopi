import { getDbConnection } from '@/lib/db/client'
import { generateEmbedding } from '@/lib/embeddings'

/**
 * LanceDB Goal Operations
 *
 * Handles goal embeddings in LanceDB for semantic similarity detection.
 *
 * MINIMAL APPROACH: LanceDB only stores id, userId, and embedding.
 * All other goal data is stored in PostgreSQL.
 */

/**
 * Sync a goal embedding to LanceDB
 *
 * Generates embedding from title + description for better semantic matching.
 */
export async function syncGoalToLanceDB(goal: {
  id: string
  userId: string
  title: string
  description?: string | null
}): Promise<void> {
  try {
    // Combine title and description for richer semantic embedding
    const textToEmbed = goal.description ? `${goal.title}: ${goal.description}` : goal.title

    const embedding = await generateEmbedding(textToEmbed)

    if (!embedding) {
      console.warn(`[LanceDB] No embedding generated for goal ${goal.id}`)
      return
    }

    const db = await getDbConnection()
    const table = await db.openTable('goals')

    await table.add([
      {
        id: goal.id,
        userId: goal.userId,
        embedding,
      },
    ])

    console.log(`[LanceDB] Synced goal ${goal.id} with embedding`)
  } catch (error) {
    console.error(`[LanceDB] Failed to sync goal ${goal.id}:`, error)
  }
}

/**
 * Delete a goal embedding from LanceDB
 */
export async function deleteGoalFromLanceDB(goalId: string): Promise<void> {
  try {
    const db = await getDbConnection()
    const table = await db.openTable('goals')
    await table.delete(`id = '${goalId}'`)
    console.log(`[LanceDB] Deleted goal ${goalId}`)
  } catch (error) {
    console.error(`[LanceDB] Failed to delete goal ${goalId}:`, error)
  }
}

/**
 * Find similar goals above a similarity threshold
 *
 * Used for duplicate detection during goal creation.
 *
 * @param queryText - The goal title/description to check for duplicates
 * @param userId - User ID to scope the search
 * @param threshold - Minimum similarity score (0-1) to include in results
 * @param limit - Maximum number of results to return
 * @returns Array of similar goals with IDs and similarity scores
 */
export async function findSimilarGoals(
  queryText: string,
  userId: string,
  threshold: number = 0.85,
  limit: number = 3
): Promise<Array<{ id: string; similarity: number }>> {
  try {
    const queryEmbedding = await generateEmbedding(queryText)

    if (!queryEmbedding) {
      console.warn('[LanceDB] No embedding generated for goal query, returning empty results')
      return []
    }

    const db = await getDbConnection()
    const table = await db.openTable('goals')

    // Get more results than limit to filter by threshold
    const results = await table
      .vectorSearch(queryEmbedding)
      .where(`"userId" = '${userId}'`)
      .limit(limit * 2) // Fetch extra to account for threshold filtering
      .toArray()

    // Convert distance to similarity and filter by threshold
    const similarItems = results
      .map((r: { id: string; _distance: number }) => ({
        id: r.id,
        similarity: 1 / (1 + r._distance),
      }))
      .filter((item) => item.similarity >= threshold)
      .slice(0, limit)

    return similarItems
  } catch (error) {
    console.error('[LanceDB] Goal similarity search failed:', error)
    return []
  }
}

/**
 * Search goals by semantic similarity (without threshold filtering)
 *
 * Returns goal IDs with their similarity scores.
 * Caller should fetch full goal data from PostgreSQL using these IDs.
 */
export async function searchSimilarGoalIds(
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
    const table = await db.openTable('goals')

    const results = await table
      .vectorSearch(queryEmbedding)
      .where(`"userId" = '${userId}'`)
      .limit(limit)
      .toArray()

    // LanceDB returns _distance (lower = more similar)
    // Convert to similarity score (0-1, higher = more similar)
    return results.map((r: { id: string; _distance: number }) => ({
      id: r.id,
      similarity: 1 / (1 + r._distance),
    }))
  } catch (error) {
    console.error('[LanceDB] Goal semantic search failed:', error)
    return []
  }
}
