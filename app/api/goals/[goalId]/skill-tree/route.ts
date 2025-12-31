import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getGoalByIdForUser } from '@/lib/db/operations/goals'
import {
  getSkillTreeByGoalIdWithNodes,
  getSkillTreeByGoalId,
} from '@/lib/db/operations/skill-trees'
import { buildNodeTree } from '@/lib/db/operations/skill-nodes'
import { createJob, checkRateLimit } from '@/lib/db/operations/background-jobs'
import { JobType } from '@/lib/db/drizzle-schema'
import * as logger from '@/lib/logger'

interface RouteContext {
  params: Promise<{ goalId: string }>
}

/**
 * GET /api/goals/[goalId]/skill-tree
 *
 * Get the skill tree for a goal
 * Maps to contracts/skill-tree.md - Get Skill Tree
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

    // Get skill tree with nodes
    const treeData = await getSkillTreeByGoalIdWithNodes(goalId)
    if (!treeData) {
      return NextResponse.json(
        { error: 'Skill tree not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Build hierarchical structure
    const nodeTree = buildNodeTree(treeData.nodes)

    return NextResponse.json({
      id: treeData.tree.id,
      goalId: treeData.tree.goalId,
      generatedBy: treeData.tree.generatedBy,
      curatedSourceId: treeData.tree.curatedSourceId,
      nodeCount: treeData.tree.nodeCount,
      maxDepth: treeData.tree.maxDepth,
      createdAt: treeData.tree.createdAt.toISOString(),
      updatedAt: treeData.tree.updatedAt.toISOString(),
      regeneratedAt: treeData.tree.regeneratedAt?.toISOString() || null,
      nodes: nodeTree,
    })
  } catch (error) {
    logger.error('Failed to get skill tree', error as Error)
    return NextResponse.json(
      { error: 'Failed to retrieve skill tree', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/goals/[goalId]/skill-tree
 *
 * Create a skill tree for a goal that doesn't have one.
 * Creates a background job for async generation.
 * Returns job ID for polling status.
 *
 * Maps to spec: 018-background-flashcard-generation (User Story 3)
 */
export async function POST(_request: Request, context: RouteContext) {
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

    // Check if skill tree already exists
    const existingTree = await getSkillTreeByGoalId(goalId)
    if (existingTree) {
      return NextResponse.json(
        {
          error: 'Skill tree already exists. Use regenerate endpoint to update.',
          code: 'ALREADY_EXISTS',
        },
        { status: 409 }
      )
    }

    // Check rate limit
    const rateLimit = await checkRateLimit(userId, JobType.SKILL_TREE_GENERATION)
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000)
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          code: 'RATE_LIMITED',
          retryAfter,
        },
        { status: 429 }
      )
    }

    logger.info('Creating skill tree generation job', { goalId, title: goal.title })

    // Create background job for skill tree generation
    const job = await createJob({
      type: JobType.SKILL_TREE_GENERATION,
      payload: {
        goalId,
        topic: goal.title,
      },
      userId,
      priority: 5, // Higher priority than flashcard generation
    })

    logger.info('Skill tree generation job created', {
      goalId,
      jobId: job.id,
    })

    // Return job ID for polling
    return NextResponse.json(
      {
        jobId: job.id,
        status: 'pending',
        message: 'Skill tree generation started',
      },
      { status: 202 }
    )
  } catch (error) {
    logger.error('Failed to create skill tree generation job', error as Error)
    return NextResponse.json(
      { error: 'Failed to start skill tree generation', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
