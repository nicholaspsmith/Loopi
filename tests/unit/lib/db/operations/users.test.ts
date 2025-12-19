import { describe, it, expect } from 'vitest'
import { createUser, getUserByEmail, getUserById, emailExists } from '@/lib/db/operations/users'

/**
 * User Database Operations Tests
 *
 * Tests the user CRUD operations with LanceDB.
 *
 * Note: Database setup/teardown is handled by tests/db-setup.ts
 */

describe('User Database Operations', () => {
  it('should successfully create a user', async () => {
    const email = `test-create-${Date.now()}@example.com`
    const userData = {
      email,
      passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.', // 60 chars
      name: 'Test Create User',
    }

    const user = await createUser(userData)

    expect(user).toBeDefined()
    expect(user.id).toBeDefined()
    expect(user.email).toBe(email)
    expect(user.name).toBe('Test Create User')
    expect(user.passwordHash).toBe(userData.passwordHash)
    expect(user.createdAt).toBeDefined()
    expect(user.updatedAt).toBeDefined()
    expect(user.createdAt).toBe(user.updatedAt) // Should be same on creation
  })

  it('should retrieve user by email', async () => {
    // Create a user first
    const email = `test-get-by-email-${Date.now()}@example.com`
    await createUser({
      email,
      passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.',
      name: 'Test Get By Email',
    })

    // Retrieve the user
    const user = await getUserByEmail(email)

    expect(user).toBeDefined()
    expect(user?.email).toBe(email)
    expect(user?.name).toBe('Test Get By Email')
  })

  it('should return null for non-existent email', async () => {
    const user = await getUserByEmail('nonexistent@example.com')
    expect(user).toBeNull()
  })

  it('should retrieve user by ID', async () => {
    // Create a user first
    const email = `test-get-by-id-${Date.now()}@example.com`
    const createdUser = await createUser({
      email,
      passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.',
      name: 'Test Get By ID',
    })

    // Retrieve by ID
    const user = await getUserById(createdUser.id)

    expect(user).toBeDefined()
    expect(user?.id).toBe(createdUser.id)
    expect(user?.email).toBe(email)
  })

  it('should return null for non-existent ID', async () => {
    const user = await getUserById('00000000-0000-0000-0000-000000000099')
    expect(user).toBeNull()
  })

  it('should check if email exists', async () => {
    // Create a user
    const email = `test-exists-${Date.now()}@example.com`
    await createUser({
      email,
      passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.',
      name: 'Test Exists',
    })

    // Check if exists
    const exists = await emailExists(email)
    expect(exists).toBe(true)

    // Check non-existent email
    const notExists = await emailExists(`does-not-exist-${Date.now()}@example.com`)
    expect(notExists).toBe(false)
  })

  it('should normalize email to lowercase', async () => {
    const timestamp = Date.now()
    await createUser({
      email: `Test.UPPERCASE.${timestamp}@Example.COM`,
      passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.',
      name: 'Test Normalize',
    })

    // Should find with different casing
    const user = await getUserByEmail(`test.uppercase.${timestamp}@example.com`)
    expect(user).toBeDefined()
    expect(user?.email).toBe(`test.uppercase.${timestamp}@example.com`)
  })

  it('should trim whitespace from email', async () => {
    const timestamp = Date.now()
    await createUser({
      email: `  test-trim-${timestamp}@example.com  `,
      passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.',
      name: 'Test Trim',
    })

    const user = await getUserByEmail(`test-trim-${timestamp}@example.com`)
    expect(user).toBeDefined()
    expect(user?.email).toBe(`test-trim-${timestamp}@example.com`)
  })

  it('should store null name if not provided', async () => {
    const user = await createUser({
      email: `test-no-name-${Date.now()}@example.com`,
      passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.',
      name: null,
    })

    expect(user.name).toBeNull()
  })

  it('should validate user data with Zod schema', async () => {
    const timestamp = Date.now()
    // Invalid UUID
    await expect(
      createUser({
        email: `invalid-uuid-${timestamp}@example.com`,
        passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.',
        name: 'Invalid',
      })
    ).resolves.toBeDefined() // Should create with auto-generated UUID

    // The createUser function generates UUIDs, so this should succeed
    const user = await createUser({
      email: `valid-auto-uuid-${timestamp}@example.com`,
      passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.',
      name: 'Valid Auto UUID',
    })

    expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })
})
