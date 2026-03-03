import { getDb } from '@/lib/db/pg-client'
import { generateEmbedding } from '@/lib/embeddings'
import { flashcardEmbeddings } from '@/lib/db/drizzle-schema'
import { eq, inArray, sql } from 'drizzle-orm'

/**
 * pgvector Flashcard Operations
 *
 * Handles flashcard embeddings in PostgreSQL using pgvector for semantic search.
 *
 * MINIMAL APPROACH: Embeddings table only stores id, userId, and embedding.
 * All other flashcard data is stored in the main flashcards table.
 */

/**
 * Sync a flashcard embedding to PostgreSQL (upsert)
 */
export async function syncFlashcardEmbedding(flashcard: {
  id: string
  userId: string
  question: string
}): Promise<void> {
  try {
    const embedding = await generateEmbedding(flashcard.question)

    if (!embedding) {
      console.warn(`[pgvector] No embedding generated for flashcard ${flashcard.id}`)
      return
    }

    const db = getDb()

    // Upsert embedding - insert or update if exists
    await db
      .insert(flashcardEmbeddings)
      .values({
        id: flashcard.id,
        userId: flashcard.userId,
        embedding,
      })
      .onConflictDoUpdate({
        target: flashcardEmbeddings.id,
        set: {
          embedding,
          updatedAt: new Date(),
        },
      })

    console.log(`[pgvector] Synced flashcard ${flashcard.id} with embedding`)
  } catch (error) {
    console.error(`[pgvector] Failed to sync flashcard ${flashcard.id}:`, error)
  }
}

/**
 * Delete a flashcard embedding from PostgreSQL
 */
export async function deleteFlashcardEmbedding(flashcardId: string): Promise<void> {
  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(flashcardId)) {
    console.error(`[pgvector] Invalid flashcard ID format: ${flashcardId}`)
    return
  }

  try {
    const db = getDb()
    await db.delete(flashcardEmbeddings).where(eq(flashcardEmbeddings.id, flashcardId))
    console.log(`[pgvector] Deleted flashcard embedding ${flashcardId}`)
  } catch (error) {
    console.error(`[pgvector] Failed to delete flashcard ${flashcardId}:`, error)
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
      console.warn('[pgvector] No embedding generated for query, returning empty results')
      return []
    }

    const db = getDb()

    // Use raw SQL for vector similarity search with cosine distance
    const results = await db.execute<{ id: string }>(sql`
      SELECT id
      FROM flashcard_embeddings
      WHERE user_id = ${userId}
      ORDER BY embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector
      LIMIT ${limit}
    `)

    return (results as unknown as { id: string }[]).map((r) => r.id)
  } catch (error) {
    console.error('[pgvector] Flashcard semantic search failed:', error)
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
      console.warn('[pgvector] No embedding generated for query, returning empty results')
      return []
    }

    const db = getDb()

    // Cosine distance returns 0-2, convert to similarity 0-1
    // similarity = 1 - (distance / 2) or simply 1 - distance for normalized vectors
    const results = await db.execute<{ id: string; similarity: number }>(sql`
      SELECT
        id,
        1 - (embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector) AS similarity
      FROM flashcard_embeddings
      WHERE user_id = ${userId}
      ORDER BY embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector
      LIMIT ${limit}
    `)

    return (results as unknown as { id: string; similarity: number }[]).map((r) => ({
      id: r.id,
      similarity: Number(r.similarity),
    }))
  } catch (error) {
    console.error('[pgvector] Flashcard semantic search with scores failed:', error)
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
      console.warn('[pgvector] No embedding generated for query, returning empty results')
      return []
    }

    const db = getDb()

    // Convert threshold to distance: distance = 1 - similarity
    const maxDistance = 1 - threshold

    const results = await db.execute<{ id: string; similarity: number }>(sql`
      SELECT
        id,
        1 - (embedding <=> ${`[${queryEmbedding.join(',')}]`}::vector) AS similarity
      FROM flashcard_embeddings
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
    console.error('[pgvector] Flashcard threshold search failed:', error)
    return []
  }
}

/**
 * Clean up orphaned pgvector embeddings
 *
 * Removes embeddings for flashcards that no longer exist in PostgreSQL.
 * Should be called after migrations that delete flashcards.
 *
 * Note: With ON DELETE CASCADE, this should rarely be needed, but
 * provides a safety net for any orphaned records.
 *
 * @returns Number of orphaned embeddings deleted
 */
export async function cleanupOrphanedFlashcardEmbeddings(): Promise<number> {
  try {
    const db = getDb()

    // Find embeddings without corresponding flashcards
    const orphanedResults = await db.execute<{ id: string }>(sql`
      SELECT fe.id
      FROM flashcard_embeddings fe
      LEFT JOIN flashcards f ON fe.id = f.id
      WHERE f.id IS NULL
    `)

    const orphanedIds = (orphanedResults as unknown as { id: string }[]).map((r) => r.id)

    if (orphanedIds.length === 0) {
      console.log('[pgvector] No orphaned flashcard embeddings found')
      return 0
    }

    console.log(`[pgvector] Found ${orphanedIds.length} orphaned embeddings, deleting...`)

    // Delete orphaned embeddings
    await db.delete(flashcardEmbeddings).where(inArray(flashcardEmbeddings.id, orphanedIds))

    console.log(`[pgvector] Cleaned up ${orphanedIds.length} orphaned flashcard embeddings`)
    return orphanedIds.length
  } catch (error) {
    console.error('[pgvector] Failed to cleanup orphaned embeddings:', error)
    return 0
  }
}

// Re-export with LanceDB-compatible names for easier migration
export {
  syncFlashcardEmbedding as syncFlashcardToLanceDB,
  deleteFlashcardEmbedding as deleteFlashcardFromLanceDB,
}
