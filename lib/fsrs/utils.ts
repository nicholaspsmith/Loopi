import { Rating, State, Card } from 'ts-fsrs'

/**
 * FSRS Utility Functions
 *
 * Helper functions for working with FSRS ratings, states, and conversions
 */

/**
 * Convert Rating enum to human-readable string
 */
export function ratingToString(rating: Rating): string {
  switch (rating) {
    case Rating.Again:
      return 'Again'
    case Rating.Hard:
      return 'Hard'
    case Rating.Good:
      return 'Good'
    case Rating.Easy:
      return 'Easy'
    default:
      return 'Unknown'
  }
}

/**
 * Convert rating number (1-4) to Rating enum
 */
export function numberToRating(num: number): Rating | null {
  if (num === 1) return Rating.Again
  if (num === 2) return Rating.Hard
  if (num === 3) return Rating.Good
  if (num === 4) return Rating.Easy
  return null
}

/**
 * Validate rating number
 */
export function isValidRating(num: number): boolean {
  return num >= 1 && num <= 4
}

/**
 * Convert State enum to human-readable string
 */
export function stateToString(state: State): string {
  switch (state) {
    case State.New:
      return 'New'
    case State.Learning:
      return 'Learning'
    case State.Review:
      return 'Review'
    case State.Relearning:
      return 'Relearning'
    default:
      return 'Unknown'
  }
}

/**
 * Convert state number (0-3) to State enum
 */
export function numberToState(num: number): State | null {
  if (num === 0) return State.New
  if (num === 1) return State.Learning
  if (num === 2) return State.Review
  if (num === 3) return State.Relearning
  return null
}

/**
 * Get rating color for UI
 */
export function getRatingColor(rating: Rating): string {
  switch (rating) {
    case Rating.Again:
      return 'red'
    case Rating.Hard:
      return 'orange'
    case Rating.Good:
      return 'green'
    case Rating.Easy:
      return 'blue'
    default:
      return 'gray'
  }
}

/**
 * Get state color for UI
 */
export function getStateColor(state: State): string {
  switch (state) {
    case State.New:
      return 'purple'
    case State.Learning:
      return 'yellow'
    case State.Review:
      return 'green'
    case State.Relearning:
      return 'orange'
    default:
      return 'gray'
  }
}

/**
 * Format interval in human-readable form
 */
export function formatInterval(days: number): string {
  if (days < 1) {
    const hours = Math.round(days * 24)
    return `${hours}h`
  }
  if (days < 30) {
    return `${Math.round(days)}d`
  }
  if (days < 365) {
    const months = Math.round(days / 30)
    return `${months}mo`
  }
  const years = Math.round(days / 365 * 10) / 10
  return `${years}y`
}

/**
 * Format due date relative to now
 */
export function formatDueDate(due: Date): string {
  const now = new Date()
  const diffMs = due.getTime() - now.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  if (diffDays < 0) {
    return 'Overdue'
  }
  if (diffDays < 1) {
    const hours = Math.ceil(diffDays * 24)
    return `Due in ${hours}h`
  }
  if (diffDays < 7) {
    return `Due in ${Math.ceil(diffDays)}d`
  }
  if (diffDays < 30) {
    const weeks = Math.ceil(diffDays / 7)
    return `Due in ${weeks}w`
  }
  const months = Math.ceil(diffDays / 30)
  return `Due in ${months}mo`
}

/**
 * Get difficulty level description
 */
export function getDifficultyLevel(difficulty: number): string {
  if (difficulty < 3) return 'Easy'
  if (difficulty < 5) return 'Medium'
  if (difficulty < 7) return 'Hard'
  return 'Very Hard'
}

/**
 * Calculate learning progress percentage
 */
export function calculateProgress(card: Card): number {
  // New cards: 0%
  if (card.state === State.New) return 0

  // Learning/Relearning: 25%
  if (card.state === State.Learning || card.state === State.Relearning) {
    return 25
  }

  // Review cards: based on stability
  // Higher stability = better progress
  // Max out at stability of 365 days (1 year) = 100%
  if (card.state === State.Review) {
    const progressPercent = Math.min(card.stability / 365, 1) * 75 + 25
    return Math.round(progressPercent)
  }

  return 0
}

/**
 * Get recommended action based on card state
 */
export function getRecommendedAction(card: Card): string {
  if (card.state === State.New) {
    return 'Start learning this card'
  }
  if (card.state === State.Learning) {
    return 'Continue practicing'
  }
  if (card.state === State.Review) {
    const now = new Date()
    const due = new Date(card.due)
    if (due <= now) {
      return 'Ready for review'
    }
    return 'Review scheduled'
  }
  if (card.state === State.Relearning) {
    return 'Needs more practice'
  }
  return 'Unknown status'
}

/**
 * Convert Card to plain object for storage
 */
export function cardToObject(card: Card): {
  state: number
  due: number
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  reps: number
  lapses: number
  last_review?: number
} {
  return {
    state: card.state,
    due: new Date(card.due).getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps: card.reps,
    lapses: card.lapses,
    last_review: card.last_review ? new Date(card.last_review).getTime() : undefined,
  }
}

/**
 * Convert plain object to Card
 */
export function objectToCard(obj: {
  state: number
  due: number
  stability: number
  difficulty: number
  elapsed_days: number
  scheduled_days: number
  reps: number
  lapses: number
  last_review?: number
}): Card {
  return {
    state: obj.state,
    due: new Date(obj.due),
    stability: obj.stability,
    difficulty: obj.difficulty,
    elapsed_days: obj.elapsed_days,
    scheduled_days: obj.scheduled_days,
    reps: obj.reps,
    lapses: obj.lapses,
    last_review: obj.last_review ? new Date(obj.last_review) : undefined,
  }
}
