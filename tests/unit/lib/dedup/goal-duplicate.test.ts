import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Unit Tests for Goal Duplicate Detection (T017)
 *
 * Tests the checkGoalDuplicate function in isolation with mocked dependencies.
 * These tests will FAIL until the implementation is complete (TDD approach).
 *
 * Feature: 023-dedupe
 * User Story 2: Goal Duplicate Detection
 */

// Mock dependencies
vi.mock('@/lib/db/operations/goals-lancedb', () => ({
  findSimilarGoals: vi.fn(),
}))

vi.mock('@/lib/db/operations/goals', () => ({
  getGoalsByIds: vi.fn(),
}))

import { findSimilarGoals } from '@/lib/db/operations/goals-lancedb'
import { getGoalsByIds } from '@/lib/db/operations/goals'
import { checkGoalDuplicate } from '@/lib/dedup/similarity-check'

describe('checkGoalDuplicate', () => {
  const mockUserId = '550e8400-e29b-41d4-a716-446655440000'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Duplicate Detection', () => {
    it('should return isDuplicate=true when similarity > 0.85 threshold', async () => {
      // Mock LanceDB returning similar goal
      ;(findSimilarGoals as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'goal-123', similarity: 0.92 },
      ])

      // Mock PostgreSQL returning goal data
      ;(getGoalsByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'goal-123',
          userId: mockUserId,
          title: 'Learn Python programming',
          description: 'Master Python from basics to advanced',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])

      const result = await checkGoalDuplicate({
        title: 'Master Python development',
        description: 'Learn Python coding skills',
        userId: mockUserId,
      })

      expect(result.isDuplicate).toBe(true)
      expect(result.topScore).toBe(0.92)
      expect(result.similarItems).toHaveLength(1)
      expect(result.similarItems[0]).toEqual({
        id: 'goal-123',
        score: 0.92,
        displayText: 'Learn Python programming',
        type: 'goal',
      })
      expect(result.checkSkipped).toBe(false)
    })

    it('should return isDuplicate=false when no similar goals found', async () => {
      // Mock LanceDB returning empty results
      ;(findSimilarGoals as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const result = await checkGoalDuplicate({
        title: 'Learn quantum computing',
        userId: mockUserId,
      })

      expect(result.isDuplicate).toBe(false)
      expect(result.topScore).toBeNull()
      expect(result.similarItems).toHaveLength(0)
      expect(result.checkSkipped).toBe(false)
    })

    it('should return isDuplicate=false when similarity < 0.85', async () => {
      // Mock LanceDB returning items below threshold (should be filtered by LanceDB itself)
      ;(findSimilarGoals as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const result = await checkGoalDuplicate({
        title: 'Related but different goal',
        userId: mockUserId,
      })

      expect(result.isDuplicate).toBe(false)
      expect(result.topScore).toBeNull()
      expect(result.similarItems).toHaveLength(0)
    })

    it('should return up to 3 similar items with scores sorted descending', async () => {
      // Mock LanceDB returning 3 similar goals
      ;(findSimilarGoals as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'goal-1', similarity: 0.95 },
        { id: 'goal-2', similarity: 0.9 },
        { id: 'goal-3', similarity: 0.87 },
      ])

      // Mock PostgreSQL returning goal data
      ;(getGoalsByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'goal-1',
          userId: mockUserId,
          title: 'Goal 1',
          description: 'Description 1',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'goal-2',
          userId: mockUserId,
          title: 'Goal 2',
          description: 'Description 2',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'goal-3',
          userId: mockUserId,
          title: 'Goal 3',
          description: 'Description 3',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])

      const result = await checkGoalDuplicate({
        title: 'Similar goal',
        description: 'Test description',
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
      // Mock LanceDB returning exactly 3 (the limit)
      ;(findSimilarGoals as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'goal-1', similarity: 0.95 },
        { id: 'goal-2', similarity: 0.9 },
        { id: 'goal-3', similarity: 0.87 },
      ])

      // Mock PostgreSQL returning goal data
      ;(getGoalsByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'goal-1',
          userId: mockUserId,
          title: 'Goal 1',
          description: null,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'goal-2',
          userId: mockUserId,
          title: 'Goal 2',
          description: null,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'goal-3',
          userId: mockUserId,
          title: 'Goal 3',
          description: null,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])

      const result = await checkGoalDuplicate({
        title: 'Popular goal topic',
        userId: mockUserId,
      })

      expect(result.similarItems).toHaveLength(3)
      expect(findSimilarGoals).toHaveBeenCalledWith('Popular goal topic', mockUserId, 0.85, 3)
    })
  })

  describe('Combined Title and Description', () => {
    it('should combine title and description for checking', async () => {
      ;(findSimilarGoals as ReturnType<typeof vi.fn>).mockResolvedValue([])

      await checkGoalDuplicate({
        title: 'Learn TypeScript',
        description: 'From beginner to advanced',
        userId: mockUserId,
      })

      expect(findSimilarGoals).toHaveBeenCalledWith(
        'Learn TypeScript: From beginner to advanced',
        mockUserId,
        0.85,
        3
      )
    })

    it('should use only title when description is not provided', async () => {
      ;(findSimilarGoals as ReturnType<typeof vi.fn>).mockResolvedValue([])

      await checkGoalDuplicate({
        title: 'Learn TypeScript',
        userId: mockUserId,
      })

      expect(findSimilarGoals).toHaveBeenCalledWith('Learn TypeScript', mockUserId, 0.85, 3)
    })

    it('should use only title when description is empty string', async () => {
      ;(findSimilarGoals as ReturnType<typeof vi.fn>).mockResolvedValue([])

      await checkGoalDuplicate({
        title: 'Learn TypeScript',
        description: '',
        userId: mockUserId,
      })

      expect(findSimilarGoals).toHaveBeenCalledWith('Learn TypeScript', mockUserId, 0.85, 3)
    })
  })

  describe('Content Validation', () => {
    it('should return checkSkipped=true for content < 10 chars', async () => {
      const result = await checkGoalDuplicate({
        title: 'Short',
        userId: mockUserId,
      })

      expect(result.checkSkipped).toBe(true)
      expect(result.skipReason).toBe('content_too_short')
      expect(result.isDuplicate).toBe(false)
      expect(result.similarItems).toHaveLength(0)
      expect(result.topScore).toBeNull()
      expect(findSimilarGoals).not.toHaveBeenCalled()
    })

    it('should return checkSkipped=true for whitespace-only content', async () => {
      const result = await checkGoalDuplicate({
        title: '   \n   ',
        userId: mockUserId,
      })

      expect(result.checkSkipped).toBe(true)
      expect(result.skipReason).toBe('content_too_short')
      expect(findSimilarGoals).not.toHaveBeenCalled()
    })

    it('should accept content with exactly 10 characters', async () => {
      ;(findSimilarGoals as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const result = await checkGoalDuplicate({
        title: '1234567890',
        userId: mockUserId,
      })

      expect(result.checkSkipped).toBe(false)
      expect(findSimilarGoals).toHaveBeenCalled()
    })

    it('should check combined length of title and description', async () => {
      // Title alone is 5 chars, but combined with description exceeds 10
      ;(findSimilarGoals as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const result = await checkGoalDuplicate({
        title: 'Short',
        description: 'But this description makes it long enough',
        userId: mockUserId,
      })

      expect(result.checkSkipped).toBe(false)
      expect(findSimilarGoals).toHaveBeenCalled()
    })

    it('should skip if combined title and description < 10 chars', async () => {
      const result = await checkGoalDuplicate({
        title: 'Hi',
        description: 'World',
        userId: mockUserId,
      })

      // "Hi: World" = 9 chars, should skip
      expect(result.checkSkipped).toBe(true)
      expect(result.skipReason).toBe('content_too_short')
      expect(findSimilarGoals).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle LanceDB query failures gracefully', async () => {
      // Mock LanceDB throwing error
      ;(findSimilarGoals as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('LanceDB connection failed')
      )

      const result = await checkGoalDuplicate({
        title: 'Valid goal title text',
        userId: mockUserId,
      })

      expect(result.checkSkipped).toBe(true)
      expect(result.skipReason).toBe('service_unavailable')
      expect(result.isDuplicate).toBe(false)
    })

    it('should handle PostgreSQL query failures gracefully', async () => {
      // Mock LanceDB success
      ;(findSimilarGoals as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'goal-1', similarity: 0.9 },
      ])

      // Mock PostgreSQL throwing error
      ;(getGoalsByIds as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Database connection failed')
      )

      const result = await checkGoalDuplicate({
        title: 'Valid goal title text',
        userId: mockUserId,
      })

      expect(result.checkSkipped).toBe(true)
      expect(result.skipReason).toBe('service_unavailable')
    })

    it('should handle empty embedding results', async () => {
      // Mock LanceDB returning empty array (could happen if embedding fails internally)
      ;(findSimilarGoals as ReturnType<typeof vi.fn>).mockResolvedValue([])

      const result = await checkGoalDuplicate({
        title: 'Valid goal title',
        userId: mockUserId,
      })

      expect(result.isDuplicate).toBe(false)
      expect(result.similarItems).toHaveLength(0)
      expect(result.checkSkipped).toBe(false)
    })
  })

  describe('User Scoping', () => {
    it('should pass userId to LanceDB search to scope results', async () => {
      ;(findSimilarGoals as ReturnType<typeof vi.fn>).mockResolvedValue([])

      await checkGoalDuplicate({
        title: 'Test goal with enough chars',
        userId: mockUserId,
      })

      expect(findSimilarGoals).toHaveBeenCalledWith(
        'Test goal with enough chars',
        mockUserId,
        0.85,
        3
      )
    })

    it('should pass userId correctly when description is provided', async () => {
      ;(findSimilarGoals as ReturnType<typeof vi.fn>).mockResolvedValue([])

      await checkGoalDuplicate({
        title: 'Test goal',
        description: 'Test description',
        userId: mockUserId,
      })

      expect(findSimilarGoals).toHaveBeenCalledWith(
        'Test goal: Test description',
        mockUserId,
        0.85,
        3
      )
    })
  })

  describe('Display Text', () => {
    it('should use goal title as displayText', async () => {
      ;(findSimilarGoals as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'goal-1', similarity: 0.9 },
      ])
      ;(getGoalsByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'goal-1',
          userId: mockUserId,
          title: 'Learn Advanced Mathematics',
          description: 'Calculus, Linear Algebra, and more',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])

      const result = await checkGoalDuplicate({
        title: 'Master Mathematics',
        userId: mockUserId,
      })

      expect(result.similarItems[0].displayText).toBe('Learn Advanced Mathematics')
    })

    it('should handle goals without descriptions', async () => {
      ;(findSimilarGoals as ReturnType<typeof vi.fn>).mockResolvedValue([
        { id: 'goal-1', similarity: 0.9 },
      ])
      ;(getGoalsByIds as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: 'goal-1',
          userId: mockUserId,
          title: 'Learn React',
          description: null,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])

      const result = await checkGoalDuplicate({
        title: 'Master React development',
        userId: mockUserId,
      })

      expect(result.similarItems[0].displayText).toBe('Learn React')
    })
  })
})
