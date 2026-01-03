import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BatchFilterResult } from '@/lib/dedup/types'

/**
 * Unit Tests for Batch Filter Duplicate Detection (T025)
 *
 * Tests the filterDuplicatesFromBatch function in isolation with mocked dependencies.
 * These tests will FAIL until the implementation is complete (TDD approach).
 *
 * Feature: 023-dedupe
 * User Story 3: Bulk AI Generation Deduplication
 */

// Mock dependencies
vi.mock('@/lib/db/operations/flashcards-lancedb', () => ({
  findSimilarFlashcardsWithThreshold: vi.fn(),
}))

vi.mock('@/lib/embeddings', () => ({
  generateEmbedding: vi.fn(),
}))

import { findSimilarFlashcardsWithThreshold } from '@/lib/db/operations/flashcards-lancedb'
import { generateEmbedding } from '@/lib/embeddings'

// Import the function to test (will fail until implemented)
let filterDuplicatesFromBatch: <T>(
  items: T[],
  userId: string,
  getTextForEmbedding: (item: T) => string
) => Promise<BatchFilterResult<T>>

try {
  const batchFilterModule = await import('@/lib/dedup/batch-filter')
  filterDuplicatesFromBatch = batchFilterModule.filterDuplicatesFromBatch
} catch {
  // Function not yet implemented - test will fail
  filterDuplicatesFromBatch = async () => {
    throw new Error('filterDuplicatesFromBatch not yet implemented')
  }
}

