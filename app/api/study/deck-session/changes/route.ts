import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDeck } from '@/lib/db/operations/decks'
import { detectDeckChanges } from '@/lib/fsrs/deck-scheduler'
import { z } from 'zod'

/**
 * POST /api/study/deck-session/changes
 * Detect deck changes for live session updates
 *
 * Compares current deck composition with original session card IDs
 * to detect added/removed cards during active study sessions.
 *
 * Maps to T051 in Phase 5 (FR-030, FR-031)
 */

const SessionChangesSchema = z.object({
  deckId: z.string().uuid(),
  originalCardIds: z.array(z.string().uuid()),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate request
    const validation = SessionChangesSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { deckId, originalCardIds } = validation.data

    // Verify deck exists and user owns it
    const deck = await getDeck(deckId)

    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
    }

    if (deck.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Detect changes
    const changes = await detectDeckChanges(deckId, session.user.id, originalCardIds)

    // Format response
    const response = {
      hasChanges: changes.hasChanges,
      addedCards: changes.addedCards.map((card) => ({
        id: card.id,
        front: card.question,
        back: card.answer,
        fsrs: {
          state: getStateName(card.fsrsState.state),
          dueDate: card.fsrsState.due.toISOString(),
          difficulty: card.fsrsState.difficulty,
          stability: card.fsrsState.stability,
        },
      })),
      removedCardIds: changes.removedCardIds,
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Error detecting session changes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Helper: Convert FSRS state number to name
 */
function getStateName(state: number): string {
  switch (state) {
    case 0:
      return 'new'
    case 1:
      return 'learning'
    case 2:
      return 'review'
    case 3:
      return 'relearning'
    default:
      return 'unknown'
  }
}
