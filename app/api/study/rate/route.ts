import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { getFlashcardById, updateFlashcardFSRSState } from '@/lib/db/operations/flashcards'
import { createReviewLog } from '@/lib/db/operations/review-logs'
import { scheduleCard } from '@/lib/fsrs/scheduler'
import { numberToRating, isValidRating, objectToCard } from '@/lib/fsrs/utils'
import * as logger from '@/lib/logger'

/**
 * POST /api/study/rate
 *
 * Record a rating for a card during study.
 * Updates FSRS state immediately.
 *
 * Per contracts/study.md - extends /api/quiz/rate with mode tracking
 */

const RateRequestSchema = z.object({
  cardId: z.string().uuid(),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  responseTimeMs: z.number().int().min(0).optional(),
  mode: z.enum(['flashcard', 'multiple_choice', 'timed']),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const parseResult = RateRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { cardId, rating: ratingNum, responseTimeMs, mode } = parseResult.data

    // Validate rating
    if (!isValidRating(ratingNum)) {
      return NextResponse.json({ error: 'Invalid rating. Must be 1-4' }, { status: 400 })
    }

    // T022-T024: Time-based rating adjustment for multiple choice mode
    // Per spec 017-multi-choice-distractors:
    // - Correct & fast (≤10s) → Good (rating 3)
    // - Correct & slow (>10s) → Hard (rating 2)
    // - Incorrect → Again (rating 1)
    let adjustedRatingNum = ratingNum
    if (mode === 'multiple_choice' && responseTimeMs !== undefined) {
      if (ratingNum > 1) {
        // Correct answer - adjust based on response time
        const FAST_THRESHOLD_MS = 10_000 // 10 seconds
        adjustedRatingNum = responseTimeMs <= FAST_THRESHOLD_MS ? 3 : 2

        // T024: Log time-based rating per plan.md observability section
        logger.debug('Time-based rating applied', {
          cardId,
          responseTimeMs,
          originalRating: ratingNum,
          adjustedRating: adjustedRatingNum,
          threshold: FAST_THRESHOLD_MS,
        })
      }
      // Incorrect (rating 1) stays as 1
    }

    const rating = numberToRating(adjustedRatingNum)
    if (!rating) {
      return NextResponse.json({ error: 'Invalid rating conversion' }, { status: 400 })
    }

    // Get the flashcard
    const flashcard = await getFlashcardById(cardId)
    if (!flashcard) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    // Verify ownership
    if (flashcard.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Convert flashcard FSRS state to Card object
    const currentCard = objectToCard({
      state: flashcard.fsrsState.state,
      due: new Date(flashcard.fsrsState.due).getTime(),
      stability: flashcard.fsrsState.stability,
      difficulty: flashcard.fsrsState.difficulty,
      elapsed_days: flashcard.fsrsState.elapsed_days,
      scheduled_days: flashcard.fsrsState.scheduled_days,
      learning_steps: flashcard.fsrsState.learning_steps,
      reps: flashcard.fsrsState.reps,
      lapses: flashcard.fsrsState.lapses,
      last_review: flashcard.fsrsState.last_review
        ? new Date(flashcard.fsrsState.last_review).getTime()
        : undefined,
    })

    // Use FSRS scheduler to calculate next review
    const { card: updatedCard, log: fsrsLog } = scheduleCard(currentCard, rating)

    // Update flashcard FSRS state in database
    await updateFlashcardFSRSState(cardId, updatedCard)

    // Create review log entry
    await createReviewLog({
      flashcardId: cardId,
      userId: session.user.id,
      rating: fsrsLog.rating,
      state: fsrsLog.state,
      due: new Date(fsrsLog.scheduled_days * 24 * 60 * 60 * 1000 + Date.now()),
      stability: updatedCard.stability,
      difficulty: updatedCard.difficulty,
      elapsed_days: fsrsLog.elapsed_days,
      last_elapsed_days: fsrsLog.last_elapsed_days,
      scheduled_days: fsrsLog.scheduled_days,
      review: fsrsLog.review,
    })

    logger.info('Card rated', {
      cardId,
      rating: adjustedRatingNum,
      originalRating: ratingNum,
      mode,
      responseTimeMs,
      newState: updatedCard.state,
      nextDue: updatedCard.due.toISOString(),
    })

    return NextResponse.json({
      cardId,
      nextDue: updatedCard.due.toISOString(),
      newState: {
        state: updatedCard.state,
        due: updatedCard.due.toISOString(),
        stability: updatedCard.stability,
        difficulty: updatedCard.difficulty,
        elapsedDays: updatedCard.elapsed_days,
        scheduledDays: updatedCard.scheduled_days,
        reps: updatedCard.reps,
        lapses: updatedCard.lapses,
        lastReview: updatedCard.last_review?.toISOString() || null,
      },
    })
  } catch (error) {
    logger.error('Failed to rate card', error as Error, {
      path: '/api/study/rate',
    })

    return NextResponse.json({ error: 'Failed to rate card' }, { status: 500 })
  }
}
