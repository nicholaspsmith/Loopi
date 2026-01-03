import { type Connection } from '@lancedb/lancedb'

// Prevent concurrent initialization
let initializationPromise: Promise<void> | null = null

/**
 * Initialize LanceDB tables for MemoryLoop
 *
 * Creates minimal tables for vector search:
 * - messages: id, userId, embedding (1024 dimensions)
 * - flashcards: id, userId, embedding (1024 dimensions)
 * - goals: id, userId, embedding (1024 dimensions) - for deduplication
 *
 * All other data is stored in PostgreSQL. LanceDB only stores
 * the minimum needed for vector search operations.
 *
 * Thread-safe: prevents concurrent initialization attempts
 *
 * @param db - Optional database connection. If not provided, will get connection.
 */
export async function initializeSchema(db?: Connection) {
  // If already initializing, wait for that to complete
  if (initializationPromise) {
    return initializationPromise
  }

  initializationPromise = performInitialization(db)

  try {
    await initializationPromise
  } finally {
    initializationPromise = null
  }
}

async function performInitialization(db?: Connection) {
  // If no connection provided, get one (for backwards compatibility)
  if (!db) {
    const { getDbConnection } = await import('./client')
    db = await getDbConnection()
  }
  const existingTables = await db.tableNames()
  const createdTables: string[] = []

  try {
    console.log('[LanceDB] Creating schema...')

    // 1. Messages table - minimal schema for vector search
    if (!existingTables.includes('messages')) {
      await db.createTable(
        'messages',
        [
          {
            id: '00000000-0000-0000-0000-000000000000',
            userId: '00000000-0000-0000-0000-000000000000',
            embedding: new Array(1024).fill(0), // jina-embeddings-v3 produces 1024 dimensions
          },
        ],
        { mode: 'create' }
      )
      createdTables.push('messages')
      console.log('[LanceDB] Created messages table (minimal: id, userId, embedding)')
    }

    // 2. Flashcards table - minimal schema for vector search
    if (!existingTables.includes('flashcards')) {
      await db.createTable(
        'flashcards',
        [
          {
            id: '00000000-0000-0000-0000-000000000000',
            userId: '00000000-0000-0000-0000-000000000000',
            embedding: new Array(1024).fill(0), // jina-embeddings-v3 produces 1024 dimensions
          },
        ],
        { mode: 'create' }
      )
      createdTables.push('flashcards')
      console.log('[LanceDB] Created flashcards table (minimal: id, userId, embedding)')
    }

    // 3. Goals table - minimal schema for vector search (for deduplication)
    if (!existingTables.includes('goals')) {
      await db.createTable(
        'goals',
        [
          {
            id: '00000000-0000-0000-0000-000000000000',
            userId: '00000000-0000-0000-0000-000000000000',
            embedding: new Array(1024).fill(0), // jina-embeddings-v3 produces 1024 dimensions
          },
        ],
        { mode: 'create' }
      )
      createdTables.push('goals')
      console.log('[LanceDB] Created goals table (minimal: id, userId, embedding)')
    }

    // Cleanup init rows from newly created tables
    if (createdTables.length > 0) {
      console.log('[LanceDB] Cleaning up init rows...')

      for (const tableName of createdTables) {
        const table = await db.openTable(tableName)
        await table.delete("id = '00000000-0000-0000-0000-000000000000'")
      }
    }

    console.log('[LanceDB] Schema initialized successfully')
  } catch (error) {
    // ATOMIC ROLLBACK: Delete all tables created during this session
    if (createdTables.length > 0) {
      console.error(
        JSON.stringify({
          event: 'schema_rollback_started',
          tablesCount: createdTables.length,
          tables: createdTables,
          timestamp: new Date().toISOString(),
        })
      )

      for (const tableName of createdTables) {
        try {
          await db.dropTable(tableName)
          console.log(`[LanceDB] Dropped table ${tableName} during rollback`)
        } catch (dropError) {
          // Best-effort cleanup - log but don't fail the rollback
          console.error(
            JSON.stringify({
              event: 'schema_rollback_table_drop_failed',
              tableName,
              error: dropError instanceof Error ? dropError.message : String(dropError),
              timestamp: new Date().toISOString(),
            })
          )
        }
      }

      console.error(
        JSON.stringify({
          event: 'schema_rollback_completed',
          tablesCount: createdTables.length,
          timestamp: new Date().toISOString(),
        })
      )
    }

    // Re-throw with context
    const errorMessage =
      `Schema initialization failed after creating ${createdTables.length} table(s). ` +
      `Rollback completed. Original error: ${error instanceof Error ? error.message : String(error)}`

    throw new Error(errorMessage)
  }
}

/**
 * Check if LanceDB schema is already initialized
 */
export async function isSchemaInitialized(): Promise<boolean> {
  try {
    const { getDbConnection } = await import('./client')
    const db = await getDbConnection()
    const tableNames = await db.tableNames()
    // Only messages, flashcards, and goals tables in LanceDB
    // Review logs are stored only in PostgreSQL
    const requiredTables = ['messages', 'flashcards', 'goals']

    return requiredTables.every((table) => tableNames.includes(table))
  } catch (error) {
    return false
  }
}
