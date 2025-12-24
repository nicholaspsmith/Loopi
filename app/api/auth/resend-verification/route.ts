/**
 * POST /api/auth/resend-verification
 *
 * Resends email verification link to authenticated user
 *
 * Security features:
 * - Requires authentication
 * - Rate limiting (3 requests per 15 minutes per email)
 * - Security event logging
 * - Token invalidation for previous verification requests
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { checkRateLimit, recordAttempt } from '@/lib/auth/rate-limit'
import { getUserById } from '@/lib/db/operations/users'
import { createVerificationToken } from '@/lib/db/operations/email-verification-tokens'
import { emailVerificationEmail } from '@/lib/email/templates'
import { queueEmail } from '@/lib/email/retry-queue'
import { logSecurityEvent } from '@/lib/db/operations/security-logs'
import { getGeolocation } from '@/lib/auth/geolocation'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user details
    const user = await getUserById(session.user.id)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if already verified
    // Note: We'll need to add emailVerified field to the User type
    // For now, we'll allow resending

    // Check rate limiting
    const { allowed, retryAfter } = await checkRateLimit(user.email)

    if (!allowed) {
      // Get IP and user agent for logging
      const ipAddress = request.headers.get('x-forwarded-for') || 'unknown'
      const userAgent = request.headers.get('user-agent')
      const geolocation = await getGeolocation(ipAddress)

      // Log rate limit event
      await logSecurityEvent({
        userId: user.id,
        eventType: 'email_verification_resend',
        email: user.email,
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
    await recordAttempt(user.email)

    // Get IP and user agent for logging
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown'
    const userAgent = request.headers.get('user-agent')
    const geolocation = await getGeolocation(ipAddress)

    // Create verification token
    const { rawToken, tokenEntry } = await createVerificationToken(user.id)

    // Build verification link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${request.headers.get('host')}`
    const verificationLink = `${baseUrl}/verify-email?token=${rawToken}`

    // Queue verification email
    const { subject, text, html } = emailVerificationEmail({
      email: user.email,
      verificationLink,
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
      eventType: 'email_verification_resend',
      email: user.email,
      ipAddress,
      userAgent,
      geolocation,
      tokenId: tokenEntry.id,
      outcome: 'success',
    })

    return NextResponse.json({
      message: 'Verification email sent! Please check your inbox.',
    })
  } catch (error) {
    console.error('❌ Error in resend-verification route:', error)

    // Generic error response (no details leaked)
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    )
  }
}
