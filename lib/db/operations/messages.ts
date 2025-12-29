import { getDb } from '@/lib/db/pg-client'
import { messages } from '@/lib/db/drizzle-schema'
import { eq } from 'drizzle-orm'
import type { Message, MessageRole } from '@/types'
import { incrementMessageCount } from './conversations'
import { syncMessageToLanceDB } from './messages-lancedb'

/**
 * Message Database Operations
 *
 * Provides CRUD operations for messages in PostgreSQL.
 * Messages are also synced to LanceDB for vector search capabilities.
 */

/**
 * Create a new message
 *
 * Messages are created in PostgreSQL and synced to LanceDB for vector search.
 * LanceDB sync happens asynchronously and doesn't block message creation.
 */
export async function createMessage(data: {
  conversationId: string
  userId: string
  role: MessageRole
  content: string
  aiProvider?: 'claude' | null
}): Promise<Message> {
  const db = getDb()

  const [message] = await db
    .insert(messages)
    .values({
      conversationId: data.conversationId,
      userId: data.userId,
      role: data.role,
      content: data.content,
      hasFlashcards: false,
      aiProvider: data.aiProvider || null,
    })
    .returning()

  // Increment conversation message count
  await incrementMessageCount(data.conversationId)

  // Sync embedding to LanceDB asynchronously (fire and forget)
  // LanceDB only stores id, userId, and embedding for vector search
  // Skip in test environment to avoid race conditions
  if (process.env.NODE_ENV !== 'test') {
    syncMessageToLanceDB({
      id: message.id,
      userId: message.userId,
      content: message.content,
    }).catch((error) => {
      console.error(`[Messages] Failed to sync message ${message.id} to LanceDB:`, error)
    })
  }

  return {
    id: message.id,
    conversationId: message.conversationId,
    userId: message.userId,
    role: message.role as MessageRole,
    content: message.content,
    embedding: null, // Embeddings stored in LanceDB, not returned in API
    createdAt: message.createdAt.getTime(),
    hasFlashcards: message.hasFlashcards,
    aiProvider: message.aiProvider as 'claude' | null,
  }
}

/**
 * Get message by ID
 */
export async function getMessageById(id: string): Promise<Message | null> {
  const db = getDb()

  const [message] = await db.select().from(messages).where(eq(messages.id, id)).limit(1)

  if (!message) {
    return null
  }

  return {
    id: message.id,
    conversationId: message.conversationId,
    userId: message.userId,
    role: message.role as MessageRole,
    content: message.content,
    embedding: null, // Don't return embedding in API responses
    createdAt: message.createdAt.getTime(),
    hasFlashcards: message.hasFlashcards,
    aiProvider: message.aiProvider as 'claude' | null,
  }
}

/**
 * Get all messages for a conversation
 */
export async function getMessagesByConversationId(conversationId: string): Promise<Message[]> {
  const db = getDb()

  const results = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt)
    .limit(10000)

  return results.map((msg) => ({
    id: msg.id,
    conversationId: msg.conversationId,
    userId: msg.userId,
    role: msg.role as MessageRole,
    content: msg.content,
    embedding: null, // Don't return embedding in API responses
    createdAt: msg.createdAt.getTime(),
    hasFlashcards: msg.hasFlashcards,
    aiProvider: msg.aiProvider as 'claude' | null,
  }))
}

/**
 * Get recent messages for context (limit to N most recent)
 */
export async function getRecentMessages(
  conversationId: string,
  limit: number = 10
): Promise<Message[]> {
  const db = getDb()

  const results = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(messages.createdAt)
    .limit(limit)

  return results.map((msg) => ({
    id: msg.id,
    conversationId: msg.conversationId,
    userId: msg.userId,
    role: msg.role as MessageRole,
    content: msg.content,
    embedding: null,
    createdAt: msg.createdAt.getTime(),
    hasFlashcards: msg.hasFlashcards,
    aiProvider: msg.aiProvider as 'claude' | null,
  }))
}

/**
 * Mark message as having flashcards
 */
export async function markMessageWithFlashcards(id: string): Promise<Message> {
  const db = getDb()

  const [updatedMessage] = await db
    .update(messages)
    .set({ hasFlashcards: true })
    .where(eq(messages.id, id))
    .returning()

  if (!updatedMessage) {
    throw new Error(`Message not found: ${id}`)
  }

  // No LanceDB update needed - hasFlashcards is only stored in PostgreSQL

  return {
    id: updatedMessage.id,
    conversationId: updatedMessage.conversationId,
    userId: updatedMessage.userId,
    role: updatedMessage.role as MessageRole,
    content: updatedMessage.content,
    embedding: null, // Embeddings stored in LanceDB
    createdAt: updatedMessage.createdAt.getTime(),
    hasFlashcards: updatedMessage.hasFlashcards,
    aiProvider: updatedMessage.aiProvider as 'claude' | null,
  }
}