describe('filterDuplicatesFromBatch', () => {
  const mockUserId = '550e8400-e29b-41d4-a716-446655440000'

  // Sample batch item type for testing
  interface TestFlashcard {
    id: string
    question: string
    answer: string
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('All Unique Items', () => {
    it('should return all items when no duplicates exist', async () => {
      const items: TestFlashcard[] = [
        {
          id: '1',
          question: 'What is photosynthesis?',
          answer: 'Plants converting light to energy',
        },
        { id: '2', question: 'What is mitosis?', answer: 'Cell division process' },
        { id: '3', question: 'What is gravity?', answer: 'Force of attraction between masses' },
      ]

      // Mock no duplicates found in existing flashcards
      ;(findSimilarFlashcardsWithThreshold as ReturnType<typeof vi.fn>).mockResolvedValue([])

      // Mock embeddings for in-batch comparison - different PATTERNS for each item
      const emb1 = new Array(1024).fill(0).map((_, i) => (i % 2 === 0 ? 1 : 0))
      const emb2 = new Array(1024).fill(0).map((_, i) => (i % 3 === 0 ? 1 : 0))
      const emb3 = new Array(1024).fill(0).map((_, i) => (i % 5 === 0 ? 1 : 0))
      ;(generateEmbedding as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(emb1)
        .mockResolvedValueOnce(emb2)
        .mockResolvedValueOnce(emb3)

      const result = await filterDuplicatesFromBatch(items, mockUserId, (item) => item.question)

      expect(result.uniqueItems).toHaveLength(3)
      expect(result.filteredItems).toHaveLength(0)
      expect(result.stats).toEqual({
        total: 3,
        unique: 3,
        duplicatesRemoved: 0,
      })
    })

    it('should handle empty batch gracefully', async () => {
      const items: TestFlashcard[] = []

      const result = await filterDuplicatesFromBatch(items, mockUserId, (item) => item.question)

      expect(result.uniqueItems).toHaveLength(0)
      expect(result.filteredItems).toHaveLength(0)
      expect(result.stats).toEqual({
        total: 0,
        unique: 0,
        duplicatesRemoved: 0,
      })
      expect(findSimilarFlashcardsWithThreshold).not.toHaveBeenCalled()
    })

    it('should handle single item batch', async () => {
      const items: TestFlashcard[] = [
        { id: '1', question: 'What is DNA?', answer: 'Genetic material' },
      ]

      ;(findSimilarFlashcardsWithThreshold as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const result = await filterDuplicatesFromBatch(items, mockUserId, (item) => item.question)

      expect(result.uniqueItems).toHaveLength(1)
      expect(result.filteredItems).toHaveLength(0)
      expect(result.stats).toEqual({
        total: 1,
        unique: 1,
        duplicatesRemoved: 0,
      })
    })
  })

  describe('Duplicate Against Existing Flashcards', () => {
    it('should filter out items similar to existing flashcards', async () => {
      const items: TestFlashcard[] = [
        { id: '1', question: 'What is photosynthesis?', answer: 'Plants converting light' },
        {
          id: '2',
          question: 'What is cellular respiration?',
          answer: 'Energy production in cells',
        },
        { id: '3', question: 'What is mitosis?', answer: 'Cell division' },
      ]

      // First item is duplicate, others are unique
      ;(findSimilarFlashcardsWithThreshold as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([{ id: 'existing-123', similarity: 0.92 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      // Mock embeddings for in-batch comparison - different patterns for unique items
      const emb2 = new Array(1024).fill(0).map((_, i) => (i % 3 === 0 ? 1 : 0))
      const emb3 = new Array(1024).fill(0).map((_, i) => (i % 5 === 0 ? 1 : 0))
      ;(generateEmbedding as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(emb2)
        .mockResolvedValueOnce(emb3)

      const result = await filterDuplicatesFromBatch(items, mockUserId, (item) => item.question)

      expect(result.uniqueItems).toHaveLength(2)
      expect(result.uniqueItems).toEqual([items[1], items[2]])
      expect(result.filteredItems).toHaveLength(1)
      expect(result.filteredItems[0]).toEqual({
        item: items[0],
        reason: 'duplicate_existing',
        similarTo: 'existing-123',
        score: 0.92,
      })
      expect(result.stats).toEqual({
        total: 3,
        unique: 2,
        duplicatesRemoved: 1,
      })
    })

    it('should filter multiple items duplicating different existing cards', async () => {
      const items: TestFlashcard[] = [
        { id: '1', question: 'What is photosynthesis?', answer: 'Answer 1' },
        { id: '2', question: 'What is unique topic A?', answer: 'Answer 2' },
        { id: '3', question: 'What is gravity?', answer: 'Answer 3' },
        { id: '4', question: 'What is unique topic B?', answer: 'Answer 4' },
      ]

      // Items 1 and 3 are duplicates of different existing cards
      ;(findSimilarFlashcardsWithThreshold as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([{ id: 'existing-1', similarity: 0.9 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'existing-3', similarity: 0.88 }])
        .mockResolvedValueOnce([])

      // Mock embeddings for unique items (2 and 4) - different patterns
      const emb2 = new Array(1024).fill(0).map((_, i) => (i % 3 === 0 ? 1 : 0))
      const emb4 = new Array(1024).fill(0).map((_, i) => (i % 5 === 0 ? 1 : 0))
      ;(generateEmbedding as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(emb2)
        .mockResolvedValueOnce(emb4)

      const result = await filterDuplicatesFromBatch(items, mockUserId, (item) => item.question)

      expect(result.uniqueItems).toHaveLength(2)
      expect(result.filteredItems).toHaveLength(2)
      expect(result.stats.duplicatesRemoved).toBe(2)
    })
  })

  describe('Duplicate Within Batch', () => {
    it('should filter out items similar to other items in same batch', async () => {
      const items: TestFlashcard[] = [
        { id: '1', question: 'What is photosynthesis?', answer: 'Answer 1' },
        { id: '2', question: 'Define photosynthesis', answer: 'Answer 2' }, // Similar to item 1
        { id: '3', question: 'What is mitosis?', answer: 'Answer 3' },
      ]

      // No existing duplicates
      ;(findSimilarFlashcardsWithThreshold as ReturnType<typeof vi.fn>).mockResolvedValue([])

      // Mock embeddings - make items 1 and 2 very similar, item 3 different
      const embedding1 = new Array(1024).fill(0).map((_, i) => (i % 2 === 0 ? 0.8 : 0.2))
      const embedding2 = new Array(1024).fill(0).map((_, i) => (i % 2 === 0 ? 0.81 : 0.19))
      const embedding3 = new Array(1024).fill(0).map((_, i) => (i % 2 === 0 ? 0.2 : 0.8))
      ;(generateEmbedding as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(embedding1) // Item 1
        .mockResolvedValueOnce(embedding2) // Item 2 - very similar pattern
        .mockResolvedValueOnce(embedding3) // Item 3 - different pattern

      const result = await filterDuplicatesFromBatch(items, mockUserId, (item) => item.question)

      // Item 2 should be filtered as duplicate of item 1
      expect(result.uniqueItems).toHaveLength(2)
      expect(result.uniqueItems).toContainEqual(items[0])
      expect(result.uniqueItems).toContainEqual(items[2])
      expect(result.filteredItems).toHaveLength(1)
      expect(result.filteredItems[0].item).toEqual(items[1])
      expect(result.filteredItems[0].reason).toBe('duplicate_in_batch')
      expect(result.stats).toEqual({
        total: 3,
        unique: 2,
        duplicatesRemoved: 1,
      })
    })

    it('should keep first occurrence when multiple batch items are similar', async () => {
      const items: TestFlashcard[] = [
        { id: '1', question: 'What is JavaScript?', answer: 'Programming language' },
        { id: '2', question: 'Define JavaScript', answer: 'Scripting language' },
        { id: '3', question: 'Explain JavaScript', answer: 'Web programming language' },
      ]

      ;(findSimilarFlashcardsWithThreshold as ReturnType<typeof vi.fn>).mockResolvedValue([])

      // All items have very similar embeddings
      ;(generateEmbedding as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(new Array(1024).fill(0.9))
        .mockResolvedValueOnce(new Array(1024).fill(0.91))
        .mockResolvedValueOnce(new Array(1024).fill(0.89))

      const result = await filterDuplicatesFromBatch(items, mockUserId, (item) => item.question)

      // Should keep only the first item
      expect(result.uniqueItems).toHaveLength(1)
      expect(result.uniqueItems[0]).toEqual(items[0])
      expect(result.filteredItems).toHaveLength(2)
      expect(result.stats.duplicatesRemoved).toBe(2)
    })
  })

  describe('Mixed Duplicates', () => {
    it('should handle both existing and in-batch duplicates', async () => {
      const items: TestFlashcard[] = [
        { id: '1', question: 'What is photosynthesis?', answer: 'A1' }, // Duplicate of existing
        { id: '2', question: 'What is mitosis?', answer: 'A2' }, // Unique
        { id: '3', question: 'Define mitosis', answer: 'A3' }, // Duplicate of item 2 (in-batch)
        { id: '4', question: 'What is gravity?', answer: 'A4' }, // Duplicate of existing
      ]

      ;(findSimilarFlashcardsWithThreshold as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([{ id: 'existing-1', similarity: 0.9 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'existing-4', similarity: 0.87 }])

      // Make items 2 and 3 similar
      ;(generateEmbedding as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(new Array(1024).fill(0.5)) // Item 2
        .mockResolvedValueOnce(new Array(1024).fill(0.51)) // Item 3 - similar to item 2

      const result = await filterDuplicatesFromBatch(items, mockUserId, (item) => item.question)

      expect(result.uniqueItems).toHaveLength(1)
      expect(result.uniqueItems[0]).toEqual(items[1])
      expect(result.filteredItems).toHaveLength(3)
      expect(result.stats).toEqual({
        total: 4,
        unique: 1,
        duplicatesRemoved: 3,
      })

      // Verify reasons
      const existingDuplicates = result.filteredItems.filter(
        (f) => f.reason === 'duplicate_existing'
      )
      const batchDuplicates = result.filteredItems.filter((f) => f.reason === 'duplicate_in_batch')
      expect(existingDuplicates).toHaveLength(2)
      expect(batchDuplicates).toHaveLength(1)
    })
  })

  describe('All Duplicates', () => {
    it('should handle batch where all items are duplicates', async () => {
      const items: TestFlashcard[] = [
        { id: '1', question: 'What is DNA?', answer: 'A1' },
        { id: '2', question: 'Define DNA', answer: 'A2' },
        { id: '3', question: 'Explain DNA', answer: 'A3' },
      ]

      // All items duplicate existing cards
      ;(findSimilarFlashcardsWithThreshold as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'existing-dna', similarity: 0.95 },
      ])
      ;(generateEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue(new Array(1024).fill(0.5))

      const result = await filterDuplicatesFromBatch(items, mockUserId, (item) => item.question)

      expect(result.uniqueItems).toHaveLength(0)
      expect(result.filteredItems).toHaveLength(3)
      expect(result.stats).toEqual({
        total: 3,
        unique: 0,
        duplicatesRemoved: 3,
      })
    })
  })

  describe('FilteredItem Details', () => {
    it('should include correct similarTo references in filteredItems', async () => {
      const items: TestFlashcard[] = [
        { id: '1', question: 'What is photosynthesis?', answer: 'A1' },
        { id: '2', question: 'What is mitosis?', answer: 'A2' },
      ]

      ;(findSimilarFlashcardsWithThreshold as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([{ id: 'existing-123', similarity: 0.92 }])
        .mockResolvedValueOnce([{ id: 'existing-456', similarity: 0.88 }])
      ;(generateEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue(new Array(1024).fill(0.5))

      const result = await filterDuplicatesFromBatch(items, mockUserId, (item) => item.question)

      expect(result.filteredItems).toHaveLength(2)
      expect(result.filteredItems[0].similarTo).toBe('existing-123')
      expect(result.filteredItems[0].score).toBe(0.92)
      expect(result.filteredItems[1].similarTo).toBe('existing-456')
      expect(result.filteredItems[1].score).toBe(0.88)
    })

    it('should include item reference in filteredItems for in-batch duplicates', async () => {
      const items: TestFlashcard[] = [
        { id: '1', question: 'What is JavaScript?', answer: 'A1' },
        { id: '2', question: 'Define JavaScript', answer: 'A2' },
      ]

      ;(findSimilarFlashcardsWithThreshold as ReturnType<typeof vi.fn>).mockResolvedValue([])
      ;(generateEmbedding as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(new Array(1024).fill(0.9))
        .mockResolvedValueOnce(new Array(1024).fill(0.91))

      const result = await filterDuplicatesFromBatch(items, mockUserId, (item) => item.question)

      expect(result.filteredItems).toHaveLength(1)
      expect(result.filteredItems[0].reason).toBe('duplicate_in_batch')
      expect(result.filteredItems[0].similarTo).toBe('What is JavaScript?') // Text of first item
      expect(result.filteredItems[0].score).toBeGreaterThanOrEqual(0.85)
    })
  })

  describe('Custom Text Extraction', () => {
    it('should use getTextForEmbedding function correctly', async () => {
      interface CustomItem {
        id: string
        title: string
        description: string
      }

      const items: CustomItem[] = [
        { id: '1', title: 'Goal 1', description: 'Learn JavaScript' },
        { id: '2', title: 'Goal 2', description: 'Learn Python' },
      ]

      ;(findSimilarFlashcardsWithThreshold as ReturnType<typeof vi.fn>).mockResolvedValue([])
      ;(generateEmbedding as ReturnType<typeof vi.fn>).mockResolvedValue(new Array(1024).fill(0.5))

      // Custom text extraction combining title and description
      await filterDuplicatesFromBatch(
        items,
        mockUserId,
        (item) => `${item.title} ${item.description}`
      )

      // Verify findSimilarFlashcardsWithThreshold was called with combined text
      expect(findSimilarFlashcardsWithThreshold).toHaveBeenCalledWith(
        'Goal 1 Learn JavaScript',
        mockUserId,
        expect.any(Number),
        expect.any(Number)
      )
      expect(findSimilarFlashcardsWithThreshold).toHaveBeenCalledWith(
        'Goal 2 Learn Python',
        mockUserId,
        expect.any(Number),
        expect.any(Number)
      )
    })
  })

  describe('Stats Accuracy', () => {
    it('should return accurate stats for mixed scenario', async () => {
      const items: TestFlashcard[] = [
        { id: '1', question: 'What is Question 1?', answer: 'A1' }, // Unique
        { id: '2', question: 'What is Question 2?', answer: 'A2' }, // Duplicate existing
        { id: '3', question: 'What is Question 3?', answer: 'A3' }, // Unique
        { id: '4', question: 'What is Question 4?', answer: 'A4' }, // Duplicate in-batch (similar to Q1)
        { id: '5', question: 'What is Question 5?', answer: 'A5' }, // Duplicate existing
      ]

      ;(findSimilarFlashcardsWithThreshold as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([]) // Q1 - no existing duplicate
        .mockResolvedValueOnce([{ id: 'ex-1', similarity: 0.9 }]) // Q2 - duplicate of existing
        .mockResolvedValueOnce([]) // Q3 - no existing duplicate
        .mockResolvedValueOnce([]) // Q4 - no existing duplicate (will be in-batch dup of Q1)
        .mockResolvedValueOnce([{ id: 'ex-2', similarity: 0.88 }]) // Q5 - duplicate of existing

      // Create embeddings with different patterns
      const embeddingQ1 = new Array(1024).fill(0).map((_, i) => (i % 2 === 0 ? 0.8 : 0.2))
      const embeddingQ3 = new Array(1024).fill(0).map((_, i) => (i % 3 === 0 ? 0.9 : 0.1))
      const embeddingQ4 = new Array(1024).fill(0).map((_, i) => (i % 2 === 0 ? 0.81 : 0.19)) // Similar to Q1
      ;(generateEmbedding as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(embeddingQ1) // Q1
        .mockResolvedValueOnce(embeddingQ3) // Q3
        .mockResolvedValueOnce(embeddingQ4) // Q4 - similar to Q1

      const result = await filterDuplicatesFromBatch(items, mockUserId, (item) => item.question)

      expect(result.stats).toEqual({
        total: 5,
        unique: 2,
        duplicatesRemoved: 3,
      })
      expect(result.uniqueItems.length).toBe(result.stats.unique)
      expect(result.filteredItems.length).toBe(result.stats.duplicatesRemoved)
      expect(result.stats.total).toBe(result.stats.unique + result.stats.duplicatesRemoved)
    })
  })
})
