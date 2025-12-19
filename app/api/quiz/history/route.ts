import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getReviewHistoryWithFlashcards } from '@/lib/db/operations/review-logs'

/**
 * GET /api/quiz/history
 *
 * Get review history with flashcard details for the authenticated user
 *
 * Query parameters:
 * - limit: Number of recent reviews to return (default: 20, max: 100)
 *
 * Maps to FR-021 (review log retrieval and history)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const userId = session.user.id

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 20

    // Get review history with flashcard details
    const history = await getReviewHistoryWithFlashcards(userId, limit)

    console.log(`[QuizHistory] Retrieved ${history.length} review logs for user ${userId}`)

    return NextResponse.json({
      success: true,
      history,
      count: history.length,
    })
  } catch (error) {
    console.error('[QuizHistory] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to retrieve quiz history',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}
