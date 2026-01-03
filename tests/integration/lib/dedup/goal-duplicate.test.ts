// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createUser } from '@/lib/db/operations/users'
import { createGoal } from '@/lib/db/operations/goals'
import { syncGoalToLanceDB } from '@/lib/db/operations/goals-lancedb'
import { closeDbConnection } from '@/lib/db/client'
import { hashPassword } from '@/lib/auth/helpers'
import { checkGoalDuplicate } from '@/lib/dedup/similarity-check'

/**
 * Integration Tests for Goal Duplicate Detection (T019)
 *
 * Tests the full duplicate detection flow with real databases (PostgreSQL + LanceDB).
 * These tests will FAIL until the implementation is complete (TDD approach).
 *
 * Feature: 023-dedupe
 * User Story 2: Goal Duplicate Detection
 */

describe('Goal Duplicate Detection - Integration Tests', () => {
  const timestamp = Date.now()
  let testUserId: string
  let otherUserId: string

  beforeAll(async () => {
    // Create test user 1
    const passwordHash = await hashPassword('TestPass123!')
    const user = await createUser({
      email: `test-goal-dedup-int-${timestamp}@example.com`,
      passwordHash,
      name: 'Goal Dedup Integration Test User',
    })
    testUserId = user.id

    // Create test user 2 (for user isolation tests)
    const otherUser = await createUser({
      email: `test-goal-dedup-int-other-${timestamp}@example.com`,
      passwordHash,
      name: 'Other Goal Dedup Test User',
    })
    otherUserId = otherUser.id
  })

  afterAll(async () => {
    await closeDbConnection()
  })

  describe('Full Duplicate Detection Flow', () => {
    it('should detect duplicate when similar goal exists', async () => {
      // Create an existing goal
      const existingGoal = await createGoal({
        userId: testUserId,
        title: 'Learn Python programming',
        description: 'Master Python from basics to advanced concepts',
      })

      // Sync to LanceDB for vector search
      await syncGoalToLanceDB({
        id: existingGoal.id,
        userId: testUserId,
        title: existingGoal.title,
        description: existingGoal.description,
      })

      // Small delay to ensure LanceDB indexing completes
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Check for duplicate with similar goal
      const result = await checkGoalDuplicate({
        title: 'Master Python development',
        description: 'Learn Python coding from beginner to expert',
        userId: testUserId,
      })

      expect(result.isDuplicate).toBe(true)
      expect(result.similarItems.length).toBeGreaterThan(0)
      expect(result.topScore).toBeGreaterThan(0.85)
      expect(result.checkSkipped).toBe(false)

      // Verify the similar item structure
      const similarItem = result.similarItems[0]
      expect(similarItem.id).toBe(existingGoal.id)
      expect(similarItem.displayText).toBe('Learn Python programming')
      expect(similarItem.type).toBe('goal')
      expect(similarItem.score).toBeGreaterThan(0.85)
    })

    it('should return no duplicates for unique content', async () => {
      // Create a goal on a unique topic
      const uniqueGoal = await createGoal({
        userId: testUserId,
        title: 'Learn quantum computing',
        description: 'Understand quantum algorithms and quantum mechanics',
      })

      await syncGoalToLanceDB({
        id: uniqueGoal.id,
        userId: testUserId,
        title: uniqueGoal.title,
        description: uniqueGoal.description,
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Check for duplicate with completely different topic
      const result = await checkGoalDuplicate({
        title: 'Master classical music composition',
        description: 'Learn orchestration and music theory',
        userId: testUserId,
      })

      expect(result.isDuplicate).toBe(false)
      expect(result.similarItems.length).toBe(0)
      expect(result.topScore).toBeNull()
      expect(result.checkSkipped).toBe(false)
    })

    it('should return multiple similar items sorted by score', async () => {
      // Create several similar goals about web development
      const webGoal1 = await createGoal({
        userId: testUserId,
        title: 'Learn web development',
        description: 'HTML, CSS, and JavaScript fundamentals',
      })

      const webGoal2 = await createGoal({
        userId: testUserId,
        title: 'Master frontend development',
        description: 'Build modern web applications',
      })

      const webGoal3 = await createGoal({
        userId: testUserId,
        title: 'Become a full-stack web developer',
        description: 'Frontend and backend technologies',
      })

      // Sync all to LanceDB
      await syncGoalToLanceDB({
        id: webGoal1.id,
        userId: testUserId,
        title: webGoal1.title,
        description: webGoal1.description,
      })
      await syncGoalToLanceDB({
        id: webGoal2.id,
        userId: testUserId,
        title: webGoal2.title,
        description: webGoal2.description,
      })
      await syncGoalToLanceDB({
        id: webGoal3.id,
        userId: testUserId,
        title: webGoal3.title,
        description: webGoal3.description,
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Check for similar goal about web development
      const result = await checkGoalDuplicate({
        title: 'Learn frontend web development',
        description: 'Build responsive websites',
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

    it('should handle goals without descriptions', async () => {
      // Create a goal with no description
      const simpleGoal = await createGoal({
        userId: testUserId,
        title: 'Learn TypeScript programming',
        description: undefined,
      })

      await syncGoalToLanceDB({
        id: simpleGoal.id,
        userId: testUserId,
        title: simpleGoal.title,
        description: simpleGoal.description,
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Check for duplicate with similar title (no description)
      const result = await checkGoalDuplicate({
        title: 'Master TypeScript development',
        userId: testUserId,
      })

      expect(result.isDuplicate).toBe(true)
      expect(result.similarItems.length).toBeGreaterThan(0)
      expect(result.similarItems[0].id).toBe(simpleGoal.id)
      expect(result.similarItems[0].displayText).toBe('Learn TypeScript programming')
    })

    it('should detect duplicates when only title matches (no description)', async () => {
      // Create goal with title only
      const titleOnlyGoal = await createGoal({
        userId: testUserId,
        title: 'Learn Rust programming',
        description: undefined,
      })

      await syncGoalToLanceDB({
        id: titleOnlyGoal.id,
        userId: testUserId,
        title: titleOnlyGoal.title,
        description: titleOnlyGoal.description,
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Check with a similar title but with description
      const result = await checkGoalDuplicate({
        title: 'Master Rust development',
        description: 'Systems programming language',
        userId: testUserId,
      })

      expect(result.isDuplicate).toBe(true)
      expect(result.similarItems.some((item) => item.id === titleOnlyGoal.id)).toBe(true)
    })
  })

  describe('User Isolation', () => {
    it('should not return goals from other users', async () => {
      // Create a goal for user 1
      const user1Goal = await createGoal({
        userId: testUserId,
        title: 'Learn React framework',
        description: 'Build modern user interfaces',
      })

      await syncGoalToLanceDB({
        id: user1Goal.id,
        userId: testUserId,
        title: user1Goal.title,
        description: user1Goal.description,
      })

      // Create similar goal for user 2
      const user2Goal = await createGoal({
        userId: otherUserId,
        title: 'Master React development',
        description: 'Advanced React patterns and hooks',
      })

      await syncGoalToLanceDB({
        id: user2Goal.id,
        userId: otherUserId,
        title: user2Goal.title,
        description: user2Goal.description,
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Check for duplicates as user 1
      const user1Result = await checkGoalDuplicate({
        title: 'Learn React programming',
        description: 'Component-based UI development',
        userId: testUserId,
      })

      // Should only find user 1's goal, not user 2's
      expect(user1Result.similarItems.every((item) => item.id === user1Goal.id)).toBe(true)
      expect(user1Result.similarItems.every((item) => item.id !== user2Goal.id)).toBe(true)

      // Check for duplicates as user 2
      const user2Result = await checkGoalDuplicate({
        title: 'Learn React programming',
        description: 'Component-based UI development',
        userId: otherUserId,
      })

      // Should only find user 2's goal, not user 1's
      expect(user2Result.similarItems.every((item) => item.id === user2Goal.id)).toBe(true)
      expect(user2Result.similarItems.every((item) => item.id !== user1Goal.id)).toBe(true)
    })
  })

  describe('Content Length Validation', () => {
    it('should skip duplicate check for very short content', async () => {
      const result = await checkGoalDuplicate({
        title: 'Learn',
        userId: testUserId,
      })

      expect(result.checkSkipped).toBe(true)
      expect(result.skipReason).toBe('content_too_short')
      expect(result.isDuplicate).toBe(false)
    })

    it('should accept content with exactly 10 characters', async () => {
      const result = await checkGoalDuplicate({
        title: '1234567890',
        userId: testUserId,
      })

      expect(result.checkSkipped).toBe(false)
    })

    it('should accept normal-length titles', async () => {
      const result = await checkGoalDuplicate({
        title: 'Learn advanced JavaScript programming',
        userId: testUserId,
      })

      expect(result.checkSkipped).toBe(false)
    })

    it('should check combined title + description length', async () => {
      // Title alone is too short, but combined with description is long enough
      const result = await checkGoalDuplicate({
        title: 'Short',
        description: 'But this description makes it valid',
        userId: testUserId,
      })

      expect(result.checkSkipped).toBe(false)
    })
  })

  describe('Similarity Threshold', () => {
    it('should not return items below 0.85 threshold', async () => {
      // Create a goal
      const goal = await createGoal({
        userId: testUserId,
        title: 'Learn machine learning',
        description: 'AI and data science fundamentals',
      })

      await syncGoalToLanceDB({
        id: goal.id,
        userId: testUserId,
        title: goal.title,
        description: goal.description,
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Check with a somewhat related but different topic
      // This should have low similarity and be filtered out
      const result = await checkGoalDuplicate({
        title: 'Learn blockchain technology',
        description: 'Cryptocurrency and distributed systems',
        userId: testUserId,
      })

      // All returned items should have score >= 0.85
      result.similarItems.forEach((item) => {
        expect(item.score).toBeGreaterThanOrEqual(0.85)
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle goals without LanceDB sync gracefully', async () => {
      // Create a goal but don't sync to LanceDB
      await createGoal({
        userId: testUserId,
        title: 'Learn database design',
        description: 'SQL and NoSQL databases',
      })

      // This should still work - just won't find the unsynced goal
      const result = await checkGoalDuplicate({
        title: 'Master database architecture',
        userId: testUserId,
      })

      // Should not crash, may or may not find similar items
      expect(result).toHaveProperty('isDuplicate')
      expect(result).toHaveProperty('similarItems')
    })
  })

  describe('Title as Display Text', () => {
    it('should use goal title as displayText even when description exists', async () => {
      const goal = await createGoal({
        userId: testUserId,
        title: 'Learn Advanced Mathematics',
        description: 'Calculus, Linear Algebra, and Differential Equations',
      })

      await syncGoalToLanceDB({
        id: goal.id,
        userId: testUserId,
        title: goal.title,
        description: goal.description,
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      const result = await checkGoalDuplicate({
        title: 'Master Mathematics',
        description: 'Advanced math topics',
        userId: testUserId,
      })

      if (result.isDuplicate) {
        expect(result.similarItems[0].displayText).toBe('Learn Advanced Mathematics')
      }
    })
  })

  describe('Combined Text Matching', () => {
    it('should match on description when title differs slightly', async () => {
      // Create a goal with distinctive description
      const goal = await createGoal({
        userId: testUserId,
        title: 'Programming Goal',
        description: 'Master the Go programming language for concurrent systems',
      })

      await syncGoalToLanceDB({
        id: goal.id,
        userId: testUserId,
        title: goal.title,
        description: goal.description,
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Check with different title but similar description
      const result = await checkGoalDuplicate({
        title: 'Learning Objective',
        description: 'Learn Go programming for concurrent applications',
        userId: testUserId,
      })

      // Should find match based on description similarity
      expect(result.isDuplicate).toBe(true)
      expect(result.similarItems.some((item) => item.id === goal.id)).toBe(true)
    })
  })
})
