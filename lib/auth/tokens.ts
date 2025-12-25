/**
 * Token Generation and Validation Utilities
 *
 * Provides cryptographically secure token generation for:
 * - Password reset tokens
 * - Email verification tokens
 *
 * Security features:
 * - Crypto.randomBytes for CSPRNG (256 bits of entropy)
 * - SHA-256 hashing before storage (prevents token theft from DB breach)
 * - Constant-time comparison to prevent timing attacks
 */

import { createHash, randomBytes, timingSafeEqual } from 'crypto'

/**
 * Generate a cryptographically secure token
 *
 * @returns Object containing raw token (64 hex chars) and hashed token (SHA-256)
 *
 * @example
 * const { rawToken, hashedToken } = generateToken()
 * // Store hashedToken in database
 * // Send rawToken via email (one-time visibility)
 */
export function generateToken(): { rawToken: string; hashedToken: string } {
  // Generate 32 random bytes (256 bits) -> 64 hex characters
  const rawToken = randomBytes(32).toString('hex')

  // Hash the token using SHA-256 for storage
  const hashedToken = hashToken(rawToken)

  return { rawToken, hashedToken }
}

/**
 * Hash a token using SHA-256
 *
 * @param token - Raw token to hash
 * @returns SHA-256 hash as hex string (64 characters)
 *
 * @example
 * const hash = hashToken(rawTokenFromRequest)
 * // Compare with stored hash in database
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Validate a token against a stored hash
 *
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param rawToken - Token from user request
 * @param storedHash - Hashed token from database
 * @returns True if token matches hash, false otherwise
 *
 * @example
 * const isValid = validateToken(tokenFromRequest, tokenHashFromDB)
 * if (!isValid) throw new Error('Invalid token')
 */
export function validateToken(rawToken: string, storedHash: string): boolean {
  if (!rawToken || !storedHash) {
    return false
  }

  // Hash the incoming token
  const incomingHash = hashToken(rawToken)

  try {
    // Convert hex strings to buffers for timing-safe comparison
    const incomingBuffer = Buffer.from(incomingHash, 'hex')
    const storedBuffer = Buffer.from(storedHash, 'hex')

    // Ensure buffers are same length (should both be 32 bytes for SHA-256)
    if (incomingBuffer.length !== storedBuffer.length) {
      return false
    }

    // Use constant-time comparison to prevent timing attacks
    return timingSafeEqual(incomingBuffer, storedBuffer)
  } catch (error) {
    // If buffer conversion fails (invalid hex), return false
    return false
  }
}
