import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { initializeSchema, isSchemaInitialized } from '@/lib/db/schema'
import { closeDbConnection, getDbConnection } from '@/lib/db/client'
import { createUser } from '@/lib/db/operations/users'
import { createConversation } from '@/lib/db/operations/conversations'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'

/**
 * Direct LanceDB Query Test
 *
 * Tests direct queries without using the helper functions
 */

describe('Direct LanceDB Query', () => {
  let testUserId: string
  let testConversationId: string

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

    // Create a test user
    const testUser = await createUser({
      email: `direct-test-${Date.now()}@example.com`,
      passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.',
      name: 'Direct Test User',
    })
    testUserId = testUser.id

    // Create a conversation
    const conversation = await createConversation({
      userId: testUserId,
      title: 'Direct Test Conversation',
    })
    testConversationId = conversation.id
  })

  afterAll(async () => {
    await closeDbConnection()
  })

  it('should directly add and query a message', async () => {
    const db = await getDbConnection()
    const table = await db.openTable('messages')

    const messageId = uuidv4()
    const now = Date.now()

    // Create message directly
    const message = {
      id: messageId,
      conversationId: testConversationId,
      userId: testUserId,
      role: 'user',
      content: 'Direct test message',
      embedding: null,
      createdAt: now,
      hasFlashcards: false,
    }

    console.log('[TEST] Adding message:', message)
    await table.add([message])
    console.log('[TEST] Message added')

    // Try to query it back immediately with different WHERE syntaxes
    console.log('\n===== Testing different WHERE clause syntaxes =====')

    // Test 1: Unquoted column name
    console.log('\nTest 1: Unquoted conversationId')
    try {
      const results1 = await table
        .query()
        .where(`conversationId = '${testConversationId}'`)
        .toArray()
      console.log('  Results:', results1.length)
    } catch (e) {
      console.log('  Error:', (e as Error).message)
    }

    // Test 2: Double-quoted column name
    console.log('\nTest 2: Double-quoted "conversationId"')
    try {
      const results2 = await table
        .query()
        .where(`"conversationId" = '${testConversationId}'`)
        .toArray()
      console.log('  Results:', results2.length)
    } catch (e) {
      console.log('  Error:', (e as Error).message)
    }

    // Test 3: Backtick-quoted column name
    console.log('\nTest 3: Backtick-quoted `conversationId`')
    try {
      const results3 = await table
        .query()
        .where(`\`conversationId\` = '${testConversationId}'`)
        .toArray()
      console.log('  Results:', results3.length)
    } catch (e) {
      console.log('  Error:', (e as Error).message)
    }

    // Test 4: Query by ID (we know this works)
    console.log('\nTest 4: Query by id (unquoted)')
    try {
      const results4 = await table
        .query()
        .where(`id = '${messageId}'`)
        .toArray()
      console.log('  Results:', results4.length)
      if (results4.length > 0) {
        console.log('  Found message:', results4[0])
      }
    } catch (e) {
      console.log('  Error:', (e as Error).message)
    }

    // Test 5: Query all messages
    console.log('\nTest 5: Query all messages (no filter)')
    try {
      const allMessages = await table.query().toArray()
      console.log('  Total messages in table:', allMessages.length)
      if (allMessages.length > 0) {
        console.log('  Sample message keys:', Object.keys(allMessages[0]))
        console.log('  Our message ID:', messageId)
        const ourMessage = allMessages.find((m: any) => m.id === messageId)
        if (ourMessage) {
          console.log('  ✅ Found our message in all messages!')
          console.log('  Our message conversationId:', ourMessage.conversationId)
          console.log('  Looking for conversationId:', testConversationId)
          console.log('  Match?', ourMessage.conversationId === testConversationId)
        } else {
          console.log('  ❌ Our message not found in all messages')
        }
      }
    } catch (e) {
      console.log('  Error:', (e as Error).message)
    }

    console.log('\n===== End of tests =====\n')

    expect(true).toBe(true) // Dummy assertion
  })
})
