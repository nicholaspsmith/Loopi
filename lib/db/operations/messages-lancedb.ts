import { getDbConnection } from '@/lib/db/client'
import { generateEmbedding } from '@/lib/embeddings/ollama'
import type { Message } from '@/types'

/**
 * LanceDB Message Operations
 *
 * Handles message storage in LanceDB with vector embeddings for semantic search.
 * These operations run asynchronously and don't block the main message operations.
 */

/**
 * Sync a message to LanceDB with embedding generation
 *
 * This is called asynchronously after a message is created in PostgreSQL.
 * Failures are logged but don't affect the message creation.
 */
export async function syncMessageToLanceDB(message: {
  id: string
  conversationId: string
  userId: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
  hasFlashcards: boolean
}): Promise<void> {
  try {
    // Generate embedding for the message content
    const embedding = await generateEmbedding(message.content)

    // Get LanceDB connection
    const db = await getDbConnection()
    const table = await db.openTable('messages')

    // Add message to LanceDB with embedding
    await table.add([
      {
        id: message.id,
        conversationId: message.conversationId,
        userId: message.userId,
        role: message.role,
        content: message.content,
        embedding: embedding || null, // Null if embedding generation failed
        createdAt: message.createdAt,
        hasFlashcards: message.hasFlashcards,
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
 * Update message hasFlashcards flag in LanceDB
 *
 * Called when flashcards are generated for a message.
 */
export async function updateMessageHasFlashcardsInLanceDB(
  messageId: string
): Promise<void> {
  try {
    const db = await getDbConnection()
    const table = await db.openTable('messages')

    // LanceDB doesn't have UPDATE - need to delete and re-add
    // First, get the existing message
    const results = await table.filter(`id = '${messageId}'`).limit(1).toArray()

    if (results.length === 0) {
      console.warn(`[LanceDB] Message ${messageId} not found for update`)
      return
    }

    const existingMessage = results[0]

    // Delete the old message
    await table.delete(`id = '${messageId}'`)

    // Add updated message
    await table.add([
      {
        ...existingMessage,
        hasFlashcards: true,
      },
    ])

    console.log(`[LanceDB] Updated hasFlashcards for message ${messageId}`)
  } catch (error) {
    console.error(
      `[LanceDB] Failed to update hasFlashcards for message ${messageId}:`,
      error
    )
  }
}

/**
 * Search messages by semantic similarity (future feature)
 *
 * This will be used to find similar messages for RAG context.
 * Currently not called by the application.
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

    const db = await getDbConnection()
    const table = await db.openTable('messages')

    // Vector search using LanceDB
    const results = await table
      .vectorSearch(queryEmbedding)
      .where(`userId = '${userId}'`)
      .limit(limit)
      .toArray()

    return results.map((result: any) => ({
      id: result.id,
      conversationId: result.conversationId,
      userId: result.userId,
      role: result.role,
      content: result.content,
      embedding: null, // Don't return embeddings in API responses
      createdAt: result.createdAt,
      hasFlashcards: result.hasFlashcards,
    }))
  } catch (error) {
    console.error('[LanceDB] Semantic search failed:', error)
    return []
  }
}
