/**
 * POST /api/auth/forgot-password
 *
 * Initiates password reset flow by sending reset email
 *
 * Security features:
 * - Rate limiting (3 requests per 15 minutes per email)
 * - Email enumeration prevention (identical response for valid/invalid emails)
 * - Security event logging
 * - Token invalidation for previous reset requests
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { checkRateLimit, recordAttempt } from '@/lib/auth/rate-limit'
import { getUserByEmail } from '@/lib/db/operations/users'
import { createResetToken } from '@/lib/db/operations/password-reset-tokens'
import { passwordResetEmail } from '@/lib/email/templates'
import { queueEmail } from '@/lib/email/retry-queue'
import { logSecurityEvent } from '@/lib/db/operations/security-logs'
import { getGeolocation } from '@/lib/auth/geolocation'

// Request validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validation = forgotPasswordSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const { email } = validation.data

    // Check rate limiting
    const { allowed, retryAfter } = await checkRateLimit(email)

    if (!allowed) {
      // Log rate limit event
      const ipAddress = request.headers.get('x-forwarded-for') || 'unknown'
      const userAgent = request.headers.get('user-agent')
      const geolocation = await getGeolocation(ipAddress)

      await logSecurityEvent({
        eventType: 'password_reset_request',
        email,
        ipAddress,
        userAgent,
        geolocation,
        outcome: 'rate_limited',
        metadata: { retryAfter },
      })

      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter,
        },
        { status: 429 }
      )
    }

    // Record rate limit attempt
    await recordAttempt(email)

    // Get IP and user agent for logging
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent')
    const geolocation = await getGeolocation(ipAddress)

    // Look up user
    const user = await getUserByEmail(email)

    // SECURITY: Always return success to prevent email enumeration
    // Even if user doesn't exist, we return 200 OK
    if (!user) {
      // Log failed attempt (user not found)
      await logSecurityEvent({
        eventType: 'password_reset_request',
        email,
        ipAddress,
        userAgent,
        geolocation,
        outcome: 'failed',
        metadata: { reason: 'user_not_found' },
      })

      // Return success response to prevent enumeration
      return NextResponse.json({
        message: 'If an account exists with that email, you will receive a password reset link.',
      })
    }

    // Create reset token
    const { rawToken, tokenEntry } = await createResetToken(user.id)

    // Build reset link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`
    const resetLink = `${baseUrl}/reset-password?token=${rawToken}`

    // Queue password reset email
    const { subject, text, html } = passwordResetEmail({
      email: user.email,
      resetLink,
    })

    await queueEmail({
      to: user.email,
      subject,
      textBody: text,
      htmlBody: html,
    })

    // Log security event
    await logSecurityEvent({
      userId: user.id,
      eventType: 'password_reset_request',
      email: user.email,
      ipAddress,
      userAgent,
      geolocation,
      tokenId: tokenEntry.id,
      outcome: 'success',
    })

    // Return success response (same as when user not found)
    return NextResponse.json({
      message: 'If an account exists with that email, you will receive a password reset link.',
    })
  } catch (error) {
    console.error('❌ Error in forgot-password route:', error)

    // Generic error response (no details leaked)
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    )
  }
}
