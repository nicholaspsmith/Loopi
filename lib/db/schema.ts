import { getDbConnection } from './client'

// Prevent concurrent initialization
let initializationPromise: Promise<void> | null = null

/**
 * Initialize LanceDB tables for MemoryLoop
 *
 * Creates minimal tables for vector search:
 * - messages: id, userId, embedding (768 dimensions)
 * - flashcards: id, userId, embedding (768 dimensions)
 *
 * All other data is stored in PostgreSQL. LanceDB only stores
 * the minimum needed for vector search operations.
 *
 * Thread-safe: prevents concurrent initialization attempts
 */
export async function initializeSchema() {
  // If already initializing, wait for that to complete
  if (initializationPromise) {
    return initializationPromise
  }

  initializationPromise = performInitialization()

  try {
    await initializationPromise
  } finally {
    initializationPromise = null
  }
}

async function performInitialization() {
  const db = await getDbConnection()
  const existingTables = await db.tableNames()

  console.log('🔨 Creating LanceDB schema...')

  // 1. Messages table - minimal schema for vector search
  if (!existingTables.includes('messages')) {
    await db.createTable(
      'messages',
      [
        {
          id: '00000000-0000-0000-0000-000000000000',
          userId: '00000000-0000-0000-0000-000000000000',
          embedding: new Array(768).fill(0), // nomic-embed-text produces 768 dimensions
        },
      ],
      { mode: 'create' }
    )
    console.log('✅ Created messages table (minimal: id, userId, embedding)')
  }

  // 2. Flashcards table - minimal schema for vector search
  if (!existingTables.includes('flashcards')) {
    await db.createTable(
      'flashcards',
      [
        {
          id: '00000000-0000-0000-0000-000000000000',
          userId: '00000000-0000-0000-0000-000000000000',
          embedding: new Array(768).fill(0), // nomic-embed-text produces 768 dimensions
        },
      ],
      { mode: 'create' }
    )
    console.log('✅ Created flashcards table (minimal: id, userId, embedding)')
  }

  // Cleanup init rows from newly created tables
  const tablesCreated = (await db.tableNames()).filter((t) => !existingTables.includes(t))

  if (tablesCreated.length > 0) {
    console.log('🧹 Cleaning up init rows...')

    for (const tableName of tablesCreated) {
      const table = await db.openTable(tableName)
      await table.delete("id = '00000000-0000-0000-0000-000000000000'")
    }
  }

  console.log('✅ LanceDB schema initialized successfully')
}

/**
 * Check if LanceDB schema is already initialized
 */
export async function isSchemaInitialized(): Promise<boolean> {
  try {
    const db = await getDbConnection()
    const tableNames = await db.tableNames()
    // Only messages and flashcards tables in LanceDB
    // Review logs are stored only in PostgreSQL
    const requiredTables = ['messages', 'flashcards']

    return requiredTables.every((table) => tableNames.includes(table))
  } catch (error) {
    return false
  }
}
