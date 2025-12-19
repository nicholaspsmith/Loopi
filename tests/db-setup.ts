import { beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * Database Test Setup
 *
 * Creates isolated database instances per test worker to prevent
 * table conflicts when tests run in parallel.
 */

// Generate unique database path per worker
const workerId = process.env.VITEST_POOL_ID || process.env.VITEST_WORKER_ID || '0'
const testDbPath = path.join(process.cwd(), 'data', 'lancedb-test', `worker-${workerId}`)

// Set the database path before any imports that might use it
process.env.LANCEDB_PATH = testDbPath

beforeAll(async () => {
  // Create test database directory
  if (!fs.existsSync(testDbPath)) {
    fs.mkdirSync(testDbPath, { recursive: true })
  }

  // Reset connection to use new path
  const { resetDbConnection } = await import('@/lib/db/client')
  resetDbConnection()

  // Initialize schema for this worker's database
  const { initializeSchema } = await import('@/lib/db/schema')
  await initializeSchema()
})

afterAll(async () => {
  // Clean up test database after all tests in this worker complete
  const { closeDbConnection } = await import('@/lib/db/client')
  await closeDbConnection()

  // Remove test database directory
  try {
    if (fs.existsSync(testDbPath)) {
      fs.rmSync(testDbPath, { recursive: true, force: true })
    }
  } catch {
    // Ignore cleanup errors
  }
})
