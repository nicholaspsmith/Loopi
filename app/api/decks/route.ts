import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createDeck, listDecks } from '@/lib/db/operations/decks'

/**
 * GET /api/decks
 * List user's decks with metadata
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const archivedParam = searchParams.get('archived')
    const sortBy = searchParams.get('sortBy') as
      | 'last_studied_at'
      | 'created_at'
      | 'name'
      | undefined

    // Parse archived param (default: false - show active decks only)
    let archived: boolean | undefined
    if (archivedParam === 'true') {
      archived = true
    } else if (archivedParam === 'false') {
      archived = false
    }
    // If not specified, default to false (active decks only)
    if (archived === undefined) {
      archived = false
    }

    const decks = await listDecks(session.user.id, {
      archived,
      sortBy,
    })

    return NextResponse.json(
      {
        decks,
        totalCount: decks.length,
        limit: 100,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error listing decks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/decks
 * Create new deck (with 100-deck limit validation)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate request body
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { error: 'Deck name is required' },
        { status: 400 }
      )
    }

    // Validate override values
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
      const deck = await createDeck({
        userId: session.user.id,
        name: body.name,
        newCardsPerDayOverride: body.newCardsPerDayOverride ?? null,
        cardsPerSessionOverride: body.cardsPerSessionOverride ?? null,
      })

      return NextResponse.json(deck, { status: 201 })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'

      // Check for limit errors
      if (message.includes('Maximum deck limit')) {
        return NextResponse.json(
          {
            error:
              'Maximum deck limit reached (100 decks). Please delete unused decks before creating new ones.',
          },
          { status: 403 }
        )
      }

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
    console.error('Error creating deck:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
