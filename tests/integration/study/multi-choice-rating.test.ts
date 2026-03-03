// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createUser } from '@/lib/db/operations/users'
import { createGoal } from '@/lib/db/operations/goals'
import { createSkillTree } from '@/lib/db/operations/skill-trees'
import { createSkillNode } from '@/lib/db/operations/skill-nodes'
import { createGoalFlashcard, getFlashcardById } from '@/lib/db/operations/flashcards'
import { hashPassword } from '@/lib/auth/helpers'
import { POST } from '@/app/api/study/rate/route'
import { NextRequest } from 'next/server'
import { State } from 'ts-fsrs'

/**
 * Integration Tests for Time-Based Rating Calculation in Multiple Choice Mode
 *
 * Tests T010-T013 from specs/017-multi-choice-distractors/tasks.md
 *
 * Per the spec:
 * - Time threshold: 10 seconds (10000ms)
 * - Fast correct (≤10s) → Good (rating 3)
 * - Slow correct (>10s) → Hard (rating 2)
 * - Incorrect → Again (rating 1)
 *
 * When studyMode is 'multiple_choice':
 * - Server calculates rating from responseTimeMs and isCorrect
 * - Client passes isCorrect implicitly via rating (1 = incorrect, 2/3/4 = correct)
 * - For correct: ≤10000ms → rating 3, >10000ms → rating 2
 * - For incorrect: rating 1
 */

// Mock the auth module
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

