import { getDb } from '@/lib/db/pg-client'
import { decks, deckCards } from '@/lib/db/drizzle-schema'
import { eq, and, desc, sql, count } from 'drizzle-orm'
import * as logger from '@/lib/logger'

/**
 * Deck Database Operations
 *
 * Provides CRUD operations for decks in PostgreSQL.
 * Enforces 100-deck limit per user.
 */

export interface DeckWithMetadata {
  id: string
  userId: string
  name: string
  createdAt: number
  lastStudiedAt: number | null
  archived: boolean
  newCardsPerDayOverride: number | null
  cardsPerSessionOverride: number | null
  cardCount: number
}

/**
 * Create a new deck
 * Enforces 100-deck limit per user (FR-033)
 */
export async function createDeck(data: {
  userId: string
  name: string
  newCardsPerDayOverride?: number | null
  cardsPerSessionOverride?: number | null
}): Promise<DeckWithMetadata> {
  const db = getDb()

  // Enforce 100-deck limit (count non-archived decks only)
  const [result] = await db
    .select({ count: count() })
    .from(decks)
    .where(and(eq(decks.userId, data.userId), eq(decks.archived, false)))

  if (result && result.count >= 100) {
    throw new Error('Maximum deck limit reached (100 decks)')
  }

  // Validate name length
  const trimmedName = data.name.trim()
  if (trimmedName.length === 0 || trimmedName.length > 200) {
    throw new Error('Deck name must be 1-200 characters')
  }

  // Validate override values
  if (
    data.newCardsPerDayOverride !== undefined &&
    data.newCardsPerDayOverride !== null &&
    data.newCardsPerDayOverride < 0
  ) {
    throw new Error('new_cards_per_day_override must be non-negative')
  }
  if (
    data.cardsPerSessionOverride !== undefined &&
    data.cardsPerSessionOverride !== null &&
    data.cardsPerSessionOverride < 0
  ) {
    throw new Error('cards_per_session_override must be non-negative')
  }

  const [deck] = await db
    .insert(decks)
    .values({
      userId: data.userId,
      name: trimmedName,
      newCardsPerDayOverride: data.newCardsPerDayOverride ?? null,
      cardsPerSessionOverride: data.cardsPerSessionOverride ?? null,
    })
    .returning()

  logger.info('Deck created', {
    deckId: deck.id,
    userId: data.userId,
    name: trimmedName,
    hasOverrides: !!(data.newCardsPerDayOverride || data.cardsPerSessionOverride),
  })

  return {
    id: deck.id,
    userId: deck.userId,
    name: deck.name,
    createdAt: deck.createdAt.getTime(),
    lastStudiedAt: deck.lastStudiedAt ? deck.lastStudiedAt.getTime() : null,
    archived: deck.archived,
    newCardsPerDayOverride: deck.newCardsPerDayOverride,
    cardsPerSessionOverride: deck.cardsPerSessionOverride,
    cardCount: 0,
  }
}

/**
 * Get deck by ID
 */
export async function getDeck(deckId: string): Promise<DeckWithMetadata | null> {
  const db = getDb()

  const result = await db
    .select({
      id: decks.id,
      userId: decks.userId,
      name: decks.name,
      createdAt: decks.createdAt,
      lastStudiedAt: decks.lastStudiedAt,
      archived: decks.archived,
      newCardsPerDayOverride: decks.newCardsPerDayOverride,
      cardsPerSessionOverride: decks.cardsPerSessionOverride,
      cardCount: count(deckCards.id),
    })
    .from(decks)
    .leftJoin(deckCards, eq(decks.id, deckCards.deckId))
    .where(eq(decks.id, deckId))
    .groupBy(decks.id)

  if (result.length === 0) {
    return null
  }

  const deck = result[0]
  return {
    id: deck.id,
    userId: deck.userId,
    name: deck.name,
    createdAt: deck.createdAt.getTime(),
    lastStudiedAt: deck.lastStudiedAt ? deck.lastStudiedAt.getTime() : null,
    archived: deck.archived,
    newCardsPerDayOverride: deck.newCardsPerDayOverride,
    cardsPerSessionOverride: deck.cardsPerSessionOverride,
    cardCount: deck.cardCount,
  }
}

/**
 * List user's decks
 * Supports filtering by archived status and sorting
 */
