import { FSRS, Rating, RecordLog, Card, createEmptyCard } from 'ts-fsrs'

/**
 * FSRS Scheduler Wrapper
 *
 * Wraps the ts-fsrs library for flashcard scheduling
 *
 * FSRS (Free Spaced Repetition Scheduler) is an evidence-based scheduling algorithm
 * that optimizes review intervals based on memory research.
 */

// Initialize FSRS with default parameters
const fsrs = new FSRS()

/**
 * Create a new card with initial FSRS state
 */
export function initializeCard(): Card {
  return createEmptyCard()
}

/**
 * Schedule next review for a card based on rating
 *
 * @param card - Current FSRS card state
 * @param rating - User's rating (Again=1, Hard=2, Good=3, Easy=4)
 * @returns Updated card and scheduling record
 */
export function scheduleCard(
  card: Card,
  rating: Rating
): { card: Card; log: RecordLog } {
  const now = new Date()

  // Use FSRS algorithm to calculate next review
  const scheduling = fsrs.repeat(card, now)

  // Get the specific rating's result
  const result = scheduling[rating]

  return {
    card: result.card,
    log: result.log,
  }
}

/**
 * Get all possible scheduling options for a card
 *
 * Returns what would happen for each rating (Again, Hard, Good, Easy)
 */
export function getSchedulingOptions(card: Card) {
  const now = new Date()
  const scheduling = fsrs.repeat(card, now)

  return {
    [Rating.Again]: {
      interval: scheduling[Rating.Again].log.scheduled_days,
      due: scheduling[Rating.Again].card.due,
      card: scheduling[Rating.Again].card,
    },
    [Rating.Hard]: {
      interval: scheduling[Rating.Hard].log.scheduled_days,
      due: scheduling[Rating.Hard].card.due,
      card: scheduling[Rating.Hard].card,
    },
    [Rating.Good]: {
      interval: scheduling[Rating.Good].log.scheduled_days,
      due: scheduling[Rating.Good].card.due,
      card: scheduling[Rating.Good].card,
    },
    [Rating.Easy]: {
      interval: scheduling[Rating.Easy].log.scheduled_days,
      due: scheduling[Rating.Easy].card.due,
      card: scheduling[Rating.Easy].card,
    },
  }
}

/**
 * Check if a card is due for review
 */
export function isCardDue(card: Card): boolean {
  const now = new Date()
  return new Date(card.due) <= now
}

/**
 * Get days until next review
 */
export function getDaysUntilDue(card: Card): number {
  const now = new Date()
  const due = new Date(card.due)
  const diffMs = due.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

/**
 * Get human-readable description of card state
 */
export function getCardStateDescription(card: Card): string {
  switch (card.state) {
    case 0:
      return 'New'
    case 1:
      return 'Learning'
    case 2:
      return 'Review'
    case 3:
      return 'Relearning'
    default:
      return 'Unknown'
  }
}

/**
 * Calculate retention rate from card stats
 */
export function calculateRetentionRate(card: Card): number {
  const total = card.reps
  if (total === 0) return 100

  const successful = total - card.lapses
  return (successful / total) * 100
}

/**
 * Export FSRS parameters (for advanced users)
 */
export function getParameters() {
  return fsrs.parameters
}
