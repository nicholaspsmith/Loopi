import { getDb } from '@/lib/db/pg-client'
import { flashcards, deckCards, decks } from '@/lib/db/drizzle-schema'
import { eq, and, inArray } from 'drizzle-orm'
import type { Flashcard } from '@/types/db'
import { State } from 'ts-fsrs'

/**
 * Deck-Specific FSRS Scheduler
 *
 * Filters FSRS scheduling queue by deck membership using query-level filtering.
 * Implements deck-specific override logic with precedence: session > deck > global
 *
 * Maps to T031-T032 in Phase 3 (FR-010, FR-027, FR-028, FR-029)
 */

/**
 * FSRS Settings with precedence
 */
export interface FSRSSettings {
  newCardsPerDay: number
  cardsPerSession: number
  source: 'session' | 'deck' | 'global'
}

/**
 * Default global FSRS settings
 */
const GLOBAL_DEFAULTS: FSRSSettings = {
  newCardsPerDay: 20,
  cardsPerSession: 50,
  source: 'global',
}

/**
 * Get effective FSRS settings for a deck session
 * Precedence: session > deck > global (FR-029)
 */
export async function getEffectiveFSRSSettings(
  deckId: string,
  sessionOverrides?: {
    newCardsPerDay?: number
    cardsPerSession?: number
  }
): Promise<FSRSSettings> {
  const db = getDb()

  // Get deck settings
  const [deck] = await db.select().from(decks).where(eq(decks.id, deckId)).limit(1)

  if (!deck) {
    throw new Error(`Deck not found: ${deckId}`)
  }

  // Apply precedence: session > deck > global
  const settings: FSRSSettings = {
    newCardsPerDay:
      sessionOverrides?.newCardsPerDay ??
      deck.newCardsPerDayOverride ??
      GLOBAL_DEFAULTS.newCardsPerDay,
    cardsPerSession:
      sessionOverrides?.cardsPerSession ??
      deck.cardsPerSessionOverride ??
      GLOBAL_DEFAULTS.cardsPerSession,
    source: sessionOverrides
      ? 'session'
      : deck.newCardsPerDayOverride !== null || deck.cardsPerSessionOverride !== null
        ? 'deck'
        : 'global',
  }

  return settings
}

/**
 * Get due flashcards filtered by deck membership
 * Uses query-level filtering: WHERE flashcard_id IN (SELECT flashcard_id FROM deck_cards WHERE deck_id = ?)
 */
export async function getDueFlashcardsForDeck(
  deckId: string,
  userId: string
): Promise<Flashcard[]> {
  const db = getDb()

  // Get all flashcard IDs in this deck
  const deckCardRows = await db
    .select({ flashcardId: deckCards.flashcardId })
    .from(deckCards)
    .where(eq(deckCards.deckId, deckId))

  const flashcardIds = deckCardRows.map((row) => row.flashcardId)

  if (flashcardIds.length === 0) {
    return []
  }

  // Get flashcards in deck
  const rows = await db
    .select()
    .from(flashcards)
    .where(and(eq(flashcards.userId, userId), inArray(flashcards.id, flashcardIds)))

  // Filter by due date in memory (JSONB date comparison in SQL is complex)
  const now = new Date()
  const dueCards = rows
    .filter((row) => {
      const fsrsState = row.fsrsState as any
      const dueDate = new Date(fsrsState.due)
      return dueDate <= now
    })
    .sort((a, b) => {
      const aState = (a.fsrsState as any).state
      const bState = (b.fsrsState as any).state

      // FSRS state priority order: New (0), Learning (1), Relearning (3), Review (2)
      const statePriority: { [key: number]: number } = {
        0: 1, // New
        1: 2, // Learning
        3: 3, // Relearning
        2: 4, // Review
      }

      const aPriority = statePriority[aState] ?? 5
      const bPriority = statePriority[bState] ?? 5

      // Sort by state priority first
      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }

      // Within same state, sort by due date (earliest first)
      const aDue = new Date((a.fsrsState as any).due).getTime()
      const bDue = new Date((b.fsrsState as any).due).getTime()
      return aDue - bDue
    })

  return dueCards.map((row) => {
    const fsrsState = row.fsrsState as any
    return {
      id: row.id,
      userId: row.userId,
      conversationId: row.conversationId,
      messageId: row.messageId,
      question: row.question,
      answer: row.answer,
      questionEmbedding: null, // Stored in LanceDB, not PostgreSQL
      fsrsState: {
        due: new Date(fsrsState.due),
        stability: fsrsState.stability ?? 0,
        difficulty: fsrsState.difficulty ?? 0,
        elapsed_days: fsrsState.elapsed_days ?? 0,
        scheduled_days: fsrsState.scheduled_days ?? 0,
        learning_steps: fsrsState.learning_steps ?? 0,
        reps: fsrsState.reps ?? 0,
        lapses: fsrsState.lapses ?? 0,
        state: fsrsState.state as State,
        last_review: fsrsState.last_review ? new Date(fsrsState.last_review) : undefined,
      },
      createdAt: row.createdAt.getTime(),
    }
  })
}

/**
 * Get new flashcards (state = New) filtered by deck membership
 * Respects newCardsPerDay limit with deck-specific override
 */
