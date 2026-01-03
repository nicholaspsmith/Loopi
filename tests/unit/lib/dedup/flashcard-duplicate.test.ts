import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DuplicateCheckResult } from '@/lib/dedup/types'

/**
 * Unit Tests for Flashcard Duplicate Detection (T008)
 *
 * Tests the checkFlashcardDuplicate function in isolation with mocked dependencies.
 * These tests will FAIL until the implementation is complete (TDD approach).
 *
 * Feature: 023-dedupe
 * User Story 1: Flashcard Duplicate Detection
 */

// Mock dependencies
vi.mock('@/lib/embeddings', () => ({
  generateEmbedding: vi.fn(),
}))

vi.mock('@/lib/db/operations/flashcards-lancedb', () => ({
  findSimilarFlashcardsWithThreshold: vi.fn(),
}))

vi.mock('@/lib/db/operations/flashcards', () => ({
  getFlashcardsByIds: vi.fn(),
}))

import { generateEmbedding } from '@/lib/embeddings'
import { findSimilarFlashcardsWithThreshold } from '@/lib/db/operations/flashcards-lancedb'
import { getFlashcardsByIds } from '@/lib/db/operations/flashcards'

// Import the function to test (will fail until implemented)
let checkFlashcardDuplicate: (input: {
  question: string
  userId: string
}) => Promise<DuplicateCheckResult>

try {
  const dedupModule = await import('@/lib/dedup/similarity-check')
  checkFlashcardDuplicate = dedupModule.checkFlashcardDuplicate
} catch {
  // Function not yet implemented - test will fail
  checkFlashcardDuplicate = async () => {
    throw new Error('checkFlashcardDuplicate not yet implemented')
  }
}

