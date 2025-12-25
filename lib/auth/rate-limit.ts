/**
 * Rate Limiting
 *
 * Implements sliding window rate limiting using PostgreSQL
 * Limit: 3 requests per 15 minutes per email address
 *
 * Features:
 * - Sliding window (not fixed window) prevents burst attacks
 * - Stores attempt timestamps in JSONB for efficient filtering
 * - Returns retry-after time in seconds when rate limited
 */

import { getRateLimitByEmail, upsertRateLimit } from '@/lib/db/operations/rate-limits'

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 3

/**
 * Check if email address is rate limited
 *
 * @param email - Email address to check
 * @returns Object with allowed status and optional retryAfter in seconds
 *
 * @example
 * const { allowed, retryAfter } = await checkRateLimit('user@example.com')
 * if (!allowed) {
 *   return res.status(429).json({
 *     error: 'Too many requests',
 *     retryAfter
 *   })
 * }
 */
export async function checkRateLimit(
  email: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = new Date()
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS)

  // Get existing rate limit entry
  const existing = await getRateLimitByEmail(email)

  if (!existing) {
    // No previous attempts - allow
    return { allowed: true }
  }

  // Parse attempts array from JSONB
  const attempts = (existing.attempts as string[]) || []

  // Filter attempts within current sliding window (last 15 minutes)
  const recentAttempts = attempts
    .map((timestamp) => new Date(timestamp))
    .filter((timestamp) => timestamp > windowStart)

  // Check if rate limit exceeded
  if (recentAttempts.length >= RATE_LIMIT_MAX_ATTEMPTS) {
    // Calculate retry-after in seconds
    const oldestRecentAttempt = recentAttempts[0]
    const retryAfterMs = oldestRecentAttempt.getTime() + RATE_LIMIT_WINDOW_MS - now.getTime()
    const retryAfter = Math.ceil(retryAfterMs / 1000) // Convert to seconds

    return { allowed: false, retryAfter }
  }

  return { allowed: true }
}

/**
 * Record an attempt for rate limiting
 *
 * Adds current timestamp to attempts array and updates window start
 *
 * @param email - Email address to record attempt for
 *
 * @example
 * await recordAttempt('user@example.com')
 * // Request will now count toward rate limit
 */
export async function recordAttempt(email: string): Promise<void> {
  const now = new Date()
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MS)

  // Get existing rate limit entry
  const existing = await getRateLimitByEmail(email)

  // Parse attempts array
  const attempts = existing ? (existing.attempts as string[]) || [] : []

  // Filter out old attempts (outside 15-minute window)
  const recentAttempts = attempts
    .map((timestamp) => new Date(timestamp).toISOString())
    .filter((timestamp) => new Date(timestamp) > windowStart)

  // Add current attempt
  recentAttempts.push(now.toISOString())

  // Update or create rate limit entry
  await upsertRateLimit({
    email,
    attempts: recentAttempts as any, // JSONB array
    windowStart: recentAttempts.length > 0 ? new Date(recentAttempts[0]) : now,
  })
}
