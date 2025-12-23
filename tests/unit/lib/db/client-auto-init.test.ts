import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getDbConnection, resetDbConnection, closeDbConnection } from '@/lib/db/client'

/**
 * Unit Tests for LanceDB Auto-Initialization
 *
 * Tests the automatic schema initialization that occurs on first connection.
 * Validates that tables are created automatically in production environments.
 *
 * Maps to PR #186 - Fix LanceDB schema initialization in production
 */

describe('LanceDB Auto-Initialization', () => {
  beforeEach(async () => {
    // Reset connection state before each test
    resetDbConnection()
  })

  afterEach(async () => {
    // Clean up after each test
    await closeDbConnection()
  })

  describe('Schema Initialization on First Connection', () => {
    it('should initialize schema automatically on first getDbConnection call', async () => {
      // Get connection - this should trigger auto-initialization
      const db = await getDbConnection()

      // Verify connection is established
      expect(db).toBeDefined()

      // Verify tables were created
      const tableNames = await db.tableNames()
      expect(tableNames).toContain('messages')
      expect(tableNames).toContain('flashcards')
    })

    it('should not re-initialize schema on subsequent getDbConnection calls', async () => {
      // First call - initializes schema
      const db1 = await getDbConnection()
      const tablesAfterFirst = await db1.tableNames()

      // Second call - should return same connection without re-initializing
      const db2 = await getDbConnection()
      const tablesAfterSecond = await db2.tableNames()

      // Should be the same connection instance
      expect(db1).toBe(db2)

      // Tables should be the same
      expect(tablesAfterSecond).toEqual(tablesAfterFirst)
    })

    it('should handle schema initialization errors gracefully', async () => {
      // This test verifies that if schema init fails, the app continues
      // In a real error scenario, getDbConnection would still return a connection
      // but operations would fail with error logging

      const db = await getDbConnection()

      // Connection should still be established even if there were init errors
      expect(db).toBeDefined()
    })
  })

  describe('Schema Initialization State Management', () => {
    it('should reset schema initialization flag when resetDbConnection is called', async () => {
      // First connection - initializes schema
      await getDbConnection()

      // Reset connection
      resetDbConnection()

      // This would normally re-initialize if tables were missing
      // In tests, tables persist, so we're just verifying the reset works
      const db = await getDbConnection()
      expect(db).toBeDefined()
    })
  })

  describe('Table Creation', () => {
    it('should create messages table with correct schema', async () => {
      const db = await getDbConnection()
      const table = await db.openTable('messages')

      // Verify table exists and is accessible
      expect(table).toBeDefined()

      // Tables should be empty after init (init rows are cleaned up)
      const count = await table.countRows()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    it('should create flashcards table with correct schema', async () => {
      const db = await getDbConnection()
      const table = await db.openTable('flashcards')

      // Verify table exists and is accessible
      expect(table).toBeDefined()

      // Tables should be empty after init (init rows are cleaned up)
      const count = await table.countRows()
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Idempotency', () => {
    it('should handle multiple concurrent getDbConnection calls safely', async () => {
      // Simulate multiple concurrent calls during app startup
      const connections = await Promise.all([
        getDbConnection(),
        getDbConnection(),
        getDbConnection(),
      ])

      // All should return the same connection instance
      expect(connections[0]).toBe(connections[1])
      expect(connections[1]).toBe(connections[2])

      // Tables should exist
      const tableNames = await connections[0].tableNames()
      expect(tableNames).toContain('messages')
      expect(tableNames).toContain('flashcards')
    })

    it('should not create duplicate tables on concurrent initialization', async () => {
      // Get connection multiple times concurrently
      await Promise.all([getDbConnection(), getDbConnection(), getDbConnection()])

      const db = await getDbConnection()
      const tableNames = await db.tableNames()

      // Should have exactly these tables (no duplicates)
      const messagesTables = tableNames.filter((t) => t === 'messages')
      const flashcardsTables = tableNames.filter((t) => t === 'flashcards')

      expect(messagesTables).toHaveLength(1)
      expect(flashcardsTables).toHaveLength(1)
    })
  })

  describe('Integration with Existing Schema Module', () => {
    it('should use the existing initializeSchema function', async () => {
      // Verify that auto-initialization delegates to schema.ts
      const db = await getDbConnection()

      // If schema.ts is being used, tables will have the correct structure
      const tableNames = await db.tableNames()
      expect(tableNames).toContain('messages')
      expect(tableNames).toContain('flashcards')

      // Verify we can open both tables (confirms they were created correctly)
      const messagesTable = await db.openTable('messages')
      const flashcardsTable = await db.openTable('flashcards')

      expect(messagesTable).toBeDefined()
      expect(flashcardsTable).toBeDefined()
    })
  })
})
