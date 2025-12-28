import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { getGoalByIdForUser } from '@/lib/db/operations/goals'
import { getSkillTreeByGoalId } from '@/lib/db/operations/skill-trees'
import {
  getSkillNodeById,
  updateSkillNode,
  recalculateTreeMastery,
} from '@/lib/db/operations/skill-nodes'
import * as logger from '@/lib/logger'

interface RouteContext {
  params: Promise<{ goalId: string; nodeId: string }>
}

const updateNodeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  isEnabled: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
})

/**
 * PATCH /api/goals/[goalId]/skill-tree/nodes/[nodeId]
 *
 * Update a skill tree node
 * Maps to contracts/skill-tree.md - Update Node
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const userId = session.user.id
    const { goalId, nodeId } = await context.params

    // Check goal ownership
    const goal = await getGoalByIdForUser(goalId, userId)
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    // Get skill tree
    const tree = await getSkillTreeByGoalId(goalId)
    if (!tree) {
      return NextResponse.json(
        { error: 'Skill tree not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Get the node and verify it belongs to this tree
    const node = await getSkillNodeById(nodeId)
    if (!node || node.treeId !== tree.id) {
      return NextResponse.json({ error: 'Node not found', code: 'NOT_FOUND' }, { status: 404 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = updateNodeSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { title, description, isEnabled, sortOrder } = validation.data

    // Track if isEnabled changed (affects mastery calculation)
    const enabledChanged = isEnabled !== undefined && isEnabled !== node.isEnabled

    // Update the node
    const updated = await updateSkillNode(nodeId, {
      title,
      description,
      isEnabled,
      sortOrder,
    })

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update node', code: 'UPDATE_FAILED' },
        { status: 500 }
      )
    }

    // If enabled state changed, recalculate tree mastery
    if (enabledChanged) {
      await recalculateTreeMastery(tree.id)

      logger.info('Node enabled state changed, recalculated mastery', {
        nodeId,
        treeId: tree.id,
        isEnabled,
      })
    }

    logger.info('Node updated', {
      nodeId,
      goalId,
      changes: { title, description, isEnabled, sortOrder },
    })

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      description: updated.description,
      isEnabled: updated.isEnabled,
      sortOrder: updated.sortOrder,
      updatedAt: updated.updatedAt.toISOString(),
    })
  } catch (error) {
    logger.error('Failed to update node', error as Error)
    return NextResponse.json(
      { error: 'Failed to update node', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
