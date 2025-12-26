import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from 'vitest'
import { closeDbConnection } from '@/lib/db/client'
import { createUser } from '@/lib/db/operations/users'
import { createConversation } from '@/lib/db/operations/conversations'
import { createMessage } from '@/lib/db/operations/messages'
import { createFlashcard } from '@/lib/db/operations/flashcards'
import { generateDeckSuggestions } from '@/lib/ai/deck-generation'
import type { DeckGenerationOptions } from '@/lib/ai/deck-generation'
import { hashPassword } from '@/lib/auth/helpers'

/**
 * Integration Tests for AI Deck Generation
 *
 * Tests the AI generation pipeline (vector search → LLM re-ranking) with mocked services.
 * Verifies hybrid approach, fallback behavior, and error handling.
 *
 * Maps to T077 in Phase 7 (Tests)
 * Tests FR-013, FR-014, FR-015, FR-016
 */

// Mock the external dependencies
vi.mock('@/lib/db/operations/flashcards-lancedb', () => ({
  searchSimilarFlashcardsWithScores: vi.fn(),
}))

vi.mock('@/lib/claude/client', () => ({
  getChatCompletion: vi.fn(),
}))

import { searchSimilarFlashcardsWithScores } from '@/lib/db/operations/flashcards-lancedb'
import { getChatCompletion } from '@/lib/claude/client'

