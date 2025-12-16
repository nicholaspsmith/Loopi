import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { closeDbConnection } from '@/lib/db/client'
import { createUser } from '@/lib/db/operations/users'
import {
  createConversation,
  getConversationsByUserId,
} from '@/lib/db/operations/conversations'
import {
  createMessage,
  getMessagesByConversationId,
} from '@/lib/db/operations/messages'
import { hashPassword } from '@/lib/auth/helpers'

/**
 * Integration Test for Chat Conversation Flow
 *
 * Tests the complete flow of creating a conversation, adding messages,
 * and retrieving the conversation history.
 */

describe('Chat Conversation Flow Integration', () => {
  let testUserId: string
  let testConversationId: string

  beforeAll(async () => {
    // Create test user
    const passwordHash = await hashPassword('TestPass123!')
    const user = await createUser({
      email: `test-chat-flow-${Date.now()}@example.com`,
      passwordHash,
      name: 'Chat Flow Test User',
    })

    testUserId = user.id
  })

  afterAll(async () => {
    await closeDbConnection()
  })

  it('should complete full chat conversation flow', async () => {
    // Step 1: Create a new conversation
    const conversation = await createConversation({
      userId: testUserId,
      title: 'Test Chat Session',
    })

    expect(conversation).toBeDefined()
    expect(conversation.userId).toBe(testUserId)
    expect(conversation.title).toBe('Test Chat Session')
    expect(conversation.messageCount).toBe(0)

    testConversationId = conversation.id

    // Step 2: Verify conversation appears in user's conversation list
    const conversations = await getConversationsByUserId(testUserId)
    expect(conversations).toHaveLength(1)
    expect(conversations[0].id).toBe(testConversationId)

    // Step 3: Add first user message
    const userMessage1 = await createMessage({
      conversationId: testConversationId,
      userId: testUserId,
      role: 'user',
      content: 'Hello! Can you explain JavaScript closures?',
    })

    expect(userMessage1).toBeDefined()
    expect(userMessage1.role).toBe('user')
    expect(userMessage1.content).toBe(
      'Hello! Can you explain JavaScript closures?'
    )

    // Step 4: Verify message is retrievable
    let messages = await getMessagesByConversationId(testConversationId)
    expect(messages).toHaveLength(1)
    expect(messages[0].id).toBe(userMessage1.id)

    // Step 5: Add assistant response
    const assistantMessage1 = await createMessage({
      conversationId: testConversationId,
      userId: testUserId,
      role: 'assistant',
      content:
        'A closure is a function that has access to variables in its outer scope...',
    })

    expect(assistantMessage1).toBeDefined()
    expect(assistantMessage1.role).toBe('assistant')

    // Step 6: Verify both messages are retrievable in order
    messages = await getMessagesByConversationId(testConversationId)
    expect(messages).toHaveLength(2)
    expect(messages[0].id).toBe(userMessage1.id)
    expect(messages[1].id).toBe(assistantMessage1.id)
    expect(messages[0].role).toBe('user')
    expect(messages[1].role).toBe('assistant')

    // Step 7: Add follow-up user message
    const userMessage2 = await createMessage({
      conversationId: testConversationId,
      userId: testUserId,
      role: 'user',
      content: 'Can you give me an example?',
    })

    expect(userMessage2).toBeDefined()

    // Step 8: Add second assistant response
    const assistantMessage2 = await createMessage({
      conversationId: testConversationId,
      userId: testUserId,
      role: 'assistant',
      content: 'Sure! Here is an example: function outer() { ... }',
    })

    expect(assistantMessage2).toBeDefined()

    // Step 9: Verify complete conversation history
    messages = await getMessagesByConversationId(testConversationId)
    expect(messages).toHaveLength(4)

    // Verify order is preserved
    expect(messages[0].content).toBe(
      'Hello! Can you explain JavaScript closures?'
    )
    expect(messages[1].content).toBe(
      'A closure is a function that has access to variables in its outer scope...'
    )
    expect(messages[2].content).toBe('Can you give me an example?')
    expect(messages[3].content).toBe(
      'Sure! Here is an example: function outer() { ... }'
    )

    // Verify roles alternate correctly
    expect(messages[0].role).toBe('user')
    expect(messages[1].role).toBe('assistant')
    expect(messages[2].role).toBe('user')
    expect(messages[3].role).toBe('assistant')

    // Step 10: Verify all messages belong to the same conversation
    messages.forEach((message) => {
      expect(message.conversationId).toBe(testConversationId)
      expect(message.userId).toBe(testUserId)
    })
  })

  it('should handle multiple conversations per user', async () => {
    // Create first conversation
    const conversation1 = await createConversation({
      userId: testUserId,
      title: 'Conversation 1',
    })

    await createMessage({
      conversationId: conversation1.id,
      userId: testUserId,
      role: 'user',
      content: 'Message in conversation 1',
    })

    // Create second conversation
    const conversation2 = await createConversation({
      userId: testUserId,
      title: 'Conversation 2',
    })

    await createMessage({
      conversationId: conversation2.id,
      userId: testUserId,
      role: 'user',
      content: 'Message in conversation 2',
    })

    // Verify user has multiple conversations
    const conversations = await getConversationsByUserId(testUserId)
    expect(conversations.length).toBeGreaterThanOrEqual(2)

    // Verify messages are isolated per conversation
    const messages1 = await getMessagesByConversationId(conversation1.id)
    const messages2 = await getMessagesByConversationId(conversation2.id)

    expect(messages1).toHaveLength(1)
    expect(messages2).toHaveLength(1)
    expect(messages1[0].content).toBe('Message in conversation 1')
    expect(messages2[0].content).toBe('Message in conversation 2')
  })

  it('should preserve message timestamps in chronological order', async () => {
    const conversation = await createConversation({
      userId: testUserId,
      title: 'Timestamp Test',
    })

    // Add messages with small delays to ensure different timestamps
    const message1 = await createMessage({
      conversationId: conversation.id,
      userId: testUserId,
      role: 'user',
      content: 'First',
    })

    await new Promise((resolve) => setTimeout(resolve, 10))

    const message2 = await createMessage({
      conversationId: conversation.id,
      userId: testUserId,
      role: 'assistant',
      content: 'Second',
    })

    await new Promise((resolve) => setTimeout(resolve, 10))

    const message3 = await createMessage({
      conversationId: conversation.id,
      userId: testUserId,
      role: 'user',
      content: 'Third',
    })

    const messages = await getMessagesByConversationId(conversation.id)

    // Verify timestamps are in chronological order
    expect(messages[0].createdAt).toBeLessThan(messages[1].createdAt)
    expect(messages[1].createdAt).toBeLessThan(messages[2].createdAt)

    // Verify content order matches timestamp order
    expect(messages[0].id).toBe(message1.id)
    expect(messages[1].id).toBe(message2.id)
    expect(messages[2].id).toBe(message3.id)
  })

  it('should handle empty conversation', async () => {
    const conversation = await createConversation({
      userId: testUserId,
      title: 'Empty Conversation',
    })

    const messages = await getMessagesByConversationId(conversation.id)

    expect(messages).toHaveLength(0)
    expect(Array.isArray(messages)).toBe(true)
  })

  it('should handle long message content', async () => {
    const conversation = await createConversation({
      userId: testUserId,
      title: 'Long Message Test',
    })

    // Create a very long message (5000 characters)
    const longContent = 'a'.repeat(5000)

    const message = await createMessage({
      conversationId: conversation.id,
      userId: testUserId,
      role: 'user',
      content: longContent,
    })

    expect(message.content).toBe(longContent)
    expect(message.content.length).toBe(5000)

    // Verify it's retrievable
    const messages = await getMessagesByConversationId(conversation.id)
    expect(messages[0].content).toBe(longContent)
  })
})
