import { getDbConnection } from '@/lib/db/client'
import { generateEmbedding } from '@/lib/embeddings/ollama'
import { getDb } from '@/lib/db/pg-client'
import { messages } from '@/lib/db/drizzle-schema'
import { inArray } from 'drizzle-orm'
import type { Message } from '@/types'

/**
 * LanceDB Message Operations
 *
 * Handles message embeddings in LanceDB for semantic search.
 *
 * MINIMAL APPROACH: LanceDB only stores id, userId, and embedding.
 * All other message data is fetched from PostgreSQL after vector search.
 */

/**
 * Sync a message embedding to LanceDB
 *
 * This is called asynchronously after a message is created in PostgreSQL.
 * Failures are logged but don't affect the message creation.
 */
export async function syncMessageToLanceDB(message: {
  id: string
  userId: string
  content: string
}): Promise<void> {
  try {
    // Generate embedding for the message content
    const embedding = await generateEmbedding(message.content)

    if (!embedding) {
      console.warn(`[LanceDB] No embedding generated for message ${message.id}`)
      return
    }

    // Get LanceDB connection
    const db = await getDbConnection()
    const table = await db.openTable('messages')

    // Add minimal data to LanceDB
    await table.add([
      {
        id: message.id,
        userId: message.userId,
        embedding,
      },
    ])

    console.log(`[LanceDB] Synced message ${message.id} with embedding`)
  } catch (error) {
    // Graceful degradation - log error but don't throw
    // Message exists in PostgreSQL even if LanceDB sync fails
    console.error(`[LanceDB] Failed to sync message ${message.id}:`, error)
  }
}

/**
 * Delete a message embedding from LanceDB
 */
export async function deleteMessageFromLanceDB(messageId: string): Promise<void> {
  try {
    const db = await getDbConnection()
    const table = await db.openTable('messages')
    await table.delete(`id = '${messageId}'`)
    console.log(`[LanceDB] Deleted message ${messageId}`)
  } catch (error) {
    console.error(`[LanceDB] Failed to delete message ${messageId}:`, error)
  }
}

/**
 * Search messages by semantic similarity
 *
 * Returns full message data by:
 * 1. Vector search in LanceDB to get matching IDs
 * 2. Fetch full message data from PostgreSQL
 */
export async function searchSimilarMessages(
  queryText: string,
  userId: string,
  limit: number = 10
): Promise<Message[]> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(queryText)

    if (!queryEmbedding) {
      throw new Error('Failed to generate query embedding')
    }

    const lanceDb = await getDbConnection()
    const table = await lanceDb.openTable('messages')

    // Vector search using LanceDB - only get IDs
    const results = await table
      .vectorSearch(queryEmbedding)
      .where(`userId = '${userId}'`)
      .limit(limit)
      .toArray()

    if (results.length === 0) {
      return []
    }

    // Get message IDs from LanceDB results
    const messageIds = results.map((r: any) => r.id)

    // Fetch full message data from PostgreSQL
    const pgDb = getDb()
    const fullMessages = await pgDb.select().from(messages).where(inArray(messages.id, messageIds))

    // Return in the same order as vector search results
    const messageMap = new Map(fullMessages.map((m) => [m.id, m]))
    return messageIds
      .map((id: string) => messageMap.get(id))
      .filter((m): m is (typeof fullMessages)[0] => m !== undefined)
      .map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        userId: m.userId,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        embedding: null, // Embeddings stored in LanceDB, not returned in API
        createdAt: m.createdAt.getTime(),
        hasFlashcards: m.hasFlashcards,
        aiProvider: m.aiProvider as 'claude' | 'ollama' | null,
        apiKeyId: m.apiKeyId,
      }))
  } catch (error) {
    console.error('[LanceDB] Semantic search failed:', error)
    return []
  }
}
