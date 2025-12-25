/**
 * Cleanup Expired Tokens Script
 *
 * Deletes expired password reset and email verification tokens
 * Should be run as a scheduled job (e.g., daily via cron)
 */

import { db } from '@/lib/db'
import { passwordResetTokens, emailVerificationTokens } from '@/lib/db/drizzle-schema'
import { lt } from 'drizzle-orm'
import { closeDb } from '@/lib/db/pg-client'

/**
 * Delete expired password reset tokens
 */
async function cleanupPasswordResetTokens(): Promise<number> {
  const now = new Date()

  await db.delete(passwordResetTokens).where(lt(passwordResetTokens.expiresAt, now))

  console.log(`🗑️  Deleted expired password reset tokens`)
  return 0 // Drizzle doesn't return count by default
}

/**
 * Delete expired email verification tokens
 */
async function cleanupEmailVerificationTokens(): Promise<number> {
  const now = new Date()

  await db.delete(emailVerificationTokens).where(lt(emailVerificationTokens.expiresAt, now))

  console.log(`🗑️  Deleted expired email verification tokens`)
  return 0 // Drizzle doesn't return count by default
}

/**
 * Main cleanup function
 */
async function main() {
  console.log('🧹 Starting token cleanup...')
  console.log(`Current time: ${new Date().toISOString()}`)

  try {
    await cleanupPasswordResetTokens()
    await cleanupEmailVerificationTokens()

    console.log('✅ Token cleanup complete')
  } catch (error) {
    console.error('❌ Token cleanup failed:', error)
    process.exit(1)
  } finally {
    await closeDb()
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { cleanupPasswordResetTokens, cleanupEmailVerificationTokens }
