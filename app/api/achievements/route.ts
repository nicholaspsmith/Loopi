import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getUserAchievements, ACHIEVEMENT_DEFINITIONS } from '@/lib/db/operations/achievements'
import { getUserTitle, getNextTitle } from '@/lib/db/operations/user-titles'
import * as logger from '@/lib/logger'

/**
 * GET /api/achievements
 *
 * Get user achievements and title info.
 *
 * Per contracts/achievements.md
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get unlocked achievements
    const achievements = await getUserAchievements(userId)

    // Get title info
    const titleInfo = await getUserTitle(userId)
    const nextTitle = getNextTitle(
      titleInfo.currentTitle,
      titleInfo.totalCardsMastered,
      titleInfo.totalGoalsCompleted
    )

    // Find when current title was earned
    const currentTitleHistory = titleInfo.titleHistory.find(
      (h) => h.title === titleInfo.currentTitle
    )
    const currentTitleEarnedAt = currentTitleHistory?.earnedAt || titleInfo.earnedAt

    logger.info('Achievements retrieved', {
      userId,
      unlockedCount: achievements.length,
      currentTitle: titleInfo.currentTitle,
    })

    return NextResponse.json({
      achievements,
      totalUnlocked: achievements.length,
      totalAvailable: ACHIEVEMENT_DEFINITIONS.length,
      currentTitle: {
        title: titleInfo.currentTitle,
        earnedAt: currentTitleEarnedAt,
      },
      nextTitle,
    })
  } catch (error) {
    logger.error('Failed to get achievements', error as Error, {
      path: '/api/achievements',
    })

    return NextResponse.json({ error: 'Failed to get achievements' }, { status: 500 })
  }
}
