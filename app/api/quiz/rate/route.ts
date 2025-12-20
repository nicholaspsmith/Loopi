import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { getFlashcardById, updateFlashcardFSRSState } from '@/lib/db/operations/flashcards'
import { createReviewLog } from '@/lib/db/operations/review-logs'
import { scheduleCard } from '@/lib/fsrs/scheduler'
import { numberToRating, isValidRating, objectToCard } from '@/lib/fsrs/utils'

/**
 * POST /api/quiz/rate
 *
 * Rate a flashcard and update FSRS scheduling
 *
 * Maps to FR-014 (rate flashcard), FR-015 (FSRS update)
 */

const RateRequestSchema = z.object({
  flashcardId: z.string().uuid(),
  rating: z.number().int().min(1).max(4), // 1=Again, 2=Hard, 3=Good, 4=Easy
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const userId = session.user.id

    // Parse and validate request body
    const body = await request.json()
    const { flashcardId, rating: ratingNum } = RateRequestSchema.parse(body)

    // Validate rating
    if (!isValidRating(ratingNum)) {
      return NextResponse.json(
        {
          error: 'Invalid rating. Must be 1 (Again), 2 (Hard), 3 (Good), or 4 (Easy)',
          code: 'INVALID_RATING',
        },
        { status: 400 }
      )
    }

    const rating = numberToRating(ratingNum)
    if (!rating) {
      return NextResponse.json(
        { error: 'Invalid rating conversion', code: 'INVALID_RATING' },
        { status: 400 }
      )
    }

    // Get the flashcard
    const flashcard = await getFlashcardById(flashcardId)

    if (!flashcard) {
      return NextResponse.json(
        { error: 'Flashcard not found', code: 'FLASHCARD_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (flashcard.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    console.log(`[QuizRate] Rating flashcard ${flashcardId} with rating ${ratingNum}`)

    // Convert flashcard FSRS state to Card object
    const currentCard = objectToCard({
      state: flashcard.fsrsState.state,
      due: new Date(flashcard.fsrsState.due).getTime(),
      stability: flashcard.fsrsState.stability,
      difficulty: flashcard.fsrsState.difficulty,
      elapsed_days: flashcard.fsrsState.elapsed_days,
      scheduled_days: flashcard.fsrsState.scheduled_days,
      reps: flashcard.fsrsState.reps,
      lapses: flashcard.fsrsState.lapses,
      last_review: flashcard.fsrsState.last_review
        ? new Date(flashcard.fsrsState.last_review).getTime()
        : undefined,
    })

    // Use FSRS scheduler to calculate next review (FR-015)
    const { card: updatedCard, log: fsrsLog } = scheduleCard(currentCard, rating)

    // Update flashcard FSRS state in database
    const updatedFlashcard = await updateFlashcardFSRSState(flashcardId, updatedCard)

    // Create review log entry (FR-016)
    const reviewLog = await createReviewLog({
      flashcardId,
      userId,
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

    console.log(`[QuizRate] Updated flashcard ${flashcardId}. Next review: ${updatedCard.due}`)

    return NextResponse.json({
      success: true,
      flashcard: updatedFlashcard,
      reviewLog,
      nextReview: {
        due: updatedCard.due,
        scheduledDays: fsrsLog.scheduled_days,
        state: updatedCard.state,
      },
    })
  } catch (error) {
    console.error('[QuizRate] Error:', error)

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          code: 'VALIDATION_ERROR',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'Failed to rate flashcard',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}
