import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { getGoalByIdForUser } from '@/lib/db/operations/goals'
import { getSkillTreeByGoalId } from '@/lib/db/operations/skill-trees'
import { getSkillNodeById, updateSkillNode } from '@/lib/db/operations/skill-nodes'
import {
  createGoalFlashcards,
  countFlashcardsByNodeId,
  type CreateGoalFlashcardInput,
} from '@/lib/db/operations/flashcards'
import * as logger from '@/lib/logger'

/**
 * POST /api/goals/[goalId]/generate/commit
 *
 * Commit approved generated cards to the database.
 * Creates FSRS state, links to skill node, syncs to LanceDB.
 *
 * Per contracts/cards.md
 */

const CardSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  cardType: z.enum(['flashcard', 'multiple_choice']),
  distractors: z.array(z.string()).optional(),
  approved: z.boolean(),
})

const CommitRequestSchema = z.object({
  cards: z.array(CardSchema),
  nodeId: z.string().uuid(),
  deckId: z.string().uuid().optional(), // Not used in current implementation
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
    const parseResult = CommitRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { cards, nodeId } = parseResult.data

    // Validate node exists and belongs to goal's skill tree
    const skillTree = await getSkillTreeByGoalId(goalId)
    if (!skillTree) {
      return NextResponse.json({ error: 'Goal has no skill tree' }, { status: 404 })
    }

    const node = await getSkillNodeById(nodeId)
    if (!node || node.treeId !== skillTree.id) {
      return NextResponse.json({ error: 'Node not found in this goal' }, { status: 404 })
    }

    // Filter to approved cards only
    const approvedCards = cards.filter((card) => card.approved)

    if (approvedCards.length === 0) {
      return NextResponse.json({ error: 'No approved cards to commit' }, { status: 400 })
    }

    logger.info('Committing cards', {
      goalId,
      nodeId,
      nodeTitle: node.title,
      totalCards: cards.length,
      approvedCards: approvedCards.length,
    })

    // Create flashcards in batch
    const flashcardInputs: CreateGoalFlashcardInput[] = approvedCards.map((card) => ({
      userId: session.user.id,
      skillNodeId: nodeId,
      question: card.question,
      answer: card.answer,
      cardType: card.cardType,
      distractors: card.cardType === 'multiple_choice' ? card.distractors : undefined,
    }))

    const createdCards = await createGoalFlashcards(flashcardInputs)

    // Update node's card count
    const newCardCount = await countFlashcardsByNodeId(nodeId)
    await updateSkillNode(nodeId, { cardCount: newCardCount })

    logger.info('Cards committed successfully', {
      goalId,
      nodeId,
      nodeTitle: node.title,
      committedCount: createdCards.length,
      newCardCount,
    })

    return NextResponse.json(
      {
        committed: createdCards.length,
        skipped: cards.length - approvedCards.length,
        nodeId,
        cards: createdCards.map((card) => ({
          id: card.id,
          question: card.question,
          cardType: card.cardType,
        })),
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error('Card commit failed', error as Error, {
      path: '/api/goals/[goalId]/generate/commit',
    })

    return NextResponse.json({ error: 'Failed to commit cards' }, { status: 500 })
  }
}
