/**
 * Test Cleanup Utility
 *
 * Deletes all test users (email ending with @example.com) and their cascaded data.
 * Should be run after integration tests to prevent data accumulation.
 */

import { getDb } from '@/lib/db/pg-client'
import { users } from '@/lib/db/drizzle-schema'
import { like } from 'drizzle-orm'

export async function cleanupTestUsers(): Promise<number> {
  // Production safeguard - prevent accidental data loss
  const isProduction = process.env.NODE_ENV === 'production'
  const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'

  if (isProduction) {
    console.error('[Test Cleanup] BLOCKED: Cannot run cleanup in production')
    throw new Error('Test cleanup is not allowed in production environment')
  }

  if (!isTestEnv) {
    console.warn('[Test Cleanup] WARNING: Running cleanup outside test environment')
  }

  try {
    const db = getDb()
    const result = await db
      .delete(users)
      .where(like(users.email, '%@example.com'))
      .returning({ id: users.id })

    console.log(`[Test Cleanup] Deleted ${result.length} test users`)
    return result.length
  } catch (error) {
    console.error('[Test Cleanup] Failed to cleanup test users:', error)
    return 0
  }
}
