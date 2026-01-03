// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createUser } from '@/lib/db/operations/users'
import { createGoal } from '@/lib/db/operations/goals'
import { createSkillTree } from '@/lib/db/operations/skill-trees'
import { createSkillNode } from '@/lib/db/operations/skill-nodes'
import { createFlashcard } from '@/lib/db/operations/flashcards'
import { syncFlashcardToLanceDB } from '@/lib/db/operations/flashcards-lancedb'
import { closeDbConnection } from '@/lib/db/client'
import { hashPassword } from '@/lib/auth/helpers'
import type { BatchFilterResult } from '@/lib/dedup/types'

/**
 * Integration Tests for Batch Filter Duplicate Detection (T026)
 *
 * Tests the full batch filtering flow with real databases (PostgreSQL + LanceDB).
 * These tests will FAIL until the implementation is complete (TDD approach).
 *
 * Feature: 023-dedupe
 * User Story 3: Bulk AI Generation Deduplication
 */

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

describe('Batch Filter - Integration Tests', () => {
  const timestamp = Date.now()
  let testUserId: string
  let testNodeId: string

  interface TestFlashcardInput {
    question: string
    answer: string
  }

  beforeAll(async () => {
    // Create test user
    const passwordHash = await hashPassword('TestPass123!')
    const user = await createUser({
      email: `test-batch-filter-${timestamp}@example.com`,
      passwordHash,
      name: 'Batch Filter Test User',
    })
    testUserId = user.id

    // Create goal and node for flashcards
    const goal = await createGoal({
      userId: testUserId,
      title: 'Test Goal for Batch Filter',
      description: 'Goal for batch filter dedup tests',
    })

    const tree = await createSkillTree({
      goalId: goal.id,
    })

    const node = await createSkillNode({
      treeId: tree.id,
      parentId: null,
      title: 'Test Node',
      description: 'Node for batch filter tests',
      depth: 0,
      path: '1',
      sortOrder: 0,
    })
    testNodeId = node.id
  })

  afterAll(async () => {
    await closeDbConnection()
  })

  describe('Full Batch Filter Flow', () => {
    it('should filter batch items that duplicate existing flashcards', async () => {
      // Create existing flashcards
      const existingCard1 = await createFlashcard({
        userId: testUserId,
        question: 'What is photosynthesis?',
        answer: 'Process by which plants convert light to energy',
        skillNodeId: testNodeId,
      })

      const existingCard2 = await createFlashcard({
        userId: testUserId,
        question: 'What is cellular respiration?',
        answer: 'Process that releases energy from glucose',
        skillNodeId: testNodeId,
      })

      // Sync to LanceDB
      await syncFlashcardToLanceDB({
        id: existingCard1.id,
        userId: testUserId,
        question: existingCard1.question,
      })

      await syncFlashcardToLanceDB({
        id: existingCard2.id,
        userId: testUserId,
        question: existingCard2.question,
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Batch with some duplicates and some unique items
      const batchItems: TestFlashcardInput[] = [
        { question: 'Define photosynthesis', answer: 'Light conversion in plants' }, // Duplicate of existingCard1
        { question: 'What is mitosis?', answer: 'Cell division process' }, // Unique
        { question: 'Explain cellular respiration', answer: 'Energy release from food' }, // Duplicate of existingCard2
        { question: 'What is osmosis?', answer: 'Water movement across membranes' }, // Unique
      ]

      const result = await filterDuplicatesFromBatch(
        batchItems,
        testUserId,
        (item) => item.question
      )

      // Should have 2 unique items
      expect(result.uniqueItems).toHaveLength(2)
      expect(result.uniqueItems[0].question).toBe('What is mitosis?')
      expect(result.uniqueItems[1].question).toBe('What is osmosis?')

      // Should have 2 filtered items
      expect(result.filteredItems).toHaveLength(2)
      expect(result.filteredItems.every((f) => f.reason === 'duplicate_existing')).toBe(true)

      // Verify filtered items include correct duplicate IDs
      const filteredIds = result.filteredItems.map((f) => f.similarTo)
      expect(filteredIds).toContain(existingCard1.id)
      expect(filteredIds).toContain(existingCard2.id)

      // Verify stats
      expect(result.stats).toEqual({
        total: 4,
        unique: 2,
        duplicatesRemoved: 2,
      })
    })

    it('should detect and filter in-batch duplicates', async () => {
      const batchItems: TestFlashcardInput[] = [
        { question: 'What is quantum mechanics?', answer: 'Physics of subatomic particles' },
        { question: 'Define quantum mechanics', answer: 'Study of quantum phenomena' }, // Duplicate of first
        { question: 'What is relativity?', answer: 'Einstein theory of spacetime' },
        { question: 'Explain relativity', answer: 'Physics theory by Einstein' }, // Duplicate of third
        { question: 'What is thermodynamics?', answer: 'Study of heat and energy' }, // Unique
      ]

      const result = await filterDuplicatesFromBatch(
        batchItems,
        testUserId,
        (item) => item.question
      )

      // Should keep first occurrence of each unique concept
      expect(result.uniqueItems).toHaveLength(3)
      expect(result.uniqueItems[0].question).toBe('What is quantum mechanics?')
      expect(result.uniqueItems[1].question).toBe('What is relativity?')
      expect(result.uniqueItems[2].question).toBe('What is thermodynamics?')

      // Should filter 2 in-batch duplicates
      expect(result.filteredItems).toHaveLength(2)
      expect(result.filteredItems.every((f) => f.reason === 'duplicate_in_batch')).toBe(true)

      expect(result.stats).toEqual({
        total: 5,
        unique: 3,
        duplicatesRemoved: 2,
      })
    })

    it('should handle batch with no duplicates', async () => {
      const batchItems: TestFlashcardInput[] = [
        {
          question: 'What is electromagnetic induction?',
          answer: 'Generating current from magnetism',
        },
        { question: 'What is entropy?', answer: 'Measure of disorder' },
        { question: 'What is wavelength?', answer: 'Distance between wave peaks' },
      ]

      const result = await filterDuplicatesFromBatch(
        batchItems,
        testUserId,
        (item) => item.question
      )

      expect(result.uniqueItems).toHaveLength(3)
      expect(result.filteredItems).toHaveLength(0)
      expect(result.stats).toEqual({
        total: 3,
        unique: 3,
        duplicatesRemoved: 0,
      })
    })

    it('should handle batch with all duplicates', async () => {
      // Create an existing flashcard
      const existingCard = await createFlashcard({
        userId: testUserId,
        question: 'What is DNA?',
        answer: 'Genetic material in cells',
        skillNodeId: testNodeId,
      })

      await syncFlashcardToLanceDB({
        id: existingCard.id,
        userId: testUserId,
        question: existingCard.question,
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Batch with all items duplicating the existing card
      const batchItems: TestFlashcardInput[] = [
        { question: 'Define DNA', answer: 'Genetic code' },
        { question: 'Explain DNA', answer: 'Molecule containing genetic info' },
        { question: 'What is deoxyribonucleic acid?', answer: 'DNA molecule' },
      ]

      const result = await filterDuplicatesFromBatch(
        batchItems,
        testUserId,
        (item) => item.question
      )

      expect(result.uniqueItems).toHaveLength(0)
      expect(result.filteredItems).toHaveLength(3)
      expect(result.stats).toEqual({
        total: 3,
        unique: 0,
        duplicatesRemoved: 3,
      })
    })

    it('should handle mixed duplicates (both existing and in-batch)', async () => {
      // Create existing flashcard about Python
      const pythonCard = await createFlashcard({
        userId: testUserId,
        question: 'What is Python?',
        answer: 'Programming language',
        skillNodeId: testNodeId,
      })

      await syncFlashcardToLanceDB({
        id: pythonCard.id,
        userId: testUserId,
        question: pythonCard.question,
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      const batchItems: TestFlashcardInput[] = [
        { question: 'Define Python programming language', answer: 'High-level language' }, // Duplicate existing
        { question: 'What is JavaScript?', answer: 'Web programming language' }, // Unique
        { question: 'Explain JavaScript', answer: 'Scripting language for web' }, // Duplicate in-batch (of #2)
        { question: 'What is TypeScript?', answer: 'Typed superset of JavaScript' }, // Unique
      ]

      const result = await filterDuplicatesFromBatch(
        batchItems,
        testUserId,
        (item) => item.question
      )

      expect(result.uniqueItems).toHaveLength(2)
      expect(result.filteredItems).toHaveLength(2)

      // Should have 1 duplicate_existing and 1 duplicate_in_batch
      const existingDuplicates = result.filteredItems.filter(
        (f) => f.reason === 'duplicate_existing'
      )
      const batchDuplicates = result.filteredItems.filter((f) => f.reason === 'duplicate_in_batch')

      expect(existingDuplicates).toHaveLength(1)
      expect(batchDuplicates).toHaveLength(1)

      expect(result.stats).toEqual({
        total: 4,
        unique: 2,
        duplicatesRemoved: 2,
      })
    })

    it('should return correct similarTo IDs in filtered items', async () => {
      // Create existing flashcard
      const existingCard = await createFlashcard({
        userId: testUserId,
        question: 'What is machine learning?',
        answer: 'AI that learns from data',
        skillNodeId: testNodeId,
      })

      await syncFlashcardToLanceDB({
        id: existingCard.id,
        userId: testUserId,
        question: existingCard.question,
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      const batchItems: TestFlashcardInput[] = [
        { question: 'Define machine learning', answer: 'Learning from data' },
      ]

      const result = await filterDuplicatesFromBatch(
        batchItems,
        testUserId,
        (item) => item.question
      )

      expect(result.filteredItems).toHaveLength(1)
      expect(result.filteredItems[0].similarTo).toBe(existingCard.id)
      expect(result.filteredItems[0].score).toBeGreaterThanOrEqual(0.85)
    })

    it('should handle empty batch', async () => {
      const batchItems: TestFlashcardInput[] = []

      const result = await filterDuplicatesFromBatch(
        batchItems,
        testUserId,
        (item) => item.question
      )

      expect(result.uniqueItems).toHaveLength(0)
      expect(result.filteredItems).toHaveLength(0)
      expect(result.stats).toEqual({
        total: 0,
        unique: 0,
        duplicatesRemoved: 0,
      })
    })

    it('should handle single item batch', async () => {
      const batchItems: TestFlashcardInput[] = [
        { question: 'What is a unique concept XYZ123?', answer: 'Some unique answer' },
      ]

      const result = await filterDuplicatesFromBatch(
        batchItems,
        testUserId,
        (item) => item.question
      )

      expect(result.uniqueItems).toHaveLength(1)
      expect(result.filteredItems).toHaveLength(0)
      expect(result.stats).toEqual({
        total: 1,
        unique: 1,
        duplicatesRemoved: 0,
      })
    })
  })

  describe('Real-world AI Generation Scenario', () => {
    it('should filter duplicates from AI-generated flashcard batch', async () => {
      // Simulate existing flashcards from previous generation
      const existingCards = [
        {
          question: 'What is a variable in programming?',
          answer: 'A named storage location',
        },
        {
          question: 'What is a function?',
          answer: 'A reusable block of code',
        },
      ]

      for (const cardData of existingCards) {
        const card = await createFlashcard({
          userId: testUserId,
          question: cardData.question,
          answer: cardData.answer,
          skillNodeId: testNodeId,
        })

        await syncFlashcardToLanceDB({
          id: card.id,
          userId: testUserId,
          question: card.question,
        })
      }

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Simulate AI-generated batch with some duplicates
      const aiBatch: TestFlashcardInput[] = [
        { question: 'Define variable in programming', answer: 'Container for data' }, // Duplicate existing
        { question: 'What is a loop?', answer: 'Repeated execution of code' }, // Unique
        { question: 'Explain what a loop is', answer: 'Repetition structure' }, // Duplicate in-batch
        { question: 'What is an array?', answer: 'Collection of elements' }, // Unique
        { question: 'Explain functions in code', answer: 'Callable code blocks' }, // Duplicate existing
      ]

      const result = await filterDuplicatesFromBatch(aiBatch, testUserId, (item) => item.question)

      // Should filter out 3 duplicates (2 existing, 1 in-batch)
      expect(result.uniqueItems).toHaveLength(2)
      expect(result.filteredItems).toHaveLength(3)
      expect(result.stats).toEqual({
        total: 5,
        unique: 2,
        duplicatesRemoved: 3,
      })

      // Verify the unique items are the non-duplicate ones
      const uniqueQuestions = result.uniqueItems.map((item) => item.question)
      expect(uniqueQuestions).toContain('What is a loop?')
      expect(uniqueQuestions).toContain('What is an array?')
    })
  })

  describe('Different Content Types', () => {
    it('should work with custom text extraction for goal-like items', async () => {
      interface GoalInput {
        title: string
        description: string
      }

      const goalBatch: GoalInput[] = [
        { title: 'Learn React', description: 'Master React library for web development' },
        { title: 'Master React', description: 'Learn React framework for building UIs' }, // Similar to first
        { title: 'Learn Python', description: 'Learn Python programming language' },
      ]

      const result = await filterDuplicatesFromBatch(
        goalBatch,
        testUserId,
        (item) => `${item.title} ${item.description}`
      )

      // Should filter the duplicate React goal
      expect(result.uniqueItems).toHaveLength(2)
      expect(result.filteredItems).toHaveLength(1)
      expect(result.stats.duplicatesRemoved).toBe(1)
    })
  })

  describe('Score Verification', () => {
    it('should include similarity scores in filtered items', async () => {
      // Create existing card
      const existingCard = await createFlashcard({
        userId: testUserId,
        question: 'What is blockchain?',
        answer: 'Distributed ledger technology',
        skillNodeId: testNodeId,
      })

      await syncFlashcardToLanceDB({
        id: existingCard.id,
        userId: testUserId,
        question: existingCard.question,
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      const batchItems: TestFlashcardInput[] = [
        { question: 'Define blockchain technology', answer: 'Decentralized ledger' },
      ]

      const result = await filterDuplicatesFromBatch(
        batchItems,
        testUserId,
        (item) => item.question
      )

      expect(result.filteredItems).toHaveLength(1)
      expect(result.filteredItems[0].score).toBeGreaterThanOrEqual(0.85)
      expect(result.filteredItems[0].score).toBeLessThanOrEqual(1.0)
    })
  })
})
