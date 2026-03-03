import { getDb } from '@/lib/db/pg-client'
import { generateEmbedding } from '@/lib/embeddings'
import { goalEmbeddings } from '@/lib/db/drizzle-schema'
import { eq, sql } from 'drizzle-orm'

/**
 * pgvector Goal Operations
 *
 * Handles goal embeddings in PostgreSQL using pgvector for semantic similarity detection.
 *
 * MINIMAL APPROACH: Embeddings table only stores id, userId, and embedding.
 * All other goal data is stored in the main learning_goals table.
 */

/**
 * Sync a goal embedding to PostgreSQL (upsert)
 *
 * Generates embedding from title + description for better semantic matching.
 */
export async function syncGoalEmbedding(goal: {
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
      console.warn(`[pgvector] No embedding generated for goal ${goal.id}`)
      return
    }

    const db = getDb()

    // Upsert embedding - insert or update if exists
    await db
      .insert(goalEmbeddings)
      .values({
        id: goal.id,
        userId: goal.userId,
        embedding,
      })
      .onConflictDoUpdate({
        target: goalEmbeddings.id,
        set: {
          embedding,
          updatedAt: new Date(),
        },
      })

    // Get count for logging
    const countResult = await db.execute<{ count: string }>(sql`
      SELECT COUNT(*) as count FROM goal_embeddings WHERE user_id = ${goal.userId}
    `)
    const count = (countResult as unknown as { count: string }[])[0]?.count || 0

    console.log(
      `[pgvector] Synced goal ${goal.id} with embedding for userId=${goal.userId}, user has ${count} goal embeddings`
    )
  } catch (error) {
    console.error(`[pgvector] Failed to sync goal ${goal.id}:`, error)
  }
}

/**
 * Delete a goal embedding from PostgreSQL
 */
export async function deleteGoalEmbedding(goalId: string): Promise<void> {
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(goalId)) {
    console.error(`[pgvector] Invalid goal ID format: ${goalId}`)
    return
  }

  try {
    const db = getDb()
    await db.delete(goalEmbeddings).where(eq(goalEmbeddings.id, goalId))
    console.log(`[pgvector] Deleted goal embedding ${goalId}`)
  } catch (error) {
    console.error(`[pgvector] Failed to delete goal ${goalId}:`, error)
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
      console.warn('[pgvector] No embedding generated for goal query, returning empty results')
      return []
    }

    const db = getDb()

    // Convert threshold to distance: distance = 1 - similarity
    const maxDistance = 1 - threshold

    const results = await db.execute<{ id: string; similarity: number }>(sql`
      SELECT
        id,
        1 - (embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector) AS similarity
      FROM goal_embeddings
      WHERE user_id = ${userId}
        AND (embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector) <= ${maxDistance}
      ORDER BY embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector
      LIMIT ${limit}
    `)

    return (results as unknown as { id: string; similarity: number }[]).map((r) => ({
      id: r.id,
      similarity: Number(r.similarity),
    }))
  } catch (error) {
    console.error('[pgvector] Goal similarity search failed:', error)
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
      console.warn('[pgvector] No embedding generated for query, returning empty results')
      return []
    }

    const db = getDb()

    const results = await db.execute<{ id: string; similarity: number }>(sql`
      SELECT
        id,
        1 - (embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector) AS similarity
      FROM goal_embeddings
      WHERE user_id = ${userId}
      ORDER BY embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector
      LIMIT ${limit}
    `)

    return (results as unknown as { id: string; similarity: number }[]).map((r) => ({
      id: r.id,
      similarity: Number(r.similarity),
    }))
  } catch (error) {
    console.error('[pgvector] Goal semantic search failed:', error)
    return []
  }
}

// Re-export with LanceDB-compatible names for easier migration
export { syncGoalEmbedding as syncGoalToLanceDB, deleteGoalEmbedding as deleteGoalFromLanceDB }
