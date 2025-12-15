import { v4 as uuidv4 } from 'uuid'
import { create, find, findById, update } from '../queries'
import type { User, PublicUser } from '@/types'
import { UserSchema } from '@/types'

/**
 * User Database Operations
 *
 * Provides CRUD operations for users in LanceDB.
 */

const USERS_TABLE = 'users'

/**
 * Create a new user
 */
export async function createUser(data: {
  email: string
  passwordHash: string
  name?: string | null
}): Promise<User> {
  const now = Date.now()

  const user: User = {
    id: uuidv4(),
    email: data.email.toLowerCase().trim(),
    passwordHash: data.passwordHash,
    name: data.name || null,
    createdAt: now,
    updatedAt: now,
  }

  // Validate before inserting
  UserSchema.parse(user)

  await create(USERS_TABLE, [user])

  return user
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const normalizedEmail = email.toLowerCase().trim()

  const users = await find<User>(USERS_TABLE, `email = '${normalizedEmail}'`, 1)

  return users.length > 0 ? users[0] : null
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User | null> {
  return await findById<User>(USERS_TABLE, id)
}

/**
 * Update user
 */
export async function updateUser(id: string, updates: Partial<User>): Promise<User> {
  const now = Date.now()

  await update<User>(USERS_TABLE, id, {
    ...updates,
    updatedAt: now,
  })

  const updatedUser = await getUserById(id)

  if (!updatedUser) {
    throw new Error(`User not found after update: ${id}`)
  }

  return updatedUser
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
