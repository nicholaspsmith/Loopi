import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getFlashcardsByUserId } from '@/lib/db/operations/flashcards'

/**
 * GET /api/quiz/due
 *
 * Get flashcards for review based on FSRS scheduling
 *
 * Query parameters:
 * - mode: 'due' (default) returns only due cards, 'all' returns all cards for practice
 *
 * Maps to FR-011 (due cards for quiz session)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode') || 'due'

    // Get all user's flashcards
    const allFlashcards = await getFlashcardsByUserId(userId)

    let flashcards = allFlashcards

    if (mode === 'due') {
      const now = new Date()

      // Filter for due cards (FR-011: FSRS due date <= now)
      const dueCards = allFlashcards.filter((card) => {
        const dueDate = new Date(card.fsrsState.due)
        return dueDate <= now
      })

      // Sort by due date (most overdue first)
      flashcards = dueCards.sort((a, b) => {
        const dueA = new Date(a.fsrsState.due).getTime()
        const dueB = new Date(b.fsrsState.due).getTime()
        return dueA - dueB
      })

      console.log(`[QuizDue] Found ${flashcards.length} due cards for user ${userId}`)
    } else if (mode === 'all') {
      // Practice mode - return all cards sorted by creation date
      flashcards = allFlashcards.sort((a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      })

      console.log(
        `[QuizDue] Practice mode: returning all ${flashcards.length} cards for user ${userId}`
      )
    }

    return NextResponse.json({
      success: true,
      flashcards,
      count: flashcards.length,
      totalCards: allFlashcards.length,
      mode,
    })
  } catch (error) {
    console.error('[QuizDue] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to retrieve flashcards',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}
