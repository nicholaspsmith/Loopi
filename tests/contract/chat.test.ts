import { describe, it, expect, beforeAll } from 'vitest'
import { initializeSchema } from '@/lib/db/schema'
import { isServerAvailable } from '@/tests/helpers/server-check'

const serverRunning = await isServerAvailable()

/**
 * Contract Tests for Chat API
 *
 * These tests verify API contracts for chat conversation and message endpoints.
 * Following TDD - these should FAIL until implementation is complete.
 *
 * Note: These tests require a running dev server and are excluded from vitest.
 * Run manually with: npm run dev (in one terminal) then npm run test:contract
 */

const BASE_URL = 'http://localhost:3000'
let testUserId: string
let testConversationId: string
let authCookie: string

describe.skipIf(!serverRunning)('Chat API Contract Tests', () => {
  beforeAll(async () => {
    // Initialize test database
    await initializeSchema()

    // Create and authenticate a test user
    const signupResponse = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test-chat-${Date.now()}@example.com`,
        password: 'SecurePass123!',
        name: 'Chat Test User',
      }),
    })

    const signupData = await signupResponse.json()
    testUserId = signupData.data.user.id

    // Get auth cookie from response
    authCookie = signupResponse.headers.get('set-cookie') || ''
  })

  describe('GET /api/chat/conversations', () => {
    it('should return 200 and empty array for new user', async () => {
      const response = await fetch(`${BASE_URL}/api/chat/conversations`, {
        headers: {
          Cookie: authCookie,
        },
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data')
      expect(data.data).toHaveProperty('conversations')
      expect(Array.isArray(data.data.conversations)).toBe(true)
      expect(data.data.conversations.length).toBe(0)
    })

    it('should return 401 for unauthenticated user', async () => {
      const response = await fetch(`${BASE_URL}/api/chat/conversations`)

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/chat/conversations', () => {
    it('should return 201 and create new conversation', async () => {
      const response = await fetch(`${BASE_URL}/api/chat/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          title: 'Test Conversation',
        }),
      })

      expect(response.status).toBe(201)

      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data')
      expect(data.data).toHaveProperty('conversation')
      expect(data.data.conversation).toHaveProperty('id')
      expect(data.data.conversation).toHaveProperty('title', 'Test Conversation')
      expect(data.data.conversation).toHaveProperty('userId', testUserId)
      expect(data.data.conversation).toHaveProperty('messageCount', 0)
      expect(data.data.conversation).toHaveProperty('createdAt')
      expect(data.data.conversation).toHaveProperty('updatedAt')

      // Store for subsequent tests
      testConversationId = data.data.conversation.id
    })

    it('should return 401 for unauthenticated user', async () => {
      const response = await fetch(`${BASE_URL}/api/chat/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Unauthorized Conversation' }),
      })

      expect(response.status).toBe(401)
    })

    it('should create conversation with auto-generated title if not provided', async () => {
      const response = await fetch(`${BASE_URL}/api/chat/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(201)

      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data')
      expect(data.data).toHaveProperty('conversation')
      expect(data.data.conversation).toHaveProperty('title')
      expect(data.data.conversation.title).toMatch(/^New Conversation/)
    })
  })

  describe('GET /api/chat/conversations/[conversationId]/messages', () => {
    it('should return 200 and empty array for new conversation', async () => {
      const response = await fetch(
        `${BASE_URL}/api/chat/conversations/${testConversationId}/messages`,
        {
          headers: {
            Cookie: authCookie,
          },
        }
      )

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('data')
      expect(data.data).toHaveProperty('messages')
      expect(Array.isArray(data.data.messages)).toBe(true)
      expect(data.data.messages.length).toBe(0)
    })

    it('should return 401 for unauthenticated user', async () => {
      const response = await fetch(
        `${BASE_URL}/api/chat/conversations/${testConversationId}/messages`
      )

      expect(response.status).toBe(401)
    })

    it('should return 404 for non-existent conversation', async () => {
      const response = await fetch(
        `${BASE_URL}/api/chat/conversations/00000000-0000-0000-0000-000000000000/messages`,
        {
          headers: {
            Cookie: authCookie,
          },
        }
      )

      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/chat/conversations/[conversationId]/messages', () => {
    it('should return 200 and create message with Claude response (streaming)', async () => {
      const response = await fetch(
        `${BASE_URL}/api/chat/conversations/${testConversationId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: authCookie,
          },
          body: JSON.stringify({
            content: 'Hello, can you help me learn about JavaScript closures?',
          }),
        }
      )

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('text/event-stream')

      // Test that we receive SSE stream
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      let receivedData = false
      if (reader) {
        const { value } = await reader.read()
        if (value) {
          const chunk = decoder.decode(value)
          receivedData = chunk.length > 0
        }
        reader.releaseLock()
      }

      expect(receivedData).toBe(true)
    })

    it('should return 400 for empty message content', async () => {
      const response = await fetch(
        `${BASE_URL}/api/chat/conversations/${testConversationId}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: authCookie,
          },
          body: JSON.stringify({
            content: '',
          }),
        }
      )

      expect(response.status).toBe(400)
    })

    it('should return 401 for unauthenticated user', async () => {
      const response = await fetch(
        `${BASE_URL}/api/chat/conversations/${testConversationId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'Unauthorized message' }),
        }
      )

      expect(response.status).toBe(401)
    })

    it('should return 404 for non-existent conversation', async () => {
      const response = await fetch(
        `${BASE_URL}/api/chat/conversations/00000000-0000-0000-0000-000000000000/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: authCookie,
          },
          body: JSON.stringify({ content: 'Message to nowhere' }),
        }
      )

      expect(response.status).toBe(404)
    })
  })
})
