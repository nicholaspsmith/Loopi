import { v4 as uuidv4 } from 'uuid'
import { create, find, findById, update } from '../queries'
import type { Conversation } from '@/types'
import { ConversationSchema } from '@/types'

/**
 * Conversation Database Operations
 *
 * Provides CRUD operations for conversations in LanceDB.
 */

const CONVERSATIONS_TABLE = 'conversations'

/**
 * Create a new conversation
 */
export async function createConversation(data: {
  userId: string
  title?: string | null
}): Promise<Conversation> {
  const now = Date.now()

  const conversation: Conversation = {
    id: uuidv4(),
    userId: data.userId,
    title: data.title || `New Conversation - ${new Date().toLocaleDateString()}`,
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
  }

  // Validate before inserting
  ConversationSchema.parse(conversation)

  await create(CONVERSATIONS_TABLE, [conversation])

  return conversation
}

/**
 * Get conversation by ID
 */
export async function getConversationById(id: string): Promise<Conversation | null> {
  return await findById<Conversation>(CONVERSATIONS_TABLE, id)
}

/**
 * Get all conversations for a user
 */
export async function getConversationsByUserId(userId: string): Promise<Conversation[]> {
  const conversations = await find<Conversation>(
    CONVERSATIONS_TABLE,
    `userId = '${userId}'`,
    1000
  )

  // Sort by most recent first
  return conversations.sort((a, b) => b.updatedAt - a.updatedAt)
}

/**
 * Update conversation
 */
export async function updateConversation(
  id: string,
  updates: Partial<Conversation>
): Promise<Conversation> {
  const now = Date.now()

  await update<Conversation>(CONVERSATIONS_TABLE, id, {
    ...updates,
    updatedAt: now,
  })

  const updatedConversation = await getConversationById(id)

  if (!updatedConversation) {
    throw new Error(`Conversation not found after update: ${id}`)
  }

  return updatedConversation
}

/**
 * Increment message count for a conversation
 */
export async function incrementMessageCount(conversationId: string): Promise<void> {
  const conversation = await getConversationById(conversationId)

  if (!conversation) {
    throw new Error(`Conversation not found: ${conversationId}`)
  }

  await updateConversation(conversationId, {
    messageCount: conversation.messageCount + 1,
  })
}

/**
 * Delete conversation (soft delete by updating status if we add that field later,
 * or actual delete for now)
 */
export async function deleteConversation(id: string): Promise<void> {
  // For now, we'll implement actual deletion
  // In production, you might want to soft-delete by adding a 'deleted' field
  const { getDbConnection } = await import('../client')
  const db = await getDbConnection()
  const table = await db.openTable(CONVERSATIONS_TABLE)
  await table.delete(`id = '${id}'`)
}

/**
 * Check if conversation belongs to user
 */
export async function conversationBelongsToUser(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const conversation = await getConversationById(conversationId)
  return conversation !== null && conversation.userId === userId
}
