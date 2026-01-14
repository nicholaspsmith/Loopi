import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { getGoalByIdForUser } from '@/lib/db/operations/goals'
import { getSkillTreeByGoalId } from '@/lib/db/operations/skill-trees'
import { getNodesByTreeId, getSkillNodeById } from '@/lib/db/operations/skill-nodes'
import { getDb } from '@/lib/db/pg-client'
import { flashcards, skillNodes } from '@/lib/db/drizzle-schema'
import { eq, and, like, isNotNull } from 'drizzle-orm'
import * as logger from '@/lib/logger'
import { getDistractorsForFlashcard } from '@/lib/db/operations/distractors'
import { createJob } from '@/lib/db/operations/background-jobs'
import { JobType } from '@/lib/db/drizzle-schema'
import { getNextIncompleteNode, getNodeProgress } from '@/lib/study/guided-flow'
import { createStudySession, abandonConflictingSessions } from '@/lib/db/operations/study-sessions'

/**
 * POST /api/study/session
 *
 * Start a study session for a goal.
 * Returns cards due for review based on FSRS.
 *
 * Per contracts/study.md
 */

const SessionRequestSchema = z.object({
  goalId: z.string().uuid(),
  mode: z.enum(['flashcard', 'multiple_choice', 'timed', 'mixed', 'node', 'all']),
  // Guided mode flag - when true, automatically selects next incomplete node
  isGuided: z.boolean().optional().default(false),
  nodeId: z.string().uuid().optional(),
  includeChildren: z.boolean().optional().default(true),
  cardLimit: z.number().int().min(1).max(50).optional().default(20),
})

