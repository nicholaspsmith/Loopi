import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createUser, getUserByEmail, toPublicUser } from '@/lib/db/operations/users'
import { hashPassword, EmailSchema, PasswordSchema, getClientIpAddress } from '@/lib/auth/helpers'
import { ConflictError } from '@/lib/errors'
import { success, error as errorResponse } from '@/lib/api/response'
import { validate } from '@/lib/validation/helpers'
import { signIn } from '@/auth'
import { createVerificationToken } from '@/lib/db/operations/email-verification-tokens'
import { emailVerificationEmail } from '@/lib/email/templates'
import { sendEmail } from '@/lib/email/client'
import { logSecurityEvent } from '@/lib/db/operations/security-logs'
import { getGeolocation } from '@/lib/auth/geolocation'

/**
 * POST /api/auth/signup
 *
 * Register a new user account
 */

const SignupSchema = z.object({
  email: EmailSchema,
  password: PasswordSchema,
  name: z.string().min(1).max(100).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate input
    const data = validate(SignupSchema, body)

    // Check if user already exists
    const existingUser = await getUserByEmail(data.email)

    if (existingUser) {
      throw new ConflictError('Email already exists')
    }

    // Hash password
    const passwordHash = await hashPassword(data.password)

    // Create user (emailVerified defaults to false in schema)
    const user = await createUser({
      email: data.email,
      passwordHash,
      name: data.name || null,
    })

    // Get IP and user agent for logging
    const ipAddress = getClientIpAddress(request)
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

    await sendEmail({
      to: user.email,
      subject,
      text,
      html,
    })

    // Log security event
    await logSecurityEvent({
      userId: user.id,
      eventType: 'user_registration',
      email: user.email,
      ipAddress,
      userAgent,
      geolocation,
      tokenId: tokenEntry.id,
      outcome: 'success',
      metadata: { verificationEmailSent: true },
    })

    // Automatically sign in the user after signup (non-blocking)
    try {
      await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })
    } catch (signInError) {
      // Auto-signin failed, but account was created - user can login manually
      console.warn('Auto-signin after signup failed:', signInError)
    }

    // Return public user data
    const publicUser = toPublicUser(user)

    return success({ user: publicUser }, 201)
  } catch (err) {
    return errorResponse(err)
  }
}
