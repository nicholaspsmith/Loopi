import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { getGoalByIdForUser, incrementGoalTime, updateGoalMastery } from '@/lib/db/operations/goals'
import { getSkillTreeByGoalId } from '@/lib/db/operations/skill-trees'
import { recalculateTreeMastery } from '@/lib/db/operations/skill-nodes'
import { checkAchievements } from '@/lib/db/operations/achievements'
import { getDb } from '@/lib/db/pg-client'
import { flashcards, skillNodes } from '@/lib/db/drizzle-schema'
import { eq, inArray } from 'drizzle-orm'
import * as logger from '@/lib/logger'
import { completeSession } from '@/lib/db/operations/study-sessions'

/**
 * POST /api/study/session/complete
 *
 * Complete a study session and calculate summary.
 * Updates goal time, recalculates mastery.
 *
 * Per contracts/study.md
 */

const CompleteRequestSchema = z.object({
  sessionId: z.string(),
  goalId: z.string().uuid(),
  mode: z.string(),
  durationSeconds: z.number().int().min(0),
  ratings: z.array(
    z.object({
      cardId: z.string().uuid(),
      rating: z.number().int().min(1).max(4),
    })
  ),
  timedScore: z
    .object({
      correct: z.number().int().min(0),
      total: z.number().int().min(0),
      bonusPoints: z.number().int().min(0),
    })
    .optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const parseResult = CompleteRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { sessionId, goalId, mode, durationSeconds, ratings, timedScore } = parseResult.data

    // Validate goal belongs to user
    const goal = await getGoalByIdForUser(goalId, session.user.id)
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    const db = getDb()

    // Update goal time
    await incrementGoalTime(goalId, durationSeconds)

    // Get unique node IDs from the rated cards
    const cardIds = ratings.map((r) => r.cardId)
    const cards = await db
      .select({
        id: flashcards.id,
        skillNodeId: flashcards.skillNodeId,
      })
      .from(flashcards)
      .where(inArray(flashcards.id, cardIds))

    const affectedNodeIds = [
      ...new Set(cards.map((c) => c.skillNodeId).filter(Boolean)),
    ] as string[]

    // Recalculate mastery for affected nodes
    const skillTree = await getSkillTreeByGoalId(goalId)
    const masteryUpdates: { nodeId: string; oldMastery: number; newMastery: number }[] = []

    if (skillTree && affectedNodeIds.length > 0) {
      // Get old mastery values
      const oldNodes = await db
        .select({
          id: skillNodes.id,
          masteryPercentage: skillNodes.masteryPercentage,
        })
        .from(skillNodes)
        .where(inArray(skillNodes.id, affectedNodeIds))

      const oldMasteryMap = new Map(oldNodes.map((n) => [n.id, n.masteryPercentage]))

      // Recalculate tree mastery (this updates all nodes)
      await recalculateTreeMastery(skillTree.id)

      // Get new mastery values
      const newNodes = await db
        .select({
          id: skillNodes.id,
          masteryPercentage: skillNodes.masteryPercentage,
        })
        .from(skillNodes)
        .where(inArray(skillNodes.id, affectedNodeIds))

      for (const node of newNodes) {
        const oldMastery = oldMasteryMap.get(node.id) || 0
        if (node.masteryPercentage !== oldMastery) {
          masteryUpdates.push({
            nodeId: node.id,
            oldMastery,
            newMastery: node.masteryPercentage,
          })
        }
      }

      // Update goal overall mastery
      const allNodes = await db
        .select({ masteryPercentage: skillNodes.masteryPercentage })
        .from(skillNodes)
        .where(eq(skillNodes.treeId, skillTree.id))

      if (allNodes.length > 0) {
        const avgMastery =
          allNodes.reduce((sum, n) => sum + n.masteryPercentage, 0) / allNodes.length
        await updateGoalMastery(goalId, Math.round(avgMastery))
      }
    }

    // Calculate summary statistics
    const cardsStudied = ratings.length
    const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0)
    const averageRating = cardsStudied > 0 ? totalRating / cardsStudied : 0

    // Calculate retention rate (ratings 3 and 4 are "retained")
    const retainedCount = ratings.filter((r) => r.rating >= 3).length
    const retentionRate = cardsStudied > 0 ? (retainedCount / cardsStudied) * 100 : 0

    // Get updated goal for mastery comparison
    const updatedGoal = await getGoalByIdForUser(goalId, session.user.id)
    const goalProgress = {
      oldMastery: goal.masteryPercentage,
      newMastery: updatedGoal?.masteryPercentage || goal.masteryPercentage,
    }

    // Check for achievements after session completion
    const ratingValues = ratings.map((r) => r.rating)
    const timedScorePercent = timedScore
      ? timedScore.total > 0
        ? Math.round((timedScore.correct / timedScore.total) * 100)
        : 0
      : undefined

    const achievementResult = await checkAchievements(session.user.id, 'session_complete', {
      goalId,
      sessionId,
      ratings: ratingValues,
      timedScore: timedScorePercent,
    })

    // Mark the persistent session as completed
    await completeSession(sessionId)

    logger.info('Study session completed', {
      sessionId,
      goalId,
      mode,
      durationSeconds,
      cardsStudied,
      averageRating: averageRating.toFixed(2),
      retentionRate: retentionRate.toFixed(1),
      timedScore,
      achievementsUnlocked: achievementResult.newlyUnlocked.length,
      titleChanged: achievementResult.titleChanged ? true : false,
    })

    return NextResponse.json({
      summary: {
        cardsStudied,
        averageRating: Math.round(averageRating * 100) / 100,
        timeSpent: durationSeconds,
        retentionRate: Math.round(retentionRate),
      },
      masteryUpdate: masteryUpdates,
      achievements: achievementResult.newlyUnlocked,
      titleChanged: achievementResult.titleChanged,
      goalProgress,
    })
  } catch (error) {
    logger.error('Failed to complete study session', error as Error, {
      path: '/api/study/session/complete',
    })

    return NextResponse.json({ error: 'Failed to complete study session' }, { status: 500 })
  }
}
