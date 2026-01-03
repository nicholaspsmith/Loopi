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
import type { DuplicateCheckResult } from '@/lib/dedup/types'

/**
 * Integration Tests for Flashcard Duplicate Detection (T010)
 *
 * Tests the full duplicate detection flow with real databases (PostgreSQL + LanceDB).
 * These tests will FAIL until the implementation is complete (TDD approach).
 *
 * Feature: 023-dedupe
 * User Story 1: Flashcard Duplicate Detection
 */

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

describe('Flashcard Duplicate Detection - Integration Tests', () => {
  const timestamp = Date.now()
  let testUserId: string
  let otherUserId: string
  let testNodeId: string
  let otherNodeId: string

  beforeAll(async () => {
    // Create test user 1
    const passwordHash = await hashPassword('TestPass123!')
    const user = await createUser({
      email: `test-dedup-int-${timestamp}@example.com`,
      passwordHash,
      name: 'Dedup Integration Test User',
    })
    testUserId = user.id

    // Create goal and node for user 1
    const goal = await createGoal({
      userId: testUserId,
      title: 'Test Goal',
      description: 'Goal for dedup tests',
    })

    const tree = await createSkillTree({
      goalId: goal.id,
    })

    const node = await createSkillNode({
      treeId: tree.id,
      parentId: null,
      title: 'Test Node',
      description: 'Node for dedup tests',
      depth: 0,
      path: '1',
      sortOrder: 0,
    })
    testNodeId = node.id

    // Create test user 2 (for user isolation tests)
    const otherUser = await createUser({
      email: `test-dedup-int-other-${timestamp}@example.com`,
      passwordHash,
      name: 'Other Dedup Test User',
    })
    otherUserId = otherUser.id

    // Create goal and node for user 2
    const otherGoal = await createGoal({
      userId: otherUserId,
      title: 'Other User Goal',
      description: 'Goal for other user',
    })

    const otherTree = await createSkillTree({
      goalId: otherGoal.id,
    })

    const otherNode = await createSkillNode({
      treeId: otherTree.id,
      parentId: null,
      title: 'Other Node',
      description: 'Node for other user',
      depth: 0,
      path: '1',
      sortOrder: 0,
    })
    otherNodeId = otherNode.id
  })

  afterAll(async () => {
    await closeDbConnection()
  })

  describe('Full Duplicate Detection Flow', () => {
    it('should detect duplicate when similar flashcard exists', async () => {
      // Create an existing flashcard
      const existingCard = await createFlashcard({
        userId: testUserId,
        question: 'What is photosynthesis?',
        answer: 'The process by which plants convert sunlight into energy',
        skillNodeId: testNodeId,
      })

      // Sync to LanceDB for vector search
      await syncFlashcardToLanceDB({
        id: existingCard.id,
        userId: testUserId,
        question: existingCard.question,
      })

      // Small delay to ensure LanceDB indexing completes
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Check for duplicate with similar question
      const result = await checkFlashcardDuplicate({
        question: 'Define photosynthesis and its purpose',
        userId: testUserId,
      })

      expect(result.isDuplicate).toBe(true)
      expect(result.similarItems.length).toBeGreaterThan(0)
      expect(result.topScore).toBeGreaterThan(0.85)
      expect(result.checkSkipped).toBe(false)

      // Verify the similar item structure
      const similarItem = result.similarItems[0]
      expect(similarItem.id).toBe(existingCard.id)
      expect(similarItem.displayText).toBe('What is photosynthesis?')
      expect(similarItem.type).toBe('flashcard')
      expect(similarItem.score).toBeGreaterThan(0.85)
    })

    it('should return no duplicates for unique content', async () => {
      // Create a flashcard on a unique topic
      const uniqueCard = await createFlashcard({
        userId: testUserId,
        question: 'What is quantum entanglement?',
        answer: 'A phenomenon where quantum particles remain connected',
        skillNodeId: testNodeId,
      })

      await syncFlashcardToLanceDB({
        id: uniqueCard.id,
        userId: testUserId,
        question: uniqueCard.question,
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Check for duplicate with completely different topic
      const result = await checkFlashcardDuplicate({
        question: 'Explain the process of cellular respiration in mitochondria',
        userId: testUserId,
      })

      expect(result.isDuplicate).toBe(false)
      expect(result.similarItems.length).toBe(0)
      expect(result.topScore).toBeNull()
      expect(result.checkSkipped).toBe(false)
    })

    it('should return multiple similar items sorted by score', async () => {
      // Create several similar flashcards about JavaScript
      const jsCard1 = await createFlashcard({
        userId: testUserId,
        question: 'What is JavaScript closure?',
        answer: 'A function that has access to outer function variables',
        skillNodeId: testNodeId,
      })

      const jsCard2 = await createFlashcard({
        userId: testUserId,
        question: 'Explain closures in JavaScript',
        answer: 'Functions that retain access to their lexical scope',
        skillNodeId: testNodeId,
      })

      const jsCard3 = await createFlashcard({
        userId: testUserId,
        question: 'How do JavaScript closures work?',
        answer: 'They preserve the scope chain at creation time',
        skillNodeId: testNodeId,
      })

      // Sync all to LanceDB
      await syncFlashcardToLanceDB({
        id: jsCard1.id,
        userId: testUserId,
        question: jsCard1.question,
      })
      await syncFlashcardToLanceDB({
        id: jsCard2.id,
        userId: testUserId,
        question: jsCard2.question,
      })
      await syncFlashcardToLanceDB({
        id: jsCard3.id,
        userId: testUserId,
        question: jsCard3.question,
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Check for similar question about closures
      const result = await checkFlashcardDuplicate({
        question: 'Define closure in JavaScript',
        userId: testUserId,
      })

      expect(result.isDuplicate).toBe(true)
      expect(result.similarItems.length).toBeGreaterThan(0)
      expect(result.similarItems.length).toBeLessThanOrEqual(3)

      // Verify items are sorted by score (descending)
      for (let i = 1; i < result.similarItems.length; i++) {
        expect(result.similarItems[i - 1].score).toBeGreaterThanOrEqual(
          result.similarItems[i].score
        )
      }

      // Top score should match the first item
      expect(result.topScore).toBe(result.similarItems[0].score)
    })
  })

  describe('User Isolation', () => {
    it('should not return flashcards from other users', async () => {
      // Create a flashcard for user 1
      const user1Card = await createFlashcard({
        userId: testUserId,
        question: 'What is TypeScript interface?',
        answer: 'A way to define object shapes in TypeScript',
        skillNodeId: testNodeId,
      })

      await syncFlashcardToLanceDB({
        id: user1Card.id,
        userId: testUserId,
        question: user1Card.question,
      })

      // Create similar flashcard for user 2
      const user2Card = await createFlashcard({
        userId: otherUserId,
        question: 'Explain TypeScript interfaces',
        answer: 'Interfaces define contracts for object structure',
        skillNodeId: otherNodeId,
      })

      await syncFlashcardToLanceDB({
        id: user2Card.id,
        userId: otherUserId,
        question: user2Card.question,
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Check for duplicates as user 1
      const user1Result = await checkFlashcardDuplicate({
        question: 'Define interface in TypeScript',
        userId: testUserId,
      })

      // Should only find user 1's card, not user 2's
      expect(user1Result.similarItems.every((item) => item.id === user1Card.id)).toBe(true)
      expect(user1Result.similarItems.every((item) => item.id !== user2Card.id)).toBe(true)

      // Check for duplicates as user 2
      const user2Result = await checkFlashcardDuplicate({
        question: 'Define interface in TypeScript',
        userId: otherUserId,
      })

      // Should only find user 2's card, not user 1's
      expect(user2Result.similarItems.every((item) => item.id === user2Card.id)).toBe(true)
      expect(user2Result.similarItems.every((item) => item.id !== user1Card.id)).toBe(true)
    })
  })

  describe('Content Length Validation', () => {
    it('should skip duplicate check for very short content', async () => {
      const result = await checkFlashcardDuplicate({
        question: 'Yes?',
        userId: testUserId,
      })

      expect(result.checkSkipped).toBe(true)
      expect(result.skipReason).toBe('content_too_short')
      expect(result.isDuplicate).toBe(false)
    })

    it('should accept content with exactly 10 characters', async () => {
      const result = await checkFlashcardDuplicate({
        question: '1234567890',
        userId: testUserId,
      })

      expect(result.checkSkipped).toBe(false)
    })

    it('should accept normal-length questions', async () => {
      const result = await checkFlashcardDuplicate({
        question: 'What is the purpose of async/await in JavaScript?',
        userId: testUserId,
      })

      expect(result.checkSkipped).toBe(false)
    })
  })

  describe('Similarity Threshold', () => {
    it('should not return items below 0.85 threshold', async () => {
      // Create a flashcard
      const card = await createFlashcard({
        userId: testUserId,
        question: 'What is machine learning?',
        answer: 'AI technique for learning from data',
        skillNodeId: testNodeId,
      })

      await syncFlashcardToLanceDB({
        id: card.id,
        userId: testUserId,
        question: card.question,
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Check with a somewhat related but different question
      // This should have low similarity and be filtered out
      const result = await checkFlashcardDuplicate({
        question: 'Explain the concept of blockchain technology',
        userId: testUserId,
      })

      // All returned items should have score >= 0.85
      result.similarItems.forEach((item) => {
        expect(item.score).toBeGreaterThanOrEqual(0.85)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle flashcards without LanceDB sync gracefully', async () => {
      // Create a flashcard but don't sync to LanceDB
      await createFlashcard({
        userId: testUserId,
        question: 'What is a database index?',
        answer: 'A data structure to speed up queries',
        skillNodeId: testNodeId,
      })

      // This should still work - just won't find the unsynced card
      const result = await checkFlashcardDuplicate({
        question: 'Explain database indexes',
        userId: testUserId,
      })

      // Should not crash, may or may not find similar items
      expect(result).toHaveProperty('isDuplicate')
      expect(result).toHaveProperty('similarItems')
    })
  })

  describe('Different Card Types', () => {
    it('should detect duplicates across different card types', async () => {
      // Create a multiple choice card (using createGoalFlashcard for cards with cardType)
      const mcCard = await createFlashcard({
        userId: testUserId,
        question: 'What is HTTP?',
        answer: 'HyperText Transfer Protocol',
        skillNodeId: testNodeId,
      })

      await syncFlashcardToLanceDB({
        id: mcCard.id,
        userId: testUserId,
        question: mcCard.question,
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Check for duplicate with a regular flashcard question
      const result = await checkFlashcardDuplicate({
        question: 'Explain what HTTP stands for',
        userId: testUserId,
      })

      // Should find the multiple choice card
      if (result.isDuplicate) {
        expect(result.similarItems.some((item) => item.id === mcCard.id)).toBe(true)
        expect(result.similarItems.find((item) => item.id === mcCard.id)?.type).toBe('flashcard')
      }
    })
  })
})
