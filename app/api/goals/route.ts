import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { createGoal, getGoalsByUserId, type GoalStatus } from '@/lib/db/operations/goals'
import { createSkillTree, getSkillTreeByGoalId } from '@/lib/db/operations/skill-trees'
import { createSkillNodes, buildNodeTree } from '@/lib/db/operations/skill-nodes'
import { generateSkillTree, flattenGeneratedNodes } from '@/lib/ai/skill-tree-generator'
import { recordTopicUsage } from '@/lib/db/operations/topic-analytics'
import { createJob } from '@/lib/db/operations/background-jobs'
import { JobType, type FlashcardGenerationPayload } from '@/lib/jobs/types'
import * as logger from '@/lib/logger'

/**
 * GET /api/goals
 *
 * List all goals for authenticated user
 * Maps to contracts/goals.md - List Goals
 */
export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const status = searchParams.get('status') as GoalStatus | 'all' | null
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Get goals with optional status filter
    let goals = await getGoalsByUserId(userId, {
      status: status && status !== 'all' ? status : undefined,
      includeArchived: status === 'archived' || status === 'all',
    })

    // Get total count before pagination
    const total = goals.length

    // Apply pagination
    goals = goals.slice(offset, offset + limit)

    // Fetch skill tree info for each goal
    const goalsWithTrees = await Promise.all(
      goals.map(async (goal) => {
        const tree = await getSkillTreeByGoalId(goal.id)
        return {
          id: goal.id,
          title: goal.title,
          description: goal.description,
          status: goal.status,
          masteryPercentage: goal.masteryPercentage,
          totalTimeSeconds: goal.totalTimeSeconds,
          createdAt: goal.createdAt.toISOString(),
          updatedAt: goal.updatedAt.toISOString(),
          skillTree: tree
            ? {
                id: tree.id,
                nodeCount: tree.nodeCount,
                maxDepth: tree.maxDepth,
              }
            : null,
        }
      })
    )

    return NextResponse.json({
      goals: goalsWithTrees,
      total,
      hasMore: offset + limit < total,
    })
  } catch (error) {
    logger.error('Failed to list goals', error as Error)
    return NextResponse.json(
      { error: 'Failed to retrieve goals', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// Request validation schema
const createGoalSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().optional(),
  generateTree: z.boolean().default(true),
})

/**
 * POST /api/goals
 *
 * Create a new learning goal with optional skill tree generation
 * Maps to contracts/goals.md - Create Goal
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
    const validation = createGoalSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { title, description, generateTree } = validation.data

    logger.info('Creating learning goal', {
      userId,
      title,
      generateTree,
    })

    // Create the goal
    const goal = await createGoal({
      userId,
      title,
      description,
    })

    // Record topic usage for analytics
    await recordTopicUsage(title, userId)

    // Generate skill tree if requested
    let skillTreeResponse:
      | {
          id: string
          nodes: ReturnType<typeof buildNodeTree>
        }
      | undefined

    if (generateTree) {
      try {
        logger.info('Generating skill tree', {
          goalId: goal.id,
          title,
        })

        // Generate skill tree using AI
        const generated = await generateSkillTree(title)

        // Create skill tree record
        const tree = await createSkillTree({
          goalId: goal.id,
          generatedBy: 'ai',
        })

        // Flatten and insert nodes
        const flatNodes = flattenGeneratedNodes(generated.nodes)

        // Create nodes in order, tracking IDs for parent relationships
        const createdNodes: Array<{ id: string; path: string }> = []

        // First pass: create all nodes without parent relationships
        for (const node of flatNodes) {
          const createdNode = await createSkillNodes([
            {
              treeId: tree.id,
              parentId: null, // Will update in second pass
              title: node.title,
              description: node.description,
              depth: node.depth,
              path: node.path,
              sortOrder: node.sortOrder,
            },
          ])
          createdNodes.push({ id: createdNode[0].id, path: node.path })

          // Recursively create children
          if (node.children && node.children.length > 0) {
            const childFlat = flattenGeneratedNodes(node.children, createdNode[0].id, node.path)
            for (const child of childFlat) {
              const createdChild = await createSkillNodes([
                {
                  treeId: tree.id,
                  parentId: createdNode[0].id,
                  title: child.title,
                  description: child.description,
                  depth: child.depth,
                  path: child.path,
                  sortOrder: child.sortOrder,
                },
              ])
              createdNodes.push({ id: createdChild[0].id, path: child.path })

              // Handle third level (subtopics)
              if (child.children && child.children.length > 0) {
                const subtopicFlat = flattenGeneratedNodes(
                  child.children,
                  createdChild[0].id,
                  child.path
                )
                for (const subtopic of subtopicFlat) {
                  const createdSubtopic = await createSkillNodes([
                    {
                      treeId: tree.id,
                      parentId: createdChild[0].id,
                      title: subtopic.title,
                      description: subtopic.description,
                      depth: subtopic.depth,
                      path: subtopic.path,
                      sortOrder: subtopic.sortOrder,
                    },
                  ])
                  createdNodes.push({ id: createdSubtopic[0].id, path: subtopic.path })
                }
              }
            }
          }
        }

        // Update tree stats
        const { updateSkillTreeStats } = await import('@/lib/db/operations/skill-trees')
        await updateSkillTreeStats(tree.id)

        // Get nodes and build tree structure for response
        const { getNodesByTreeId } = await import('@/lib/db/operations/skill-nodes')
        const nodes = await getNodesByTreeId(tree.id)
        const nodeTree = buildNodeTree(nodes)

        skillTreeResponse = {
          id: tree.id,
          nodes: nodeTree,
        }

        // Queue flashcard generation jobs for each node (019-auto-gen-guided-study)
        const FREE_TIER_MAX_CARDS = 5

        logger.info('[GoalCreate] Queuing flashcard generation for nodes', {
          treeId: tree.id,
          nodeCount: nodes.length,
          maxCardsPerNode: FREE_TIER_MAX_CARDS,
        })

        for (const node of nodes) {
          const flashcardPayload: FlashcardGenerationPayload = {
            nodeId: node.id,
            nodeTitle: node.title,
            nodeDescription: node.description ?? undefined,
            maxCards: FREE_TIER_MAX_CARDS,
          }

          await createJob({
            type: JobType.FLASHCARD_GENERATION,
            payload: flashcardPayload,
            userId,
            priority: 0, // Lower priority than tree generation
          })

          logger.debug('[GoalCreate] Queued flashcard job for node', {
            nodeId: node.id,
            nodeTitle: node.title,
          })
        }

        logger.info('Skill tree generated successfully', {
          goalId: goal.id,
          treeId: tree.id,
          nodeCount: generated.metadata.nodeCount,
          generationTimeMs: generated.metadata.generationTimeMs,
        })
      } catch (error) {
        logger.error('Skill tree generation failed', error as Error, {
          goalId: goal.id,
          title,
        })
        // Goal is still created, just without tree
      }
    }

    return NextResponse.json(
      {
        goal: {
          id: goal.id,
          title: goal.title,
          description: goal.description,
          status: goal.status,
          masteryPercentage: goal.masteryPercentage,
          createdAt: goal.createdAt.toISOString(),
        },
        skillTree: skillTreeResponse,
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Failed to create goal', error as Error)
    return NextResponse.json(
      { error: 'Failed to create goal', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
