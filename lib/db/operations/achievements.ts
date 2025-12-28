import { getDb } from '../pg-client'
import { userAchievements, flashcards, learningGoals, reviewLogs } from '../drizzle-schema'
import { eq, and, gte, sql } from 'drizzle-orm'
import * as logger from '@/lib/logger'

/**
 * Achievement System Operations
 *
 * Per contracts/achievements.md:
 * - Achievements unlock based on milestones (not streaks)
 * - Non-punishing: retroactive, no daily requirements
 * - Categories: mastery, progress, performance, consistency
 */

// ============================================================================
// Achievement Definitions
// ============================================================================

export interface AchievementDefinition {
  key: string
  title: string
  description: string
  icon: string
  category: 'mastery' | 'progress' | 'performance' | 'consistency'
  requirement: string
  checkLogic: string
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // Mastery achievements
  {
    key: 'first_10_cards',
    title: 'First Steps',
    description: 'Master your first 10 cards',
    icon: '🌱',
    category: 'mastery',
    requirement: '10 cards mastered',
    checkLogic: 'totalCardsMastered >= 10',
  },
  {
    key: 'first_50_cards',
    title: 'Getting Started',
    description: 'Master 50 cards',
    icon: '📚',
    category: 'mastery',
    requirement: '50 cards mastered',
    checkLogic: 'totalCardsMastered >= 50',
  },
  {
    key: 'first_100_cards',
    title: 'Century',
    description: 'Master 100 cards',
    icon: '💯',
    category: 'mastery',
    requirement: '100 cards mastered',
    checkLogic: 'totalCardsMastered >= 100',
  },
  {
    key: 'first_500_cards',
    title: 'Memory Master',
    description: 'Master 500 cards',
    icon: '🧠',
    category: 'mastery',
    requirement: '500 cards mastered',
    checkLogic: 'totalCardsMastered >= 500',
  },
  // Progress achievements
  {
    key: 'goal_25_percent',
    title: 'Making Progress',
    description: 'Reach 25% mastery on a goal',
    icon: '📈',
    category: 'progress',
    requirement: 'Any goal at 25% mastery',
    checkLogic: 'goal.masteryPercentage >= 25',
  },
  {
    key: 'goal_50_percent',
    title: 'Halfway There',
    description: 'Reach 50% mastery on a goal',
    icon: '🎯',
    category: 'progress',
    requirement: 'Any goal at 50% mastery',
    checkLogic: 'goal.masteryPercentage >= 50',
  },
  {
    key: 'goal_75_percent',
    title: 'Almost There',
    description: 'Reach 75% mastery on a goal',
    icon: '🚀',
    category: 'progress',
    requirement: 'Any goal at 75% mastery',
    checkLogic: 'goal.masteryPercentage >= 75',
  },
  {
    key: 'goal_complete',
    title: 'Goal Achieved',
    description: 'Complete a learning goal',
    icon: '🏆',
    category: 'progress',
    requirement: 'Any goal at 100% mastery',
    checkLogic: 'goal.masteryPercentage >= 100',
  },
  {
    key: 'five_goals',
    title: 'Goal Setter',
    description: 'Complete 5 learning goals',
    icon: '⭐',
    category: 'progress',
    requirement: '5 completed goals',
    checkLogic: 'completedGoals >= 5',
  },
  // Performance achievements
  {
    key: 'perfect_session',
    title: 'Perfect Session',
    description: 'All Good or Easy in a session',
    icon: '✨',
    category: 'performance',
    requirement: 'Min 10 cards, all ratings >= 3',
    checkLogic: 'ratings.length >= 10 && ratings.every(r => r >= 3)',
  },
  {
    key: 'speed_demon',
    title: 'Speed Demon',
    description: 'Score 90%+ in timed challenge',
    icon: '⚡',
    category: 'performance',
    requirement: 'Timed mode score >= 90%',
    checkLogic: 'timedScore >= 90',
  },
  {
    key: 'accuracy_master',
    title: 'Accuracy Master',
    description: '95% retention over 100 reviews',
    icon: '🎖️',
    category: 'performance',
    requirement: 'Retention >= 95% after 100+ reviews',
    checkLogic: 'retentionRate >= 95 && totalReviews >= 100',
  },
  // Consistency achievements (non-streak based)
  {
    key: 'week_warrior',
    title: 'Week Warrior',
    description: 'Study 7 days in any week',
    icon: '📅',
    category: 'consistency',
    requirement: '7 study days in rolling 7-day window',
    checkLogic: 'studyDaysInWeek >= 7',
  },
  {
    key: 'month_master',
    title: 'Month Master',
    description: 'Study 20 days in a month',
    icon: '🗓️',
    category: 'consistency',
    requirement: '20 study days in any 30-day window',
    checkLogic: 'studyDaysInMonth >= 20',
  },
]

// ============================================================================
// Types
// ============================================================================

export interface UnlockedAchievement {
  key: string
  title: string
  description: string
  icon: string
  unlockedAt: string
  metadata?: Record<string, unknown>
}

