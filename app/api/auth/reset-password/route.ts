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
import { updateUser } from '@/lib/db/operations/users'
import { logSecurityEvent } from '@/lib/db/operations/security-logs'
import { getGeolocation } from '@/lib/auth/geolocation'
import { hashToken } from '@/lib/auth/tokens'

// Password validation schema
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
})

export async function POST(request: NextRequest) {
  try {
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
    const ipAddress = request.headers.get('x-forwarded-for') || 'unknown'
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

    // Update user password
    const updatedUser = await updateUser(userId, { passwordHash })

    // Mark token as used
    const tokenHash = hashToken(token)
    const { markTokenUsed } = await import('@/lib/db/operations/password-reset-tokens')
    await markTokenUsed(tokenHash)

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
