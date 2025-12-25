/**
 * Password Reset Tokens Database Operations
 *
 * Handles CRUD operations for password reset tokens
 * Tokens are single-use with 1-hour expiration
 */

import { db } from '@/lib/db'
import { passwordResetTokens, type PasswordResetToken } from '@/lib/db/drizzle-schema'
import { eq, and } from 'drizzle-orm'
import { generateToken, validateToken } from '@/lib/auth/tokens'

/**
 * Create a password reset token for a user
 *
 * Invalidates all previous tokens for this user
 *
 * @param userId - User ID to create token for
 * @returns Object with rawToken (send via email) and token entry
 *
 * @example
 * const { rawToken, tokenEntry } = await createResetToken(user.id)
 * // Send rawToken via email
 * // Store tokenEntry.id in security logs
 */
export async function createResetToken(userId: string): Promise<{
  rawToken: string
  tokenEntry: PasswordResetToken
}> {
  // Invalidate all previous tokens for this user
  await db
    .update(passwordResetTokens)
    .set({ used: true, usedAt: new Date() })
    .where(eq(passwordResetTokens.userId, userId))

  // Generate new token
  const { rawToken, hashedToken } = generateToken()

  // Token expires in 1 hour
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  // Insert new token
  const [tokenEntry] = await db
    .insert(passwordResetTokens)
    .values({
      userId,
      tokenHash: hashedToken,
      expiresAt,
      used: false,
    })
    .returning()

  return { rawToken, tokenEntry }
}

/**
 * Validate a password reset token
 *
 * Checks if token is valid, not expired, and not already used
 *
 * @param rawToken - Raw token from user request
 * @returns Object with valid status, userId if valid, and error message if invalid
 *
 * @example
 * const { valid, userId, error } = await validateResetToken(tokenFromRequest)
 * if (!valid) {
 *   return res.status(401).json({ error })
 * }
 */
export async function validateResetToken(rawToken: string): Promise<{
  valid: boolean
  userId?: string
  tokenId?: string
  error?: string
}> {
  // Hash the incoming token
  const { hashToken } = await import('@/lib/auth/tokens')
  const incomingHash = hashToken(rawToken)

  // Find token by hash
  const [token] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, incomingHash))
    .limit(1)

  if (!token) {
    return { valid: false, error: 'Invalid token' }
  }

  // Check if already used
  if (token.used) {
    return { valid: false, error: 'Token already used' }
  }

  // Check if expired
  if (token.expiresAt < new Date()) {
    return { valid: false, error: 'Token expired' }
  }

  // Validate using constant-time comparison
  if (!validateToken(rawToken, token.tokenHash)) {
    return { valid: false, error: 'Invalid token' }
  }

  return { valid: true, userId: token.userId, tokenId: token.id }
}

/**
 * Mark a token as used
 *
 * Should be called after successful password reset
 *
 * @param tokenHash - Hashed token to mark as used
 *
 * @example
 * await markTokenUsed(hashedToken)
 */
export async function markTokenUsed(tokenHash: string): Promise<void> {
  await db
    .update(passwordResetTokens)
    .set({ used: true, usedAt: new Date() })
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
}

/**
 * Invalidate all previous tokens for a user
 *
 * Used when creating a new token to ensure only one active token
 *
 * @param userId - User ID to invalidate tokens for
 *
 * @example
 * await invalidatePreviousTokens(user.id)
 */
export async function invalidatePreviousTokens(userId: string): Promise<void> {
  await db
    .update(passwordResetTokens)
    .set({ used: true, usedAt: new Date() })
    .where(and(eq(passwordResetTokens.userId, userId), eq(passwordResetTokens.used, false)))
}
