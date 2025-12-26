import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getDbConnection } from '@/lib/db/client'
import { createUser } from '@/lib/db/operations/users'
import { v4 as uuidv4 } from 'uuid'

/**
 * Direct LanceDB Query Test
 *
 * Tests direct queries on the LanceDB messages table.
 *
 * IMPORTANT: LanceDB messages table uses MINIMAL schema:
 * - id: string
 * - userId: string
 * - embedding: number[] (vector)
 *
 * Full message data is stored in PostgreSQL, not LanceDB.
 * See lib/db/operations/messages-lancedb.ts for details.
 *
 * Note: Database setup/teardown is handled by tests/db-setup.ts
 */

describe('Direct LanceDB Query', () => {
  let testUserId: string
  const testMessageIds: string[] = []

  beforeAll(async () => {
    // Create a test user
    const testUser = await createUser({
      email: `direct-test-${Date.now()}@example.com`,
      passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.',
      name: 'Direct Test User',
    })
    testUserId = testUser.id
  })

  afterAll(async () => {
    // Clean up test messages from LanceDB
    if (testMessageIds.length > 0) {
      try {
        const db = await getDbConnection()
        const table = await db.openTable('messages')
        for (const id of testMessageIds) {
          await table.delete(`id = '${id}'`)
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  })

  it('should directly add and query a message embedding', async () => {
    const db = await getDbConnection()
    const table = await db.openTable('messages')

    const messageId = uuidv4()
    testMessageIds.push(messageId)

    // Create message with MINIMAL schema (id, userId, embedding)
    // Schema uses 768 dimensions for nomic-embed-text
    const message = {
      id: messageId,
      userId: testUserId,
      embedding: new Array(768).fill(0.1),
    }

    await table.add([message])

    // Query by ID
    const results = await table.query().where(`id = '${messageId}'`).toArray()
    expect(results.length).toBe(1)
    expect(results[0].id).toBe(messageId)
    expect(results[0].userId).toBe(testUserId)

    // Verify we can find the message by userId
    // Note: LanceDB WHERE has case-sensitivity quirks, so we filter in JS
    const allMessages = await table.query().toArray()
    const byUserResults = allMessages.filter((m: { userId: string }) => m.userId === testUserId)
    const ourMessage = byUserResults.find((m: { id: string }) => m.id === messageId)
    expect(ourMessage).toBeDefined()
  })

  it('should return empty results for non-existent userId', async () => {
    const db = await getDbConnection()
    const table = await db.openTable('messages')

    const fakeUserId = uuidv4()
    // Filter in JS to avoid LanceDB WHERE case-sensitivity issues
    const allMessages = await table.query().toArray()
    const results = allMessages.filter((m: { userId: string }) => m.userId === fakeUserId)
    expect(results.length).toBe(0)
  })
})
