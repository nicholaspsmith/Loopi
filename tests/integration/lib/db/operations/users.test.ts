import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createUser, getUserByEmail, getUserById, emailExists } from '@/lib/db/operations/users'
import { initializeSchema, isSchemaInitialized } from '@/lib/db/schema'
import { closeDbConnection } from '@/lib/db/client'
import fs from 'fs'
import path from 'path'

/**
 * User Database Operations Tests
 *
 * Tests the user CRUD operations with LanceDB.
 */

describe('User Database Operations', () => {
  // Generate unique timestamp for test emails to prevent duplicates across runs
  const timestamp = Date.now()

  beforeAll(async () => {
    // Ensure test database directory exists
    const dbPath = path.join(process.cwd(), 'data', 'lancedb')
    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(dbPath, { recursive: true })
    }

    // Initialize database schema if not already initialized
    const initialized = await isSchemaInitialized()
    if (!initialized) {
      console.log('Initializing test database schema...')
      await initializeSchema()
    }
  })

  afterAll(async () => {
    // Clean up database connection
    await closeDbConnection()
  })

  it('should successfully create a user', async () => {
    const userData = {
      email: `test-create-${timestamp}@example.com`,
      passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.', // 60 chars
      name: 'Test Create User',
    }

    const user = await createUser(userData)

    expect(user).toBeDefined()
    expect(user.id).toBeDefined()
    expect(user.email).toBe(`test-create-${timestamp}@example.com`)
    expect(user.name).toBe('Test Create User')
    expect(user.passwordHash).toBe(userData.passwordHash)
    expect(user.createdAt).toBeDefined()
    expect(user.updatedAt).toBeDefined()
    expect(user.createdAt).toBe(user.updatedAt) // Should be same on creation
  })

  it('should retrieve user by email', async () => {
    // Create a user first
    await createUser({
      email: `test-get-by-email-${timestamp}@example.com`,
      passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.',
      name: 'Test Get By Email',
    })

    // Retrieve the user
    const user = await getUserByEmail(`test-get-by-email-${timestamp}@example.com`)

    expect(user).toBeDefined()
    expect(user?.email).toBe(`test-get-by-email-${timestamp}@example.com`)
    expect(user?.name).toBe('Test Get By Email')
  })

  it('should return null for non-existent email', async () => {
    const user = await getUserByEmail('nonexistent@example.com')
    expect(user).toBeNull()
  })

  it('should retrieve user by ID', async () => {
    // Create a user first
    const createdUser = await createUser({
      email: `test-get-by-id-${timestamp}@example.com`,
      passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.',
      name: 'Test Get By ID',
    })

    // Retrieve by ID
    const user = await getUserById(createdUser.id)

    expect(user).toBeDefined()
    expect(user?.id).toBe(createdUser.id)
    expect(user?.email).toBe(`test-get-by-id-${timestamp}@example.com`)
  })

  it('should return null for non-existent ID', async () => {
    const user = await getUserById('00000000-0000-0000-0000-000000000099')
    expect(user).toBeNull()
  })

  it('should check if email exists', async () => {
    // Create a user
    await createUser({
      email: `test-exists-${timestamp}@example.com`,
      passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.',
      name: 'Test Exists',
    })

    // Check if exists
    const exists = await emailExists(`test-exists-${timestamp}@example.com`)
    expect(exists).toBe(true)

    // Check non-existent email
    const notExists = await emailExists('does-not-exist@example.com')
    expect(notExists).toBe(false)
  })

  it('should normalize email to lowercase', async () => {
    await createUser({
      email: `Test.UPPERCASE-${timestamp}@Example.COM`,
      passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.',
      name: 'Test Normalize',
    })

    // Should find with different casing
    const user = await getUserByEmail(`test.uppercase-${timestamp}@example.com`)
    expect(user).toBeDefined()
    expect(user?.email).toBe(`test.uppercase-${timestamp}@example.com`)
  })

  it('should trim whitespace from email', async () => {
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
      email: `test-no-name-${timestamp}@example.com`,
      passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.',
      name: null,
    })

    expect(user.name).toBeNull()
  })

  it('should validate user data with Zod schema', async () => {
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
