/**
 * Deck Limit Validation Helpers
 *
 * Enforces hard limits for deck organization:
 * - 100 decks per user
 * - 1000 cards per deck
 */

export const DECK_LIMITS = {
  MAX_DECKS_PER_USER: 100,
  MAX_CARDS_PER_DECK: 1000,
  MIN_DECK_NAME_LENGTH: 1,
  MAX_DECK_NAME_LENGTH: 200,
} as const

/**
 * Validate deck name
 * @throws Error if name is invalid
 */
export function validateDeckName(name: string): string {
  const trimmed = name.trim()

  if (trimmed.length < DECK_LIMITS.MIN_DECK_NAME_LENGTH) {
    throw new Error('Deck name cannot be empty')
  }

  if (trimmed.length > DECK_LIMITS.MAX_DECK_NAME_LENGTH) {
    throw new Error(`Deck name must be ${DECK_LIMITS.MAX_DECK_NAME_LENGTH} characters or less`)
  }

  return trimmed
}

/**
 * Validate deck count for user
 * @throws Error if limit exceeded
 */
export function validateDeckCount(currentCount: number): void {
  if (currentCount >= DECK_LIMITS.MAX_DECKS_PER_USER) {
    throw new Error(
      `Maximum deck limit reached (${DECK_LIMITS.MAX_DECKS_PER_USER} decks)`
    )
  }
}

/**
 * Validate card count for deck
 * @throws Error if limit would be exceeded
 */
export function validateCardCount(
  currentCount: number,
  cardsToAdd: number
): void {
  const newTotal = currentCount + cardsToAdd

  if (newTotal > DECK_LIMITS.MAX_CARDS_PER_DECK) {
    throw new Error(
      `Deck limit reached (${DECK_LIMITS.MAX_CARDS_PER_DECK} cards maximum). ` +
      `Current: ${currentCount}, Attempting to add: ${cardsToAdd}`
    )
  }
}

/**
 * Validate FSRS override values
 * @throws Error if values are negative
 */
export function validateFSRSOverrides(overrides: {
  newCardsPerDayOverride?: number | null
  cardsPerSessionOverride?: number | null
}): void {
  if (
    overrides.newCardsPerDayOverride !== undefined &&
    overrides.newCardsPerDayOverride !== null &&
    overrides.newCardsPerDayOverride < 0
  ) {
    throw new Error('new_cards_per_day_override must be non-negative')
  }

  if (
    overrides.cardsPerSessionOverride !== undefined &&
    overrides.cardsPerSessionOverride !== null &&
    overrides.cardsPerSessionOverride < 0
  ) {
    throw new Error('cards_per_session_override must be non-negative')
  }
}

/**
 * Check if adding cards would exceed deck limit
 * Returns true if operation is allowed
 */
export function canAddCardsToDeck(
  currentCount: number,
  cardsToAdd: number
): { allowed: boolean; reason?: string } {
  const newTotal = currentCount + cardsToAdd

  if (newTotal > DECK_LIMITS.MAX_CARDS_PER_DECK) {
    return {
      allowed: false,
      reason: `Would exceed deck limit (${DECK_LIMITS.MAX_CARDS_PER_DECK} cards maximum). Current: ${currentCount}, Attempting to add: ${cardsToAdd}`,
    }
  }

  return { allowed: true }
}

/**
 * Check if user can create a new deck
 * Returns true if operation is allowed
 */
export function canCreateDeck(
  currentCount: number
): { allowed: boolean; reason?: string } {
  if (currentCount >= DECK_LIMITS.MAX_DECKS_PER_USER) {
    return {
      allowed: false,
      reason: `Maximum deck limit reached (${DECK_LIMITS.MAX_DECKS_PER_USER} decks)`,
    }
  }

  return { allowed: true }
}
