import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { closeDbConnection } from '@/lib/db/client'
import { createUser, getUserById } from '@/lib/db/operations/users'
import {
  createConversation,
  getConversationsByUserId,
  getConversationById,
} from '@/lib/db/operations/conversations'
import {
  createMessage,
  getMessagesByConversationId,
} from '@/lib/db/operations/messages'
import { hashPassword } from '@/lib/auth/helpers'

/**
 * Integration Tests for Conversation History Persistence (FR-023)
 *
 * Tests that conversation history persists across sessions indefinitely,
 * allowing users to continue previous conversations after logout and re-login.
 */

describe('Conversation History Persistence (FR-023)', () => {
  let testUserId: string
  let testConversationId: string
  let firstMessageId: string
  let secondMessageId: string

  beforeAll(async () => {
    // Create test user (simulating signup)
    const passwordHash = await hashPassword('TestPass123!')
    const user = await createUser({
      email: `test-persistence-${Date.now()}@example.com`,
      passwordHash,
      name: 'Persistence Test User',
    })

    testUserId = user.id
  })

  afterAll(async () => {
    await closeDbConnection()
  })

  it('should persist conversation across sessions', async () => {
    // Session 1: User creates conversation
    const conversation = await createConversation({
      userId: testUserId,
      title: 'Persistent Conversation',
    })

    testConversationId = conversation.id

    expect(conversation).toBeDefined()
    expect(conversation.userId).toBe(testUserId)
    expect(conversation.title).toBe('Persistent Conversation')

    // Simulate session end - in real app, user would log out
    // Database connection remains but represents different session

    // Session 2: User logs back in and retrieves conversations
    const userConversations = await getConversationsByUserId(testUserId)

    expect(userConversations).toHaveLength(1)
    expect(userConversations[0].id).toBe(testConversationId)
    expect(userConversations[0].title).toBe('Persistent Conversation')
  })

  it('should persist messages in conversation across sessions', async () => {
    // Session 1: User sends first message
    const message1 = await createMessage({
      conversationId: testConversationId,
      userId: testUserId,
      role: 'user',
      content: 'Hello, can you explain quantum physics?',
    })

    firstMessageId = message1.id

    // Session 1: Assistant responds
    const message2 = await createMessage({
      conversationId: testConversationId,
      userId: testUserId,
      role: 'assistant',
      content: 'Quantum physics is the study of matter and energy at the atomic level...',
    })

    secondMessageId = message2.id

    // Simulate session end (user logs out)

    // Session 2: User logs back in and retrieves conversation
    const messages = await getMessagesByConversationId(testConversationId)

    expect(messages).toHaveLength(2)
    expect(messages[0].id).toBe(firstMessageId)
    expect(messages[1].id).toBe(secondMessageId)
    expect(messages[0].content).toBe('Hello, can you explain quantum physics?')
    expect(messages[1].content).toContain('Quantum physics')
  })

  it('should maintain chronological message order across sessions', async () => {
    // Session 2 (continuing): User sends follow-up message
    const message3 = await createMessage({
      conversationId: testConversationId,
      userId: testUserId,
      role: 'user',
      content: 'Can you elaborate on quantum entanglement?',
    })

    // Simulate another session end

    // Session 3: User logs back in
    const messages = await getMessagesByConversationId(testConversationId)

    expect(messages).toHaveLength(3)
    // Messages should be in chronological order (oldest first)
    expect(messages[0].content).toBe('Hello, can you explain quantum physics?')
    expect(messages[1].content).toContain('Quantum physics')
    expect(messages[2].content).toBe('Can you elaborate on quantum entanglement?')

    // Verify timestamps are in ascending order
    expect(messages[0].createdAt).toBeLessThan(messages[1].createdAt)
    expect(messages[1].createdAt).toBeLessThan(messages[2].createdAt)
  })

  it('should persist multiple conversations per user indefinitely', async () => {
    // Session 3 (continuing): User creates second conversation
    const conversation2 = await createConversation({
      userId: testUserId,
      title: 'Another Topic',
    })

    await createMessage({
      conversationId: conversation2.id,
      userId: testUserId,
      role: 'user',
      content: 'Tell me about black holes',
    })

    // Session 3: User creates third conversation
    const conversation3 = await createConversation({
      userId: testUserId,
      title: 'Yet Another Topic',
    })

    await createMessage({
      conversationId: conversation3.id,
      userId: testUserId,
      role: 'user',
      content: 'Explain machine learning',
    })

    // Simulate session end

    // Session 4: User logs back in and retrieves all conversations
    const allConversations = await getConversationsByUserId(testUserId)

    expect(allConversations.length).toBeGreaterThanOrEqual(3)

    // Find our test conversations
    const persistentConv = allConversations.find((c) => c.id === testConversationId)
    const secondConv = allConversations.find((c) => c.id === conversation2.id)
    const thirdConv = allConversations.find((c) => c.id === conversation3.id)

    expect(persistentConv).toBeDefined()
    expect(secondConv).toBeDefined()
    expect(thirdConv).toBeDefined()

    // Verify each conversation has its messages
    const messages1 = await getMessagesByConversationId(testConversationId)
    const messages2 = await getMessagesByConversationId(conversation2.id)
    const messages3 = await getMessagesByConversationId(conversation3.id)

    expect(messages1.length).toBeGreaterThanOrEqual(3)
    expect(messages2).toHaveLength(1)
    expect(messages3).toHaveLength(1)
  })

  it('should persist conversation metadata across sessions', async () => {
    // Retrieve conversation after multiple sessions
    const conversation = await getConversationById(testConversationId)

    expect(conversation).toBeDefined()
    expect(conversation?.id).toBe(testConversationId)
    expect(conversation?.userId).toBe(testUserId)
    expect(conversation?.title).toBe('Persistent Conversation')
    expect(conversation?.messageCount).toBeGreaterThan(0)
    expect(conversation?.createdAt).toBeDefined()
    expect(conversation?.updatedAt).toBeDefined()
  })

  it('should allow user to resume conversation after long period', async () => {
    // Simulate time passing (in production, this could be days/months)
    // For test, we just verify data is still accessible

    // User logs in after "long time"
    const user = await getUserById(testUserId)
    expect(user).toBeDefined()

    // User can still access their conversations
    const conversations = await getConversationsByUserId(testUserId)
    expect(conversations.length).toBeGreaterThan(0)

    // User can still access conversation messages
    const messages = await getMessagesByConversationId(testConversationId)
    expect(messages.length).toBeGreaterThan(0)

    // User can add new messages to old conversation
    const newMessage = await createMessage({
      conversationId: testConversationId,
      userId: testUserId,
      role: 'user',
      content: 'Resuming our previous conversation about quantum physics',
    })

    expect(newMessage).toBeDefined()

    // Verify message was added to existing conversation
    const updatedMessages = await getMessagesByConversationId(testConversationId)
    expect(updatedMessages.length).toBe(messages.length + 1)
    expect(updatedMessages[updatedMessages.length - 1].content).toBe(
      'Resuming our previous conversation about quantum physics'
    )
  })

  it('should persist conversation independently of database connection lifecycle', async () => {
    // Close and re-open database connection (simulating server restart)
    await closeDbConnection()
    // Connection will auto-reconnect on next query

    // After "server restart", user data should still be accessible
    const user = await getUserById(testUserId)
    expect(user).toBeDefined()
    expect(user?.id).toBe(testUserId)

    // Conversations should still be accessible
    const conversations = await getConversationsByUserId(testUserId)
    expect(conversations.length).toBeGreaterThan(0)

    const persistentConv = conversations.find((c) => c.id === testConversationId)
    expect(persistentConv).toBeDefined()

    // Messages should still be accessible
    const messages = await getMessagesByConversationId(testConversationId)
    expect(messages.length).toBeGreaterThan(0)
  })

  it('should maintain message immutability across sessions', async () => {
    // Get original messages
    const originalMessages = await getMessagesByConversationId(testConversationId)
    const originalFirstMessage = originalMessages[0]

    // Simulate session end and re-login

    // Get messages again
    const retrievedMessages = await getMessagesByConversationId(testConversationId)
    const retrievedFirstMessage = retrievedMessages.find(
      (m) => m.id === originalFirstMessage.id
    )

    // Message content should be unchanged (immutable)
    expect(retrievedFirstMessage).toBeDefined()
    expect(retrievedFirstMessage?.content).toBe(originalFirstMessage.content)
    expect(retrievedFirstMessage?.role).toBe(originalFirstMessage.role)
    expect(retrievedFirstMessage?.createdAt).toBe(originalFirstMessage.createdAt)
  })
})
