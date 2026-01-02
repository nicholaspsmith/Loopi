import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import {
  getGoalByIdForUser,
  updateGoal,
  deleteGoal,
  getGoalCounts,
  type GoalStatus,
} from '@/lib/db/operations/goals'
import { GOAL_LIMITS } from '@/lib/constants/goals'
import { getSkillTreeByGoalIdWithNodes } from '@/lib/db/operations/skill-trees'
import { buildNodeTree } from '@/lib/db/operations/skill-nodes'
import { getDb } from '@/lib/db/pg-client'
import { flashcards } from '@/lib/db/drizzle-schema'
import { eq } from 'drizzle-orm'
import * as logger from '@/lib/logger'

import { withRetry } from '@/lib/db/utils/retry'

interface RouteContext {
  params: Promise<{ goalId: string }>
}

/**
 * GET /api/goals/[goalId]
 *
 * Get a specific goal with skill tree and stats
 * Maps to contracts/goals.md - Get Goal
 */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const userId = session.user.id
    const { goalId } = await context.params

    // Get goal with ownership check
    const goal = await getGoalByIdForUser(goalId, userId)
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    // Get skill tree with nodes
    const treeData = await getSkillTreeByGoalIdWithNodes(goalId)

    // Calculate stats from flashcards with retry for transient DB errors
    const db = getDb()
    const allCards = await withRetry(
      () => db.select().from(flashcards).where(eq(flashcards.userId, userId)),
      {
        maxAttempts: 3,
        onRetry: (attempt, error) => {
          logger.warn('Retrying flashcards query', {
            attempt,
            goalId,
            userId,
            error: error.message,
          })
        },
      }
    )

    // Filter cards linked to this goal's skill tree nodes
    const nodeIds = treeData?.nodes.map((n) => n.id) || []
    const goalCards = allCards.filter(
      (card) => card.skillNodeId && nodeIds.includes(card.skillNodeId)
    )

    // Count due cards
    const now = new Date()
    const dueCards = goalCards.filter((card) => {
      const fsrsState = card.fsrsState as { due: number }
      return new Date(fsrsState.due) <= now
    })

    // Calculate retention rate (cards in Review state / total cards)
    const reviewCards = goalCards.filter((card) => {
      const fsrsState = card.fsrsState as { state: number }
      return fsrsState.state === 2 // State.Review = 2
    })
    const retentionRate =
      goalCards.length > 0 ? Math.round((reviewCards.length / goalCards.length) * 100) : 0

    return NextResponse.json({
      id: goal.id,
      title: goal.title,
      description: goal.description,
      status: goal.status,
      masteryPercentage: goal.masteryPercentage,
      totalTimeSeconds: goal.totalTimeSeconds,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
      completedAt: goal.completedAt?.toISOString() || null,
      archivedAt: goal.archivedAt?.toISOString() || null,
      skillTree: treeData
        ? {
            id: treeData.tree.id,
            generatedBy: treeData.tree.generatedBy,
            nodeCount: treeData.tree.nodeCount,
            maxDepth: treeData.tree.maxDepth,
            nodes: buildNodeTree(treeData.nodes),
          }
        : null,
      stats: {
        totalCards: goalCards.length,
        cardsDue: dueCards.length,
        retentionRate,
      },
    })
  } catch (error) {
    logger.error('Failed to get goal', error as Error)
    return NextResponse.json(
      { error: 'Failed to retrieve goal', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// Update validation schema
const updateGoalSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'paused', 'archived']).optional(),
})

/**
 * PATCH /api/goals/[goalId]
 *
 * Update a goal
 * Maps to contracts/goals.md - Update Goal
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const userId = session.user.id
    const { goalId } = await context.params

    // Check ownership
    const existingGoal = await getGoalByIdForUser(goalId, userId)
    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    const body = await request.json()

    // Validate request body
    const validation = updateGoalSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { title, description, status } = validation.data

    // Check archive limit if archiving
    if (status === 'archived' && existingGoal.status !== 'archived') {
      const counts = await getGoalCounts(userId)
      if (counts.archived >= GOAL_LIMITS.ARCHIVED) {
        return NextResponse.json(
          {
            error: 'Maximum 6 archived goals reached. Delete an archived goal first.',
            code: 'ARCHIVE_LIMIT_EXCEEDED',
            limits: counts,
          },
          { status: 422 }
        )
      }
    }

    // Update the goal
    const updated = await updateGoal(goalId, {
      title,
      description,
      status: status as GoalStatus,
    })

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update goal', code: 'UPDATE_FAILED' },
        { status: 500 }
      )
    }

    logger.info('Goal updated', {
      goalId,
      userId,
      changes: { title, description, status },
    })

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      description: updated.description,
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
    })
  } catch (error) {
    logger.error('Failed to update goal', error as Error)
    return NextResponse.json(
      { error: 'Failed to update goal', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/goals/[goalId]
 *
 * Delete a goal (cascades to skill tree)
 * Maps to contracts/goals.md - Delete Goal
 */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const userId = session.user.id
    const { goalId } = await context.params

    // Check ownership
    const existingGoal = await getGoalByIdForUser(goalId, userId)
    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    // Delete the goal (cascades to skill tree and nodes)
    await deleteGoal(goalId)

    logger.info('Goal deleted', {
      goalId,
      userId,
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    logger.error('Failed to delete goal', error as Error)
    return NextResponse.json(
      { error: 'Failed to delete goal', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
