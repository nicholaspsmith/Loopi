import { connect, Connection } from '@lancedb/lancedb'
import path from 'path'

let dbConnection: Connection | null = null

/**
 * Get LanceDB connection singleton
 * Creates a new connection if one doesn't exist, otherwise returns cached connection
 */
export async function getDbConnection(): Promise<Connection> {
  if (dbConnection) {
    return dbConnection
  }

  const dbPath = process.env.LANCEDB_PATH || path.join(process.cwd(), 'data', 'lancedb')

  dbConnection = await connect(dbPath)

  console.log(`✅ LanceDB connected at: ${dbPath}`)

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
}
