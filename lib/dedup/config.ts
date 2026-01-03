/**
 * Deduplication Configuration
 *
 * Configurable thresholds and settings for duplicate detection.
 */

export const DEDUP_CONFIG = {
  /**
   * Similarity threshold (0-1) above which items are considered duplicates.
   * 0.85 = 85% similar
   */
  SIMILARITY_THRESHOLD: 0.85,

  /**
   * Minimum content length to trigger dedup check.
   * Content shorter than this bypasses duplicate detection.
   */
  MIN_CONTENT_LENGTH: 10,

  /**
   * Maximum number of similar items to return in warning UI.
   */
  MAX_SIMILAR_RESULTS: 3,

  /**
   * Timeout for embedding generation API call in milliseconds.
   */
  EMBEDDING_TIMEOUT_MS: 5000,

  /**
   * Enable debug logging for dedup operations.
   */
  DEBUG_LOGGING: process.env.NODE_ENV !== 'production',
} as const

export type DedupConfig = typeof DEDUP_CONFIG
