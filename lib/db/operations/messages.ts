import { getDb } from '@/lib/db/pg-client'
import { messages } from '@/lib/db/drizzle-schema'
import { eq } from 'drizzle-orm'
import type { Message, MessageRole } from '@/types'
import { incrementMessageCount } from './conversations'
import { generateEmbedding } from '@/lib/embeddings/ollama'

/**
 * Message Database Operations
 *
 * Provides CRUD operations for messages in PostgreSQL.
 */

/**
 * Create a new message
 *
 * Messages are created immediately with embedding: null.
 * Embeddings are generated asynchronously and updated after creation.
 * This ensures fast message creation with graceful degradation if embedding fails.
 */
export async function createMessage(data: {
  conversationId: string
  userId: string
  role: MessageRole
  content: string
  embedding?: number[] | null
  aiProvider?: 'claude' | 'ollama' | null
  apiKeyId?: string | null
}): Promise<Message> {
  const db = getDb()

  // Convert embedding array to pgvector string format if provided
  const embeddingString = data.embedding ? `[${data.embedding.join(',')}]` : null

  const [message] = await db
    .insert(messages)
    .values({
      conversationId: data.conversationId,
      userId: data.userId,
      role: data.role,
      content: data.content,
      embedding: embeddingString as any,
      hasFlashcards: false,
      aiProvider: data.aiProvider || null,
      apiKeyId: data.apiKeyId || null,
    })
    .returning()

  // Increment conversation message count
  await incrementMessageCount(data.conversationId)

  // Generate embedding asynchronously (fire and forget)
  // This doesn't block message creation and gracefully degrades on failure
  // Skip in test environment to avoid race conditions
  if (!data.embedding && process.env.NODE_ENV !== 'test') {
    generateMessageEmbeddingAsync(message.id, data.content).catch((error) => {
      console.error(`[Messages] Failed to generate embedding for message ${message.id}:`, error)
    })
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
    aiProvider: message.aiProvider as 'claude' | 'ollama' | null,
    apiKeyId: message.apiKeyId,
  }
}

/**
 * Generate and update message embedding asynchronously
 *
 * This runs in the background and doesn't block message creation.
 * Failures are logged but don't affect the message.
 */
async function generateMessageEmbeddingAsync(
  messageId: string,
  content: string
): Promise<void> {
  try {
    const embedding = await generateEmbedding(content)

    if (embedding) {
      await updateMessage(messageId, { embedding })
    }
  } catch (error) {
    // Graceful degradation - message exists without embedding
    console.error(`[Messages] Error in async embedding generation:`, error)
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
    aiProvider: message.aiProvider as 'claude' | 'ollama' | null,
    apiKeyId: message.apiKeyId,
  }
}

/**
 * Get all messages for a conversation
 */
export async function getMessagesByConversationId(
  conversationId: string
): Promise<Message[]> {
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
    aiProvider: msg.aiProvider as 'claude' | 'ollama' | null,
    apiKeyId: msg.apiKeyId,
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
    aiProvider: msg.aiProvider as 'claude' | 'ollama' | null,
    apiKeyId: msg.apiKeyId,
  }))
}

/**
 * Update message
 */
export async function updateMessage(
  id: string,
  updates: Partial<Pick<Message, 'embedding' | 'hasFlashcards'>>
): Promise<Message> {
  const db = getDb()

  // Convert embedding array to pgvector string format if provided
  const updateData: any = { ...updates }
  if (updates.embedding) {
    updateData.embedding = `[${updates.embedding.join(',')}]`
  }

  const [updatedMessage] = await db
    .update(messages)
    .set(updateData)
    .where(eq(messages.id, id))
    .returning()

  if (!updatedMessage) {
    throw new Error(`Message not found: ${id}`)
  }

  return {
    id: updatedMessage.id,
    conversationId: updatedMessage.conversationId,
    userId: updatedMessage.userId,
    role: updatedMessage.role as MessageRole,
    content: updatedMessage.content,
    embedding: null, // Don't return embedding in API responses
    createdAt: updatedMessage.createdAt.getTime(),
    hasFlashcards: updatedMessage.hasFlashcards,
    aiProvider: updatedMessage.aiProvider as 'claude' | 'ollama' | null,
    apiKeyId: updatedMessage.apiKeyId,
  }
}