export async function getNewFlashcardsForDeck(
  deckId: string,
  userId: string,
  limit: number
): Promise<Flashcard[]> {
  const db = getDb()

  // Get all flashcard IDs in this deck
  const deckCardRows = await db
    .select({ flashcardId: deckCards.flashcardId })
    .from(deckCards)
    .where(eq(deckCards.deckId, deckId))

  const flashcardIds = deckCardRows.map((row) => row.flashcardId)

  if (flashcardIds.length === 0) {
    return []
  }

  // Get flashcards in deck
  const rows = await db
    .select()
    .from(flashcards)
    .where(and(eq(flashcards.userId, userId), inArray(flashcards.id, flashcardIds)))

  // Filter by state = New (0) in memory
  const newCards = rows
    .filter((row) => {
      const fsrsState = row.fsrsState as any
      return fsrsState.state === 0 // State.New
    })
    .slice(0, limit)

  return newCards.map((row) => {
    const fsrsState = row.fsrsState as any
    return {
      id: row.id,
      userId: row.userId,
      conversationId: row.conversationId,
      messageId: row.messageId,
      question: row.question,
      answer: row.answer,
      questionEmbedding: null, // Stored in LanceDB, not PostgreSQL
      fsrsState: {
        due: new Date(fsrsState.due),
        stability: fsrsState.stability ?? 0,
        difficulty: fsrsState.difficulty ?? 0,
        elapsed_days: fsrsState.elapsed_days ?? 0,
        scheduled_days: fsrsState.scheduled_days ?? 0,
        learning_steps: fsrsState.learning_steps ?? 0,
        reps: fsrsState.reps ?? 0,
        lapses: fsrsState.lapses ?? 0,
        state: fsrsState.state as State,
        last_review: fsrsState.last_review ? new Date(fsrsState.last_review) : undefined,
      },
      createdAt: row.createdAt.getTime(),
    }
  })
}

/**
 * Get all flashcards in deck (for session preparation)
 */
export async function getAllFlashcardsInDeck(deckId: string, userId: string): Promise<Flashcard[]> {
  const db = getDb()

  // Get all flashcard IDs in this deck
  const deckCardRows = await db
    .select({ flashcardId: deckCards.flashcardId })
    .from(deckCards)
    .where(eq(deckCards.deckId, deckId))

  const flashcardIds = deckCardRows.map((row) => row.flashcardId)

  if (flashcardIds.length === 0) {
    return []
  }

  // Get flashcards in deck
  const rows = await db
    .select()
    .from(flashcards)
    .where(and(eq(flashcards.userId, userId), inArray(flashcards.id, flashcardIds)))

  return rows.map((row) => {
    const fsrsState = row.fsrsState as any
    return {
      id: row.id,
      userId: row.userId,
      conversationId: row.conversationId,
      messageId: row.messageId,
      question: row.question,
      answer: row.answer,
      questionEmbedding: null, // Stored in LanceDB, not PostgreSQL
      fsrsState: {
        due: new Date(fsrsState.due),
        stability: fsrsState.stability ?? 0,
        difficulty: fsrsState.difficulty ?? 0,
        elapsed_days: fsrsState.elapsed_days ?? 0,
        scheduled_days: fsrsState.scheduled_days ?? 0,
        learning_steps: fsrsState.learning_steps ?? 0,
        reps: fsrsState.reps ?? 0,
        lapses: fsrsState.lapses ?? 0,
        state: fsrsState.state as State,
        last_review: fsrsState.last_review ? new Date(fsrsState.last_review) : undefined,
      },
      createdAt: row.createdAt.getTime(),
    }
  })
}

/**
 * Deck change detection result
 */
export interface DeckChanges {
  addedCards: Flashcard[]
  removedCardIds: string[]
  hasChanges: boolean
}

/**
 * Detect changes in deck composition since session started
 * Used for live session updates (FR-030, FR-031)
 *
 * Compares current deck cards with original session card IDs to detect:
 * - Added cards: Cards now in deck but not in original session
 * - Removed cards: Cards in original session but no longer in deck
 *
 * Maps to T050 in Phase 5 (User Story 2)
 */
export async function detectDeckChanges(
  deckId: string,
  userId: string,
  originalCardIds: string[]
): Promise<DeckChanges> {
  // Get current cards in deck
  const currentCards = await getAllFlashcardsInDeck(deckId, userId)
  const currentCardIds = currentCards.map((card) => card.id)

  // Detect added cards (in current but not in original)
  const addedCardIds = currentCardIds.filter((id) => !originalCardIds.includes(id))
  const addedCards = currentCards.filter((card) => addedCardIds.includes(card.id))

  // Detect removed cards (in original but not in current)
  const removedCardIds = originalCardIds.filter((id) => !currentCardIds.includes(id))

  // Filter added cards to only include FSRS-due cards
  const now = new Date()
  const dueAddedCards = addedCards.filter((card) => {
    const dueDate = new Date(card.fsrsState.due)
    return dueDate <= now
  })

  return {
    addedCards: dueAddedCards,
    removedCardIds,
    hasChanges: dueAddedCards.length > 0 || removedCardIds.length > 0,
  }
}
