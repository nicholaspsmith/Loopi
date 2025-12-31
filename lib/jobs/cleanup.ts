/**
 * Job Cleanup Utilities
 *
 * Functions for cleaning up old completed and failed jobs.
 * Prevents the background_jobs table from growing indefinitely.
 *
 * Usage:
 * - Can be called from a scheduled task (cron job)
 * - Or triggered manually via admin API
 */

import { getDb } from '@/lib/db/pg-client'
import { backgroundJobs, jobRateLimits } from '@/lib/db/drizzle-schema'
import { lt, and, eq, count, min } from 'drizzle-orm'
import * as logger from '@/lib/logger'

export interface CleanupOptions {
  /** Age in hours for completed jobs to be cleaned up (default: 24) */
  completedMaxAgeHours?: number
  /** Age in hours for failed jobs to be cleaned up (default: 72) */
  failedMaxAgeHours?: number
  /** Age in hours for rate limit records to be cleaned up (default: 2) */
  rateLimitMaxAgeHours?: number
  /** Maximum number of jobs to delete in one batch (default: 1000) */
  batchSize?: number
  /** Dry run - log what would be deleted without actually deleting (default: false) */
  dryRun?: boolean
}

export interface CleanupResult {
  completedJobsDeleted: number
  failedJobsDeleted: number
  rateLimitRecordsDeleted: number
  dryRun: boolean
}

/**
 * Clean up old completed and failed jobs from the database.
 *
 * @param options - Cleanup configuration options
 * @returns Summary of deleted records
 */
export async function cleanupOldJobs(options: CleanupOptions = {}): Promise<CleanupResult> {
  const {
    completedMaxAgeHours = 24,
    failedMaxAgeHours = 72,
    rateLimitMaxAgeHours = 2,
    batchSize = 1000,
    dryRun = false,
  } = options

  const db = getDb()
  const now = new Date()

  // Calculate cutoff dates
  const completedCutoff = new Date(now.getTime() - completedMaxAgeHours * 60 * 60 * 1000)
  const failedCutoff = new Date(now.getTime() - failedMaxAgeHours * 60 * 60 * 1000)
  const rateLimitCutoff = new Date(now.getTime() - rateLimitMaxAgeHours * 60 * 60 * 1000)

  logger.info('[JobCleanup] Starting job cleanup', {
    completedMaxAgeHours,
    failedMaxAgeHours,
    rateLimitMaxAgeHours,
    batchSize,
    dryRun,
    completedCutoff: completedCutoff.toISOString(),
    failedCutoff: failedCutoff.toISOString(),
  })

  let completedJobsDeleted = 0
  let failedJobsDeleted = 0
  let rateLimitRecordsDeleted = 0

  try {
    if (dryRun) {
      // Count what would be deleted
      const completedCount = await db
        .select({ id: backgroundJobs.id })
        .from(backgroundJobs)
        .where(
          and(
            eq(backgroundJobs.status, 'completed'),
            lt(backgroundJobs.completedAt, completedCutoff)
          )
        )
        .limit(batchSize)

      const failedCount = await db
        .select({ id: backgroundJobs.id })
        .from(backgroundJobs)
        .where(and(eq(backgroundJobs.status, 'failed'), lt(backgroundJobs.createdAt, failedCutoff)))
        .limit(batchSize)

      const rateLimitCount = await db
        .select({ id: jobRateLimits.id })
        .from(jobRateLimits)
        .where(lt(jobRateLimits.windowStart, rateLimitCutoff))
        .limit(batchSize)

      completedJobsDeleted = completedCount.length
      failedJobsDeleted = failedCount.length
      rateLimitRecordsDeleted = rateLimitCount.length

      logger.info('[JobCleanup] Dry run complete', {
        completedJobsWouldDelete: completedJobsDeleted,
        failedJobsWouldDelete: failedJobsDeleted,
        rateLimitRecordsWouldDelete: rateLimitRecordsDeleted,
      })
    } else {
      // Delete completed jobs older than cutoff
      const completedResult = await db
        .delete(backgroundJobs)
        .where(
          and(
            eq(backgroundJobs.status, 'completed'),
            lt(backgroundJobs.completedAt, completedCutoff)
          )
        )
        .returning({ id: backgroundJobs.id })

      completedJobsDeleted = completedResult.length

      // Delete failed jobs older than cutoff
      const failedResult = await db
        .delete(backgroundJobs)
        .where(and(eq(backgroundJobs.status, 'failed'), lt(backgroundJobs.createdAt, failedCutoff)))
        .returning({ id: backgroundJobs.id })

      failedJobsDeleted = failedResult.length

      // Delete old rate limit records
      const rateLimitResult = await db
        .delete(jobRateLimits)
        .where(lt(jobRateLimits.windowStart, rateLimitCutoff))
        .returning({ id: jobRateLimits.id })

      rateLimitRecordsDeleted = rateLimitResult.length

      logger.info('[JobCleanup] Cleanup complete', {
        completedJobsDeleted,
        failedJobsDeleted,
        rateLimitRecordsDeleted,
      })
    }
  } catch (error) {
    logger.error('[JobCleanup] Cleanup failed', error as Error)
    throw error
  }

  return {
    completedJobsDeleted,
    failedJobsDeleted,
    rateLimitRecordsDeleted,
    dryRun,
  }
}

/**
 * Get statistics about jobs in the database.
 * Useful for monitoring and deciding when to run cleanup.
 */
export async function getJobStats(): Promise<{
  pending: number
  processing: number
  completed: number
  failed: number
  total: number
  oldestCompletedAt: Date | null
  oldestFailedAt: Date | null
}> {
  const db = getDb()

  const [pendingResult] = await db
    .select({ count: count() })
    .from(backgroundJobs)
    .where(eq(backgroundJobs.status, 'pending'))

  const [processingResult] = await db
    .select({ count: count() })
    .from(backgroundJobs)
    .where(eq(backgroundJobs.status, 'processing'))

  const [completedResult] = await db
    .select({ count: count(), oldest: min(backgroundJobs.completedAt) })
    .from(backgroundJobs)
    .where(eq(backgroundJobs.status, 'completed'))

  const [failedResult] = await db
    .select({ count: count(), oldest: min(backgroundJobs.createdAt) })
    .from(backgroundJobs)
    .where(eq(backgroundJobs.status, 'failed'))

  const pending = pendingResult?.count ?? 0
  const processing = processingResult?.count ?? 0
  const completed = completedResult?.count ?? 0
  const failed = failedResult?.count ?? 0

  return {
    pending,
    processing,
    completed,
    failed,
    total: pending + processing + completed + failed,
    oldestCompletedAt: completedResult?.oldest ?? null,
    oldestFailedAt: failedResult?.oldest ?? null,
  }
}