describe('Multiple Choice Time-Based Rating Integration', () => {
  let testUserId: string
  let testGoalId: string
  let testTreeId: string
  let testNodeId: string
  let testCardId: string
  const timestamp = Date.now()

  beforeAll(async () => {
    // Create test user
    const passwordHash = await hashPassword('TestPass123!')
    const user = await createUser({
      email: `mc-rating-test-${timestamp}@example.com`,
      passwordHash,
      name: 'MC Rating Test User',
    })
    testUserId = user.id

    // Create test goal
    const goal = await createGoal({
      userId: testUserId,
      title: 'Learn React Hooks',
      description: 'Master React Hooks',
    })
    testGoalId = goal.id

    // Create skill tree
    const tree = await createSkillTree({
      goalId: testGoalId,
    })
    testTreeId = tree.id

    // Create skill node
    const node = await createSkillNode({
      treeId: testTreeId,
      title: 'useState Hook',
      description: 'State management in React',
      depth: 1,
      path: '0',
      sortOrder: 0,
    })
    testNodeId = node.id

    // Create test flashcard
    const card = await createGoalFlashcard({
      userId: testUserId,
      skillNodeId: testNodeId,
      question: 'What does useState return?',
      answer: 'An array with state value and setter function',
      cardType: 'flashcard',
    })
    testCardId = card.id
  })

  afterAll(async () => {})

  /**
   * T010: Integration test for time-based rating calculation
   *
   * Tests that the rate endpoint correctly processes responseTimeMs
   * and applies time-based rating logic for multiple choice mode.
   */
  describe('T010: Time-based rating calculation', () => {
    it('should accept responseTimeMs parameter in request', async () => {
      const { auth } = await import('@/auth')
      vi.mocked(auth).mockResolvedValue({
        user: { id: testUserId, email: `mc-rating-test-${timestamp}@example.com` },
      } as any)

      const request = new NextRequest('http://localhost:3000/api/study/rate', {
        method: 'POST',
        body: JSON.stringify({
          cardId: testCardId,
          rating: 3,
          responseTimeMs: 5000,
          mode: 'multiple_choice',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      // Should accept the request (not return 400 for invalid params)
      expect(response.status).not.toBe(400)

      // Should successfully process the rating
      expect(response.status).toBe(200)
      expect(data.cardId).toBe(testCardId)
    })

    it('should calculate rating based on responseTimeMs for correct answers', async () => {
      const { auth } = await import('@/auth')
      vi.mocked(auth).mockResolvedValue({
        user: { id: testUserId, email: `mc-rating-test-${timestamp}@example.com` },
      } as any)

      // Get initial card state
      const initialCard = await getFlashcardById(testCardId)
      expect(initialCard).toBeDefined()

      const request = new NextRequest('http://localhost:3000/api/study/rate', {
        method: 'POST',
        body: JSON.stringify({
          cardId: testCardId,
          rating: 3, // Client sends correct (will be adjusted by server based on time)
          responseTimeMs: 5000, // Fast response
          mode: 'multiple_choice',
        }),
      })

      const response = await POST(request)
      await response.json()

      expect(response.status).toBe(200)

      // Verify that the card was updated
      const updatedCard = await getFlashcardById(testCardId)
      expect(updatedCard).toBeDefined()

      // FSRS state should have been updated
      expect(updatedCard!.fsrsState.reps).toBeGreaterThan(initialCard!.fsrsState.reps)
    })
  })

  /**
   * T011: Test fast correct (≤10s) returns rating 3
   *
   * When user answers correctly in ≤10 seconds, should map to
   * FSRS Rating.Good (3) for optimal scheduling.
   */
  describe('T011: Fast correct answers (≤10s) map to Rating.Good (3)', () => {
    it('should apply Rating.Good for correct answer in 5 seconds', async () => {
      const { auth } = await import('@/auth')
      vi.mocked(auth).mockResolvedValue({
        user: { id: testUserId, email: `mc-rating-test-${timestamp}@example.com` },
      } as any)

      // Create fresh card for this test
      const card = await createGoalFlashcard({
        userId: testUserId,
        skillNodeId: testNodeId,
        question: 'What is the useEffect cleanup function?',
        answer: 'A function returned from useEffect that runs on unmount',
        cardType: 'flashcard',
      })

      const request = new NextRequest('http://localhost:3000/api/study/rate', {
        method: 'POST',
        body: JSON.stringify({
          cardId: card.id,
          rating: 3, // Correct answer (client indicates correctness)
          responseTimeMs: 5000, // ≤10s → Should result in Rating.Good (3)
          mode: 'multiple_choice',
        }),
      })

      const response = await POST(request)
      await response.json()

      expect(response.status).toBe(200)

      // Verify the card was scheduled with Good rating
      const updatedCard = await getFlashcardById(card.id)
      expect(updatedCard).toBeDefined()

      // Good rating should increase interval significantly
      // New card rated Good should move to Learning state
      expect(updatedCard!.fsrsState.reps).toBe(1)
      expect(updatedCard!.fsrsState.state).toBeGreaterThanOrEqual(State.Learning) // Not "New" anymore

      // For a new card rated Good, the interval should be approximately 10 minutes
      const now = new Date()
      const dueDate = new Date(updatedCard!.fsrsState.due)
      const minutesUntilDue = (dueDate.getTime() - now.getTime()) / 1000 / 60

      // Rating.Good on a new card should give ~10 minute interval
      expect(minutesUntilDue).toBeGreaterThanOrEqual(8)
      expect(minutesUntilDue).toBeLessThanOrEqual(12)
    })

    it('should apply Rating.Good for correct answer at exactly 10 seconds', async () => {
      const { auth } = await import('@/auth')
      vi.mocked(auth).mockResolvedValue({
        user: { id: testUserId, email: `mc-rating-test-${timestamp}@example.com` },
      } as any)

      // Create fresh card for this test
      const card = await createGoalFlashcard({
        userId: testUserId,
        skillNodeId: testNodeId,
        question: 'What is JSX?',
        answer: 'JavaScript XML syntax extension',
        cardType: 'flashcard',
      })

      const request = new NextRequest('http://localhost:3000/api/study/rate', {
        method: 'POST',
        body: JSON.stringify({
          cardId: card.id,
          rating: 3, // Correct answer
          responseTimeMs: 10000, // Exactly 10s → Should still be Rating.Good (≤10s)
          mode: 'multiple_choice',
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      // Verify Good rating was applied
      const updatedCard = await getFlashcardById(card.id)
      expect(updatedCard).toBeDefined()
      expect(updatedCard!.fsrsState.reps).toBe(1)

      // Should have ~10 minute interval for Good rating
      const now = new Date()
      const dueDate = new Date(updatedCard!.fsrsState.due)
      const minutesUntilDue = (dueDate.getTime() - now.getTime()) / 1000 / 60
      expect(minutesUntilDue).toBeGreaterThanOrEqual(8)
      expect(minutesUntilDue).toBeLessThanOrEqual(12)
    })
  })

  /**
   * T012: Test slow correct (>10s) returns rating 2
   *
   * When user answers correctly but slowly (>10 seconds), should map to
   * FSRS Rating.Hard (2) indicating the card was challenging.
   */
  describe('T012: Slow correct answers (>10s) map to Rating.Hard (2)', () => {
    it('should apply Rating.Hard for correct answer in 15 seconds', async () => {
      const { auth } = await import('@/auth')
      vi.mocked(auth).mockResolvedValue({
        user: { id: testUserId, email: `mc-rating-test-${timestamp}@example.com` },
      } as any)

      // Create fresh card for this test
      const card = await createGoalFlashcard({
        userId: testUserId,
        skillNodeId: testNodeId,
        question: 'What is React reconciliation?',
        answer: 'Process of comparing virtual DOM trees to update real DOM efficiently',
        cardType: 'flashcard',
      })

      const request = new NextRequest('http://localhost:3000/api/study/rate', {
        method: 'POST',
        body: JSON.stringify({
          cardId: card.id,
          rating: 3, // Correct answer (but slow)
          responseTimeMs: 15000, // >10s → Should result in Rating.Hard (2)
          mode: 'multiple_choice',
        }),
      })

      const response = await POST(request)
      await response.json()

      expect(response.status).toBe(200)

      // Verify the card was scheduled with Hard rating
      const updatedCard = await getFlashcardById(card.id)
      expect(updatedCard).toBeDefined()

      // Hard rating should give shorter interval than Good
      expect(updatedCard!.fsrsState.reps).toBe(1)
      expect(updatedCard!.fsrsState.state).toBeGreaterThanOrEqual(State.Learning)

      // For a new card rated Hard, the interval should be approximately 5 minutes
      // (less than the ~10 minutes for Good)
      const now = new Date()
      const dueDate = new Date(updatedCard!.fsrsState.due)
      const minutesUntilDue = (dueDate.getTime() - now.getTime()) / 1000 / 60

      // Rating.Hard on a new card should give ~5 minute interval (shorter than Good)
      expect(minutesUntilDue).toBeGreaterThanOrEqual(4)
      expect(minutesUntilDue).toBeLessThanOrEqual(7)
    })

    it('should apply Rating.Hard for correct answer in 30 seconds', async () => {
      const { auth } = await import('@/auth')
      vi.mocked(auth).mockResolvedValue({
        user: { id: testUserId, email: `mc-rating-test-${timestamp}@example.com` },
      } as any)

      // Create fresh card for this test
      const card = await createGoalFlashcard({
        userId: testUserId,
        skillNodeId: testNodeId,
        question: 'What are React keys used for?',
        answer: 'Identifying elements in lists for efficient re-rendering',
        cardType: 'flashcard',
      })

      const request = new NextRequest('http://localhost:3000/api/study/rate', {
        method: 'POST',
        body: JSON.stringify({
          cardId: card.id,
          rating: 3, // Correct answer
          responseTimeMs: 30000, // Very slow (>10s) → Rating.Hard (2)
          mode: 'multiple_choice',
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      // Verify Hard rating was applied
      const updatedCard = await getFlashcardById(card.id)
      expect(updatedCard).toBeDefined()
      expect(updatedCard!.fsrsState.reps).toBe(1)

      // Should have ~5 minute interval for Hard rating
      const now = new Date()
      const dueDate = new Date(updatedCard!.fsrsState.due)
      const minutesUntilDue = (dueDate.getTime() - now.getTime()) / 1000 / 60
      expect(minutesUntilDue).toBeGreaterThanOrEqual(4)
      expect(minutesUntilDue).toBeLessThanOrEqual(7)
    })
  })

  /**
   * T013: Test incorrect returns rating 1
   *
   * When user answers incorrectly, should always map to
   * FSRS Rating.Again (1) regardless of response time.
   */
  describe('T013: Incorrect answers map to Rating.Again (1)', () => {
    it('should apply Rating.Again for incorrect answer (fast response)', async () => {
      const { auth } = await import('@/auth')
      vi.mocked(auth).mockResolvedValue({
        user: { id: testUserId, email: `mc-rating-test-${timestamp}@example.com` },
      } as any)

      // Create fresh card for this test
      const card = await createGoalFlashcard({
        userId: testUserId,
        skillNodeId: testNodeId,
        question: 'What is the virtual DOM?',
        answer: 'In-memory representation of the real DOM',
        cardType: 'flashcard',
      })

      const request = new NextRequest('http://localhost:3000/api/study/rate', {
        method: 'POST',
        body: JSON.stringify({
          cardId: card.id,
          rating: 1, // Incorrect answer
          responseTimeMs: 3000, // Fast but wrong
          mode: 'multiple_choice',
        }),
      })

      const response = await POST(request)
      await response.json()

      expect(response.status).toBe(200)

      // Verify the card was scheduled with Again rating
      const updatedCard = await getFlashcardById(card.id)
      expect(updatedCard).toBeDefined()

      // Again rating should keep card in learning
      expect(updatedCard!.fsrsState.reps).toBe(1)
      expect(updatedCard!.fsrsState.lapses).toBeGreaterThanOrEqual(0)

      // Card should be due soon (learning step) - typically 1 minute for Again
      const now = new Date()
      const dueDate = new Date(updatedCard!.fsrsState.due)
      const minutesUntilDue = (dueDate.getTime() - now.getTime()) / 1000 / 60
      expect(minutesUntilDue).toBeLessThan(5) // Due within 5 minutes for Again rating
    })

    it('should apply Rating.Again for incorrect answer (slow response)', async () => {
      const { auth } = await import('@/auth')
      vi.mocked(auth).mockResolvedValue({
        user: { id: testUserId, email: `mc-rating-test-${timestamp}@example.com` },
      } as any)

      // Create fresh card for this test
      const card = await createGoalFlashcard({
        userId: testUserId,
        skillNodeId: testNodeId,
        question: 'What is prop drilling?',
        answer: 'Passing props through multiple component layers',
        cardType: 'flashcard',
      })

      const request = new NextRequest('http://localhost:3000/api/study/rate', {
        method: 'POST',
        body: JSON.stringify({
          cardId: card.id,
          rating: 1, // Incorrect answer
          responseTimeMs: 25000, // Slow and wrong
          mode: 'multiple_choice',
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      // Verify Again rating was applied regardless of time
      const updatedCard = await getFlashcardById(card.id)
      expect(updatedCard).toBeDefined()
      expect(updatedCard!.fsrsState.reps).toBe(1)

      // Should be due soon
      const now = new Date()
      const dueDate = new Date(updatedCard!.fsrsState.due)
      const minutesUntilDue = (dueDate.getTime() - now.getTime()) / 1000 / 60
      expect(minutesUntilDue).toBeLessThan(5)
    })

    it('should ignore responseTimeMs for incorrect answers', async () => {
      const { auth } = await import('@/auth')
      vi.mocked(auth).mockResolvedValue({
        user: { id: testUserId, email: `mc-rating-test-${timestamp}@example.com` },
      } as any)

      // Create fresh card for this test
      const card = await createGoalFlashcard({
        userId: testUserId,
        skillNodeId: testNodeId,
        question: 'What is React context?',
        answer: 'A way to pass data through component tree without props',
        cardType: 'flashcard',
      })

      const request = new NextRequest('http://localhost:3000/api/study/rate', {
        method: 'POST',
        body: JSON.stringify({
          cardId: card.id,
          rating: 1, // Incorrect
          responseTimeMs: 1, // Extremely fast (should be ignored)
          mode: 'multiple_choice',
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      // Verify Again rating regardless of time
      const updatedCard = await getFlashcardById(card.id)
      expect(updatedCard).toBeDefined()
      expect(updatedCard!.fsrsState.reps).toBe(1)

      // Should be due soon like other Again ratings
      const now = new Date()
      const dueDate = new Date(updatedCard!.fsrsState.due)
      const minutesUntilDue = (dueDate.getTime() - now.getTime()) / 1000 / 60
      expect(minutesUntilDue).toBeLessThan(5)
    })
  })

  /**
   * Additional test: Verify flashcard mode doesn't apply time-based rating
   */
  describe('Flashcard mode should not apply time-based rating', () => {
    it('should use rating as-is in flashcard mode regardless of responseTimeMs', async () => {
      const { auth } = await import('@/auth')
      vi.mocked(auth).mockResolvedValue({
        user: { id: testUserId, email: `mc-rating-test-${timestamp}@example.com` },
      } as any)

      // Create fresh card for this test
      const card = await createGoalFlashcard({
        userId: testUserId,
        skillNodeId: testNodeId,
        question: 'What is component composition?',
        answer: 'Building complex UIs from simple components',
        cardType: 'flashcard',
      })

      // In flashcard mode, rating should be used as-is
      const request = new NextRequest('http://localhost:3000/api/study/rate', {
        method: 'POST',
        body: JSON.stringify({
          cardId: card.id,
          rating: 4, // User explicitly chose "Easy"
          responseTimeMs: 30000, // Slow, but shouldn't affect rating in flashcard mode
          mode: 'flashcard',
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      // In flashcard mode, rating 4 (Easy) should be honored
      // Easy rating should give a long interval (weeks/months)
      const updatedCard = await getFlashcardById(card.id)
      expect(updatedCard).toBeDefined()
      expect(updatedCard!.fsrsState.reps).toBe(1)

      // Rating.Easy should give a multi-day interval
      const now = new Date()
      const dueDate = new Date(updatedCard!.fsrsState.due)
      const daysUntilDue = (dueDate.getTime() - now.getTime()) / 1000 / 60 / 60 / 24

      // Easy rating should schedule card several days out
      expect(daysUntilDue).toBeGreaterThan(5)
    })
  })
})
