/**
 * Job Processor
 *
 * Core job processing engine with state machine:
 * pending → processing → completed/failed
 *
 * Features:
 * - Handler dispatch registry by job type
 * - Exponential backoff retry (1s, 2s, 4s delays)
 * - Error handling with max attempts
 */

import { JobStatus } from '@/lib/db/drizzle-schema'
import { updateJobStatus } from '@/lib/db/operations/background-jobs'
import type { BackgroundJob, JobHandler, JobPayload, JobResult, JobTypeValue } from './types'

// Handler registry - will be populated as handlers are implemented
const handlers: Record<string, JobHandler> = {}

/**
 * Register a job handler for a specific job type
 */
export function registerHandler<P extends JobPayload, R extends JobResult>(
  type: JobTypeValue,
  handler: JobHandler<P, R>
): void {
  handlers[type] = handler as unknown as JobHandler
}

/**
 * Get a registered handler for a job type
 */
export function getHandler(type: string): JobHandler | undefined {
  return handlers[type]
}

/**
 * Calculate exponential backoff delay for retries
 * Delays: 1s (attempt 0), 2s (attempt 1), 4s (attempt 2)
 */
export function calculateBackoffDelay(attempts: number): number {
  return Math.pow(2, attempts) * 1000
}

/**
 * Process a single job through its lifecycle
 *
 * State transitions:
 * - pending → processing (on pickup)
 * - processing → completed (on success)
 * - processing → pending (on failure, if retries remain)
 * - processing → failed (on failure, max retries reached)
 */
export async function processJob(job: BackgroundJob): Promise<void> {
  const handler = handlers[job.type]
  if (!handler) {
    throw new Error(`Unknown job type: ${job.type}`)
  }

  // Mark as processing
  await updateJobStatus(job.id, JobStatus.PROCESSING, {
    startedAt: new Date(),
    attempts: job.attempts + 1,
  })

  try {
    // Execute the handler
    const result = await handler(job.payload as JobPayload, job)

    // Success - mark as completed
    await updateJobStatus(job.id, JobStatus.COMPLETED, {
      result,
      completedAt: new Date(),
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const newAttempts = job.attempts + 1

    if (newAttempts >= job.maxAttempts) {
      // Max retries reached - mark as failed
      await updateJobStatus(job.id, JobStatus.FAILED, {
        error: errorMessage,
        completedAt: new Date(),
      })
    } else {
      // Schedule retry with exponential backoff
      const delay = calculateBackoffDelay(job.attempts)
      await updateJobStatus(job.id, JobStatus.PENDING, {
        error: errorMessage,
        nextRetryAt: new Date(Date.now() + delay),
      })
    }
  }
}

/**
 * Check if a job can be processed (pending and retry time passed)
 */
export function canProcessJob(job: BackgroundJob): boolean {
  if (job.status !== 'pending') {
    return false
  }

  if (job.nextRetryAt && new Date(job.nextRetryAt) > new Date()) {
    return false
  }

  return true
}