describe('AI Deck Generation Integration', () => {
  let testUserId: string
  let testConversationId: string
  let testMessageId: string
  let testFlashcardIds: string[] = []

  beforeAll(async () => {
    // Create test user
    const passwordHash = await hashPassword('TestPass123!')
    const user = await createUser({
      email: `test-ai-deck-${Date.now()}@example.com`,
      passwordHash,
      name: 'AI Deck Test User',
    })
    testUserId = user.id

    // Create conversation and message
    const conversation = await createConversation({
      userId: testUserId,
      title: 'AI Deck Test Conversation',
    })
    testConversationId = conversation.id

    const message = await createMessage({
      conversationId: testConversationId,
      userId: testUserId,
      role: 'assistant',
      content: 'AI deck generation test content.',
    })
    testMessageId = message.id

    // Create 10 test flashcards
    for (let i = 0; i < 10; i++) {
      const flashcard = await createFlashcard({
        userId: testUserId,
        conversationId: testConversationId,
        messageId: testMessageId,
        question: `Question ${i + 1}`,
        answer: `Answer ${i + 1}`,
      })
      testFlashcardIds.push(flashcard.id)
    }
  })

  afterAll(async () => {
    await closeDbConnection()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Vector Search Stage (FR-013)', () => {
    it('should retrieve candidates from vector search', async () => {
      // Mock vector search results
      vi.mocked(searchSimilarFlashcardsWithScores).mockResolvedValue([
        { id: testFlashcardIds[0], similarity: 0.95 },
        { id: testFlashcardIds[1], similarity: 0.9 },
        { id: testFlashcardIds[2], similarity: 0.85 },
      ])

      // Mock LLM re-ranking
      vi.mocked(getChatCompletion).mockResolvedValue(
        JSON.stringify([
          { id: testFlashcardIds[0], score: 9, explanation: 'Highly relevant' },
          { id: testFlashcardIds[1], score: 8, explanation: 'Very relevant' },
          { id: testFlashcardIds[2], score: 7, explanation: 'Relevant' },
        ])
      )

      const options: DeckGenerationOptions = {
        topic: 'JavaScript fundamentals',
        userId: testUserId,
        minCards: 3,
        maxCards: 10,
      }

      const result = await generateDeckSuggestions(options)

      expect(searchSimilarFlashcardsWithScores).toHaveBeenCalledWith(
        'JavaScript fundamentals',
        testUserId,
        40 // Default vectorSearchLimit
      )

      expect(result.metadata.candidateCount).toBe(3)
      expect(result.metadata.vectorSearchTimeMs).toBeGreaterThan(0)
    })

    it('should respect vectorSearchLimit parameter', async () => {
      vi.mocked(searchSimilarFlashcardsWithScores).mockResolvedValue([])
      vi.mocked(getChatCompletion).mockResolvedValue('[]')

      const options: DeckGenerationOptions = {
        topic: 'React hooks',
        userId: testUserId,
        vectorSearchLimit: 100,
      }

      await generateDeckSuggestions(options)

      expect(searchSimilarFlashcardsWithScores).toHaveBeenCalledWith('React hooks', testUserId, 100)
    })

    it('should handle no candidates found', async () => {
      vi.mocked(searchSimilarFlashcardsWithScores).mockResolvedValue([])

      const options: DeckGenerationOptions = {
        topic: 'Nonexistent topic',
        userId: testUserId,
      }

      const result = await generateDeckSuggestions(options)

      expect(result.suggestions.length).toBe(0)
      expect(result.metadata.candidateCount).toBe(0)
      expect(result.metadata.llmFiltered).toBe(false)
      expect(result.metadata.warnings.length).toBeGreaterThan(0)
      expect(result.metadata.warnings[0]).toContain('No matching flashcards found')
    })

    it('should warn when insufficient candidates found', async () => {
      vi.mocked(searchSimilarFlashcardsWithScores).mockResolvedValue([
        { id: testFlashcardIds[0], similarity: 0.9 },
        { id: testFlashcardIds[1], similarity: 0.8 },
      ])

      vi.mocked(getChatCompletion).mockResolvedValue(
        JSON.stringify([
          { id: testFlashcardIds[0], score: 9, explanation: 'Relevant' },
          { id: testFlashcardIds[1], score: 8, explanation: 'Relevant' },
        ])
      )

      const options: DeckGenerationOptions = {
        topic: 'Rare topic',
        userId: testUserId,
        minCards: 5, // More than available
        maxCards: 10,
      }

      const result = await generateDeckSuggestions(options)

      expect(result.metadata.warnings.length).toBeGreaterThan(0)
      expect(result.metadata.warnings.some((w) => w.includes('Only 2 matching cards found'))).toBe(
        true
      )
    })
  })

  describe('LLM Re-ranking Stage (FR-014, FR-015)', () => {
    it('should filter and rank candidates using LLM', async () => {
      // Mock vector search with 5 candidates
      vi.mocked(searchSimilarFlashcardsWithScores).mockResolvedValue([
        { id: testFlashcardIds[0], similarity: 0.95 },
        { id: testFlashcardIds[1], similarity: 0.9 },
        { id: testFlashcardIds[2], similarity: 0.85 },
        { id: testFlashcardIds[3], similarity: 0.8 },
        { id: testFlashcardIds[4], similarity: 0.75 },
      ])

      // Mock LLM ranking (only 3 cards meet threshold)
      vi.mocked(getChatCompletion).mockResolvedValue(
        JSON.stringify([
          { id: testFlashcardIds[0], score: 9, explanation: 'Highly relevant to topic' },
          { id: testFlashcardIds[1], score: 8, explanation: 'Very relevant' },
          { id: testFlashcardIds[2], score: 7, explanation: 'Moderately relevant' },
        ])
      )

      const options: DeckGenerationOptions = {
        topic: 'Python decorators',
        userId: testUserId,
        minCards: 3,
        maxCards: 10,
      }

      const result = await generateDeckSuggestions(options)

      expect(result.suggestions.length).toBe(3)
      expect(result.metadata.llmFiltered).toBe(true)
      expect(result.metadata.llmFilteringTimeMs).toBeGreaterThanOrEqual(0)

      // Verify ranking is applied
      expect(result.suggestions[0].relevanceScore).toBe(0.9) // Normalized from 9/10
      expect(result.suggestions[0].relevanceReason).toBe('Highly relevant to topic')

      expect(result.suggestions[1].relevanceScore).toBe(0.8)
      expect(result.suggestions[2].relevanceScore).toBe(0.7)

      // Verify vector similarity is preserved
      expect(result.suggestions[0].vectorSimilarity).toBe(0.95)
    })

    it('should filter out low-relevance cards (score < 6)', async () => {
      vi.mocked(searchSimilarFlashcardsWithScores).mockResolvedValue([
        { id: testFlashcardIds[0], similarity: 0.95 },
        { id: testFlashcardIds[1], similarity: 0.9 },
        { id: testFlashcardIds[2], similarity: 0.85 },
      ])

      // LLM returns mixed scores (only 1 meets threshold)
      vi.mocked(getChatCompletion).mockResolvedValue(
        JSON.stringify([
          { id: testFlashcardIds[0], score: 8, explanation: 'Highly relevant' },
          { id: testFlashcardIds[1], score: 4, explanation: 'Low relevance' },
          { id: testFlashcardIds[2], score: 3, explanation: 'Not relevant' },
        ])
      )

      const options: DeckGenerationOptions = {
        topic: 'Graph algorithms',
        userId: testUserId,
      }

      const result = await generateDeckSuggestions(options)

      // Should only include cards with score >= 6
      expect(result.suggestions.length).toBe(1)
      expect(result.suggestions[0].flashcardId).toBe(testFlashcardIds[0])
    })

    it('should respect maxCards limit', async () => {
      vi.mocked(searchSimilarFlashcardsWithScores).mockResolvedValue(
        testFlashcardIds.slice(0, 8).map((id, idx) => ({
          id,
          similarity: 0.95 - idx * 0.05,
        }))
      )

      // LLM ranks all 8 cards highly (all scores >= 6 to pass threshold)
      vi.mocked(getChatCompletion).mockResolvedValue(
        JSON.stringify(
          testFlashcardIds.slice(0, 8).map((id, idx) => ({
            id,
            score: 10 - idx * 0.5, // Scores: 10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5 (all >= 6)
            explanation: `Relevant ${idx + 1}`,
          }))
        )
      )

      const options: DeckGenerationOptions = {
        topic: 'Data structures',
        userId: testUserId,
        minCards: 3,
        maxCards: 5, // Limit to 5
      }

      const result = await generateDeckSuggestions(options)

      // Should not exceed maxCards
      expect(result.suggestions.length).toBe(5)
    })

    it('should preserve LLM ranking order', async () => {
      vi.mocked(searchSimilarFlashcardsWithScores).mockResolvedValue([
        { id: testFlashcardIds[0], similarity: 0.85 }, // Lower vector sim
        { id: testFlashcardIds[1], similarity: 0.95 }, // Higher vector sim
        { id: testFlashcardIds[2], similarity: 0.9 },
      ])

      // LLM ranks in different order than vector similarity
      vi.mocked(getChatCompletion).mockResolvedValue(
        JSON.stringify([
          { id: testFlashcardIds[0], score: 10, explanation: 'Most relevant' }, // Vector: 0.85
          { id: testFlashcardIds[2], score: 8, explanation: 'Relevant' }, // Vector: 0.90
          { id: testFlashcardIds[1], score: 7, explanation: 'Moderately relevant' }, // Vector: 0.95
        ])
      )

      const options: DeckGenerationOptions = {
        topic: 'Algorithms',
        userId: testUserId,
      }

      const result = await generateDeckSuggestions(options)

      // Should follow LLM ranking, not vector similarity
      expect(result.suggestions[0].flashcardId).toBe(testFlashcardIds[0])
      expect(result.suggestions[1].flashcardId).toBe(testFlashcardIds[2])
      expect(result.suggestions[2].flashcardId).toBe(testFlashcardIds[1])
    })
  })

  describe('Fallback Behavior (FR-016)', () => {
    it('should fall back to vector search when LLM unavailable', async () => {
      vi.mocked(searchSimilarFlashcardsWithScores).mockResolvedValue([
        { id: testFlashcardIds[0], similarity: 0.95 },
        { id: testFlashcardIds[1], similarity: 0.9 },
        { id: testFlashcardIds[2], similarity: 0.85 },
      ])

      // LLM fails
      vi.mocked(getChatCompletion).mockRejectedValue(new Error('Claude API unavailable'))

      const options: DeckGenerationOptions = {
        topic: 'TypeScript generics',
        userId: testUserId,
        maxCards: 5,
      }

      const result = await generateDeckSuggestions(options)

      // Should still return suggestions (from vector search)
      expect(result.suggestions.length).toBe(3)
      expect(result.metadata.llmFiltered).toBe(false)
      expect(result.metadata.warnings.length).toBeGreaterThan(0)
      expect(result.metadata.warnings.some((w) => w.includes('AI filtering unavailable'))).toBe(
        true
      )

      // Fallback should use vector similarity as relevance score
      expect(result.suggestions[0].relevanceScore).toBe(0.95)
      expect(result.suggestions[0].relevanceReason).toContain('vector similarity')
    })

    it('should limit fallback results to maxCards', async () => {
      vi.mocked(searchSimilarFlashcardsWithScores).mockResolvedValue(
        testFlashcardIds.map((id, idx) => ({
          id,
          similarity: 0.95 - idx * 0.05,
        }))
      )

      // LLM fails
      vi.mocked(getChatCompletion).mockRejectedValue(new Error('Network error'))

      const options: DeckGenerationOptions = {
        topic: 'CSS Grid',
        userId: testUserId,
        maxCards: 3,
      }

      const result = await generateDeckSuggestions(options)

      expect(result.suggestions.length).toBe(3)
      expect(result.metadata.llmFiltered).toBe(false)
    })

    it('should throw error when vector search fails', async () => {
      vi.mocked(searchSimilarFlashcardsWithScores).mockRejectedValue(
        new Error('LanceDB connection failed')
      )

      const options: DeckGenerationOptions = {
        topic: 'Database indexing',
        userId: testUserId,
      }

      await expect(generateDeckSuggestions(options)).rejects.toThrow(
        'Vector search service unavailable'
      )
    })
  })

  describe('Performance Metrics', () => {
    it('should track vector search time', async () => {
      vi.mocked(searchSimilarFlashcardsWithScores).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50)) // Simulate delay
        return [{ id: testFlashcardIds[0], similarity: 0.9 }]
      })

      vi.mocked(getChatCompletion).mockResolvedValue(
        JSON.stringify([{ id: testFlashcardIds[0], score: 8, explanation: 'Relevant' }])
      )

      const options: DeckGenerationOptions = {
        topic: 'Async programming',
        userId: testUserId,
      }

      const result = await generateDeckSuggestions(options)

      expect(result.metadata.vectorSearchTimeMs).toBeGreaterThan(0)
    })

    it('should track LLM filtering time when successful', async () => {
      vi.mocked(searchSimilarFlashcardsWithScores).mockResolvedValue([
        { id: testFlashcardIds[0], similarity: 0.9 },
      ])

      vi.mocked(getChatCompletion).mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100)) // Simulate delay
        return JSON.stringify([{ id: testFlashcardIds[0], score: 8, explanation: 'Relevant' }])
      })

      const options: DeckGenerationOptions = {
        topic: 'Testing',
        userId: testUserId,
      }

      const result = await generateDeckSuggestions(options)

      expect(result.metadata.llmFilteringTimeMs).toBeGreaterThan(0)
    })

    it('should track total processing time', async () => {
      vi.mocked(searchSimilarFlashcardsWithScores).mockResolvedValue([
        { id: testFlashcardIds[0], similarity: 0.9 },
      ])

      vi.mocked(getChatCompletion).mockResolvedValue(
        JSON.stringify([{ id: testFlashcardIds[0], score: 8, explanation: 'Relevant' }])
      )

      const options: DeckGenerationOptions = {
        topic: 'Performance',
        userId: testUserId,
      }

      const result = await generateDeckSuggestions(options)

      expect(result.metadata.processingTimeMs).toBeGreaterThan(0)
      expect(result.metadata.processingTimeMs).toBeGreaterThanOrEqual(
        result.metadata.vectorSearchTimeMs
      )
    })

    it('should not track LLM time when fallback used', async () => {
      vi.mocked(searchSimilarFlashcardsWithScores).mockResolvedValue([
        { id: testFlashcardIds[0], similarity: 0.9 },
      ])

      vi.mocked(getChatCompletion).mockRejectedValue(new Error('LLM error'))

      const options: DeckGenerationOptions = {
        topic: 'Fallback test',
        userId: testUserId,
      }

      const result = await generateDeckSuggestions(options)

      expect(result.metadata.llmFilteringTimeMs).toBeUndefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty LLM response', async () => {
      vi.mocked(searchSimilarFlashcardsWithScores).mockResolvedValue([
        { id: testFlashcardIds[0], similarity: 0.9 },
      ])

      vi.mocked(getChatCompletion).mockResolvedValue('[]')

      const options: DeckGenerationOptions = {
        topic: 'Empty response test',
        userId: testUserId,
      }

      const result = await generateDeckSuggestions(options)

      expect(result.suggestions.length).toBe(0)
      expect(result.metadata.llmFiltered).toBe(true)
    })

    it('should handle LLM returning only low-scoring cards', async () => {
      vi.mocked(searchSimilarFlashcardsWithScores).mockResolvedValue([
        { id: testFlashcardIds[0], similarity: 0.9 },
        { id: testFlashcardIds[1], similarity: 0.8 },
      ])

      vi.mocked(getChatCompletion).mockResolvedValue(
        JSON.stringify([
          { id: testFlashcardIds[0], score: 3, explanation: 'Low relevance' },
          { id: testFlashcardIds[1], score: 2, explanation: 'Very low relevance' },
        ])
      )

      const options: DeckGenerationOptions = {
        topic: 'Unrelated topic',
        userId: testUserId,
      }

      const result = await generateDeckSuggestions(options)

      // All filtered out due to score < 6
      expect(result.suggestions.length).toBe(0)
    })

    it('should use default limits when not specified', async () => {
      vi.mocked(searchSimilarFlashcardsWithScores).mockResolvedValue([
        { id: testFlashcardIds[0], similarity: 0.9 },
      ])

      vi.mocked(getChatCompletion).mockResolvedValue(
        JSON.stringify([{ id: testFlashcardIds[0], score: 8, explanation: 'Relevant' }])
      )

      const options: DeckGenerationOptions = {
        topic: 'Default limits',
        userId: testUserId,
        // minCards and maxCards not specified
      }

      const result = await generateDeckSuggestions(options)

      // Should use defaults: minCards=5, maxCards=15
      expect(result.suggestions.length).toBeLessThanOrEqual(15)
      expect(getChatCompletion).toHaveBeenCalled()

      const callArgs = vi.mocked(getChatCompletion).mock.calls[0][0]
      expect(callArgs.systemPrompt).toContain('5-15')
    })
  })

  describe('Data Integrity', () => {
    it('should preserve flashcard content through pipeline', async () => {
      vi.mocked(searchSimilarFlashcardsWithScores).mockResolvedValue([
        { id: testFlashcardIds[0], similarity: 0.95 },
      ])

      vi.mocked(getChatCompletion).mockResolvedValue(
        JSON.stringify([{ id: testFlashcardIds[0], score: 9, explanation: 'Relevant' }])
      )

      const options: DeckGenerationOptions = {
        topic: 'Integrity test',
        userId: testUserId,
      }

      const result = await generateDeckSuggestions(options)

      // Verify flashcard content matches database
      expect(result.suggestions[0].flashcardId).toBe(testFlashcardIds[0])
      expect(result.suggestions[0].front).toBe('Question 1')
      expect(result.suggestions[0].back).toBe('Answer 1')
    })

    it('should skip non-existent flashcard IDs', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'

      vi.mocked(searchSimilarFlashcardsWithScores).mockResolvedValue([
        { id: testFlashcardIds[0], similarity: 0.95 },
        { id: fakeId, similarity: 0.9 }, // Non-existent
        { id: testFlashcardIds[1], similarity: 0.85 },
      ])

      vi.mocked(getChatCompletion).mockResolvedValue(
        JSON.stringify([
          { id: testFlashcardIds[0], score: 9, explanation: 'Relevant' },
          { id: testFlashcardIds[1], score: 8, explanation: 'Relevant' },
        ])
      )

      const options: DeckGenerationOptions = {
        topic: 'Non-existent ID test',
        userId: testUserId,
      }

      const result = await generateDeckSuggestions(options)

      // Should only have 2 candidates (fake ID skipped)
      expect(result.metadata.candidateCount).toBe(2)
      expect(result.suggestions.length).toBe(2)
    })
  })
})
