import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getGoalByIdForUser } from '@/lib/db/operations/goals'
import {
  getSkillTreeByGoalIdWithNodes,
  getSkillTreeByGoalId,
  createSkillTree,
  updateSkillTreeStats,
} from '@/lib/db/operations/skill-trees'
import { buildNodeTree, createSkillNodes, getNodesByTreeId } from '@/lib/db/operations/skill-nodes'
import { generateSkillTree, flattenGeneratedNodes } from '@/lib/ai/skill-tree-generator'
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
 * Create a skill tree for a goal that doesn't have one
 * This is used when initial goal creation failed to generate a tree
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

    logger.info('Creating skill tree for goal', { goalId, title: goal.title })

    try {
      // Generate skill tree using AI
      const generated = await generateSkillTree(goal.title)

      // Create skill tree record
      const tree = await createSkillTree({
        goalId: goal.id,
        generatedBy: 'ai',
      })

      // Flatten and insert nodes
      const flatNodes = flattenGeneratedNodes(generated.nodes)

      // Create nodes in order, tracking IDs for parent relationships
      for (const node of flatNodes) {
        const createdNode = await createSkillNodes([
          {
            treeId: tree.id,
            parentId: null,
            title: node.title,
            description: node.description,
            depth: node.depth,
            path: node.path,
            sortOrder: node.sortOrder,
          },
        ])

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

            // Handle third level (subtopics)
            if (child.children && child.children.length > 0) {
              const subtopicFlat = flattenGeneratedNodes(
                child.children,
                createdChild[0].id,
                child.path
              )
              for (const subtopic of subtopicFlat) {
                await createSkillNodes([
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
              }
            }
          }
        }
      }

      // Update tree stats
      await updateSkillTreeStats(tree.id)

      // Get nodes and build tree structure for response
      const nodes = await getNodesByTreeId(tree.id)
      const nodeTree = buildNodeTree(nodes)

      logger.info('Skill tree created successfully', {
        goalId,
        treeId: tree.id,
        nodeCount: generated.metadata.nodeCount,
        generationTimeMs: generated.metadata.generationTimeMs,
      })

      return NextResponse.json(
        {
          id: tree.id,
          nodeCount: nodes.length,
          maxDepth: Math.max(...nodes.map((n) => n.depth), 0),
          nodes: nodeTree,
        },
        { status: 201 }
      )
    } catch (error) {
      logger.error('Skill tree creation failed', error as Error, { goalId })

      return NextResponse.json(
        {
          error: 'Failed to generate skill tree',
          code: 'GENERATION_FAILED',
          message: (error as Error).message,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error('Failed to create skill tree', error as Error)
    return NextResponse.json(
      { error: 'Failed to create skill tree', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
