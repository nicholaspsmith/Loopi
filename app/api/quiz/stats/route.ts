import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getReviewStats } from '@/lib/db/operations/review-logs'
import { getFlashcardsByUserId } from '@/lib/db/operations/flashcards'

/**
 * GET /api/quiz/stats
 *
 * Get quiz statistics and progress for the authenticated user
 *
 * Maps to FR-020 (quiz progress tracking)
 */
export async function GET() {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const userId = session.user.id

    // Get review statistics
    const reviewStats = await getReviewStats(userId)

    // Get all flashcards for additional stats
    const allFlashcards = await getFlashcardsByUserId(userId)

    const now = new Date()

    // Count due flashcards
    const dueCount = allFlashcards.filter((card) => {
      const dueDate = new Date(card.fsrsState.due)
      return dueDate <= now
    }).length

    // Count flashcards by state
    const stateBreakdown = {
      new: 0,
      learning: 0,
      review: 0,
      relearning: 0,
    }

    allFlashcards.forEach((card) => {
      switch (card.fsrsState.state) {
        case 0:
          stateBreakdown.new++
          break
        case 1:
          stateBreakdown.learning++
          break
        case 2:
          stateBreakdown.review++
          break
        case 3:
          stateBreakdown.relearning++
          break
      }
    })

    // Calculate average difficulty
    const avgDifficulty =
      allFlashcards.length > 0
        ? allFlashcards.reduce((sum, card) => sum + card.fsrsState.difficulty, 0) /
          allFlashcards.length
        : 0

    // Calculate average stability (days)
    const avgStability =
      allFlashcards.length > 0
        ? allFlashcards.reduce((sum, card) => sum + card.fsrsState.stability, 0) /
          allFlashcards.length
        : 0

    console.log(`[QuizStats] Retrieved stats for user ${userId}`)

    return NextResponse.json({
      success: true,
      stats: {
        // Review stats
        ...reviewStats,

        // Flashcard stats
        totalFlashcards: allFlashcards.length,
        dueFlashcards: dueCount,
        stateBreakdown,
        avgDifficulty: Math.round(avgDifficulty * 100) / 100,
        avgStability: Math.round(avgStability * 100) / 100,
      },
    })
  } catch (error) {
    console.error('[QuizStats] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to retrieve quiz statistics',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}
