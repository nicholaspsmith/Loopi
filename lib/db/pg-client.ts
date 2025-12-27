import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './drizzle-schema'

/**
 * PostgreSQL Database Client for MemoryLoop
 *
 * Uses Drizzle ORM for users, conversations, messages, and API keys.
 * Vector embeddings are stored in LanceDB (see lib/db/client.ts).
 */

let client: postgres.Sql | null = null
let db: ReturnType<typeof drizzle> | null = null

/**
 * Get PostgreSQL database connection
 *
 * Singleton pattern to reuse connection across requests
 */
export function getDb() {
  if (!db) {
    const connectionString = process.env.DATABASE_URL

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set')
    }

    // Create postgres.js client
    client = postgres(connectionString, {
      max: 10, // Maximum connections in pool
      idle_timeout: 20, // Close idle connections after 20 seconds
      connect_timeout: 10, // Timeout connection attempts after 10 seconds
      connection: {
        timezone: 'UTC', // Use UTC to avoid timezone conversion issues
      },
    })

    // Create Drizzle instance
    db = drizzle(client, { schema })

    console.log('✅ PostgreSQL connected')
  }

  return db
}

/**
 * Close database connection
 *
 * Should be called on application shutdown
 */
export async function closeDb() {
  if (client) {
    await client.end()
    client = null
    db = null
    console.log('✅ PostgreSQL connection closed')
  }
}
