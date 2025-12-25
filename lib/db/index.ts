/**
 * Database exports
 *
 * Re-exports database instance and utilities for convenience
 */

import { getDb } from './pg-client'

// Export database instance
export const db = getDb()

// Re-export all schema types and tables
export * from './drizzle-schema'

// Re-export client utilities
export { getDb, closeDb } from './pg-client'