export async function listDecks(
  userId: string,
  options: {
    archived?: boolean
    sortBy?: 'created_at' | 'last_studied_at' | 'name'
  } = {}
): Promise<DeckWithMetadata[]> {
  const db = getDb()

  const conditions = [eq(decks.userId, userId)]
  if (options.archived !== undefined) {
    conditions.push(eq(decks.archived, options.archived))
  }

  let orderByClause
  switch (options.sortBy) {
    case 'name':
      orderByClause = decks.name
      break
    case 'created_at':
      orderByClause = desc(decks.createdAt)
      break
    case 'last_studied_at':
    default:
      orderByClause = sql`${decks.lastStudiedAt} DESC NULLS LAST`
      break
  }

  const result = await db
    .select({
      id: decks.id,
      userId: decks.userId,
      name: decks.name,
      createdAt: decks.createdAt,
      lastStudiedAt: decks.lastStudiedAt,
      archived: decks.archived,
      newCardsPerDayOverride: decks.newCardsPerDayOverride,
      cardsPerSessionOverride: decks.cardsPerSessionOverride,
      cardCount: count(deckCards.id),
    })
    .from(decks)
    .leftJoin(deckCards, eq(decks.id, deckCards.deckId))
    .where(and(...conditions))
    .groupBy(decks.id)
    .orderBy(orderByClause)

  return result.map((deck) => ({
    id: deck.id,
    userId: deck.userId,
    name: deck.name,
    createdAt: deck.createdAt.getTime(),
    lastStudiedAt: deck.lastStudiedAt ? deck.lastStudiedAt.getTime() : null,
    archived: deck.archived,
    newCardsPerDayOverride: deck.newCardsPerDayOverride,
    cardsPerSessionOverride: deck.cardsPerSessionOverride,
    cardCount: deck.cardCount,
  }))
}

/**
 * Update deck
 * Supports partial updates
 */
export async function updateDeck(
  deckId: string,
  updates: {
    name?: string
    archived?: boolean
    newCardsPerDayOverride?: number | null
    cardsPerSessionOverride?: number | null
    lastStudiedAt?: Date | null
  }
): Promise<DeckWithMetadata> {
  const db = getDb()

  // Validate name if provided
  if (updates.name !== undefined) {
    const trimmedName = updates.name.trim()
    if (trimmedName.length === 0 || trimmedName.length > 200) {
      throw new Error('Deck name must be 1-200 characters')
    }
    updates.name = trimmedName
  }

  // Validate override values
  if (
    updates.newCardsPerDayOverride !== undefined &&
    updates.newCardsPerDayOverride !== null &&
    updates.newCardsPerDayOverride < 0
  ) {
    throw new Error('new_cards_per_day_override must be non-negative')
  }
  if (
    updates.cardsPerSessionOverride !== undefined &&
    updates.cardsPerSessionOverride !== null &&
    updates.cardsPerSessionOverride < 0
  ) {
    throw new Error('cards_per_session_override must be non-negative')
  }

  const [deck] = await db.update(decks).set(updates).where(eq(decks.id, deckId)).returning()

  if (!deck) {
    throw new Error(`Deck not found: ${deckId}`)
  }

  logger.info('Deck updated', {
    deckId,
    userId: deck.userId,
    updatedFields: Object.keys(updates),
  })

  // Get card count
  const [cardCountResult] = await db
    .select({ count: count() })
    .from(deckCards)
    .where(eq(deckCards.deckId, deckId))

  return {
    id: deck.id,
    userId: deck.userId,
    name: deck.name,
    createdAt: deck.createdAt.getTime(),
    lastStudiedAt: deck.lastStudiedAt ? deck.lastStudiedAt.getTime() : null,
    archived: deck.archived,
    newCardsPerDayOverride: deck.newCardsPerDayOverride,
    cardsPerSessionOverride: deck.cardsPerSessionOverride,
    cardCount: cardCountResult?.count ?? 0,
  }
}

/**
 * Delete deck
 * Cascade deletes deck_cards, preserves flashcards (FR-005, FR-008)
 */
export async function deleteDeck(deckId: string): Promise<void> {
  const db = getDb()

  const result = await db.delete(decks).where(eq(decks.id, deckId)).returning()

  if (result.length === 0) {
    throw new Error(`Deck not found: ${deckId}`)
  }

  logger.info('Deck deleted', {
    deckId,
  })
}
