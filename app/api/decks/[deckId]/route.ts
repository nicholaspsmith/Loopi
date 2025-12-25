import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  getDeck,
  updateDeck,
  deleteDeck,
} from '@/lib/db/operations/decks'
import { getDeckCards } from '@/lib/db/operations/deck-cards'

/**
 * GET /api/decks/[deckId]
 * Get deck with full card list
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { deckId } = await params

    const deck = await getDeck(deckId)

    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
    }

    // Verify ownership
    if (deck.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get cards in deck
    const cards = await getDeckCards(deckId)

    return NextResponse.json(
      {
        ...deck,
        cards,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error getting deck:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/decks/[deckId]
 * Update deck (name, settings, archived)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { deckId } = await params
    const body = await request.json()

    // Verify deck exists and ownership
    const existingDeck = await getDeck(deckId)

    if (!existingDeck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
    }

    if (existingDeck.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate fields if provided
    if (body.name !== undefined && typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'name must be a string' },
        { status: 400 }
      )
    }

    if (body.archived !== undefined && typeof body.archived !== 'boolean') {
      return NextResponse.json(
        { error: 'archived must be a boolean' },
        { status: 400 }
      )
    }

    if (
      body.newCardsPerDayOverride !== undefined &&
      body.newCardsPerDayOverride !== null
    ) {
      const value = Number(body.newCardsPerDayOverride)
      if (isNaN(value) || value < 0) {
        return NextResponse.json(
          { error: 'new_cards_per_day_override must be a non-negative number' },
          { status: 400 }
        )
      }
    }

    if (
      body.cardsPerSessionOverride !== undefined &&
      body.cardsPerSessionOverride !== null
    ) {
      const value = Number(body.cardsPerSessionOverride)
      if (isNaN(value) || value < 0) {
        return NextResponse.json(
          { error: 'cards_per_session_override must be a non-negative number' },
          { status: 400 }
        )
      }
    }

    try {
      const updatedDeck = await updateDeck(deckId, {
        name: body.name,
        archived: body.archived,
        newCardsPerDayOverride: body.newCardsPerDayOverride,
        cardsPerSessionOverride: body.cardsPerSessionOverride,
      })

      return NextResponse.json(updatedDeck, { status: 200 })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'

      // Check for validation errors
      if (
        message.includes('Deck name') ||
        message.includes('override must be non-negative')
      ) {
        return NextResponse.json({ error: message }, { status: 400 })
      }

      // Re-throw for generic error handling
      throw error
    }
  } catch (error) {
    console.error('Error updating deck:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/decks/[deckId]
 * Delete deck (cascade to deck_cards, preserves flashcards)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { deckId } = await params

    // Verify deck exists and ownership
    const deck = await getDeck(deckId)

    if (!deck) {
      return NextResponse.json({ error: 'Deck not found' }, { status: 404 })
    }

    if (deck.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await deleteDeck(deckId)

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting deck:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
