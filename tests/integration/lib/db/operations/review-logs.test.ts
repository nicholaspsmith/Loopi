import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Rating, State } from 'ts-fsrs'
import { createReviewLog, getReviewLogsByFlashcardId } from '@/lib/db/operations/review-logs'
import { createUser } from '@/lib/db/operations/users'
import { createFlashcard } from '@/lib/db/operations/flashcards'
import { hashPassword } from '@/lib/auth/helpers'
import { closeDbConnection } from '@/lib/db/client'

/**
 * Unit tests for review_logs database operations
 *
 * Critical: Tests that FSRS decimal values are properly stored
 * This catches schema mismatches (integer vs real columns)
 */

describe('Review Logs Database Operations', () => {
  let testUserId: string
  let testFlashcardId: string

  beforeAll(async () => {
    // Create test user
    const passwordHash = await hashPassword('TestPass123!')
    const user = await createUser({
      email: `test-review-logs-${Date.now()}@example.com`,
      passwordHash,
      name: 'Review Logs Test User',
    })
    testUserId = user.id

    // Create flashcard
    const flashcard = await createFlashcard({
      userId: testUserId,
      question: 'Test question?',
      answer: 'Test answer',
    })
    testFlashcardId = flashcard.id
  })

  afterAll(async () => {
    await closeDbConnection()
  })

  describe('FSRS Decimal Values', () => {
    it('should store and retrieve decimal stability values', async () => {
      // FSRS typically returns stability as a decimal like 0.4, 1.2, 5.07
      const decimalStability = 4.93
      const decimalDifficulty = 5.81

      const reviewLog = await createReviewLog({
        flashcardId: testFlashcardId,
        userId: testUserId,
        rating: Rating.Good,
        state: State.Learning,
        due: new Date(),
        stability: decimalStability,
        difficulty: decimalDifficulty,
        elapsed_days: 0.5, // Half a day
        last_elapsed_days: 0,
        scheduled_days: 1.5, // 1.5 days
        review: new Date(),
      })

      expect(reviewLog).toBeDefined()
      expect(reviewLog.stability).toBeCloseTo(decimalStability, 2)
      expect(reviewLog.difficulty).toBeCloseTo(decimalDifficulty, 2)
    })

    it('should store decimal elapsed_days values', async () => {
      const reviewLog = await createReviewLog({
        flashcardId: testFlashcardId,
        userId: testUserId,
        rating: Rating.Hard,
        state: State.Review,
        due: new Date(),
        stability: 10.5,
        difficulty: 6.2,
        elapsed_days: 2.75, // 2 days and 18 hours
        last_elapsed_days: 1.25,
        scheduled_days: 4.5,
        review: new Date(),
      })

      expect(reviewLog.elapsed_days).toBeCloseTo(2.75, 2)
      expect(reviewLog.last_elapsed_days).toBeCloseTo(1.25, 2)
      expect(reviewLog.scheduled_days).toBeCloseTo(4.5, 2)
    })

    it('should store very small decimal values (new cards)', async () => {
      // New cards often have very small stability values
      const reviewLog = await createReviewLog({
        flashcardId: testFlashcardId,
        userId: testUserId,
        rating: Rating.Again,
        state: State.New,
        due: new Date(),
        stability: 0.4, // Very small stability for new card
        difficulty: 5.0,
        elapsed_days: 0,
        last_elapsed_days: 0,
        scheduled_days: 0.00694, // ~10 minutes in days
        review: new Date(),
      })

      expect(reviewLog.stability).toBeCloseTo(0.4, 2)
      expect(reviewLog.scheduled_days).toBeCloseTo(0.00694, 4)
    })

    it('should store large decimal values (mature cards)', async () => {
      // Mature cards can have large stability values
      const reviewLog = await createReviewLog({
        flashcardId: testFlashcardId,
        userId: testUserId,
        rating: Rating.Easy,
        state: State.Review,
        due: new Date(),
        stability: 365.75, // Over a year
        difficulty: 3.14159, // PI for fun
        elapsed_days: 30.5,
        last_elapsed_days: 15.25,
        scheduled_days: 90.333,
        review: new Date(),
      })

      expect(reviewLog.stability).toBeCloseTo(365.75, 2)
      expect(reviewLog.difficulty).toBeCloseTo(3.14159, 4)
      expect(reviewLog.scheduled_days).toBeCloseTo(90.333, 2)
    })

    it('should retrieve review logs with correct decimal precision', async () => {
      // Create a review log with specific decimals
      const expectedStability = 7.89
      const expectedDifficulty = 4.56

      await createReviewLog({
        flashcardId: testFlashcardId,
        userId: testUserId,
        rating: Rating.Good,
        state: State.Review,
        due: new Date(),
        stability: expectedStability,
        difficulty: expectedDifficulty,
        elapsed_days: 3.33,
        last_elapsed_days: 2.22,
        scheduled_days: 5.55,
        review: new Date(),
      })

      // Retrieve and verify
      const logs = await getReviewLogsByFlashcardId(testFlashcardId)
      const latestLog = logs[logs.length - 1]

      expect(latestLog.stability).toBeCloseTo(expectedStability, 2)
      expect(latestLog.difficulty).toBeCloseTo(expectedDifficulty, 2)
    })
  })
})
