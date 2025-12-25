import { getDb } from '@/lib/db/pg-client'
import { users } from '@/lib/db/drizzle-schema'
import { eq } from 'drizzle-orm'
import type { User, PublicUser } from '@/types'

/**
 * User Database Operations
 *
 * Provides CRUD operations for users in PostgreSQL.
 */

/**
 * Create a new user
 */
export async function createUser(data: {
  email: string
  passwordHash: string
  name?: string | null
}): Promise<User> {
  const db = getDb()

  const [user] = await db
    .insert(users)
    .values({
      email: data.email.toLowerCase().trim(),
      passwordHash: data.passwordHash,
      name: data.name || null,
    })
    .returning()

  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    name: user.name,
    emailVerified: user.emailVerified ?? false,
    emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.getTime() : null,
    passwordChangedAt: user.passwordChangedAt ? user.passwordChangedAt.getTime() : null,
    createdAt: user.createdAt.getTime(),
    updatedAt: user.updatedAt.getTime(),
  }
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const db = getDb()
  const normalizedEmail = email.toLowerCase().trim()

  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1)

  if (!user) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    name: user.name,
    emailVerified: user.emailVerified ?? false,
    emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.getTime() : null,
    passwordChangedAt: user.passwordChangedAt ? user.passwordChangedAt.getTime() : null,
    createdAt: user.createdAt.getTime(),
    updatedAt: user.updatedAt.getTime(),
  }
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User | null> {
  const db = getDb()

  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)

  if (!user) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    name: user.name,
    emailVerified: user.emailVerified ?? false,
    emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.getTime() : null,
    passwordChangedAt: user.passwordChangedAt ? user.passwordChangedAt.getTime() : null,
    createdAt: user.createdAt.getTime(),
    updatedAt: user.updatedAt.getTime(),
  }
}

/**
 * Update user
 */
export async function updateUser(
  id: string,
  updates: Partial<Pick<User, 'email' | 'name' | 'passwordHash'>>
): Promise<User> {
  const db = getDb()

  const [updatedUser] = await db
    .update(users)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning()

  if (!updatedUser) {
    throw new Error(`User not found: ${id}`)
  }

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    passwordHash: updatedUser.passwordHash,
    name: updatedUser.name,
    emailVerified: updatedUser.emailVerified ?? false,
    emailVerifiedAt: updatedUser.emailVerifiedAt ? updatedUser.emailVerifiedAt.getTime() : null,
    passwordChangedAt: updatedUser.passwordChangedAt
      ? updatedUser.passwordChangedAt.getTime()
      : null,
    createdAt: updatedUser.createdAt.getTime(),
    updatedAt: updatedUser.updatedAt.getTime(),
  }
}

/**
 * Convert User to PublicUser (remove sensitive fields)
 */
export function toPublicUser(user: User): PublicUser {
  const { passwordHash, ...publicUser } = user
  return publicUser
}

/**
 * Check if email already exists
 */
export async function emailExists(email: string): Promise<boolean> {
  const user = await getUserByEmail(email)
  return user !== null
}

/**
 * Update user email verification status
 *
 * @param userId - User ID to update
 * @returns Updated user
 */
export async function updateUserEmailVerified(userId: string): Promise<User> {
  const db = getDb()

  const [updatedUser] = await db
    .update(users)
    .set({
      emailVerified: true,
      emailVerifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning()

  if (!updatedUser) {
    throw new Error(`User not found: ${userId}`)
  }

  return {
    id: updatedUser.id,
    email: updatedUser.email,
    passwordHash: updatedUser.passwordHash,
    name: updatedUser.name,
    emailVerified: updatedUser.emailVerified ?? false,
    emailVerifiedAt: updatedUser.emailVerifiedAt ? updatedUser.emailVerifiedAt.getTime() : null,
    passwordChangedAt: updatedUser.passwordChangedAt
      ? updatedUser.passwordChangedAt.getTime()
      : null,
    createdAt: updatedUser.createdAt.getTime(),
    updatedAt: updatedUser.updatedAt.getTime(),
  }
}
