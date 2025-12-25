import bcrypt from 'bcryptjs'
import { z } from 'zod'
import type { NextRequest } from 'next/server'

/**
 * Authentication Helper Functions
 *
 * Provides utilities for password hashing, validation, and session management.
 */

/**
 * Password validation schema
 * Enforces strong password requirements aligned with NIST guidelines
 */
export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must not exceed 72 characters') // Prevent bcrypt DoS
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
    'Password must contain at least one special character'
  )

/**
 * Email validation schema
 */
export const EmailSchema = z.string().email('Invalid email address').min(3).max(255)

/**
 * Hash a password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password (60 characters)
 */
export async function hashPassword(password: string): Promise<string> {
  // Validate password
  PasswordSchema.parse(password)

  // Generate salt and hash (10 rounds)
  const salt = await bcrypt.genSalt(10)
  const hash = await bcrypt.hash(password, salt)

  return hash
}

/**
 * Verify a password against a hash
 * @param password - Plain text password
 * @param hash - Hashed password from database
 * @returns True if password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash)
}

/**
 * Validate email format
 * @param email - Email address to validate
 * @returns True if email is valid
 */
export function validateEmail(email: string): boolean {
  const result = EmailSchema.safeParse(email)
  return result.success
}

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns True if password meets requirements
 */
export function validatePassword(password: string): boolean {
  const result = PasswordSchema.safeParse(password)
  return result.success
}

/**
 * Session expiration duration in milliseconds
 * Default: 7 days
 */
export const SESSION_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Check if a session timestamp is expired
 * @param timestamp - Session creation timestamp
 * @returns True if session is expired
 */
export function isSessionExpired(timestamp: number): boolean {
  const now = Date.now()
  return now - timestamp > SESSION_EXPIRATION_MS
}

/**
 * Extract client IP address from Next.js request
 *
 * Prioritizes headers in order of trustworthiness:
 * 1. x-real-ip (set by trusted reverse proxies like Nginx)
 * 2. x-forwarded-for (first IP in chain, may be spoofed)
 * 3. 'unknown' fallback
 *
 * @param request - Next.js request object
 * @returns IP address or 'unknown'
 *
 * @example
 * const ip = getClientIpAddress(request)
 * console.log(`Request from: ${ip}`)
 */
export function getClientIpAddress(request: NextRequest): string {
  // Priority 1: x-real-ip header (set by trusted reverse proxy)
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }

  // Priority 2: x-forwarded-for header (may contain chain of IPs)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // Take first IP in chain (client IP)
    const firstIp = forwardedFor.split(',')[0]?.trim()
    if (firstIp) {
      return firstIp
    }
  }

  // Fallback: unknown
  return 'unknown'
}
