import { getDb } from '@/lib/db/pg-client'
import { conversations } from '@/lib/db/drizzle-schema'
import { eq, desc } from 'drizzle-orm'
import type { Conversation } from '@/types'

/**
 * Conversation Database Operations
 *
 * Provides CRUD operations for conversations in PostgreSQL.
 */

/**
 * Create a new conversation
 */
export async function createConversation(data: {
  userId: string
  title?: string | null
}): Promise<Conversation> {
  const db = getDb()

  const [conversation] = await db
    .insert(conversations)
    .values({
      userId: data.userId,
      title: data.title || `New Conversation - ${new Date().toLocaleDateString()}`,
      messageCount: 0,
    })
    .returning()

  return {
    id: conversation.id,
    userId: conversation.userId,
    title: conversation.title,
    messageCount: conversation.messageCount,
    createdAt: conversation.createdAt.getTime(),
    updatedAt: conversation.updatedAt.getTime(),
  }
}

/**
 * Get conversation by ID
 */
export async function getConversationById(id: string): Promise<Conversation | null> {
  const db = getDb()

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, id))
    .limit(1)

  if (!conversation) {
    return null
  }

  return {
    id: conversation.id,
    userId: conversation.userId,
    title: conversation.title,
    messageCount: conversation.messageCount,
    createdAt: conversation.createdAt.getTime(),
    updatedAt: conversation.updatedAt.getTime(),
  }
}

/**
 * Get all conversations for a user
 */
export async function getConversationsByUserId(userId: string): Promise<Conversation[]> {
  const db = getDb()

  const results = await db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt))
    .limit(1000)

  return results.map((conv) => ({
    id: conv.id,
    userId: conv.userId,
    title: conv.title,
    messageCount: conv.messageCount,
    createdAt: conv.createdAt.getTime(),
    updatedAt: conv.updatedAt.getTime(),
  }))
}

/**
 * Update conversation
 */
export async function updateConversation(
  id: string,
  updates: Partial<Pick<Conversation, 'title' | 'messageCount'>>
): Promise<Conversation> {
  const db = getDb()

  const [updatedConversation] = await db
    .update(conversations)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, id))
    .returning()

  if (!updatedConversation) {
    throw new Error(`Conversation not found: ${id}`)
  }

  return {
    id: updatedConversation.id,
    userId: updatedConversation.userId,
    title: updatedConversation.title,
    messageCount: updatedConversation.messageCount,
    createdAt: updatedConversation.createdAt.getTime(),
    updatedAt: updatedConversation.updatedAt.getTime(),
  }
}

/**
 * Increment message count for a conversation
 */
export async function incrementMessageCount(conversationId: string): Promise<void> {
  const db = getDb()
  const { sql } = await import('drizzle-orm')

  await db
    .update(conversations)
    .set({
      messageCount: sql`${conversations.messageCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, conversationId))
}

/**
 * Delete conversation
 */
export async function deleteConversation(id: string): Promise<void> {
  const db = getDb()

  await db.delete(conversations).where(eq(conversations.id, id))
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