export interface SessionContext {
  goalId?: string
  sessionId?: string
  ratings?: number[]
  timedScore?: number
}

export interface CheckAchievementsResult {
  newlyUnlocked: UnlockedAchievement[]
  titleChanged: { oldTitle: string; newTitle: string } | null
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get all achievements for a user
 */
export async function getUserAchievements(userId: string) {
  const db = getDb()

  const achievements = await db
    .select()
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId))
    .orderBy(userAchievements.unlockedAt)

  return achievements.map((a) => {
    const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.key === a.achievementKey)
    return {
      key: a.achievementKey,
      title: def?.title || a.achievementKey,
      description: def?.description || '',
      icon: def?.icon || '🏅',
      unlockedAt: a.unlockedAt.toISOString(),
      metadata: a.metadata as Record<string, unknown> | null,
    }
  })
}

/**
 * Check if user has a specific achievement
 */
export async function hasAchievement(userId: string, key: string): Promise<boolean> {
  const db = getDb()

  const existing = await db
    .select({ id: userAchievements.id })
    .from(userAchievements)
    .where(and(eq(userAchievements.userId, userId), eq(userAchievements.achievementKey, key)))
    .limit(1)

  return existing.length > 0
}

/**
 * Unlock an achievement for a user (idempotent)
 */
export async function unlockAchievement(
  userId: string,
  key: string,
  metadata?: Record<string, unknown>
): Promise<UnlockedAchievement | null> {
  // Check if already unlocked
  if (await hasAchievement(userId, key)) {
    return null
  }

  const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.key === key)
  if (!def) {
    logger.warn('Unknown achievement key', { userId, key })
    return null
  }

  const db = getDb()

  await db.insert(userAchievements).values({
    userId,
    achievementKey: key,
    metadata: metadata || null,
  })

  logger.info('Achievement unlocked', {
    userId,
    achievementKey: key,
    category: def.category,
    metadata,
  })

  return {
    key,
    title: def.title,
    description: def.description,
    icon: def.icon,
    unlockedAt: new Date().toISOString(),
    metadata,
  }
}

// ============================================================================
// Achievement Check Functions
// ============================================================================

/**
 * Count mastered cards for a user
 * A card is "mastered" when state=Review and stability > 21 days
 */
export async function countMasteredCards(userId: string): Promise<number> {
  const db = getDb()

  const cards = await db
    .select({ fsrsState: flashcards.fsrsState })
    .from(flashcards)
    .where(eq(flashcards.userId, userId))

  let masteredCount = 0
  for (const card of cards) {
    const fsrs = card.fsrsState as Record<string, unknown>
    const state = fsrs.state as number
    const stability = fsrs.stability as number

    // State 2 = Review, stability > 21 = mastered
    if (state === 2 && stability > 21) {
      masteredCount++
    }
  }

  return masteredCount
}

/**
 * Check card mastery achievements
 */
async function checkCardMasteryAchievements(userId: string): Promise<UnlockedAchievement[]> {
  const masteredCount = await countMasteredCards(userId)
  const unlocked: UnlockedAchievement[] = []

  const thresholds = [
    { key: 'first_10_cards', threshold: 10 },
    { key: 'first_50_cards', threshold: 50 },
    { key: 'first_100_cards', threshold: 100 },
    { key: 'first_500_cards', threshold: 500 },
  ]

  for (const { key, threshold } of thresholds) {
    if (masteredCount >= threshold) {
      const result = await unlockAchievement(userId, key, { masteredCount })
      if (result) unlocked.push(result)
    }
  }

  return unlocked
}

/**
 * Check goal progress achievements
 */
async function checkGoalProgressAchievements(
  userId: string,
  goalId?: string
): Promise<UnlockedAchievement[]> {
  const db = getDb()
  const unlocked: UnlockedAchievement[] = []

  // Get all goals for this user
  const goals = await db
    .select({
      id: learningGoals.id,
      masteryPercentage: learningGoals.masteryPercentage,
      status: learningGoals.status,
    })
    .from(learningGoals)
    .where(eq(learningGoals.userId, userId))

  // Check progress achievements for any goal
  const progressThresholds = [
    { key: 'goal_25_percent', threshold: 25 },
    { key: 'goal_50_percent', threshold: 50 },
    { key: 'goal_75_percent', threshold: 75 },
    { key: 'goal_complete', threshold: 100 },
  ]

  for (const { key, threshold } of progressThresholds) {
    const hasGoalAtThreshold = goals.some((g) => g.masteryPercentage >= threshold)
    if (hasGoalAtThreshold) {
      const triggeredGoalId = goalId || goals.find((g) => g.masteryPercentage >= threshold)?.id
      const result = await unlockAchievement(userId, key, { goalId: triggeredGoalId })
      if (result) unlocked.push(result)
    }
  }

  // Check completed goals count
  const completedGoals = goals.filter((g) => g.status === 'completed').length
  if (completedGoals >= 5) {
    const result = await unlockAchievement(userId, 'five_goals', { completedGoals })
    if (result) unlocked.push(result)
  }

  return unlocked
}

/**
 * Check perfect session achievement
 */
