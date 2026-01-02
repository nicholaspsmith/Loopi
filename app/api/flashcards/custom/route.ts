import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { createGoalFlashcard } from '@/lib/db/operations/flashcards'
import { getNodeWithGoal, incrementNodeCardCount } from '@/lib/db/operations/skill-nodes'
import * as logger from '@/lib/logger'

/**
 * Custom Card Creation Schema
 * Based on specs/021-custom-cards-archive/contracts/custom-cards.md
 */
const customCardSchema = z.object({
  nodeId: z.string().uuid('Invalid node ID'),
  question: z
    .string()
    .min(5, 'Question must be at least 5 characters')
    .max(1000, 'Question must be at most 1000 characters'),
  answer: z
    .string()
    .min(5, 'Answer must be at least 5 characters')
    .max(5000, 'Answer must be at most 5000 characters'),
})

/**
 * POST /api/flashcards/custom
 *
 * Create a custom flashcard within a skill tree node.
 * Maps to contracts/custom-cards.md
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
    const validation = customCardSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { nodeId, question, answer } = validation.data

    // Verify node exists and user owns the goal
    const nodeData = await getNodeWithGoal(nodeId)
    if (!nodeData) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 })
    }

    if (nodeData.goal.userId !== userId) {
      return NextResponse.json(
        { error: 'You do not have permission to add cards to this node' },
        { status: 403 }
      )
    }

    // Create the custom flashcard
    const card = await createGoalFlashcard({
      userId,
      skillNodeId: nodeId,
      question,
      answer,
      cardType: 'flashcard',
    })

    // Update node card count
    await incrementNodeCardCount(nodeId, 1)

    logger.info('Custom flashcard created', {
      cardId: card.id,
      nodeId,
      userId,
    })

    // Transform fsrsState to expected camelCase format
    const fsrsState = card.fsrsState as unknown as Record<string, unknown> | null
    const transformedFsrsState = fsrsState
      ? {
          state: fsrsState.state,
          due: fsrsState.due,
          stability: fsrsState.stability,
          difficulty: fsrsState.difficulty,
          elapsedDays: fsrsState.elapsed_days ?? 0,
          scheduledDays: fsrsState.scheduled_days ?? 0,
          reps: fsrsState.reps,
          lapses: fsrsState.lapses,
        }
      : null

    return NextResponse.json(
      {
        id: card.id,
        userId: card.userId,
        question: card.question,
        answer: card.answer,
        skillNodeId: card.skillNodeId,
        cardType: card.cardType,
        fsrsState: transformedFsrsState,
        createdAt: new Date(card.createdAt).toISOString(),
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Failed to create custom flashcard', error as Error)
    return NextResponse.json(
      { error: 'Failed to create flashcard', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
