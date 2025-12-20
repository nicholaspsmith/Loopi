import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import {
  createMessage,
  getMessageById,
  getMessagesByConversationId,
} from '@/lib/db/operations/messages'
import { createConversation } from '@/lib/db/operations/conversations'
import { createUser } from '@/lib/db/operations/users'

/**
 * Message Database Operations Tests
 *
 * Tests the message CRUD operations with LanceDB.
 * These tests focus on the bug where messages aren't retrieved after creation.
 *
 * Note: Database setup/teardown is handled by tests/db-setup.ts
 */

describe('Message Database Operations', () => {
  let testUserId: string
  let testConversationId: string

  beforeAll(async () => {
    // Create a test user for all tests
    const testUser = await createUser({
      email: `message-test-${Date.now()}@example.com`,
      passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.',
      name: 'Message Test User',
    })
    testUserId = testUser.id
  })

  beforeEach(async () => {
    // Create a fresh conversation for each test
    const conversation = await createConversation({
      userId: testUserId,
      title: 'Test Conversation',
    })
    testConversationId = conversation.id
  })

  describe('createMessage', () => {
    it('should create a user message', async () => {
      const message = await createMessage({
        conversationId: testConversationId,
        userId: testUserId,
        role: 'user',
        content: 'Hello, can you help me?',
      })

      expect(message).toBeDefined()
      expect(message.id).toBeDefined()
      expect(message.conversationId).toBe(testConversationId)
      expect(message.userId).toBe(testUserId)
      expect(message.role).toBe('user')
      expect(message.content).toBe('Hello, can you help me?')
      expect(message.embedding).toBeNull()
      expect(message.createdAt).toBeDefined()
      expect(message.hasFlashcards).toBe(false)
    })

    it('should create an assistant message', async () => {
      const message = await createMessage({
        conversationId: testConversationId,
        userId: testUserId,
        role: 'assistant',
        content: "Of course! I'd be happy to help.",
      })

      expect(message.role).toBe('assistant')
      expect(message.content).toBe("Of course! I'd be happy to help.")
    })

    it('should generate unique IDs for each message', async () => {
      const message1 = await createMessage({
        conversationId: testConversationId,
        userId: testUserId,
        role: 'user',
        content: 'First message',
      })

      const message2 = await createMessage({
        conversationId: testConversationId,
        userId: testUserId,
        role: 'user',
        content: 'Second message',
      })

      expect(message1.id).not.toBe(message2.id)
    })

    it('should set createdAt timestamp', async () => {
      const beforeCreate = Date.now()

      const message = await createMessage({
        conversationId: testConversationId,
        userId: testUserId,
        role: 'user',
        content: 'Test timestamp',
      })

      const afterCreate = Date.now()

      expect(message.createdAt).toBeGreaterThanOrEqual(beforeCreate)
      expect(message.createdAt).toBeLessThanOrEqual(afterCreate)
    })
  })

  describe('getMessageById', () => {
    it('should retrieve a message by ID', async () => {
      const created = await createMessage({
        conversationId: testConversationId,
        userId: testUserId,
        role: 'user',
        content: 'Find me by ID',
      })

      const retrieved = await getMessageById(created.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(created.id)
      expect(retrieved?.content).toBe('Find me by ID')
    })

    it('should return null for non-existent ID', async () => {
      const message = await getMessageById('00000000-0000-0000-0000-000000000099')
      expect(message).toBeNull()
    })
  })

  describe('getMessagesByConversationId', () => {
    it('should retrieve all messages for a conversation', async () => {
      // Create multiple messages
      const message1 = await createMessage({
        conversationId: testConversationId,
        userId: testUserId,
        role: 'user',
        content: 'First message',
      })

      const message2 = await createMessage({
        conversationId: testConversationId,
        userId: testUserId,
        role: 'assistant',
        content: 'Response to first',
      })

      const message3 = await createMessage({
        conversationId: testConversationId,
        userId: testUserId,
        role: 'user',
        content: 'Second message',
      })

      const messages = await getMessagesByConversationId(testConversationId)

      expect(messages).toHaveLength(3)
      expect(messages[0].id).toBe(message1.id)
      expect(messages[1].id).toBe(message2.id)
      expect(messages[2].id).toBe(message3.id)
    })

    it('should return messages in chronological order (oldest first)', async () => {
      // Create messages with slight delay to ensure different timestamps
      await createMessage({
        conversationId: testConversationId,
        userId: testUserId,
        role: 'user',
        content: 'Oldest',
      })

      await new Promise((resolve) => setTimeout(resolve, 10))

      await createMessage({
        conversationId: testConversationId,
        userId: testUserId,
        role: 'assistant',
        content: 'Middle',
      })

      await new Promise((resolve) => setTimeout(resolve, 10))

      await createMessage({
        conversationId: testConversationId,
        userId: testUserId,
        role: 'user',
        content: 'Newest',
      })

      const messages = await getMessagesByConversationId(testConversationId)

      expect(messages[0].content).toBe('Oldest')
      expect(messages[1].content).toBe('Middle')
      expect(messages[2].content).toBe('Newest')
    })

    it('should return empty array for conversation with no messages', async () => {
      const messages = await getMessagesByConversationId(testConversationId)
      expect(messages).toEqual([])
    })

    it('should return empty array for non-existent conversation', async () => {
      const messages = await getMessagesByConversationId('00000000-0000-0000-0000-000000000099')
      expect(messages).toEqual([])
    })

    it('should NOT retrieve messages from other conversations', async () => {
      // Create another conversation
      const otherConversation = await createConversation({
        userId: testUserId,
        title: 'Other Conversation',
      })

      // Create message in first conversation
      await createMessage({
        conversationId: testConversationId,
        userId: testUserId,
        role: 'user',
        content: 'Message in first conversation',
      })

      // Create message in second conversation
      await createMessage({
        conversationId: otherConversation.id,
        userId: testUserId,
        role: 'user',
        content: 'Message in second conversation',
      })

      const messages = await getMessagesByConversationId(testConversationId)

      expect(messages).toHaveLength(1)
      expect(messages[0].content).toBe('Message in first conversation')
    })
  })

  describe('Message retrieval after creation (the bug)', () => {
    it('should immediately retrieve message after creation', async () => {
      console.log('[TEST] Creating message...')
      const created = await createMessage({
        conversationId: testConversationId,
        userId: testUserId,
        role: 'user',
        content: 'Immediate retrieval test',
      })
      console.log('[TEST] Message created:', created.id)

      console.log('[TEST] Retrieving messages by conversationId...')
      const messages = await getMessagesByConversationId(testConversationId)
      console.log('[TEST] Retrieved messages:', messages.length)

      expect(messages).toHaveLength(1)
      expect(messages[0].id).toBe(created.id)
    })

    it('should retrieve both user and assistant messages immediately', async () => {
      console.log('[TEST] Creating user message...')
      const userMessage = await createMessage({
        conversationId: testConversationId,
        userId: testUserId,
        role: 'user',
        content: 'User question',
      })
      console.log('[TEST] User message created:', userMessage.id)

      console.log('[TEST] Creating assistant message...')
      const assistantMessage = await createMessage({
        conversationId: testConversationId,
        userId: testUserId,
        role: 'assistant',
        content: 'Assistant response',
      })
      console.log('[TEST] Assistant message created:', assistantMessage.id)

      console.log('[TEST] Retrieving all messages...')
      const messages = await getMessagesByConversationId(testConversationId)
      console.log('[TEST] Retrieved messages:', messages)

      expect(messages).toHaveLength(2)
      expect(messages[0].role).toBe('user')
      expect(messages[1].role).toBe('assistant')
    })

    it('should retrieve messages multiple times consistently', async () => {
      // Create a message
      await createMessage({
        conversationId: testConversationId,
        userId: testUserId,
        role: 'user',
        content: 'Consistency test',
      })

      // Retrieve multiple times
      const retrieval1 = await getMessagesByConversationId(testConversationId)
      const retrieval2 = await getMessagesByConversationId(testConversationId)
      const retrieval3 = await getMessagesByConversationId(testConversationId)

      expect(retrieval1).toHaveLength(1)
      expect(retrieval2).toHaveLength(1)
      expect(retrieval3).toHaveLength(1)
      expect(retrieval1[0].id).toBe(retrieval2[0].id)
      expect(retrieval2[0].id).toBe(retrieval3[0].id)
    })

    it('should handle rapid create and retrieve operations', async () => {
      // Simulate the actual chat flow
      console.log('[TEST] Simulating chat flow...')

      // Get existing messages (should be empty)
      const before = await getMessagesByConversationId(testConversationId)
      console.log('[TEST] Messages before:', before.length)
      expect(before).toHaveLength(0)

      // Create user message
      console.log('[TEST] Creating user message...')
      const userMsg = await createMessage({
        conversationId: testConversationId,
        userId: testUserId,
        role: 'user',
        content: 'Rapid test question',
      })
      console.log('[TEST] User message created:', userMsg.id)

      // Create assistant message (like the onComplete callback)
      console.log('[TEST] Creating assistant message...')
      const assistantMsg = await createMessage({
        conversationId: testConversationId,
        userId: testUserId,
        role: 'assistant',
        content: 'Rapid test answer',
      })
      console.log('[TEST] Assistant message created:', assistantMsg.id)

      // Retrieve messages (like fetchMessages in the UI)
      console.log('[TEST] Fetching messages after both created...')
      const after = await getMessagesByConversationId(testConversationId)
      console.log('[TEST] Messages after:', after.length)
      console.log(
        '[TEST] Message IDs:',
        after.map((m) => m.id)
      )

      // THIS IS THE CRITICAL TEST - it should find both messages
      expect(after).toHaveLength(2)
      expect(after[0].role).toBe('user')
      expect(after[1].role).toBe('assistant')
    })
  })
})
