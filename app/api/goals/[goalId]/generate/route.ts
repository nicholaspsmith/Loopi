import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { getGoalByIdForUser } from '@/lib/db/operations/goals'
import { getSkillTreeByGoalId } from '@/lib/db/operations/skill-trees'
import { getSkillNodeById, incrementNodeCardCount } from '@/lib/db/operations/skill-nodes'
import { generateCards, generateMixedCards } from '@/lib/ai/card-generator'
import * as logger from '@/lib/logger'
import { createFlashcard } from '@/lib/db/operations/flashcards'

/**
 * POST /api/goals/[goalId]/generate
 *
 * Generate cards for a skill tree node using AI.
 * Cards are created directly as active (no draft/commit step).
 *
 * Per contracts/cards.md
 */

const GenerateRequestSchema = z.object({
  nodeId: z.string().uuid(),
  count: z.number().int().min(1).max(20).optional().default(10),
  cardType: z.enum(['flashcard', 'multiple_choice', 'mixed']).optional().default('flashcard'),
  feedback: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { goalId } = await params

    // Validate goal belongs to user
    const goal = await getGoalByIdForUser(goalId, session.user.id)
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const parseResult = GenerateRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { nodeId, count, cardType, feedback } = parseResult.data

    // Validate node exists and belongs to goal's skill tree
    const skillTree = await getSkillTreeByGoalId(goalId)
    if (!skillTree) {
      return NextResponse.json({ error: 'Goal has no skill tree' }, { status: 404 })
    }

    const node = await getSkillNodeById(nodeId)
    if (!node || node.treeId !== skillTree.id) {
      return NextResponse.json({ error: 'Node not found in this goal' }, { status: 404 })
    }

    const startTime = Date.now()

    logger.info('Card generation started', {
      goalId,
      nodeId,
      nodeTitle: node.title,
      count,
      cardType,
      hasFeedback: !!feedback,
    })

    // Generate cards based on type
    let result
    if (cardType === 'mixed') {
      // Split count between flashcard and MC
      const flashcardCount = Math.ceil(count / 2)
      const mcCount = count - flashcardCount

      result = await generateMixedCards({
        nodeTitle: node.title,
        nodeDescription: node.description ?? undefined,
        goalTitle: goal.title,
        count,
        flashcardCount,
        multipleChoiceCount: mcCount,
      })
    } else {
      result = await generateCards({
        nodeTitle: node.title,
        nodeDescription: node.description ?? undefined,
        goalTitle: goal.title,
        cardType: cardType === 'multiple_choice' ? 'multiple_choice' : 'flashcard',
        count,
      })
    }

    // Create cards directly as active (no draft step)
    const createdCardIds: string[] = []
    for (const card of result.cards) {
      let question = card.question

      // For scenario cards, prepend context to question
      if (card.cardType === 'scenario' && 'context' in card) {
        question = `${card.context}\n\n${card.question}`
      }

      const createdCard = await createFlashcard({
        userId: session.user!.id,
        skillNodeId: nodeId,
        question,
        answer: card.answer,
      })

      createdCardIds.push(createdCard.id)
    }

    // Update node card count
    await incrementNodeCardCount(nodeId, createdCardIds.length)

    const generationTimeMs = Date.now() - startTime

    logger.info('Card generation completed (created as active)', {
      goalId,
      nodeId,
      nodeTitle: node.title,
      cardCount: createdCardIds.length,
      generationTimeMs,
      model: result.metadata.model,
    })

    return NextResponse.json({
      success: true,
      created: createdCardIds.length,
      nodeId,
      nodeTitle: node.title,
      generatedAt: new Date().toISOString(),
      metadata: {
        generationTimeMs,
        model: result.metadata.model,
        retryCount: result.metadata.retryCount,
      },
    })
  } catch (error) {
    logger.error('Card generation failed', error as Error, {
      path: '/api/goals/[goalId]/generate',
    })

    return NextResponse.json({ error: 'Failed to generate cards' }, { status: 500 })
  }
}
