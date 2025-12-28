import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { getGoalByIdForUser } from '@/lib/db/operations/goals'
import {
  getSkillTreeByGoalId,
  markTreeRegenerated,
  updateSkillTreeStats,
} from '@/lib/db/operations/skill-trees'
import { getNodesByTreeId, createSkillNodes, buildNodeTree } from '@/lib/db/operations/skill-nodes'
import { generateSkillTree, flattenGeneratedNodes } from '@/lib/ai/skill-tree-generator'
import { getDb } from '@/lib/db/pg-client'
import { skillNodes, flashcards } from '@/lib/db/drizzle-schema'
import { eq } from 'drizzle-orm'
import * as logger from '@/lib/logger'

interface RouteContext {
  params: Promise<{ goalId: string }>
}

const regenerateSchema = z.object({
  feedback: z.string().optional(),
})

/**
 * POST /api/goals/[goalId]/skill-tree/regenerate
 *
 * Regenerate the skill tree using AI
 * Maps to contracts/skill-tree.md - Regenerate Skill Tree
 */
export async function POST(request: Request, context: RouteContext) {
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

    // Get existing tree
    const existingTree = await getSkillTreeByGoalId(goalId)
    if (!existingTree) {
      return NextResponse.json(
        { error: 'Skill tree not found', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json().catch(() => ({}))
    const validation = regenerateSchema.safeParse(body)
    const feedback = validation.success ? validation.data.feedback : undefined

    logger.info('Regenerating skill tree', {
      goalId,
      treeId: existingTree.id,
      hasFeedback: !!feedback,
    })

    // Build prompt with feedback if provided
    const prompt = feedback ? `${goal.title}. User feedback: ${feedback}` : goal.title

    try {
      // Generate new skill tree
      const generated = await generateSkillTree(prompt)

      const db = getDb()

      // Unlink flashcards from old nodes (set skillNodeId to null)
      const oldNodes = await getNodesByTreeId(existingTree.id)
      for (const node of oldNodes) {
        await db
          .update(flashcards)
          .set({ skillNodeId: null })
          .where(eq(flashcards.skillNodeId, node.id))
      }

      // Delete old nodes
      await db.delete(skillNodes).where(eq(skillNodes.treeId, existingTree.id))

      // Insert new nodes
      const flatNodes = flattenGeneratedNodes(generated.nodes)

      for (const node of flatNodes) {
        const createdNode = await createSkillNodes([
          {
            treeId: existingTree.id,
            parentId: null,
            title: node.title,
            description: node.description,
            depth: node.depth,
            path: node.path,
            sortOrder: node.sortOrder,
          },
        ])

        // Create children recursively
        if (node.children && node.children.length > 0) {
          const childFlat = flattenGeneratedNodes(node.children, createdNode[0].id, node.path)
          for (const child of childFlat) {
            const createdChild = await createSkillNodes([
              {
                treeId: existingTree.id,
                parentId: createdNode[0].id,
                title: child.title,
                description: child.description,
                depth: child.depth,
                path: child.path,
                sortOrder: child.sortOrder,
              },
            ])

            if (child.children && child.children.length > 0) {
              const subtopicFlat = flattenGeneratedNodes(
                child.children,
                createdChild[0].id,
                child.path
              )
              for (const subtopic of subtopicFlat) {
                await createSkillNodes([
                  {
                    treeId: existingTree.id,
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

      // Update tree stats and mark as regenerated
      await updateSkillTreeStats(existingTree.id)
      await markTreeRegenerated(existingTree.id)

      // Get updated tree
      const newNodes = await getNodesByTreeId(existingTree.id)
      const nodeTree = buildNodeTree(newNodes)

      logger.info('Skill tree regenerated', {
        goalId,
        treeId: existingTree.id,
        nodeCount: generated.metadata.nodeCount,
        generationTimeMs: generated.metadata.generationTimeMs,
      })

      return NextResponse.json({
        id: existingTree.id,
        nodeCount: newNodes.length,
        maxDepth: Math.max(...newNodes.map((n) => n.depth), 0),
        regeneratedAt: new Date().toISOString(),
        nodes: nodeTree,
      })
    } catch (error) {
      logger.error('Skill tree regeneration failed', error as Error, {
        goalId,
        treeId: existingTree.id,
      })

      return NextResponse.json(
        {
          error: 'Failed to regenerate skill tree',
          code: 'GENERATION_FAILED',
          message: (error as Error).message,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    logger.error('Failed to regenerate skill tree', error as Error)
    return NextResponse.json(
      { error: 'Failed to regenerate skill tree', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
