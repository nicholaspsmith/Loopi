/**
 * Goal Limits Constants
 *
 * Hard limits to encourage focus and prevent overwhelm.
 * - Research shows 3-7 concurrent goals is optimal for focus
 * - Keeps archive manageable, encourages cleanup
 * - Simplifies UI (no pagination needed for 12 items max)
 */

export const GOAL_LIMITS = {
  /** Maximum active goals per user */
  ACTIVE: 6,
  /** Maximum archived goals per user */
  ARCHIVED: 6,
  /** Maximum total goals per user (active + archived) */
  TOTAL: 12,
} as const

export type GoalLimits = typeof GOAL_LIMITS
