import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { isServerAvailable } from '@/tests/helpers/server-check'

const serverRunning = await isServerAvailable()

import { hashPassword } from '@/lib/auth/helpers'
import { createUser } from '@/lib/db/operations/users'
import { createConversation } from '@/lib/db/operations/conversations'
import { createMessage } from '@/lib/db/operations/messages'
import { closeDbConnection } from '@/lib/db/client'

/**
 * Contract Tests for Flashcard API
 *
 * Tests API contracts for flashcard generation and management per
 * specs/001-claude-flashcard/contracts/flashcards.yaml
 *
 * Maps to FR-008, FR-009, FR-010, FR-017, FR-018, FR-019, FR-024
 */

describe.skipIf(!serverRunning)('Flashcard API Contract Tests', () => {
  let testUserId: string
  let testConversationId: string
  let assistantMessageId: string
  let userMessageId: string

  beforeAll(async () => {
    // Create test user
    const passwordHash = await hashPassword('TestPass123!')
    const user = await createUser({
      email: `test-flashcards-${Date.now()}@example.com`,
      passwordHash,
      name: 'Flashcard Test User',
    })
    testUserId = user.id

    // Create test conversation
    const conversation = await createConversation({
      userId: testUserId,
      title: 'Flashcard Test Conversation',
    })
    testConversationId = conversation.id

    // Create user message
    const userMessage = await createMessage({
      conversationId: testConversationId,
      userId: testUserId,
      role: 'user',
      content: 'Explain quantum entanglement',
    })
    userMessageId = userMessage.id

    // Create assistant message with educational content
    const assistantMessage = await createMessage({
      conversationId: testConversationId,
      userId: testUserId,
      role: 'assistant',
      content: `Quantum entanglement is a physical phenomenon that occurs when pairs or groups of particles are generated, interact, or share spatial proximity in ways such that the quantum state of each particle cannot be described independently of the state of the others, even when the particles are separated by large distances.

Key concepts:
1. Non-locality: Entangled particles remain connected regardless of distance
2. Superposition: Particles exist in multiple states simultaneously until measured
3. Correlation: Measuring one particle instantly affects its entangled partner
4. Bell's theorem: Proves that quantum mechanics cannot be explained by local hidden variables

Applications include quantum computing, quantum cryptography, and quantum teleportation.`,
    })
    assistantMessageId = assistantMessage.id
  })

  afterAll(async () => {
    await closeDbConnection()
  })

  describe('POST /api/flashcards/generate', () => {
    it('should generate flashcards from assistant message', async () => {
      const response = await fetch(`http://localhost:3000/api/flashcards/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: assistantMessageId,
        }),
      })

      expect(response.status).toBe(201)

      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('flashcards')
      expect(data).toHaveProperty('count')
      expect(data).toHaveProperty('sourceMessage')

      expect(Array.isArray(data.flashcards)).toBe(true)
      expect(data.flashcards.length).toBeGreaterThan(0)
      expect(data.count).toBe(data.flashcards.length)

      // Verify flashcard structure
      const flashcard = data.flashcards[0]
      expect(flashcard).toHaveProperty('id')
      expect(flashcard).toHaveProperty('userId', testUserId)
      expect(flashcard).toHaveProperty('conversationId', testConversationId)
      expect(flashcard).toHaveProperty('messageId', assistantMessageId)
      expect(flashcard).toHaveProperty('question')
      expect(flashcard).toHaveProperty('answer')
      expect(flashcard).toHaveProperty('questionEmbedding')
      expect(flashcard).toHaveProperty('createdAt')
      expect(flashcard).toHaveProperty('fsrsState')

      // Verify FSRS state structure
      expect(flashcard.fsrsState).toHaveProperty('due')
      expect(flashcard.fsrsState).toHaveProperty('stability')
      expect(flashcard.fsrsState).toHaveProperty('difficulty')
      expect(flashcard.fsrsState).toHaveProperty('state')
      expect(flashcard.fsrsState.state).toBe(0) // New card

      // Verify source message flag updated
      expect(data.sourceMessage).toHaveProperty('id', assistantMessageId)
      expect(data.sourceMessage).toHaveProperty('hasFlashcards', true)
    })

    it('should respect maxFlashcards parameter', async () => {
      // Create new message for this test
      const newMessage = await createMessage({
        conversationId: testConversationId,
        userId: testUserId,
        role: 'assistant',
        content: 'Test content for max flashcards limit test. '.repeat(100),
      })

      const response = await fetch(`http://localhost:3000/api/flashcards/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: newMessage.id,
          maxFlashcards: 3,
        }),
      })

      expect(response.status).toBe(201)

      const data = await response.json()
      expect(data.count).toBeLessThanOrEqual(3)
    })

    it('should return 409 if flashcards already generated (FR-017)', async () => {
      // Try to generate flashcards again from same message
      const response = await fetch(`http://localhost:3000/api/flashcards/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: assistantMessageId,
        }),
      })

      expect(response.status).toBe(409)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('code', 'FLASHCARDS_ALREADY_EXIST')
      expect(data).toHaveProperty('existingFlashcardIds')
      expect(Array.isArray(data.existingFlashcardIds)).toBe(true)
    })

    it('should return 400 for user message (not assistant)', async () => {
      const response = await fetch(`http://localhost:3000/api/flashcards/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: userMessageId,
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('code', 'INVALID_MESSAGE_ROLE')
    })

    it('should return 400 for insufficient educational content (FR-019)', async () => {
      // Create message with only conversational content
      const conversationalMessage = await createMessage({
        conversationId: testConversationId,
        userId: testUserId,
        role: 'assistant',
        content: 'Hello! How are you today?',
      })

      const response = await fetch(`http://localhost:3000/api/flashcards/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: conversationalMessage.id,
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('code', 'INSUFFICIENT_CONTENT')
    })

    it('should return 404 for non-existent message', async () => {
      const response = await fetch(`http://localhost:3000/api/flashcards/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: '00000000-0000-0000-0000-000000000000',
        }),
      })

      expect(response.status).toBe(404)
    })

    it('should return 400 for invalid message ID format', async () => {
      const response = await fetch(`http://localhost:3000/api/flashcards/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: 'not-a-valid-uuid',
        }),
      })

      expect(response.status).toBe(400)
    })
  })

  describe('GET /api/flashcards', () => {
    it('should list user flashcards in chronological order (FR-024)', async () => {
      const response = await fetch(`http://localhost:3000/api/flashcards`)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('flashcards')
      expect(Array.isArray(data.flashcards)).toBe(true)

      if (data.flashcards.length > 1) {
        // Verify chronological order (oldest first)
        for (let i = 1; i < data.flashcards.length; i++) {
          expect(data.flashcards[i].createdAt).toBeGreaterThanOrEqual(
            data.flashcards[i - 1].createdAt
          )
        }
      }
    })

    it('should return empty array if user has no flashcards', async () => {
      // Create new user with no flashcards
      const passwordHash = await hashPassword('TestPass123!')
      await createUser({
        email: `test-no-flashcards-${Date.now()}@example.com`,
        passwordHash,
        name: 'No Flashcards User',
      })

      const response = await fetch(`http://localhost:3000/api/flashcards`)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.flashcards).toEqual([])
    })
  })

  describe('GET /api/flashcards/:id', () => {
    it('should return single flashcard by ID', async () => {
      // First, get the flashcard ID
      const listResponse = await fetch(`http://localhost:3000/api/flashcards`)
      const listData = await listResponse.json()
      const flashcardId = listData.flashcards[0]?.id

      if (!flashcardId) {
        throw new Error('No flashcards found for test')
      }

      const response = await fetch(`http://localhost:3000/api/flashcards/${flashcardId}`)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('flashcard')
      expect(data.flashcard).toHaveProperty('id', flashcardId)
    })

    it('should return 404 for non-existent flashcard', async () => {
      const response = await fetch(
        `http://localhost:3000/api/flashcards/00000000-0000-0000-0000-000000000000`
      )

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/flashcards/:id', () => {
    it('should delete flashcard', async () => {
      // Create new flashcard to delete
      const newMessage = await createMessage({
        conversationId: testConversationId,
        userId: testUserId,
        role: 'assistant',
        content: 'Content for delete test. Educational material here.',
      })

      const generateResponse = await fetch(`http://localhost:3000/api/flashcards/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: newMessage.id }),
      })
      const generateData = await generateResponse.json()
      const flashcardId = generateData.flashcards[0].id

      // Delete the flashcard
      const deleteResponse = await fetch(`http://localhost:3000/api/flashcards/${flashcardId}`, {
        method: 'DELETE',
      })

      expect(deleteResponse.status).toBe(200)

      const deleteData = await deleteResponse.json()
      expect(deleteData).toHaveProperty('success', true)

      // Verify flashcard is deleted
      const getResponse = await fetch(`http://localhost:3000/api/flashcards/${flashcardId}`)
      expect(getResponse.status).toBe(404)
    })

    it('should return 404 when deleting non-existent flashcard', async () => {
      const response = await fetch(
        `http://localhost:3000/api/flashcards/00000000-0000-0000-0000-000000000000`,
        {
          method: 'DELETE',
        }
      )

      expect(response.status).toBe(404)
    })
  })
})