interface StudyCard {
  id: string
  question: string
  answer: string
  cardType: 'flashcard' | 'multiple_choice'
  distractors?: string[]
  distractorsJobId?: string // Job ID when distractors are being generated in background
  nodeId: string
  nodeTitle: string
  fsrsState: {
    state: string
    due: string
    stability: number
    difficulty: number
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const parseResult = SessionRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const {
      goalId,
      mode,
      isGuided,
      nodeId: requestedNodeId,
      includeChildren,
      cardLimit,
    } = parseResult.data

    logger.info('Starting study session', {
      goalId,
      mode,
      isGuided,
      nodeId: requestedNodeId,
      cardLimit,
    })

    // Validate goal belongs to user
    const goal = await getGoalByIdForUser(goalId, session.user.id)
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Get skill tree
    const skillTree = await getSkillTreeByGoalId(goalId)
    if (!skillTree) {
      return NextResponse.json({ error: 'Goal has no skill tree' }, { status: 404 })
    }

    const db = getDb()
    const now = new Date()

    // For guided mode, auto-determine the next node
    let nodeId = requestedNodeId
    let currentNode: { id: string; title: string; path: string } | null = null
    let nodeProgress: { completedInNode: number; totalInNode: number } | null = null

    if (isGuided) {
      const nextNode = await getNextIncompleteNode(skillTree.id)
      if (!nextNode) {
        // All nodes complete or no cards yet
        const { summary } = await getNodeProgress(skillTree.id)
        const isComplete = summary.completedNodes === summary.totalNodes && summary.totalNodes > 0
        return NextResponse.json({
          sessionId: null,
          mode,
          isGuided: true,
          isTreeComplete: isComplete,
          currentNode: null,
          cards: [],
          totalCards: 0,
          message: isComplete
            ? "Congratulations! You've completed all nodes in this skill tree."
            : 'Cards are still being generated. Please wait a moment.',
        })
      }
      nodeId = nextNode.id
      currentNode = { id: nextNode.id, title: nextNode.title, path: nextNode.path }
      nodeProgress = { completedInNode: nextNode.completedCards, totalInNode: nextNode.totalCards }
      logger.info('Guided mode: selected next node', { nodeId, path: nextNode.path })
    }

    // Get all nodes in tree to filter cards
    const treeNodes = await getNodesByTreeId(skillTree.id)
    const treeNodeIds = treeNodes.map((n) => n.id)

    // If filtering by specific node, get its path for subtree filtering
    let filterPath: string | null = null
    if (nodeId) {
      const node = await getSkillNodeById(nodeId)
      if (!node || node.treeId !== skillTree.id) {
        return NextResponse.json({ error: 'Node not found in this goal' }, { status: 404 })
      }
      filterPath = includeChildren ? node.path : null
      // For guided/node mode without children, filter to exact node only
      if ((isGuided || mode === 'node') && !includeChildren) {
        filterPath = null // We'll filter by exact nodeId below
      }
    }

    // Get cards for this goal's skill tree
    // Filter to nodes in tree and optionally by subtree path
    const allCards = await db
      .select({
        id: flashcards.id,
        question: flashcards.question,
        answer: flashcards.answer,
        cardType: flashcards.cardType,
        cardMetadata: flashcards.cardMetadata,
        fsrsState: flashcards.fsrsState,
        skillNodeId: flashcards.skillNodeId,
        nodePath: skillNodes.path,
        nodeTitle: skillNodes.title,
      })
      .from(flashcards)
      .innerJoin(skillNodes, eq(flashcards.skillNodeId, skillNodes.id))
      .where(
        and(
          eq(flashcards.userId, session.user.id),
          eq(flashcards.status, 'active'),
          isNotNull(flashcards.skillNodeId),
          filterPath ? like(skillNodes.path, `${filterPath}%`) : undefined
        )
      )

    // Filter to cards in this tree's nodes
    const treeCards = allCards.filter((card) => treeNodeIds.includes(card.skillNodeId!))

    // Filter by due date and sort
    const dueCards = treeCards
      .filter((card) => {
        const fsrs = card.fsrsState as Record<string, unknown>
        const dueDate = new Date(fsrs.due as number)
        return dueDate <= now
      })
      .sort((a, b) => {
        const aDue = new Date((a.fsrsState as Record<string, unknown>).due as number).getTime()
        const bDue = new Date((b.fsrsState as Record<string, unknown>).due as number).getTime()
        return aDue - bDue
      })
      .slice(0, cardLimit)

    if (dueCards.length === 0) {
      // No due cards, return some recent cards for practice
      const practiceCards = treeCards
        .sort((a, b) => {
          const aDue = new Date((a.fsrsState as Record<string, unknown>).due as number).getTime()
          const bDue = new Date((b.fsrsState as Record<string, unknown>).due as number).getTime()
          return aDue - bDue
        })
        .slice(0, cardLimit)

      if (practiceCards.length === 0) {
        return NextResponse.json(
          { error: 'No cards available for study. Generate some cards first.' },
          { status: 400 }
        )
      }

      // Use practice cards
      dueCards.push(...practiceCards)
    }

    // Format cards for study
    // For mixed mode, randomly assign ~50% as multiple choice
    // For MC/mixed/timed modes, generate distractors if not present
    const needsDistractors = mode === 'multiple_choice' || mode === 'mixed' || mode === 'timed'

    const studyCards: StudyCard[] = await Promise.all(
      dueCards.map(async (card) => {
        const fsrs = card.fsrsState as Record<string, unknown>
        const metadata = card.cardMetadata as { distractors?: string[] } | null

        // For mixed mode, randomly decide if card should be MC (50% chance)
        let effectiveCardType: 'flashcard' | 'multiple_choice' = card.cardType as
          | 'flashcard'
          | 'multiple_choice'
        if (mode === 'mixed') {
          effectiveCardType = Math.random() < 0.5 ? 'multiple_choice' : 'flashcard'
        } else if (mode === 'multiple_choice') {
          effectiveCardType = 'multiple_choice'
        }

        const studyCard: StudyCard = {
          id: card.id,
          question: card.question,
          answer: card.answer,
          cardType: effectiveCardType,
          nodeId: card.skillNodeId!,
          nodeTitle: card.nodeTitle,
          fsrsState: {
            state: ['New', 'Learning', 'Review', 'Relearning'][fsrs.state as number] || 'New',
            due: new Date(fsrs.due as number).toISOString(),
            stability: (fsrs.stability as number) || 0,
            difficulty: (fsrs.difficulty as number) || 0,
          },
        }

        // For MC cards, ensure we have distractors
        if (needsDistractors && effectiveCardType === 'multiple_choice') {
          // T10: First try to load distractors from database
          const dbDistractors = await getDistractorsForFlashcard(card.id)

          if (dbDistractors.length >= 3) {
            // Use database distractors
            studyCard.distractors = shuffleArray(dbDistractors.map((d) => d.content))
            logger.debug('Using database distractors', {
              cardId: card.id,
              count: dbDistractors.length,
            })
          } else if (metadata?.distractors && metadata.distractors.length >= 3) {
            // Fallback to metadata distractors
            studyCard.distractors = shuffleArray([...metadata.distractors])
            logger.debug('Using metadata distractors', {
              cardId: card.id,
              count: metadata.distractors.length,
            })
          } else {
            // Create background job for distractor generation (US2)
            logger.info('Creating background job for distractor generation', {
              cardId: card.id,
              hasDbDistractors: dbDistractors.length > 0,
              hasMetadata: !!metadata,
              existingDistractors: metadata?.distractors?.length || 0,
            })
            try {
              const job = await createJob({
                type: JobType.DISTRACTOR_GENERATION,
                payload: {
                  flashcardId: card.id,
                  question: card.question,
                  answer: card.answer,
                },
                userId: session.user.id,
                priority: 0, // Lower priority than flashcard generation
              })
              studyCard.distractorsJobId = job.id
              logger.info('Created distractor generation job', {
                cardId: card.id,
                jobId: job.id,
              })
            } catch (error) {
              // Fallback to flashcard if job creation fails
              studyCard.cardType = 'flashcard'
              logger.warn('Failed to create distractor job, falling back to flashcard', {
                cardId: card.id,
                error: error instanceof Error ? error.message : 'Unknown error',
              })
            }
          }
        }

        return studyCard
      })
    )

    // Shuffle cards for variety
    const shuffledCards = shuffleArray(studyCards)

    // Persist session to database for resume functionality
    // First abandon any conflicting sessions for this goal (handles multiple tabs)
    const abandonedCount = await abandonConflictingSessions(session.user.id, goalId)
    if (abandonedCount > 0) {
      logger.info('Abandoned conflicting sessions', { goalId, count: abandonedCount })
    }

    // Create the persistent session record
    const persistedSession = await createStudySession({
      userId: session.user.id,
      goalId,
      mode,
      status: 'active',
      cardIds: shuffledCards.map((c) => c.id),
      currentIndex: 0,
      responses: [],
      startedAt: now,
      lastActivityAt: now,
      // Timed mode settings
      ...(mode === 'timed' && {
        timedSettings: {
          durationSeconds: 300,
          pointsPerCard: 10,
        },
        timeRemainingMs: 300 * 1000,
        score: 0,
      }),
      // Guided mode settings
      isGuided: isGuided,
      currentNodeId: isGuided && currentNode ? currentNode.id : undefined,
    })

    const sessionId = persistedSession.id

    logger.info('Study session started', {
      sessionId,
      goalId,
      mode,
      nodeId: nodeId || null,
      cardCount: shuffledCards.length,
    })

    const response: Record<string, unknown> = {
      sessionId,
      mode,
      isGuided,
      cards: shuffledCards,
      totalCards: shuffledCards.length,
    }

    // Add guided mode info
    if (isGuided && currentNode) {
      response.currentNode = currentNode
      response.nodeProgress = nodeProgress
    }

    // Add timed mode settings
    if (mode === 'timed') {
      response.timedSettings = {
        durationSeconds: 300, // 5 minutes
        pointsPerCard: 10,
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Failed to start study session', error as Error, {
      path: '/api/study/session',
    })

    return NextResponse.json({ error: 'Failed to start study session' }, { status: 500 })
  }
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
