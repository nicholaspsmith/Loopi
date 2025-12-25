/**
 * POST /api/auth/verify-email
 *
 * Verifies user email address using valid verification token
 *
 * Security features:
 * - Token validation (expiration, usage, hash verification)
 * - Security event logging
 * - Token marked as used after successful verification
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateVerificationToken } from '@/lib/db/operations/email-verification-tokens'
import { getUserById } from '@/lib/db/operations/users'
import { logSecurityEvent } from '@/lib/db/operations/security-logs'
import { getGeolocation } from '@/lib/auth/geolocation'
import { hashToken } from '@/lib/auth/tokens'
import { checkRateLimit } from '@/lib/auth/rate-limit'
import { getClientIpAddress } from '@/lib/auth/helpers'

// Request validation schema
const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
})

export async function POST(request: NextRequest) {
  try {
    // Extract client IP address for rate limiting and logging
    const ipAddress = getClientIpAddress(request)

    // Parse and validate request body first
    const body = await request.json()
    const validation = verifyEmailSchema.safeParse(body)

    if (!validation.success) {
      const errors = validation.error.issues
        .map((err: { message: string }) => err.message)
        .join(', ')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const { token } = validation.data

    // Get IP and user agent for logging
    const userAgent = request.headers.get('user-agent')
    const geolocation = await getGeolocation(ipAddress)

    // Check rate limit BEFORE token validation to prevent consuming quota
    const rateLimitResult = await checkRateLimit(`verify-email:${ipAddress}`)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: `Too many verification attempts. Please try again in ${Math.ceil(
            (rateLimitResult.retryAfter || 900) / 60
          )} minutes.`,
        },
        { status: 429 }
      )
    }

    // Validate verification token
    const { valid, userId, tokenId, error } = await validateVerificationToken(token)

    // Record attempt AFTER rate limit check but regardless of token validity
    // This ensures invalid tokens count towards rate limit without consuming quota when already limited
    const { recordAttempt } = await import('@/lib/auth/rate-limit')
    await recordAttempt(`verify-email:${ipAddress}`)

    if (!valid || !userId) {
      // Log failed attempt
      await logSecurityEvent({
        eventType: 'email_verification_attempt',
        email: 'unknown', // We don't have email context for invalid tokens
        ipAddress,
        userAgent,
        geolocation,
        tokenId: tokenId || null,
        outcome: 'failed',
        metadata: { reason: error || 'invalid_token' },
      })

      // Return appropriate error
      if (error === 'Token expired') {
        return NextResponse.json(
          {
            error: 'This verification link has expired. Please request a new verification email.',
          },
          { status: 401 }
        )
      }

      if (error === 'Token already used') {
        return NextResponse.json(
          { error: 'This email has already been verified.' },
          { status: 401 }
        )
      }

      return NextResponse.json(
        { error: 'Invalid verification link. Please request a new one.' },
        { status: 401 }
      )
    }

    // Get user details
    const user = await getUserById(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Execute verification in transaction (atomic: both succeed or both fail)
    const { getDb } = await import('@/lib/db/pg-client')
    const db = getDb()
    const tokenHash = hashToken(token)

    await db.transaction(async (tx) => {
      const { users, emailVerificationTokens } = await import('@/lib/db/drizzle-schema')
      const { eq, and } = await import('drizzle-orm')

      // 1. Mark token as used FIRST with race condition protection
      //    This prevents concurrent requests from reusing the same token
      const [markedToken] = await tx
        .update(emailVerificationTokens)
        .set({ used: true, usedAt: new Date() })
        .where(
          and(
            eq(emailVerificationTokens.tokenHash, tokenHash),
            eq(emailVerificationTokens.used, false)
          )
        )
        .returning()

      if (!markedToken) {
        throw new Error('Token has already been used or is invalid')
      }

      // 2. Update user email verification status AFTER token is marked used
      //    If user update fails, transaction rolls back and token remains unused for retry
      await tx
        .update(users)
        .set({
          emailVerified: true,
          emailVerifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
    })

    // Log successful email verification
    await logSecurityEvent({
      userId: user.id,
      eventType: 'email_verification_success',
      email: user.email,
      ipAddress,
      userAgent,
      geolocation,
      tokenId: tokenId || null,
      outcome: 'success',
    })

    return NextResponse.json({
      message: 'Email successfully verified!',
    })
  } catch (error) {
    console.error('❌ Error in verify-email route:', error)

    // Generic error response (no details leaked)
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    )
  }
}