async function checkPerfectSession(
  userId: string,
  ratings: number[]
): Promise<UnlockedAchievement | null> {
  if (ratings.length < 10) return null

  const allGoodOrEasy = ratings.every((r) => r >= 3)
  if (allGoodOrEasy) {
    return await unlockAchievement(userId, 'perfect_session', {
      cardCount: ratings.length,
      ratings,
    })
  }

  return null
}

/**
 * Check speed demon achievement (timed mode 90%+)
 */
async function checkSpeedDemon(
  userId: string,
  timedScore: number | undefined
): Promise<UnlockedAchievement | null> {
  if (timedScore === undefined) return null

  if (timedScore >= 90) {
    return await unlockAchievement(userId, 'speed_demon', { timedScore })
  }

  return null
}

/**
 * Check accuracy master achievement (95% retention over 100+ reviews)
 */
async function checkAccuracyMaster(userId: string): Promise<UnlockedAchievement | null> {
  const db = getDb()

  // Get total reviews and successful reviews (rating >= 3)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const reviews = await db
    .select({ rating: reviewLogs.rating })
    .from(reviewLogs)
    .where(and(eq(reviewLogs.userId, userId), gte(reviewLogs.createdAt, thirtyDaysAgo)))

  if (reviews.length < 100) return null

  const successfulReviews = reviews.filter((r) => r.rating >= 3).length
  const retentionRate = Math.round((successfulReviews / reviews.length) * 100)

  if (retentionRate >= 95) {
    return await unlockAchievement(userId, 'accuracy_master', {
      retentionRate,
      totalReviews: reviews.length,
    })
  }

  return null
}

/**
 * Check consistency achievements (non-streak based)
 */
async function checkConsistencyAchievements(userId: string): Promise<UnlockedAchievement[]> {
  const db = getDb()
  const unlocked: UnlockedAchievement[] = []

  // Get distinct study days in last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const studyDaysResult = await db
    .select({
      studyDate: sql<string>`DATE(${reviewLogs.createdAt})`,
    })
    .from(reviewLogs)
    .where(and(eq(reviewLogs.userId, userId), gte(reviewLogs.createdAt, thirtyDaysAgo)))
    .groupBy(sql`DATE(${reviewLogs.createdAt})`)

  const studyDaysCount = studyDaysResult.length

  // Week warrior: 7 days in any 7-day window
  // For simplicity, check if they've studied 7+ days in the last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const recentDays = studyDaysResult.filter((d) => new Date(d.studyDate) >= sevenDaysAgo).length

  if (recentDays >= 7) {
    const result = await unlockAchievement(userId, 'week_warrior', { studyDays: recentDays })
    if (result) unlocked.push(result)
  }

  // Month master: 20 days in 30-day window
  if (studyDaysCount >= 20) {
    const result = await unlockAchievement(userId, 'month_master', { studyDays: studyDaysCount })
    if (result) unlocked.push(result)
  }

  return unlocked
}

// ============================================================================
// Main Check Function
// ============================================================================

/**
 * Check all applicable achievements after a study session
 */
export async function checkAchievements(
  userId: string,
  trigger: 'session_complete' | 'goal_progress' | 'daily_check',
  context: SessionContext
): Promise<CheckAchievementsResult> {
  const newlyUnlocked: UnlockedAchievement[] = []
  let titleChanged: { oldTitle: string; newTitle: string } | null = null

  try {
    if (trigger === 'session_complete') {
      // Check mastery achievements
      const masteryAchievements = await checkCardMasteryAchievements(userId)
      newlyUnlocked.push(...masteryAchievements)

      // Check perfect session
      if (context.ratings && context.ratings.length > 0) {
        const perfectSession = await checkPerfectSession(userId, context.ratings)
        if (perfectSession) newlyUnlocked.push(perfectSession)
      }

      // Check speed demon
      const speedDemon = await checkSpeedDemon(userId, context.timedScore)
      if (speedDemon) newlyUnlocked.push(speedDemon)

      // Check accuracy master
      const accuracyMaster = await checkAccuracyMaster(userId)
      if (accuracyMaster) newlyUnlocked.push(accuracyMaster)
    }

    if (trigger === 'goal_progress' || trigger === 'session_complete') {
      // Check goal progress achievements
      const goalAchievements = await checkGoalProgressAchievements(userId, context.goalId)
      newlyUnlocked.push(...goalAchievements)
    }

    if (trigger === 'daily_check') {
      // Check consistency achievements
      const consistencyAchievements = await checkConsistencyAchievements(userId)
      newlyUnlocked.push(...consistencyAchievements)
    }

    // Check for title upgrade if any achievements were unlocked
    if (newlyUnlocked.length > 0) {
      // Import dynamically to avoid circular dependency
      const { checkAndUpdateTitle } = await import('./user-titles')
      titleChanged = await checkAndUpdateTitle(userId)
    }
  } catch (error) {
    logger.error('Failed to check achievements', error as Error, {
      userId,
      trigger,
      context,
    })
  }

  return { newlyUnlocked, titleChanged }
}
