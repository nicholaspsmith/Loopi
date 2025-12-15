import { v4 as uuidv4 } from 'uuid'
import { create, find, findById, update } from '../queries'
import type { Message, MessageRole } from '@/types'
import { MessageSchema } from '@/types'
import { incrementMessageCount } from './conversations'

/**
 * Message Database Operations
 *
 * Provides CRUD operations for messages in LanceDB.
 */

const MESSAGES_TABLE = 'messages'

/**
 * Create a new message
 */
export async function createMessage(data: {
  conversationId: string
  userId: string
  role: MessageRole
  content: string
  embedding?: number[] | null
}): Promise<Message> {
  const now = Date.now()

  const message: Message = {
    id: uuidv4(),
    conversationId: data.conversationId,
    userId: data.userId,
    role: data.role,
    content: data.content,
    embedding: data.embedding || null,
    createdAt: now,
    hasFlashcards: false,
  }

  // Validate before inserting
  MessageSchema.parse(message)

  await create(MESSAGES_TABLE, [message])

  // Increment conversation message count
  await incrementMessageCount(data.conversationId)

  return message
}

/**
 * Get message by ID
 */
export async function getMessageById(id: string): Promise<Message | null> {
  return await findById<Message>(MESSAGES_TABLE, id)
}

/**
 * Get all messages for a conversation
 */
export async function getMessagesByConversationId(
  conversationId: string
): Promise<Message[]> {
  const messages = await find<Message>(
    MESSAGES_TABLE,
    `conversationId = '${conversationId}'`,
    10000
  )

  // Sort by creation time (oldest first for chat history)
  return messages.sort((a, b) => a.createdAt - b.createdAt)
}

/**
 * Get recent messages for context (limit to N most recent)
 */
export async function getRecentMessages(
  conversationId: string,
  limit: number = 10
): Promise<Message[]> {
  const allMessages = await getMessagesByConversationId(conversationId)

  // Return the N most recent messages
  return allMessages.slice(-limit)
}

/**
 * Update message
 */
export async function updateMessage(
  id: string,
  updates: Partial<Message>
): Promise<Message> {
  await update<Message>(MESSAGES_TABLE, id, updates)

  const updatedMessage = await getMessageById(id)

  if (!updatedMessage) {
    throw new Error(`Message not found after update: ${id}`)
  }

  return updatedMessage
}

/**
 * Mark message as having flashcards
 */
export async function markMessageWithFlashcards(messageId: string): Promise<void> {
  await updateMessage(messageId, {
    hasFlashcards: true,
  })
}

/**
 * Search messages by content (vector search when embedding is available)
 */
export async function searchMessages(
  userId: string,
  query: string,
  limit: number = 10
): Promise<Message[]> {
  // For now, simple text search
  // TODO: Implement vector search using embeddings
  const messages = await find<Message>(MESSAGES_TABLE, `userId = '${userId}'`, 10000)

  // Filter by content matching
  const filtered = messages.filter((msg) =>
    msg.content.toLowerCase().includes(query.toLowerCase())
  )

  return filtered.slice(0, limit)
}

/**
 * Get messages with flashcards for a user
 */
export async function getMessagesWithFlashcards(userId: string): Promise<Message[]> {
  const messages = await find<Message>(
    MESSAGES_TABLE,
    `userId = '${userId}' AND hasFlashcards = true`,
    10000
  )

  return messages.sort((a, b) => b.createdAt - a.createdAt)
}

/**
 * Delete message
 */
export async function deleteMessage(id: string): Promise<void> {
  const { getDbConnection } = await import('../client')
  const db = await getDbConnection()
  const table = await db.openTable(MESSAGES_TABLE)
  await table.delete(`id = '${id}'`)
}
