import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { isServerAvailable } from '@/tests/helpers/server-check'

const serverRunning = await isServerAvailable()

import { hashPassword } from '@/lib/auth/helpers'
import { createUser } from '@/lib/db/operations/users'
import { createFlashcard } from '@/lib/db/operations/flashcards'
import { closeDbConnection } from '@/lib/db/client'

/**
 * Contract Tests for AI Deck Generation API
 *
 * Tests API contracts for AI-powered deck generation per
 * specs/012-flashcard-decks/contracts/deck-ai-generation.yaml
 *
 * Tests POST /api/decks-ai endpoint:
 * - Topic validation (3-500 characters)
 * - Request parameter validation (minCards, maxCards, vectorSearchLimit)
 * - FlashcardSuggestion response schema
 * - GenerationMetadata schema
 * - Error handling (insufficient cards, service unavailable)
 *
 * Maps to User Story 3 (T072)
 */

describe.skipIf(!serverRunning)('AI Deck Generation API Contract Tests', () => {
  let testUserId: string

  beforeAll(async () => {
    // Create test user
    const passwordHash = await hashPassword('TestPass123!')
    const user = await createUser({
      email: `test-ai-gen-${Date.now()}@example.com`,
      passwordHash,
      name: 'AI Generation Test User',
    })
    testUserId = user.id

    // Create test flashcards with varied content for AI matching
    const flashcardData = [
      {
        question: 'What is the role of mitochondria in cellular respiration?',
        answer:
          'Mitochondria are the powerhouse of the cell, generating ATP through aerobic respiration.',
      },
      {
        question: 'Explain the process of photosynthesis',
        answer:
          'Photosynthesis is the process by which plants convert light energy into chemical energy stored in glucose.',
      },
      {
        question: 'What is the Krebs cycle?',
        answer:
          'The Krebs cycle is a series of chemical reactions in cellular respiration that generate energy.',
      },
      {
        question: 'Define ATP',
        answer: 'ATP (adenosine triphosphate) is the primary energy currency of cells.',
      },
      {
        question: 'What are chloroplasts?',
        answer: 'Chloroplasts are organelles in plant cells where photosynthesis occurs.',
      },
    ]

    for (const data of flashcardData) {
      await createFlashcard({
        userId: testUserId,
        conversationId: null,
        messageId: null,
        question: data.question,
        answer: data.answer,
      })
    }
  })

  afterAll(async () => {
    await closeDbConnection()
  })

  describe('POST /api/decks-ai', () => {
    it('should generate AI deck suggestions with valid topic', async () => {
      const response = await fetch('http://localhost:3000/api/decks-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'cellular respiration and ATP production',
        }),
      })

      expect(response.status).toBe(200)

      const data = await response.json()

      // Verify top-level structure
      expect(data).toHaveProperty('suggestions')
      expect(data).toHaveProperty('metadata')

      // Verify suggestions array
      expect(Array.isArray(data.suggestions)).toBe(true)

      // Verify FlashcardSuggestion schema
      if (data.suggestions.length > 0) {
        const suggestion = data.suggestions[0]
        expect(suggestion).toHaveProperty('flashcardId')
        expect(suggestion).toHaveProperty('front')
        expect(suggestion).toHaveProperty('back')
        expect(suggestion).toHaveProperty('tags')
        expect(suggestion).toHaveProperty('relevanceScore')
        expect(suggestion).toHaveProperty('relevanceReason')
        expect(suggestion).toHaveProperty('vectorSimilarity')

        // Validate types
        expect(typeof suggestion.flashcardId).toBe('string')
        expect(typeof suggestion.front).toBe('string')
        expect(typeof suggestion.back).toBe('string')
        expect(Array.isArray(suggestion.tags)).toBe(true)
        expect(typeof suggestion.relevanceScore).toBe('number')
        expect(typeof suggestion.vectorSimilarity).toBe('number')

        // Validate ranges
        expect(suggestion.relevanceScore).toBeGreaterThanOrEqual(0.0)
        expect(suggestion.relevanceScore).toBeLessThanOrEqual(1.0)
        expect(suggestion.vectorSimilarity).toBeGreaterThanOrEqual(0.0)
        expect(suggestion.vectorSimilarity).toBeLessThanOrEqual(1.0)
      }

      // Verify GenerationMetadata schema
      expect(data.metadata).toHaveProperty('candidateCount')
      expect(data.metadata).toHaveProperty('llmFiltered')
      expect(data.metadata).toHaveProperty('processingTimeMs')
      expect(data.metadata).toHaveProperty('warnings')

      expect(typeof data.metadata.candidateCount).toBe('number')
      expect(typeof data.metadata.llmFiltered).toBe('boolean')
      expect(typeof data.metadata.processingTimeMs).toBe('number')
      expect(Array.isArray(data.metadata.warnings)).toBe(true)
    })

    it('should respect minCards and maxCards parameters', async () => {
      const response = await fetch('http://localhost:3000/api/decks-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'cellular respiration',
          minCards: 2,
          maxCards: 3,
        }),
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.suggestions.length).toBeLessThanOrEqual(3)
    })

    it('should respect vectorSearchLimit parameter', async () => {
      const response = await fetch('http://localhost:3000/api/decks-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'biology',
          vectorSearchLimit: 20,
        }),
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.metadata.candidateCount).toBeLessThanOrEqual(20)
    })

    it('should include performance metrics in metadata', async () => {
      const response = await fetch('http://localhost:3000/api/decks-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'photosynthesis',
        }),
      })

      expect(response.status).toBe(200)

      const data = await response.json()

      expect(data.metadata).toHaveProperty('processingTimeMs')
      expect(data.metadata).toHaveProperty('vectorSearchTimeMs')
      expect(data.metadata).toHaveProperty('llmFilteringTimeMs')

      expect(data.metadata.processingTimeMs).toBeGreaterThan(0)

      // Performance target: <10s (10000ms)
      expect(data.metadata.processingTimeMs).toBeLessThan(10000)
    })

    it('should reject topic shorter than 3 characters (400)', async () => {
      const response = await fetch('http://localhost:3000/api/decks-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'ab',
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data.error).toContain('3')
    })

    it('should reject topic longer than 500 characters (400)', async () => {
      const response = await fetch('http://localhost:3000/api/decks-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'A'.repeat(501),
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data.error).toContain('500')
    })

    it('should reject missing topic (400)', async () => {
      const response = await fetch('http://localhost:3000/api/decks-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should reject minCards > maxCards (400)', async () => {
      const response = await fetch('http://localhost:3000/api/decks-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'test topic',
          minCards: 10,
          maxCards: 5,
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data.error).toContain('minCards')
    })

    it('should reject minCards < 1 (400)', async () => {
      const response = await fetch('http://localhost:3000/api/decks-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'test topic',
          minCards: 0,
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should reject maxCards > 50 (400)', async () => {
      const response = await fetch('http://localhost:3000/api/decks-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'test topic',
          maxCards: 51,
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should reject vectorSearchLimit < 10 (400)', async () => {
      const response = await fetch('http://localhost:3000/api/decks-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'test topic',
          vectorSearchLimit: 5,
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should reject vectorSearchLimit > 100 (400)', async () => {
      const response = await fetch('http://localhost:3000/api/decks-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'test topic',
          vectorSearchLimit: 101,
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should handle insufficient cards gracefully with warnings', async () => {
      const response = await fetch('http://localhost:3000/api/decks-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'quantum mechanics advanced topics',
          minCards: 10,
          maxCards: 15,
        }),
      })

      // Should still return 200 with warnings
      expect(response.status).toBe(200)

      const data = await response.json()

      // May have warnings about insufficient cards
      if (data.metadata.warnings.length > 0) {
        expect(data.metadata.warnings[0]).toContain('matching cards')
      }

      // Should return whatever suggestions are available
      expect(Array.isArray(data.suggestions)).toBe(true)
    })

    it('should return empty suggestions with warning if no matching cards', async () => {
      const response = await fetch('http://localhost:3000/api/decks-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'extremely specific topic that has no flashcards xyzabc123',
        }),
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.suggestions).toEqual([])
      expect(data.metadata.candidateCount).toBe(0)
      expect(data.metadata.warnings.length).toBeGreaterThan(0)
      expect(data.metadata.warnings[0]).toContain('No matching')
    })

    it('should include LLM filtering status in metadata', async () => {
      const response = await fetch('http://localhost:3000/api/decks-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'cellular biology',
        }),
      })

      expect(response.status).toBe(200)

      const data = await response.json()

      // llmFiltered should be boolean
      expect(typeof data.metadata.llmFiltered).toBe('boolean')

      // If LLM filtering was applied, relevanceReason should be present
      if (data.metadata.llmFiltered && data.suggestions.length > 0) {
        const suggestion = data.suggestions[0]
        expect(suggestion.relevanceReason).toBeDefined()
        expect(typeof suggestion.relevanceReason).toBe('string')
      }
    })
  })

  describe('Error Handling - Service Unavailable', () => {
    // Note: These tests would require mocking or shutting down services
    // Skipping for now but documenting expected behavior

    it.skip('should return 503 when LanceDB is unavailable', async () => {
      // Would need to mock LanceDB failure
      const response = await fetch('http://localhost:3000/api/decks-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'test topic',
        }),
      })

      expect(response.status).toBe(503)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('fallback', 'manual')
      expect(data.error).toContain('Vector search service unavailable')
    })

    it.skip('should fallback to vector-only when Claude API is unavailable', async () => {
      // Would need to mock Claude API failure
      const response = await fetch('http://localhost:3000/api/decks-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: 'test topic',
        }),
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.metadata.llmFiltered).toBe(false)
      expect(data.metadata.warnings).toContain(
        'AI filtering unavailable. Returning vector search results only.'
      )

      // Should still return suggestions from vector search
      expect(Array.isArray(data.suggestions)).toBe(true)
    })
  })
})
