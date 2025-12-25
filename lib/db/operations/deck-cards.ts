import { getDb } from '@/lib/db/pg-client'
import { deckCards, flashcards } from '@/lib/db/drizzle-schema'
import { eq, and, inArray, count, desc } from 'drizzle-orm'

/**
 * Deck-Card Relationship Operations
 *
 * Manages many-to-many relationships between decks and flashcards.
 * Enforces 1000-card limit per deck.
 */

export interface FlashcardInDeck {
  id: string
  question: string
  answer: string
  addedAt: number
}

/**
 * Add cards to deck
 * Enforces 1000-card limit per deck (FR-032)
 * Idempotent: Silently ignores cards already in deck
 */
export async function addCardsToDeck(
  deckId: string,
  flashcardIds: string[]
): Promise<{ added: number; skipped: number }> {
  const db = getDb()

  if (flashcardIds.length === 0) {
    return { added: 0, skipped: 0 }
  }

  // Get current card count
  const [currentCount] = await db
    .select({ count: count() })
    .from(deckCards)
    .where(eq(deckCards.deckId, deckId))

  const existingCount = currentCount?.count ?? 0

  // Check if adding these cards would exceed limit
  if (existingCount + flashcardIds.length > 1000) {
    throw new Error(
      `Deck limit reached (1000 cards maximum). Current: ${existingCount}, Attempting to add: ${flashcardIds.length}`
    )
  }

  // Find which cards are already in the deck
  const existingCards = await db
    .select({ flashcardId: deckCards.flashcardId })
    .from(deckCards)
    .where(
      and(
        eq(deckCards.deckId, deckId),
        inArray(deckCards.flashcardId, flashcardIds)
      )
    )

  const existingCardIds = new Set(existingCards.map((c) => c.flashcardId))

  // Filter out cards already in deck (idempotent behavior)
  const newCardIds = flashcardIds.filter((id) => !existingCardIds.has(id))

  if (newCardIds.length === 0) {
    return { added: 0, skipped: flashcardIds.length }
  }

  // Insert new card relationships
  await db.insert(deckCards).values(
    newCardIds.map((flashcardId) => ({
      deckId,
      flashcardId,
    }))
  )

  return {
    added: newCardIds.length,
    skipped: flashcardIds.length - newCardIds.length,
  }
}

/**
 * Remove cards from deck
 * Idempotent: Returns count of actually removed cards
 * Preserves flashcards (FR-005)
 */
export async function removeCardsFromDeck(
  deckId: string,
  flashcardIds: string[]
): Promise<number> {
  const db = getDb()

  if (flashcardIds.length === 0) {
    return 0
  }

  const result = await db
    .delete(deckCards)
    .where(
      and(
        eq(deckCards.deckId, deckId),
        inArray(deckCards.flashcardId, flashcardIds)
      )
    )

  return result.rowCount ?? 0
}

/**
 * Get all cards in a deck
 * Returns flashcards with added_at timestamp
 * Ordered by most recently added first
 */
export async function getDeckCards(deckId: string): Promise<FlashcardInDeck[]> {
  const db = getDb()

  const result = await db
    .select({
      id: flashcards.id,
      question: flashcards.question,
      answer: flashcards.answer,
      addedAt: deckCards.addedAt,
    })
    .from(flashcards)
    .innerJoin(deckCards, eq(flashcards.id, deckCards.flashcardId))
    .where(eq(deckCards.deckId, deckId))
    .orderBy(desc(deckCards.addedAt))

  return result.map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
    addedAt: row.addedAt.getTime(),
  }))
}

/**
 * Check if card is in deck
 */
export async function isCardInDeck(
  deckId: string,
  flashcardId: string
): Promise<boolean> {
  const db = getDb()

  const [result] = await db
    .select({ id: deckCards.id })
    .from(deckCards)
    .where(
      and(
        eq(deckCards.deckId, deckId),
        eq(deckCards.flashcardId, flashcardId)
      )
    )
    .limit(1)

  return result !== undefined
}

/**
 * Get deck IDs containing a flashcard
 */
export async function getDecksContainingCard(
  flashcardId: string
): Promise<string[]> {
  const db = getDb()

  const result = await db
    .select({ deckId: deckCards.deckId })
    .from(deckCards)
    .where(eq(deckCards.flashcardId, flashcardId))

  return result.map((row) => row.deckId)
}

/**
 * Get card count for deck
 */
export async function getDeckCardCount(deckId: string): Promise<number> {
  const db = getDb()

  const [result] = await db
    .select({ count: count() })
    .from(deckCards)
    .where(eq(deckCards.deckId, deckId))

  return result?.count ?? 0
}