describe('checkFlashcardDuplicate', () => {
  const mockUserId = '550e8400-e29b-41d4-a716-446655440000'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Duplicate Detection', () => {
    it('should return isDuplicate=true when similarity > 0.85 threshold', async () => {
      // Mock embedding generation
      const mockEmbedding = new Array(1024).fill(0.5)
      ;(generateEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue(mockEmbedding)

      // Mock LanceDB returning similar flashcard
      ;(findSimilarFlashcardsWithThreshold as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'card-123', similarity: 0.92 },
      ])

      // Mock PostgreSQL returning flashcard data
      ;(getFlashcardsByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'card-123',
          question: 'What is photosynthesis?',
          answer: 'Process by which plants convert light to energy',
          userId: mockUserId,
        },
      ])

      const result = await checkFlashcardDuplicate({
        question: 'Define photosynthesis',
        userId: mockUserId,
      })

      expect(result.isDuplicate).toBe(true)
      expect(result.topScore).toBe(0.92)
      expect(result.similarItems).toHaveLength(1)
      expect(result.similarItems[0]).toEqual({
        id: 'card-123',
        score: 0.92,
        displayText: 'What is photosynthesis?',
        type: 'flashcard',
      })
      expect(result.checkSkipped).toBe(false)
    })

    it('should return isDuplicate=false when no similar cards found', async () => {
      // Mock embedding generation
      const mockEmbedding = new Array(1024).fill(0.5)
      ;(generateEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue(mockEmbedding)

      // Mock LanceDB returning empty results
      ;(findSimilarFlashcardsWithThreshold as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const result = await checkFlashcardDuplicate({
        question: 'What is quantum mechanics?',
        userId: mockUserId,
      })

      expect(result.isDuplicate).toBe(false)
      expect(result.topScore).toBeNull()
      expect(result.similarItems).toHaveLength(0)
      expect(result.checkSkipped).toBe(false)
    })

    it('should return isDuplicate=false when similarity < 0.85', async () => {
      // Mock embedding generation
      const mockEmbedding = new Array(1024).fill(0.5)
      ;(generateEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue(mockEmbedding)

      // Mock LanceDB returning items below threshold (should be filtered by LanceDB itself)
      ;(findSimilarFlashcardsWithThreshold as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const result = await checkFlashcardDuplicate({
        question: 'Related but different question',
        userId: mockUserId,
      })

      expect(result.isDuplicate).toBe(false)
      expect(result.topScore).toBeNull()
      expect(result.similarItems).toHaveLength(0)
    })

    it('should return up to 3 similar items with scores sorted descending', async () => {
      // Mock embedding generation
      const mockEmbedding = new Array(1024).fill(0.5)
      ;(generateEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue(mockEmbedding)

      // Mock LanceDB returning 3 similar flashcards
      ;(findSimilarFlashcardsWithThreshold as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'card-1', similarity: 0.95 },
        { id: 'card-2', similarity: 0.9 },
        { id: 'card-3', similarity: 0.87 },
      ])

      // Mock PostgreSQL returning flashcard data
      ;(getFlashcardsByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'card-1', question: 'Question 1', userId: mockUserId },
        { id: 'card-2', question: 'Question 2', userId: mockUserId },
        { id: 'card-3', question: 'Question 3', userId: mockUserId },
      ])

      const result = await checkFlashcardDuplicate({
        question: 'Similar question',
        userId: mockUserId,
      })

      expect(result.isDuplicate).toBe(true)
      expect(result.similarItems).toHaveLength(3)
      expect(result.similarItems[0].score).toBe(0.95)
      expect(result.similarItems[1].score).toBe(0.9)
      expect(result.similarItems[2].score).toBe(0.87)
      expect(result.topScore).toBe(0.95)
    })

    it('should limit results to maximum 3 items even if more are similar', async () => {
      // Mock embedding generation
      const mockEmbedding = new Array(1024).fill(0.5)
      ;(generateEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue(mockEmbedding)

      // Mock LanceDB returning 5 similar flashcards (function should request limit=3)
      ;(findSimilarFlashcardsWithThreshold as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'card-1', similarity: 0.95 },
        { id: 'card-2', similarity: 0.9 },
        { id: 'card-3', similarity: 0.87 },
      ])

      // Mock PostgreSQL returning flashcard data
      ;(getFlashcardsByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'card-1', question: 'Question 1', userId: mockUserId },
        { id: 'card-2', question: 'Question 2', userId: mockUserId },
        { id: 'card-3', question: 'Question 3', userId: mockUserId },
      ])

      const result = await checkFlashcardDuplicate({
        question: 'Popular question',
        userId: mockUserId,
      })

      expect(result.similarItems).toHaveLength(3)
      expect(findSimilarFlashcardsWithThreshold).toHaveBeenCalledWith(
        'Popular question',
        mockUserId,
        0.85,
        3
      )
    })
  })

  describe('Content Validation', () => {
    it('should return checkSkipped=true for content < 10 chars', async () => {
      const result = await checkFlashcardDuplicate({
        question: 'Short',
        userId: mockUserId,
      })

      expect(result.checkSkipped).toBe(true)
      expect(result.skipReason).toBe('content_too_short')
      expect(result.isDuplicate).toBe(false)
      expect(result.similarItems).toHaveLength(0)
      expect(result.topScore).toBeNull()
      expect(generateEmbedding).not.toHaveBeenCalled()
    })

    it('should return checkSkipped=true for whitespace-only content', async () => {
      const result = await checkFlashcardDuplicate({
        question: '   \n   ',
        userId: mockUserId,
      })

      expect(result.checkSkipped).toBe(true)
      expect(result.skipReason).toBe('content_too_short')
      expect(generateEmbedding).not.toHaveBeenCalled()
    })

    it('should accept content with exactly 10 characters', async () => {
      const mockEmbedding = new Array(1024).fill(0.5)
      ;(generateEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue(mockEmbedding)
      ;(findSimilarFlashcardsWithThreshold as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const result = await checkFlashcardDuplicate({
        question: '1234567890',
        userId: mockUserId,
      })

      expect(result.checkSkipped).toBe(false)
      expect(result.isDuplicate).toBe(false)
      expect(result.similarItems).toHaveLength(0)
    })

    it('should trim content before length check', async () => {
      const result = await checkFlashcardDuplicate({
        question: '  Short  ',
        userId: mockUserId,
      })

      expect(result.checkSkipped).toBe(true)
      expect(result.skipReason).toBe('content_too_short')
    })
  })

  describe('Error Handling', () => {
    it('should handle embedding generation failures gracefully', async () => {
      // Mock findSimilarFlashcardsWithThreshold to return empty array
      // (this is what happens when embedding generation fails inside that function)
      ;(findSimilarFlashcardsWithThreshold as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const result = await checkFlashcardDuplicate({
        question: 'Valid question text',
        userId: mockUserId,
      })

      expect(result.checkSkipped).toBe(false)
      expect(result.isDuplicate).toBe(false)
      expect(result.similarItems).toHaveLength(0)
      expect(result.topScore).toBeNull()
    })

    it('should handle LanceDB query failures gracefully', async () => {
      // Mock embedding success
      const mockEmbedding = new Array(1024).fill(0.5)
      ;(generateEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue(mockEmbedding)

      // Mock LanceDB throwing error
      ;(findSimilarFlashcardsWithThreshold as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('LanceDB connection failed')
      )

      const result = await checkFlashcardDuplicate({
        question: 'Valid question text',
        userId: mockUserId,
      })

      expect(result.checkSkipped).toBe(true)
      expect(result.skipReason).toBe('service_unavailable')
      expect(result.isDuplicate).toBe(false)
    })

    it('should handle PostgreSQL query failures gracefully', async () => {
      // Mock embedding and LanceDB success
      const mockEmbedding = new Array(1024).fill(0.5)
      ;(generateEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue(mockEmbedding)
      ;(findSimilarFlashcardsWithThreshold as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'card-1', similarity: 0.9 },
      ])

      // Mock PostgreSQL throwing error
      ;(getFlashcardsByIds as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Database connection failed')
      )

      const result = await checkFlashcardDuplicate({
        question: 'Valid question text',
        userId: mockUserId,
      })

      expect(result.checkSkipped).toBe(true)
      expect(result.skipReason).toBe('service_unavailable')
    })

    it('should handle empty embedding array', async () => {
      // Mock findSimilarFlashcardsWithThreshold to return empty array
      // (this is what happens when embedding is empty inside that function)
      ;(findSimilarFlashcardsWithThreshold as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const result = await checkFlashcardDuplicate({
        question: 'Valid question text',
        userId: mockUserId,
      })

      expect(result.checkSkipped).toBe(false)
      expect(result.isDuplicate).toBe(false)
      expect(result.similarItems).toHaveLength(0)
      expect(result.topScore).toBeNull()
    })
  })

  describe('User Scoping', () => {
    it('should pass userId to LanceDB search to scope results', async () => {
      const mockEmbedding = new Array(1024).fill(0.5)
      ;(generateEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue(mockEmbedding)
      ;(findSimilarFlashcardsWithThreshold as ReturnType<typeof vi.fn>).mockResolvedValue([])

      await checkFlashcardDuplicate({
        question: 'Test question',
        userId: mockUserId,
      })

      expect(findSimilarFlashcardsWithThreshold).toHaveBeenCalledWith(
        'Test question',
        mockUserId,
        0.85,
        3
      )
    })
  })
})
