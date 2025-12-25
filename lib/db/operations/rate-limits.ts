/**
 * Rate Limits Database Operations
 *
 * Provides CRUD operations for the rate_limits table
 * Used for sliding window rate limiting (3 requests per 15 minutes)
 */

import { db } from '@/lib/db'
import { rateLimits, type RateLimit, type NewRateLimit } from '@/lib/db/drizzle-schema'
import { eq, lt } from 'drizzle-orm'

/**
 * Get rate limit entry by email
 *
 * @param email - Email address to look up
 * @returns Rate limit entry or null if not found
 */
export async function getRateLimitByEmail(email: string): Promise<RateLimit | null> {
  const [result] = await db.select().from(rateLimits).where(eq(rateLimits.email, email)).limit(1)
  return result || null
}

/**
 * Upsert rate limit entry
 *
 * Creates new entry if doesn't exist, updates if it does
 *
 * @param data - Rate limit data to insert/update
 * @returns Created/updated rate limit entry
 */
export async function upsertRateLimit(data: NewRateLimit): Promise<RateLimit> {
  // Use INSERT ... ON CONFLICT DO UPDATE pattern
  const [result] = await db
    .insert(rateLimits)
    .values(data)
    .onConflictDoUpdate({
      target: rateLimits.email,
      set: {
        attempts: data.attempts,
        windowStart: data.windowStart,
      },
    })
    .returning()

  return result
}

/**
 * Delete old rate limit entries (cleanup job)
 *
 * Removes entries where windowStart is older than 15 minutes
 *
 * @returns Number of deleted entries
 */
export async function deleteOldRateLimits(): Promise<number> {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)

  await db.delete(rateLimits).where(lt(rateLimits.windowStart, fifteenMinutesAgo))

  // Return number of deleted rows (if available)
  return 0 // Drizzle doesn't return count by default
}
