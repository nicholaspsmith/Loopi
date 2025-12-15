import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createUser, getUserByEmail, toPublicUser } from '@/lib/db/operations/users'
import { hashPassword, EmailSchema, PasswordSchema } from '@/lib/auth/helpers'
import { ConflictError } from '@/lib/errors'
import { success, error as errorResponse } from '@/lib/api/response'
import { validate } from '@/lib/validation/helpers'
import { signIn } from '@/auth'

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

    // Create user
    const user = await createUser({
      email: data.email,
      passwordHash,
      name: data.name || null,
    })

    // Automatically sign in the user after signup
    await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    })

    // Return public user data
    const publicUser = toPublicUser(user)

    return success({ user: publicUser }, 201)
  } catch (err) {
    return errorResponse(err)
  }
}
