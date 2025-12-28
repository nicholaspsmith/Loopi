import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { getGoalByIdForUser } from '@/lib/db/operations/goals'
import { getSkillTreeByGoalId } from '@/lib/db/operations/skill-trees'
import { getSkillNodeById } from '@/lib/db/operations/skill-nodes'
import { generateCards, generateMixedCards } from '@/lib/ai/card-generator'
import * as logger from '@/lib/logger'

/**
 * POST /api/goals/[goalId]/generate
 *
 * Generate cards for a skill tree node using AI.
 * Cards are returned for preview/editing before committing to database.
 *
 * Per contracts/cards.md
 */

const GenerateRequestSchema = z.object({
  nodeId: z.string().uuid(),
  count: z.number().int().min(1).max(20).optional().default(10),
  cardType: z.enum(['flashcard', 'multiple_choice', 'mixed']).optional().default('flashcard'),
  feedback: z.string().optional(),
})

interface GeneratedCard {
  tempId: string
  question: string
  answer: string
  cardType: 'flashcard' | 'multiple_choice'
  distractors?: string[]
  context?: string // For scenario cards
  approved: boolean
  edited: boolean
}

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

    // Transform to preview format with tempIds
    const cards: GeneratedCard[] = result.cards.map((card, index) => {
      const base: GeneratedCard = {
        tempId: `temp-${Date.now()}-${index}`,
        question: card.question,
        answer: card.answer,
        cardType: card.cardType === 'scenario' ? 'flashcard' : card.cardType,
        approved: true, // Default to approved, user can uncheck
        edited: false,
      }

      // Add type-specific fields
      if (card.cardType === 'multiple_choice' && 'distractors' in card) {
        base.distractors = card.distractors
      }

      if (card.cardType === 'scenario' && 'context' in card) {
        // Prepend context to question for scenario cards
        base.question = `${card.context}\n\n${card.question}`
        base.context = card.context
      }

      return base
    })

    const generationTimeMs = Date.now() - startTime

    logger.info('Card generation completed', {
      goalId,
      nodeId,
      nodeTitle: node.title,
      cardCount: cards.length,
      generationTimeMs,
      model: result.metadata.model,
    })

    return NextResponse.json({
      cards,
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
