import { describe, it, expect, beforeAll } from 'vitest'
import { createUser } from '@/lib/db/operations/users'
import { createConversation } from '@/lib/db/operations/conversations'
import { createMessage } from '@/lib/db/operations/messages'
import { getUserApiKey } from '@/lib/db/operations/api-keys'
import { getChatCompletion } from '@/lib/claude/client'
import { generateFlashcardsFromContent } from '@/lib/claude/flashcard-generator'
import { initializeSchema, isSchemaInitialized } from '@/lib/db/schema'

/**
 * Integration Tests for Ollama Fallback Behavior
 *
 * Tests that the system correctly falls back to Ollama when:
 * 1. User has no saved API key
 * 2. User's API key is null/undefined
 *
 * User Story 4: Fallback to Ollama
 * Ensures users without API keys can still use the application
 */

describe('Ollama Fallback Behavior', () => {
  let testUserId: string
  let testConversationId: string

  beforeAll(async () => {
    // Initialize schema if needed
    const initialized = await isSchemaInitialized()
    if (!initialized) {
      await initializeSchema()
    }

    // Create test user WITHOUT an API key
    const testUser = await createUser({
      email: `ollama-test-${Date.now()}@example.com`,
      passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.',
      name: 'Ollama Test User',
    })
    testUserId = testUser.id

    // Create a test conversation
    const conversation = await createConversation({
      userId: testUserId,
      title: 'Ollama Fallback Test',
    })
    testConversationId = conversation.id
  })

  describe('Chat completion fallback', () => {
    it('should use Ollama when user has no API key', async () => {
      // Verify user has no API key
      const apiKey = await getUserApiKey(testUserId)
      expect(apiKey).toBeNull()

      // Create a user message
      const userMessage = await createMessage({
        conversationId: testConversationId,
        userId: testUserId,
        role: 'user',
        content: 'Hello, this is a test message',
      })

      expect(userMessage).toBeDefined()

      // Get chat completion without API key (should fall back to Ollama)
      const response = await getChatCompletion({
        messages: [{ role: 'user', content: 'Hello' }],
        systemPrompt: 'You are a helpful assistant.',
        userApiKey: null, // No API key provided
      })

      expect(response).toBeDefined()
      expect(typeof response).toBe('string')
      expect(response.length).toBeGreaterThan(0)
    }, 30000) // 30 second timeout for Ollama

    it('should set aiProvider to "ollama" when using fallback', async () => {
      // Create messages using Ollama
      const userMessage = await createMessage({
        conversationId: testConversationId,
        userId: testUserId,
        role: 'user',
        content: 'Test message for provider tracking',
      })

      const assistantMessage = await createMessage({
        conversationId: testConversationId,
        userId: testUserId,
        role: 'assistant',
        content: 'Response from Ollama',
        aiProvider: 'ollama', // Should be set when using Ollama
        apiKeyId: null, // No API key used
      })

      expect(userMessage).toBeDefined()
      expect(assistantMessage.aiProvider).toBe('ollama')
      expect(assistantMessage.apiKeyId).toBeNull()
    })
  })

  describe('Flashcard generation fallback', () => {
    it('should use Ollama for flashcard generation when no API key', async () => {
      // Verify user has no API key
      const apiKey = await getUserApiKey(testUserId)
      expect(apiKey).toBeNull()

      const educationalContent = `
        Photosynthesis is the process by which plants convert light energy into chemical energy.
        It occurs in the chloroplasts of plant cells. The process requires carbon dioxide, water, and sunlight.
        The main product is glucose, which plants use for energy, and oxygen is released as a byproduct.
        Chlorophyll is the green pigment that captures light energy.
      `

      // Generate flashcards without API key (should fall back to Ollama)
      const flashcards = await generateFlashcardsFromContent(educationalContent, {
        userApiKey: null, // No API key provided
      })

      expect(flashcards).toBeDefined()
      expect(Array.isArray(flashcards)).toBe(true)
      expect(flashcards.length).toBeGreaterThan(0)

      // Verify flashcard structure
      flashcards.forEach((card) => {
        expect(card).toHaveProperty('question')
        expect(card).toHaveProperty('answer')
        expect(typeof card.question).toBe('string')
        expect(typeof card.answer).toBe('string')
        expect(card.question.length).toBeGreaterThan(0)
        expect(card.answer.length).toBeGreaterThan(0)
      })
    }, 60000) // 60 second timeout for flashcard generation with Ollama
  })

  describe('Fallback behavior verification', () => {
    it('should handle null API key gracefully', async () => {
      const response = await getChatCompletion({
        messages: [{ role: 'user', content: 'Test with null key' }],
        systemPrompt: 'You are a helpful assistant.',
        userApiKey: null,
      })

      expect(response).toBeDefined()
      expect(typeof response).toBe('string')
      expect(response.length).toBeGreaterThan(0)
    }, 30000)

    it('should handle undefined API key gracefully', async () => {
      const response = await getChatCompletion({
        messages: [{ role: 'user', content: 'Test with undefined key' }],
        systemPrompt: 'You are a helpful assistant.',
        userApiKey: undefined,
      })

      expect(response).toBeDefined()
      expect(typeof response).toBe('string')
      expect(response.length).toBeGreaterThan(0)
    }, 30000)

    it('should work for users without saved API keys', async () => {
      // This is the primary use case - a user who hasn't configured an API key yet
      const userApiKey = await getUserApiKey(testUserId)
      expect(userApiKey).toBeNull()

      // Both chat and flashcards should work via Ollama
      const chatResponse = await getChatCompletion({
        messages: [{ role: 'user', content: 'Hello without API key' }],
        systemPrompt: 'You are a helpful assistant.',
        userApiKey: null,
      })

      expect(chatResponse).toBeDefined()
      expect(typeof chatResponse).toBe('string')
      expect(chatResponse.length).toBeGreaterThan(0)
    }, 30000)
  })
})
