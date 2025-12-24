/**
 * Cleanup Old Security Logs Script
 *
 * Deletes security logs older than retention period (default: 90 days)
 * Should be run as a scheduled job (e.g., weekly via cron)
 */

import { db } from '@/lib/db'
import { securityLogs } from '@/lib/db/drizzle-schema'
import { lt } from 'drizzle-orm'
import { closeDb } from '@/lib/db/pg-client'

const DEFAULT_RETENTION_DAYS = 90

/**
 * Delete security logs older than retention period
 *
 * @param retentionDays - Number of days to retain logs (default: 90)
 */
async function cleanupSecurityLogs(retentionDays: number = DEFAULT_RETENTION_DAYS): Promise<void> {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

  console.log(`🗑️  Deleting security logs older than ${cutoffDate.toISOString()}`)

  await db.delete(securityLogs).where(lt(securityLogs.createdAt, cutoffDate))

  console.log(`✅ Security logs cleanup complete`)
}

/**
 * Main cleanup function
 */
async function main() {
  const retentionDays = process.env.SECURITY_LOG_RETENTION_DAYS
    ? parseInt(process.env.SECURITY_LOG_RETENTION_DAYS, 10)
    : DEFAULT_RETENTION_DAYS

  console.log('🧹 Starting security logs cleanup...')
  console.log(`Retention period: ${retentionDays} days`)
  console.log(`Current time: ${new Date().toISOString()}`)

  try {
    await cleanupSecurityLogs(retentionDays)
  } catch (error) {
    console.error('❌ Security logs cleanup failed:', error)
    process.exit(1)
  } finally {
    await closeDb()
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { cleanupSecurityLogs }
