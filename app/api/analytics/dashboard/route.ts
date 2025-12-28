import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getDb } from '@/lib/db/pg-client'
import { learningGoals, flashcards, reviewLogs, userTitles } from '@/lib/db/drizzle-schema'
import { eq, and, gte, lte, sql } from 'drizzle-orm'
import * as logger from '@/lib/logger'

/**
 * GET /api/analytics/dashboard
 *
 * Get dashboard statistics for the current user.
 *
 * Per contracts/analytics.md
 */

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getDb()
    const userId = session.user.id
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get goals stats
    const goals = await db
      .select({
        id: learningGoals.id,
        status: learningGoals.status,
        masteryPercentage: learningGoals.masteryPercentage,
        totalTimeSeconds: learningGoals.totalTimeSeconds,
      })
      .from(learningGoals)
      .where(eq(learningGoals.userId, userId))

    const activeGoals = goals.filter((g) => g.status === 'active').length
    const completedGoals = goals.filter((g) => g.status === 'completed').length
    const totalTimeHours = goals.reduce((sum, g) => sum + g.totalTimeSeconds, 0) / 3600

    // Get flashcard stats
    const cards = await db
      .select({
        id: flashcards.id,
        fsrsState: flashcards.fsrsState,
      })
      .from(flashcards)
      .where(eq(flashcards.userId, userId))

    const totalCards = cards.length

    // Count due cards
    let cardsDueToday = 0
    let cardsDueThisWeek = 0

    for (const card of cards) {
      const fsrs = card.fsrsState as Record<string, unknown>
      const dueDate = new Date(fsrs.due as number)

      if (dueDate <= today) {
        cardsDueToday++
        cardsDueThisWeek++
      } else if (dueDate <= weekFromNow) {
        cardsDueThisWeek++
      }
    }

    // Calculate overall retention from recent reviews
    const recentReviews = await db
      .select({
        rating: reviewLogs.rating,
      })
      .from(reviewLogs)
      .where(and(eq(reviewLogs.userId, userId), gte(reviewLogs.createdAt, weekAgo)))

    const totalReviews = recentReviews.length
    const correctReviews = recentReviews.filter((r) => r.rating >= 3).length
    const overallRetention =
      totalReviews > 0 ? Math.round((correctReviews / totalReviews) * 100) : 0

    // Get current title
    const userTitle = await db
      .select({
        currentTitle: userTitles.currentTitle,
        totalCardsMastered: userTitles.totalCardsMastered,
      })
      .from(userTitles)
      .where(eq(userTitles.userId, userId))
      .limit(1)

    const currentTitle = {
      title: userTitle[0]?.currentTitle || 'Novice',
      nextTitle: 'Apprentice', // Simplified for now
      progressToNext: Math.min(100, Math.round(totalCards / 10)), // Progress based on card count
    }

    // Get recent activity (last 7 days)
    const recentActivity: { date: string; cardsStudied: number; minutesSpent: number }[] = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000)

      const dayReviews = await db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(reviewLogs)
        .where(
          and(
            eq(reviewLogs.userId, userId),
            gte(reviewLogs.createdAt, date),
            lte(reviewLogs.createdAt, nextDate)
          )
        )

      recentActivity.push({
        date: date.toISOString().split('T')[0],
        cardsStudied: Number(dayReviews[0]?.count || 0),
        minutesSpent: Math.round(Number(dayReviews[0]?.count || 0) * 0.5), // Estimate 30s per card
      })
    }

    // Get upcoming reviews (next 7 days)
    const upcomingReviews: { date: string; cardCount: number }[] = []

    for (let i = 0; i < 7; i++) {
      const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000)
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000)

      let count = 0
      for (const card of cards) {
        const fsrs = card.fsrsState as Record<string, unknown>
        const dueDate = new Date(fsrs.due as number)

        if (dueDate >= date && dueDate < nextDate) {
          count++
        }
      }

      upcomingReviews.push({
        date: date.toISOString().split('T')[0],
        cardCount: count,
      })
    }

    logger.info('Dashboard stats retrieved', {
      userId,
      activeGoals,
      totalCards,
      cardsDueToday,
    })

    return NextResponse.json({
      overview: {
        activeGoals,
        completedGoals,
        totalCards,
        cardsDueToday,
        cardsDueThisWeek,
        overallRetention,
        totalTimeHours: Math.round(totalTimeHours * 10) / 10,
      },
      currentTitle,
      recentActivity,
      upcomingReviews,
    })
  } catch (error) {
    logger.error('Failed to get dashboard stats', error as Error, {
      path: '/api/analytics/dashboard',
    })

    return NextResponse.json({ error: 'Failed to get dashboard stats' }, { status: 500 })
  }
}
