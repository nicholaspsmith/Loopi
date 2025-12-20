import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import {
  getFlashcardById,
  deleteFlashcard,
  flashcardBelongsToUser,
} from '@/lib/db/operations/flashcards'

/**
 * GET /api/flashcards/:flashcardId
 *
 * Get single flashcard by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ flashcardId: string }> }
) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const { flashcardId } = await params

    // Get flashcard
    const flashcard = await getFlashcardById(flashcardId)

    if (!flashcard) {
      return NextResponse.json(
        { error: 'Flashcard not found', code: 'FLASHCARD_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (flashcard.userId !== userId) {
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      flashcard,
    })
  } catch (error) {
    console.error('[FlashcardGet] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to retrieve flashcard',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/flashcards/:flashcardId
 *
 * Delete flashcard
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ flashcardId: string }> }
) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const { flashcardId } = await params

    // Check if flashcard exists and belongs to user
    const belongs = await flashcardBelongsToUser(flashcardId, userId)

    if (!belongs) {
      // Could be not found or forbidden - check which
      const flashcard = await getFlashcardById(flashcardId)
      if (!flashcard) {
        return NextResponse.json(
          { error: 'Flashcard not found', code: 'FLASHCARD_NOT_FOUND' },
          { status: 404 }
        )
      } else {
        return NextResponse.json(
          { error: 'Forbidden', code: 'FORBIDDEN' },
          { status: 403 }
        )
      }
    }

    // Delete flashcard
    await deleteFlashcard(flashcardId)

    console.log(`[FlashcardDelete] Deleted flashcard ${flashcardId}`)

    return NextResponse.json({
      success: true,
      message: 'Flashcard deleted successfully',
    })
  } catch (error) {
    console.error('[FlashcardDelete] Error:', error)

    return NextResponse.json(
      {
        error: 'Failed to delete flashcard',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}
