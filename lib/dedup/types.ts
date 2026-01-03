/**
 * Deduplication Types
 *
 * Types for duplicate detection results and batch filtering.
 */

/**
 * Result of checking for duplicates
 */
export interface DuplicateCheckResult {
  /** True if any item exceeds similarity threshold */
  isDuplicate: boolean
  /** Top N similar items (max 3) */
  similarItems: SimilarItem[]
  /** Highest similarity score (0-1), null if no matches */
  topScore: number | null
  /** True if check was skipped (short content, service error) */
  checkSkipped: boolean
  /** Reason for skip if applicable */
  skipReason?: 'content_too_short' | 'service_unavailable' | 'embedding_failed'
}

/**
 * A similar item found during duplicate check
 */
export interface SimilarItem {
  /** ID of existing item */
  id: string
  /** Similarity score (0-1) */
  score: number
  /** Text to show in warning (question or title) */
  displayText: string
  /** Item type */
  type: 'flashcard' | 'goal'
}

/**
 * Result of filtering duplicates from a batch
 */
export interface BatchFilterResult<T> {
  /** Items that passed dedup filter */
  uniqueItems: T[]
  /** Items removed with reasons */
  filteredItems: FilteredItem<T>[]
  /** Statistics about the filtering */
  stats: BatchFilterStats
}

/**
 * Statistics from batch filtering
 */
export interface BatchFilterStats {
  /** Total items in original batch */
  total: number
  /** Items that passed filter */
  unique: number
  /** Items removed as duplicates */
  duplicatesRemoved: number
}

/**
 * An item that was filtered out as a duplicate
 */
export interface FilteredItem<T> {
  /** The item that was filtered */
  item: T
  /** Why it was filtered */
  reason: 'duplicate_existing' | 'duplicate_in_batch'
  /** ID of item it duplicates */
  similarTo: string
  /** Similarity score */
  score: number
}

/**
 * Input for flashcard duplicate check
 */
export interface FlashcardDuplicateCheckInput {
  /** The question text to check */
  question: string
  /** User ID for scoping the search */
  userId: string
}

/**
 * Input for goal duplicate check
 */
export interface GoalDuplicateCheckInput {
  /** Goal title */
  title: string
  /** Goal description (optional) */
  description?: string
  /** User ID for scoping the search */
  userId: string
}
