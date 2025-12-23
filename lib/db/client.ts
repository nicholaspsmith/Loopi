import { connect, Connection } from '@lancedb/lancedb'
import path from 'path'

let dbConnection: Connection | null = null
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

  const dbPath = process.env.LANCEDB_PATH || path.join(process.cwd(), 'data', 'lancedb')

  dbConnection = await connect(dbPath)

  console.log(`✅ LanceDB connected at: ${dbPath}`)

  // Auto-initialize schema on first connection if tables don't exist
  // This ensures production deployments work without manual initialization
  if (!schemaInitialized) {
    try {
      const tableNames = await dbConnection.tableNames()

      // Create messages table if it doesn't exist
      if (!tableNames.includes('messages')) {
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
        const table = await dbConnection.openTable('messages')
        await table.delete("id = '00000000-0000-0000-0000-000000000000'")
        console.log('✅ Created messages table')
      }

      // Create flashcards table if it doesn't exist
      if (!tableNames.includes('flashcards')) {
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
        const table = await dbConnection.openTable('flashcards')
        await table.delete("id = '00000000-0000-0000-0000-000000000000'")
        console.log('✅ Created flashcards table')
      }

      schemaInitialized = true
    } catch (error) {
      console.error('❌ Failed to auto-initialize LanceDB schema:', error)
      // Don't throw - allow app to continue even if schema init fails
      // Operations will fail gracefully with error logging
    }
  }

  return dbConnection
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
  schemaInitialized = false
}
