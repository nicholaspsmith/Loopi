import { getDb } from '../pg-client'
import { userTitles, learningGoals } from '../drizzle-schema'
import { eq } from 'drizzle-orm'
import * as logger from '@/lib/logger'
import { countMasteredCards } from './achievements'

/**
 * User Titles System
 *
 * Per contracts/achievements.md:
 * Title Ladder:
 * 1. Novice (default)
 * 2. Apprentice (25 cards mastered)
 * 3. Practitioner (100 cards mastered)
 * 4. Specialist (250 cards mastered)
 * 5. Expert (500 cards mastered)
 * 6. Master (1000 cards OR 5 goals completed)
 * 7. Grandmaster (2000 cards AND 10 goals completed)
 */

// ============================================================================
// Title Definitions
// ============================================================================

export interface TitleDefinition {
  title: string
  rank: number
  requirement: string
  cardThreshold?: number
  goalThreshold?: number
  requiresBoth?: boolean
}

export const TITLE_LADDER: TitleDefinition[] = [
  {
    title: 'Novice',
    rank: 1,
    requirement: 'Default title',
  },
  {
    title: 'Apprentice',
    rank: 2,
    requirement: '25 cards mastered',
    cardThreshold: 25,
  },
  {
    title: 'Practitioner',
    rank: 3,
    requirement: '100 cards mastered',
    cardThreshold: 100,
  },
  {
    title: 'Specialist',
    rank: 4,
    requirement: '250 cards mastered',
    cardThreshold: 250,
  },
  {
    title: 'Expert',
    rank: 5,
    requirement: '500 cards mastered',
    cardThreshold: 500,
  },
  {
    title: 'Master',
    rank: 6,
    requirement: '1000 cards mastered OR 5 goals completed',
    cardThreshold: 1000,
    goalThreshold: 5,
  },
  {
    title: 'Grandmaster',
    rank: 7,
    requirement: '2000 cards mastered AND 10 goals completed',
    cardThreshold: 2000,
    goalThreshold: 10,
    requiresBoth: true,
  },
]

// ============================================================================
// Types
// ============================================================================

export interface UserTitleInfo {
  currentTitle: string
  earnedAt: string
  totalCardsMastered: number
  totalGoalsCompleted: number
  titleHistory: { title: string; earnedAt: string }[]
}

