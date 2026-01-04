/**
 * Background Jobs Database Operations
 *
 * CRUD operations for background_jobs and job_rate_limits tables.
 * Implements job queuing, status updates, stale job detection, and rate limiting.
 */

import { getDb } from '@/lib/db/pg-client'
import {
  backgroundJobs,
  jobRateLimits,
  type BackgroundJob,
  type NewBackgroundJob,
  JobStatus,
} from '@/lib/db/drizzle-schema'
import type { JobStatusValue, JobTypeValue, RateLimitResult } from '@/lib/jobs/types'
import { eq, and, lt, desc, asc, or, isNull, sql } from 'drizzle-orm'

// ============================================================================
// T008 - Job CRUD Operations
// ============================================================================

/**
 * Create a new background job
 *
 * @param job - Job data to insert
 * @returns Created job record
 */
export async function createJob(job: NewBackgroundJob): Promise<BackgroundJob> {
  const db = getDb()
  const [created] = await db.insert(backgroundJobs).values(job).returning()
  return created
}

/**
 * Get a single job by ID
 *
 * @param jobId - Job ID to look up
 * @returns Job record or null if not found
 */
export async function getJobById(jobId: string): Promise<BackgroundJob | null> {
  const db = getDb()
  const [job] = await db.select().from(backgroundJobs).where(eq(backgroundJobs.id, jobId)).limit(1)
  return job || null
}

/**
 * Update job status and optional fields
 *
 * @param jobId - Job ID to update
 * @param status - New status value
 * @param updates - Additional fields to update (e.g., result, error, startedAt, completedAt)
 */
export async function updateJobStatus(
  jobId: string,
  status: JobStatusValue,
  updates: Partial<BackgroundJob> = {}
): Promise<void> {
  const db = getDb()
  await db
    .update(backgroundJobs)
    .set({
      status,
      ...updates,
    })
    .where(eq(backgroundJobs.id, jobId))
}

/**
 * Get next pending job for user
 *
 * Respects nextRetryAt and orders by priority DESC, createdAt ASC
 *
 * @param userId - User ID to get job for
 * @returns Next pending job or null if none available
 */
export async function getPendingJobForUser(userId: string): Promise<BackgroundJob | null> {
  const db = getDb()
  const now = new Date()

  const [job] = await db
    .select()
    .from(backgroundJobs)
    .where(
      and(
        eq(backgroundJobs.userId, userId),
        eq(backgroundJobs.status, JobStatus.PENDING),
        // Job is ready if nextRetryAt is null OR in the past
        or(isNull(backgroundJobs.nextRetryAt), lt(backgroundJobs.nextRetryAt, now))
      )
    )
    .orderBy(desc(backgroundJobs.priority), asc(backgroundJobs.createdAt))
    .limit(1)

  return job || null
}

/**
 * Get jobs by user ID with optional filters
 *
 * @param userId - User ID to get jobs for
 * @param filters - Optional filters (type, status, limit)
 * @returns Array of matching jobs
 */
export async function getJobsByUserId(
  userId: string,
  filters?: { type?: string; status?: string; limit?: number }
): Promise<BackgroundJob[]> {
  const db = getDb()

  // Build conditions array
  const conditions = [eq(backgroundJobs.userId, userId)]
  if (filters?.type) {
    conditions.push(eq(backgroundJobs.type, filters.type))
  }
  if (filters?.status) {
    conditions.push(eq(backgroundJobs.status, filters.status))
  }

  // Build query with all conditions
  const baseQuery = db
    .select()
    .from(backgroundJobs)
    .where(and(...conditions))
    .orderBy(desc(backgroundJobs.createdAt))

  // Apply limit if specified
  if (filters?.limit) {
    return await baseQuery.limit(filters.limit)
  }

  return await baseQuery
}

// ============================================================================
// T009 - Stale Job Detection
// ============================================================================

/**
 * Reset stale jobs to pending status
 *
 * Finds jobs with status='processing' AND startedAt < 5 minutes ago,
 * resets them to 'pending' status
 *
 * @returns Number of jobs reset
 */
export async function resetStaleJobs(): Promise<number> {
  const db = getDb()
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

  const result = await db
    .update(backgroundJobs)
    .set({
      status: JobStatus.PENDING,
      nextRetryAt: new Date(), // Ready for immediate retry
    })
    .where(
      and(
        eq(backgroundJobs.status, JobStatus.PROCESSING),
        lt(backgroundJobs.startedAt, fiveMinutesAgo)
      )
    )
    .returning({ id: backgroundJobs.id })

  return result.length
}

/**
 * Reset failed jobs that failed due to missing handler
 *
 * This handles jobs that were created before a handler was registered.
 * Resets them to pending with attempts reset so they can be retried.
 *
 * @param jobType - Job type to reset (e.g., 'flashcard_generation')
 * @returns Number of jobs reset
 */
export async function resetFailedJobsForMissingHandler(jobType: JobTypeValue): Promise<number> {
  const db = getDb()

  const result = await db
    .update(backgroundJobs)
    .set({
      status: JobStatus.PENDING,
      attempts: 0,
      error: null,
      nextRetryAt: new Date(), // Ready for immediate retry
    })
    .where(
      and(
        eq(backgroundJobs.type, jobType),
        eq(backgroundJobs.status, JobStatus.FAILED),
        sql`${backgroundJobs.error} LIKE '%Unknown job type%'`
      )
    )
    .returning({ id: backgroundJobs.id })

  return result.length
}

// ============================================================================
// T010 - Rate Limiting
// ============================================================================

/**
 * Check if user can create a new job (rate limit: 20/hour)
 *
 * @param userId - User ID to check
 * @param jobType - Job type to check
 * @returns Rate limit result with allowed flag, remaining count, and reset time
 */
export async function checkRateLimit(userId: string, jobType: string): Promise<RateLimitResult> {
  const db = getDb()
  const now = new Date()
  const windowStart = getHourWindowStart(now)
  const resetAt = new Date(windowStart.getTime() + 60 * 60 * 1000) // 1 hour from window start

  // Get current rate limit entry for this user/type/window
  const [entry] = await db
    .select()
    .from(jobRateLimits)
    .where(
      and(
        eq(jobRateLimits.userId, userId),
        eq(jobRateLimits.jobType, jobType),
        eq(jobRateLimits.windowStart, windowStart)
      )
    )
    .limit(1)

  const currentCount = entry?.count || 0
  const limit = 20
  const allowed = currentCount < limit
  const remaining = Math.max(0, limit - currentCount)

  return {
    allowed,
    remaining,
    resetAt,
  }
}

/**
 * Increment rate limit counter for user and job type
 *
 * Uses upsert to create or increment the counter for the current hour window
 *
 * @param userId - User ID to increment
 * @param jobType - Job type to increment
 */
export async function incrementRateLimit(userId: string, jobType: string): Promise<void> {
  const db = getDb()
  const windowStart = getHourWindowStart(new Date())

  // Upsert: insert new entry or increment existing count
  await db
    .insert(jobRateLimits)
    .values({
      userId,
      jobType,
      windowStart,
      count: 1,
    })
    .onConflictDoUpdate({
      target: [jobRateLimits.userId, jobRateLimits.jobType, jobRateLimits.windowStart],
      set: {
        count: sql`${jobRateLimits.count} + 1`,
      },
    })
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get hour window start by rounding down to the current hour
 *
 * @param date - Date to round
 * @returns Date rounded down to hour boundary (minutes, seconds, ms set to 0)
 */
function getHourWindowStart(date: Date): Date {
  const rounded = new Date(date)
  rounded.setMinutes(0, 0, 0)
  return rounded
}
