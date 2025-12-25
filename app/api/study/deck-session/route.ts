import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getDeck } from '@/lib/db/operations/decks'
import {
  getDueFlashcardsForDeck,
  getNewFlashcardsForDeck,
  getEffectiveFSRSSettings,
} from '@/lib/fsrs/deck-scheduler'
import { v4 as uuidv4 } from 'uuid'

/**
 * POST /api/study/deck-session
 * Start deck-filtered FSRS study session
 *
 * Returns due cards filtered by deck membership with deck-specific FSRS settings.
 * Implements precedence: session > deck > global (FR-029)
 *
 * Maps to T033 in Phase 3 (FR-010, FR-027, FR-028, FR-029)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate request body
    if (!body.deckId || typeof body.deckId !== 'string') {
      return NextResponse.json(
        { error: 'deckId is required and must be a string' },
        { status: 400 }
      )
    }

    // Validate optional session settings
    if (body.settings) {
      if (
        body.settings.newCardsPerDay !== undefined &&
        (typeof body.settings.newCardsPerDay !== 'number' ||
          body.settings.newCardsPerDay < 0)
      ) {
        return NextResponse.json(
          { error: 'newCardsPerDay must be a non-negative number' },
          { status: 400 }
        )
      }

      if (
        body.settings.cardsPerSession !== undefined &&
        (typeof body.settings.cardsPerSession !== 'number' ||
          body.settings.cardsPerSession <= 0)
      ) {
        return NextResponse.json(
          { error: 'cardsPerSession must be greater than 0' },
          { status: 400 }
        )
      }
    }

    // Get deck
    const deck = await getDeck(body.deckId)

    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
    }

    // Verify ownership
    if (deck.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if deck has cards
    if (deck.cardCount === 0) {
      return NextResponse.json(
        {
          error:
            'Cannot start session: deck contains 0 cards. Please add cards to the deck first.',
        },
        { status: 400 }
      )
    }

    // Get effective FSRS settings with precedence
    const settings = await getEffectiveFSRSSettings(body.deckId, body.settings)

    // Get due cards for this deck
    const dueCards = await getDueFlashcardsForDeck(body.deckId, session.user.id)

    // Get new cards if needed (respecting newCardsPerDay limit)
    const newCards = await getNewFlashcardsForDeck(
      body.deckId,
      session.user.id,
      settings.newCardsPerDay
    )

    // Combine due and new cards (limit by cardsPerSession)
    const allCards = [...dueCards, ...newCards].slice(0, settings.cardsPerSession)

    // Generate session ID
    const sessionId = uuidv4()

    // Format response
    const response = {
      sessionId,
      deckId: deck.id,
      deckName: deck.name,
      dueCards: allCards.map((card) => ({
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
      totalDueCards: dueCards.length,
      totalNewCards: newCards.length,
      appliedSettings: {
        source: settings.source,
        newCardsPerDay: settings.newCardsPerDay,
        cardsPerSession: settings.cardsPerSession,
      },
    }

    // If no cards available, include next due card info
    if (allCards.length === 0 && dueCards.length === 0) {
      // Find next due card
      const allDeckCards = await getDueFlashcardsForDeck(body.deckId, session.user.id)
      if (allDeckCards.length > 0) {
        const nextDue = allDeckCards.sort(
          (a, b) => a.fsrsState.due.getTime() - b.fsrsState.due.getTime()
        )[0]
        return NextResponse.json(
          {
            ...response,
            nextDueCard: {
              dueDate: nextDue.fsrsState.due.toISOString(),
              count: 1,
            },
          },
          { status: 200 }
        )
      }
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error('Error starting deck session:', error)
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