export interface NextTitleInfo {
  title: string
  requirement: string
  progress: number // 0-100
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get or create user title record
 */
export async function getUserTitle(userId: string): Promise<UserTitleInfo> {
  const db = getDb()

  const existing = await db.select().from(userTitles).where(eq(userTitles.userId, userId)).limit(1)

  if (existing.length > 0) {
    const record = existing[0]
    return {
      currentTitle: record.currentTitle,
      earnedAt: record.updatedAt.toISOString(),
      totalCardsMastered: record.totalCardsMastered,
      totalGoalsCompleted: record.totalGoalsCompleted,
      titleHistory: (record.titleHistory as { title: string; earnedAt: string }[]) || [],
    }
  }

  // Create default record
  await db.insert(userTitles).values({
    userId,
    currentTitle: 'Novice',
    totalCardsMastered: 0,
    totalGoalsCompleted: 0,
    titleHistory: [],
  })

  return {
    currentTitle: 'Novice',
    earnedAt: new Date().toISOString(),
    totalCardsMastered: 0,
    totalGoalsCompleted: 0,
    titleHistory: [],
  }
}

/**
 * Calculate the next title and progress toward it
 */
export function getNextTitle(
  currentTitle: string,
  cardsMastered: number,
  goalsCompleted: number
): NextTitleInfo | null {
  const currentDef = TITLE_LADDER.find((t) => t.title === currentTitle)
  if (!currentDef) return null

  const nextDef = TITLE_LADDER.find((t) => t.rank === currentDef.rank + 1)
  if (!nextDef) return null // Already at max rank

  // Calculate progress toward next title
  let progress = 0

  if (nextDef.requiresBoth) {
    // Need both cards AND goals
    const cardProgress = nextDef.cardThreshold ? (cardsMastered / nextDef.cardThreshold) * 100 : 100
    const goalProgress = nextDef.goalThreshold
      ? (goalsCompleted / nextDef.goalThreshold) * 100
      : 100
    progress = Math.min(cardProgress, goalProgress)
  } else if (nextDef.cardThreshold && nextDef.goalThreshold) {
    // Need cards OR goals (take the higher progress)
    const cardProgress = (cardsMastered / nextDef.cardThreshold) * 100
    const goalProgress = (goalsCompleted / nextDef.goalThreshold) * 100
    progress = Math.max(cardProgress, goalProgress)
  } else if (nextDef.cardThreshold) {
    progress = (cardsMastered / nextDef.cardThreshold) * 100
  }

  return {
    title: nextDef.title,
    requirement: nextDef.requirement,
    progress: Math.min(100, Math.round(progress)),
  }
}

/**
 * Determine which title a user should have based on their stats
 */
function calculateEarnedTitle(cardsMastered: number, goalsCompleted: number): string {
  let earnedTitle = 'Novice'

  for (const def of TITLE_LADDER) {
    if (def.rank === 1) continue // Skip Novice

    let meetsRequirement = false

    if (def.requiresBoth) {
      // Must meet BOTH thresholds
      const meetsCards = def.cardThreshold ? cardsMastered >= def.cardThreshold : true
      const meetsGoals = def.goalThreshold ? goalsCompleted >= def.goalThreshold : true
      meetsRequirement = meetsCards && meetsGoals
    } else if (def.cardThreshold && def.goalThreshold) {
      // Must meet EITHER threshold
      meetsRequirement = cardsMastered >= def.cardThreshold || goalsCompleted >= def.goalThreshold
    } else if (def.cardThreshold) {
      meetsRequirement = cardsMastered >= def.cardThreshold
    }

    if (meetsRequirement) {
      earnedTitle = def.title
    }
  }

  return earnedTitle
}

/**
 * Check and update user title based on current stats
 * Returns title change info if title was upgraded
 */
export async function checkAndUpdateTitle(
  userId: string
): Promise<{ oldTitle: string; newTitle: string } | null> {
  const db = getDb()

  // Get current stats
  const masteredCards = await countMasteredCards(userId)

  // Count completed goals
  const goals = await db
    .select({ status: learningGoals.status })
    .from(learningGoals)
    .where(eq(learningGoals.userId, userId))

  const completedGoals = goals.filter((g) => g.status === 'completed').length

  // Get current title
  const currentInfo = await getUserTitle(userId)
  const currentTitle = currentInfo.currentTitle

  // Calculate what title they should have
  const earnedTitle = calculateEarnedTitle(masteredCards, completedGoals)

  // Check if title should change
  const currentDef = TITLE_LADDER.find((t) => t.title === currentTitle)
  const earnedDef = TITLE_LADDER.find((t) => t.title === earnedTitle)

  if (!currentDef || !earnedDef) return null
  if (earnedDef.rank <= currentDef.rank) return null // No upgrade

  // Update title
  const newHistory = [
    ...currentInfo.titleHistory,
    { title: earnedTitle, earnedAt: new Date().toISOString() },
  ]

  await db
    .update(userTitles)
    .set({
      currentTitle: earnedTitle,
      totalCardsMastered: masteredCards,
      totalGoalsCompleted: completedGoals,
      titleHistory: newHistory,
      updatedAt: new Date(),
    })
    .where(eq(userTitles.userId, userId))

  logger.info('User title upgraded', {
    userId,
    oldTitle: currentTitle,
    newTitle: earnedTitle,
    masteredCards,
    completedGoals,
  })

  return { oldTitle: currentTitle, newTitle: earnedTitle }
}

/**
 * Sync user title stats (called periodically or on demand)
 */
export async function syncUserTitleStats(userId: string): Promise<void> {
  const db = getDb()

  const masteredCards = await countMasteredCards(userId)

  const goals = await db
    .select({ status: learningGoals.status })
    .from(learningGoals)
    .where(eq(learningGoals.userId, userId))

  const completedGoals = goals.filter((g) => g.status === 'completed').length

  // Ensure record exists
  await getUserTitle(userId)

  // Update stats
  await db
    .update(userTitles)
    .set({
      totalCardsMastered: masteredCards,
      totalGoalsCompleted: completedGoals,
      updatedAt: new Date(),
    })
    .where(eq(userTitles.userId, userId))
}
