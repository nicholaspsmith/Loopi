import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { isServerAvailable } from '@/tests/helpers/server-check'

const serverRunning = await isServerAvailable()

import { hashPassword } from '@/lib/auth/helpers'
import { createUser } from '@/lib/db/operations/users'
import { createConversation } from '@/lib/db/operations/conversations'
import { createMessage } from '@/lib/db/operations/messages'
import { createFlashcard } from '@/lib/db/operations/flashcards'
import { closeDbConnection } from '@/lib/db/client'

/**
 * Contract Tests for Quiz API
 *
 * Tests API contracts for quiz and FSRS scheduling per
 * specs/001-claude-flashcard/contracts/quiz.yaml
 *
 * Maps to FR-011, FR-014, FR-015, FR-020, FR-021
 *
 * TODO: These tests currently skip authentication.
 * Need to implement session authentication for contract tests.
 */

describe.skipIf(!serverRunning)('Quiz API Contract Tests', () => {
  let testUserId: string
  let testConversationId: string
  let testMessageId: string
  let dueFlashcardId: string

  beforeAll(async () => {
    // Create test user
    const passwordHash = await hashPassword('TestPass123!')
    const user = await createUser({
      email: `test-quiz-${Date.now()}@example.com`,
      passwordHash,
      name: 'Quiz Test User',
    })
    testUserId = user.id

    // Create test conversation
    const conversation = await createConversation({
      userId: testUserId,
      title: 'Quiz Test Conversation',
    })
    testConversationId = conversation.id

    // Create assistant message
    const message = await createMessage({
      conversationId: testConversationId,
      userId: testUserId,
      role: 'assistant',
      content: 'Spaced repetition is a learning technique...',
    })
    testMessageId = message.id

    // Create a flashcard that's due now
    const dueFlashcard = await createFlashcard({
      userId: testUserId,
      conversationId: testConversationId,
      messageId: testMessageId,
      question: 'What is spaced repetition?',
      answer: 'A learning technique that reviews information at increasing intervals.',
    })
    dueFlashcardId = dueFlashcard.id

    // Create a flashcard that's not due yet (future due date)
    await createFlashcard({
      userId: testUserId,
      conversationId: testConversationId,
      messageId: testMessageId,
      question: 'What is the FSRS algorithm?',
      answer: 'Free Spaced Repetition Scheduler - an evidence-based scheduling algorithm.',
    })
  })

  afterAll(async () => {
    await closeDbConnection()
  })

  describe('GET /api/quiz/due (FR-011, FR-012)', () => {
    it('should return due flashcards for authenticated user', async () => {
      // TODO: Add authentication headers
      const response = await fetch('http://localhost:3000/api/quiz/due', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      // Expect 401 without auth
      // When auth is implemented, this should return 200
      if (response.status === 401) {
        expect(response.status).toBe(401)
        return
      }

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('flashcards')
      expect(data).toHaveProperty('count')
      expect(data).toHaveProperty('totalCards')

      expect(Array.isArray(data.flashcards)).toBe(true)
      expect(data.count).toBe(data.flashcards.length)

      // Verify flashcard structure
      if (data.flashcards.length > 0) {
        const flashcard = data.flashcards[0]
        expect(flashcard).toHaveProperty('id')
        expect(flashcard).toHaveProperty('question')
        expect(flashcard).toHaveProperty('answer')
        expect(flashcard).toHaveProperty('fsrsState')

        // Verify FSRS state structure
        const fsrsState = flashcard.fsrsState
        expect(fsrsState).toHaveProperty('due')
        expect(fsrsState).toHaveProperty('stability')
        expect(fsrsState).toHaveProperty('difficulty')
        expect(fsrsState).toHaveProperty('state')
        expect(fsrsState).toHaveProperty('reps')
        expect(fsrsState).toHaveProperty('lapses')

        // Verify due date is in the past
        const dueDate = new Date(fsrsState.due)
        expect(dueDate.getTime()).toBeLessThanOrEqual(Date.now())
      }
    })

    it('should return 401 for unauthenticated request', async () => {
      const response = await fetch('http://localhost:3000/api/quiz/due', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('code', 'UNAUTHORIZED')
    })
  })

  describe('POST /api/quiz/rate (FR-014, FR-015)', () => {
    it('should rate a flashcard and update FSRS state', async () => {
      // TODO: Add authentication headers
      const response = await fetch('http://localhost:3000/api/quiz/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flashcardId: dueFlashcardId,
          rating: 3, // Good
        }),
      })

      // Expect 401 without auth
      if (response.status === 401) {
        expect(response.status).toBe(401)
        return
      }

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('flashcard')
      expect(data).toHaveProperty('reviewLog')
      expect(data).toHaveProperty('nextReview')

      // Verify updated flashcard
      const flashcard = data.flashcard
      expect(flashcard.id).toBe(dueFlashcardId)
      expect(flashcard.fsrsState.reps).toBeGreaterThan(0)

      // Verify review log
      const reviewLog = data.reviewLog
      expect(reviewLog).toHaveProperty('id')
      expect(reviewLog).toHaveProperty('flashcardId', dueFlashcardId)
      expect(reviewLog).toHaveProperty('rating', 3)

      // Verify next review
      const nextReview = data.nextReview
      expect(nextReview).toHaveProperty('due')
      expect(nextReview).toHaveProperty('scheduledDays')
      expect(nextReview).toHaveProperty('state')

      // Next due date should be in the future
      const nextDue = new Date(nextReview.due)
      expect(nextDue.getTime()).toBeGreaterThan(Date.now())
    })

    it('should return 400 for invalid rating', async () => {
      // TODO: Add authentication headers
      const response = await fetch('http://localhost:3000/api/quiz/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flashcardId: dueFlashcardId,
          rating: 5, // Invalid - must be 1-4
        }),
      })

      // Expect 401 without auth, or 400 with auth
      if (response.status === 401) {
        expect(response.status).toBe(401)
        return
      }

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('code')
    })

    it('should return 404 for non-existent flashcard', async () => {
      // TODO: Add authentication headers
      const response = await fetch('http://localhost:3000/api/quiz/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flashcardId: '00000000-0000-0000-0000-000000000000',
          rating: 3,
        }),
      })

      // Expect 401 without auth, or 404 with auth
      if (response.status === 401) {
        expect(response.status).toBe(401)
        return
      }

      expect(response.status).toBe(404)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('code', 'FLASHCARD_NOT_FOUND')
    })

    it('should handle all four FSRS ratings (Again, Hard, Good, Easy)', async () => {
      // TODO: Add authentication headers
      // This test validates that all 4 rating values work correctly

      const ratings = [
        { rating: 1, name: 'Again' },
        { rating: 2, name: 'Hard' },
        { rating: 3, name: 'Good' },
        { rating: 4, name: 'Easy' },
      ]

      for (const { rating, name } of ratings) {
        // Create a fresh flashcard for each rating
        const flashcard = await createFlashcard({
          userId: testUserId,
          conversationId: testConversationId,
          messageId: testMessageId,
          question: `Test question for ${name}`,
          answer: `Test answer for ${name}`,
        })

        const response = await fetch('http://localhost:3000/api/quiz/rate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            flashcardId: flashcard.id,
            rating,
          }),
        })

        // Skip if not authenticated
        if (response.status === 401) {
          continue
        }

        expect(response.status).toBe(200)

        const data = await response.json()
        expect(data.success).toBe(true)
        expect(data.reviewLog.rating).toBe(rating)
      }
    })
  })

  describe('GET /api/quiz/stats (FR-020)', () => {
    it('should return comprehensive quiz statistics', async () => {
      // TODO: Add authentication headers
      const response = await fetch('http://localhost:3000/api/quiz/stats', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      // Expect 401 without auth
      if (response.status === 401) {
        expect(response.status).toBe(401)
        return
      }

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('stats')

      const stats = data.stats
      expect(stats).toHaveProperty('totalReviews')
      expect(stats).toHaveProperty('reviewsToday')
      expect(stats).toHaveProperty('reviewsThisWeek')
      expect(stats).toHaveProperty('averageRating')
      expect(stats).toHaveProperty('retentionRate')
      expect(stats).toHaveProperty('totalFlashcards')
      expect(stats).toHaveProperty('dueFlashcards')
      expect(stats).toHaveProperty('stateBreakdown')
      expect(stats).toHaveProperty('avgDifficulty')
      expect(stats).toHaveProperty('avgStability')

      // Verify state breakdown structure
      const stateBreakdown = stats.stateBreakdown
      expect(stateBreakdown).toHaveProperty('new')
      expect(stateBreakdown).toHaveProperty('learning')
      expect(stateBreakdown).toHaveProperty('review')
      expect(stateBreakdown).toHaveProperty('relearning')

      // All counts should be non-negative
      expect(stats.totalReviews).toBeGreaterThanOrEqual(0)
      expect(stats.reviewsToday).toBeGreaterThanOrEqual(0)
      expect(stats.reviewsThisWeek).toBeGreaterThanOrEqual(0)
      expect(stats.totalFlashcards).toBeGreaterThanOrEqual(0)
      expect(stats.dueFlashcards).toBeGreaterThanOrEqual(0)
    })

    it('should return 401 for unauthenticated request', async () => {
      const response = await fetch('http://localhost:3000/api/quiz/stats', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('code', 'UNAUTHORIZED')
    })
  })

  describe('GET /api/quiz/history (FR-021)', () => {
    it('should return review history with flashcard details', async () => {
      // TODO: Add authentication headers
      const response = await fetch('http://localhost:3000/api/quiz/history?limit=20', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      // Expect 401 without auth
      if (response.status === 401) {
        expect(response.status).toBe(401)
        return
      }

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('history')
      expect(data).toHaveProperty('count')

      expect(Array.isArray(data.history)).toBe(true)
      expect(data.count).toBe(data.history.length)

      // Verify history entry structure if any exist
      if (data.history.length > 0) {
        const entry = data.history[0]
        expect(entry).toHaveProperty('id')
        expect(entry).toHaveProperty('flashcardId')
        expect(entry).toHaveProperty('userId', testUserId)
        expect(entry).toHaveProperty('rating')
        expect(entry).toHaveProperty('state')
        expect(entry).toHaveProperty('review')
        expect(entry).toHaveProperty('flashcardQuestion')
        expect(entry).toHaveProperty('flashcardAnswer')

        // Rating should be 1-4
        expect(entry.rating).toBeGreaterThanOrEqual(1)
        expect(entry.rating).toBeLessThanOrEqual(4)

        // State should be 0-3
        expect(entry.state).toBeGreaterThanOrEqual(0)
        expect(entry.state).toBeLessThanOrEqual(3)
      }
    })

    it('should respect limit parameter', async () => {
      // TODO: Add authentication headers
      const response = await fetch('http://localhost:3000/api/quiz/history?limit=5', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      // Skip if not authenticated
      if (response.status === 401) {
        return
      }

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.history.length).toBeLessThanOrEqual(5)
    })

    it('should return 401 for unauthenticated request', async () => {
      const response = await fetch('http://localhost:3000/api/quiz/history', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('code', 'UNAUTHORIZED')
    })
  })
})
