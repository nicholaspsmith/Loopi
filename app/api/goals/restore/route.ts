import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { restoreGoal, getGoalCounts } from '@/lib/db/operations/goals'
import { getGoalById } from '@/lib/db/operations/goals'
import { GOAL_LIMITS } from '@/lib/constants/goals'
import * as logger from '@/lib/logger'

/**
 * Restore Goal Schema
 * Based on specs/021-custom-cards-archive/contracts/restore.md
 */
const restoreGoalSchema = z.object({
  goalId: z.string().uuid('Invalid goal ID format'),
})

/**
 * POST /api/goals/restore
 *
 * Restore an archived goal back to active status.
 * Maps to contracts/restore.md
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()

    // Validate request body
    const validation = restoreGoalSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { goalId } = validation.data

    // Verify goal exists
    const goal = await getGoalById(goalId)
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Verify ownership
    if (goal.userId !== userId) {
      return NextResponse.json(
        { error: "You don't have permission to restore this goal" },
        { status: 403 }
      )
    }

    // Verify goal is archived
    if (goal.status !== 'archived') {
      return NextResponse.json({ error: 'Goal is not archived' }, { status: 409 })
    }

    // Check active limit
    const counts = await getGoalCounts(userId)
    if (counts.active >= GOAL_LIMITS.ACTIVE) {
      return NextResponse.json(
        {
          error: 'Maximum 6 active goals reached. Archive or delete a goal first.',
          code: 'ACTIVE_LIMIT_EXCEEDED',
          limits: counts,
        },
        { status: 422 }
      )
    }

    // Restore the goal
    const restored = await restoreGoal(goalId, userId)
    const newCounts = await getGoalCounts(userId)

    logger.info('Restored goal', {
      userId,
      goalId: restored.id,
    })

    return NextResponse.json({
      restored: true,
      goal: {
        id: restored.id,
        title: restored.title,
        status: restored.status,
        archivedAt: restored.archivedAt,
      },
      limits: newCounts,
    })
  } catch (error) {
    logger.error('Failed to restore goal', error as Error)
    return NextResponse.json(
      { error: 'Failed to restore goal', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
