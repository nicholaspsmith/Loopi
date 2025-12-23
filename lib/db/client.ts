import { connect, Connection } from '@lancedb/lancedb'
import path from 'path'

let dbConnection: Connection | null = null
let connectionPromise: Promise<Connection> | null = null
let schemaInitialized = false

/**
 * Get LanceDB connection singleton
 * Creates a new connection if one doesn't exist, otherwise returns cached connection
 * Automatically initializes schema on first connection
 */
export async function getDbConnection(): Promise<Connection> {
  if (dbConnection) {
    return dbConnection
  }

  // If connection is already in progress, wait for it
  if (connectionPromise) {
    return connectionPromise
  }

  // Create new connection promise to prevent race conditions
  connectionPromise = (async () => {
    const dbPath = process.env.LANCEDB_PATH || path.join(process.cwd(), 'data', 'lancedb')

    dbConnection = await connect(dbPath)

    console.log(`✅ LanceDB connected at: ${dbPath}`)

    // Auto-initialize schema on first connection if tables don't exist
    // This ensures production deployments work without manual initialization
    //
    // NOTE: This duplicates logic from lib/db/schema.ts to avoid circular dependency:
    // - schema.ts imports getDbConnection() from this file
    // - We cannot import initializeSchema() from schema.ts here without creating a cycle
    // - Alternative solutions (dependency injection, separate module) add unnecessary complexity
    if (!schemaInitialized) {
      try {
        const existingTables = await dbConnection.tableNames()

        // Create messages table if it doesn't exist
        if (!existingTables.includes('messages')) {
          await dbConnection.createTable(
            'messages',
            [
              {
                id: '00000000-0000-0000-0000-000000000000',
                userId: '00000000-0000-0000-0000-000000000000',
                embedding: new Array(768).fill(0), // nomic-embed-text: 768 dimensions
              },
            ],
            { mode: 'create' }
          )
        }

        // Create flashcards table if it doesn't exist
        if (!existingTables.includes('flashcards')) {
          await dbConnection.createTable(
            'flashcards',
            [
              {
                id: '00000000-0000-0000-0000-000000000000',
                userId: '00000000-0000-0000-0000-000000000000',
                embedding: new Array(768).fill(0), // nomic-embed-text: 768 dimensions
              },
            ],
            { mode: 'create' }
          )
        }

        // Cleanup init rows from newly created tables only
        // More efficient than deleting from all tables - only clean up what we just created
        const tablesCreated = (await dbConnection.tableNames()).filter(
          (t) => !existingTables.includes(t)
        )

        for (const tableName of tablesCreated) {
          const table = await dbConnection.openTable(tableName)
          await table.delete("id = '00000000-0000-0000-0000-000000000000'")
        }

        schemaInitialized = true
      } catch (error) {
        // Structured error logging for production debugging
        const errorContext = {
          event: 'schema_init_failed',
          dbPath,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        }
        console.error('❌ Failed to auto-initialize LanceDB schema:', JSON.stringify(errorContext))
        // Don't throw - allow app to continue even if schema init fails
        // Operations will fail gracefully with error logging
      }
    }

    return dbConnection
  })()

  return connectionPromise
}

/**
 * Close database connection (for cleanup in tests or shutdown)
 */
export async function closeDbConnection(): Promise<void> {
  if (dbConnection) {
    // LanceDB doesn't have explicit close, just set to null
    dbConnection = null
    console.log('✅ LanceDB connection closed')
  }
}

/**
 * Reset database connection (for test isolation)
 * Forces a new connection on next getDbConnection call
 */
export function resetDbConnection(): void {
  dbConnection = null
  connectionPromise = null
  schemaInitialized = false
}
