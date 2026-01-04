/**
 * Flashcard Jobs API for Goal
 *
 * GET /api/goals/[goalId]/flashcard-jobs
 *
 * Returns pending flashcard generation jobs for this goal's nodes.
 * Triggers processing of pending jobs (piggyback on poll request).
 */

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getGoalByIdForUser } from '@/lib/db/operations/goals'
import { getSkillTreeByGoalId } from '@/lib/db/operations/skill-trees'
import { getDb } from '@/lib/db/pg-client'
import { backgroundJobs, skillNodes } from '@/lib/db/drizzle-schema'
import { eq, and, sql } from 'drizzle-orm'
import { processJob, canProcessJob } from '@/lib/jobs/processor'
import {
  resetStaleJobs,
  resetFailedJobsForMissingHandler,
} from '@/lib/db/operations/background-jobs'
import * as logger from '@/lib/logger'

// Register job handlers (side-effect import)
import '@/lib/jobs/handlers'

interface RouteContext {
  params: Promise<{ goalId: string }>
}

/**
 * GET /api/goals/[goalId]/flashcard-jobs
 *
 * Returns job status summary and triggers processing of pending jobs
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const userId = session.user.id
    const { goalId } = await context.params

    // Check goal ownership
    const goal = await getGoalByIdForUser(goalId, userId)
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    // Get skill tree
    const tree = await getSkillTreeByGoalId(goalId)
    if (!tree) {
      return NextResponse.json({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: 0,
      })
    }

    // Reset stale jobs and failed jobs from missing handler
    await resetStaleJobs()
    await resetFailedJobsForMissingHandler('flashcard_generation')

    const db = getDb()

    // Get all node IDs for this tree
    const nodes = await db
      .select({ id: skillNodes.id })
      .from(skillNodes)
      .where(eq(skillNodes.treeId, tree.id))

    if (nodes.length === 0) {
      return NextResponse.json({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        total: 0,
      })
    }

    const nodeIds = nodes.map((n) => n.id)

    // Get flashcard generation jobs for these nodes
    // Use sql.join to construct proper PostgreSQL array syntax
    const nodeIdsSql = sql.join(
      nodeIds.map((id) => sql`${id}`),
      sql`, `
    )
    const jobs = await db
      .select()
      .from(backgroundJobs)
      .where(
        and(
          eq(backgroundJobs.type, 'flashcard_generation'),
          eq(backgroundJobs.userId, userId),
          sql`${backgroundJobs.payload}->>'nodeId' IN (${nodeIdsSql})`
        )
      )

    // Count by status
    const counts = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    }

    // Track jobs to process
    const jobsToProcess: typeof jobs = []

    for (const job of jobs) {
      counts[job.status as keyof typeof counts]++
      if (canProcessJob(job)) {
        jobsToProcess.push(job)
      }
    }

    // Process pending jobs (up to 3 at a time to avoid overwhelming the system)
    const jobsToTrigger = jobsToProcess.slice(0, 3)
    for (const job of jobsToTrigger) {
      logger.debug('[FlashcardJobs] Triggering job processing', {
        jobId: job.id,
        nodeId: (job.payload as { nodeId?: string })?.nodeId,
      })
      // Process in background, don't await
      processJob(job).catch((error) => {
        logger.error('[FlashcardJobs] Job processing error', error as Error, {
          jobId: job.id,
        })
      })
    }

    return NextResponse.json({
      pending: counts.pending,
      processing: counts.processing,
      completed: counts.completed,
      failed: counts.failed,
      total: jobs.length,
      triggered: jobsToTrigger.length,
    })
  } catch (error) {
    logger.error('Failed to get flashcard jobs', error as Error)
    return NextResponse.json(
      { error: 'Failed to get flashcard jobs', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
