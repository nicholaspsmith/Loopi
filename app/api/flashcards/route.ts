import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getFlashcardsByUserId } from '@/lib/db/operations/flashcards'

/**
 * GET /api/flashcards
 *
 * List all flashcards for authenticated user in chronological order
 *
 * Maps to FR-024 (single chronological collection)
 */
export async function GET() {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const userId = session.user.id

    // Get user's flashcards in chronological order (FR-024)
    const flashcards = await getFlashcardsByUserId(userId)

    return NextResponse.json({
      success: true,
      flashcards,
      count: flashcards.length,
    })
  } catch (error) {
    console.error('[FlashcardsList] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to retrieve flashcards',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}
