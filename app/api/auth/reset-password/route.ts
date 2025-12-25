/**
 * POST /api/auth/reset-password
 *
 * Resets user password using valid reset token
 *
 * Security features:
 * - Token validation (expiration, usage, hash verification)
 * - Password strength validation
 * - Security event logging
 * - Token marked as used after successful reset
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { hash } from 'bcryptjs'
import { validateResetToken } from '@/lib/db/operations/password-reset-tokens'
import { logSecurityEvent } from '@/lib/db/operations/security-logs'
import { getGeolocation } from '@/lib/auth/geolocation'
import { hashToken } from '@/lib/auth/tokens'
import { checkRateLimit } from '@/lib/auth/rate-limit'

// Password validation schema
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must not exceed 72 characters') // Prevent bcrypt DoS
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 3 attempts per 15 minutes per IP
    const ipAddress =
      request.headers.get('x-real-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown'

    // Use composite identifier for rate limiting (email field repurposed for IP-based limiting)
    const rateLimitResult = await checkRateLimit(`reset-password:${ipAddress}`)

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: `Too many password reset attempts. Please try again in ${Math.ceil(
            (rateLimitResult.retryAfter || 900) / 60
          )} minutes.`,
        },
        { status: 429 }
      )
    }

    // Record this attempt for rate limiting
    const { recordAttempt } = await import('@/lib/auth/rate-limit')
    await recordAttempt(`reset-password:${ipAddress}`)

    // Parse and validate request body
    const body = await request.json()
    const validation = resetPasswordSchema.safeParse(body)

    if (!validation.success) {
      const errors = validation.error.issues
        .map((err: { message: string }) => err.message)
        .join(', ')
      return NextResponse.json({ error: errors }, { status: 400 })
    }

    const { token, password } = validation.data

    // Get IP and user agent for logging
    const userAgent = request.headers.get('user-agent')
    const geolocation = await getGeolocation(ipAddress)

    // Validate reset token
    const { valid, userId, tokenId, error } = await validateResetToken(token)

    if (!valid || !userId) {
      // Log failed attempt
      await logSecurityEvent({
        eventType: 'password_reset_attempt',
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
          { error: 'This password reset link has expired. Please request a new one.' },
          { status: 401 }
        )
      }

      if (error === 'Token already used') {
        return NextResponse.json(
          { error: 'This password reset link has already been used. Please request a new one.' },
          { status: 401 }
        )
      }

      return NextResponse.json(
        { error: 'Invalid password reset link. Please request a new one.' },
        { status: 401 }
      )
    }

    // Hash new password
    const passwordHash = await hash(password, 12)
    const tokenHash = hashToken(token)

    // Execute password reset in transaction (atomic: both succeed or both fail)
    const { getDb } = await import('@/lib/db/pg-client')
    const db = getDb()

    const updatedUser = await db.transaction(async (tx) => {
      const { users, passwordResetTokens } = await import('@/lib/db/drizzle-schema')
      const { eq } = await import('drizzle-orm')

      // 1. Update user password FIRST
      const [user] = await tx
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning()

      if (!user) {
        throw new Error(`User not found: ${userId}`)
      }

      // 2. Mark token as used AFTER password update succeeds
      //    If password update failed, transaction rolls back and token remains valid for retry
      await tx
        .update(passwordResetTokens)
        .set({ used: true, usedAt: new Date() })
        .where(eq(passwordResetTokens.tokenHash, tokenHash))

      // Return user in application format
      return {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        name: user.name,
        emailVerified: user.emailVerified ?? false,
        emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.getTime() : null,
        createdAt: user.createdAt.getTime(),
        updatedAt: user.updatedAt.getTime(),
      }
    })

    // Send password change notification email (non-blocking)
    try {
      const { sendPasswordChangedEmail } = await import('@/lib/email/templates')
      await sendPasswordChangedEmail(updatedUser.email, updatedUser.name || undefined)
    } catch (emailError) {
      // Log error but don't fail the request - password was already changed successfully
      console.error('Failed to send password change notification:', emailError)
    }

    // Note: With JWT-based sessions, existing sessions remain valid until expiry (7 days).
    // Users should manually log out and log back in with their new password.
    // For production: Consider implementing session versioning to invalidate all sessions.

    // Log successful password reset
    await logSecurityEvent({
      userId: updatedUser.id,
      eventType: 'password_reset_success',
      email: updatedUser.email,
      ipAddress,
      userAgent,
      geolocation,
      tokenId: tokenId || null,
      outcome: 'success',
    })

    return NextResponse.json({
      message: 'Password successfully reset. You can now login with your new password.',
    })
  } catch (error) {
    console.error('❌ Error in reset-password route:', error)

    // Generic error response (no details leaked)
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    )
  }
}
