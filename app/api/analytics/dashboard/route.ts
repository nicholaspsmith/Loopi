import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getDb } from '@/lib/db/pg-client'
import { learningGoals, flashcards, reviewLogs, userTitles, users } from '@/lib/db/drizzle-schema'
import { eq, and, gte, lte, sql } from 'drizzle-orm'
import * as logger from '@/lib/logger'

/**
 * GET /api/analytics/dashboard
 *
 * Get dashboard statistics for the current user.
 *
 * Per contracts/analytics.md
 */

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getDb()
    const userId = session.user.id
    const now = new Date()

    // Get month/year from query params, default to current month
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!) : now.getMonth()
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : now.getFullYear()

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Calculate first and last day of the requested month (needed for parallel queries)
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)

    // Convert dates to ISO strings for PostgreSQL compatibility
    const todayISO = today.toISOString()
    const weekFromNowISO = weekFromNow.toISOString()
    const firstDayOfMonthISO = firstDayOfMonth.toISOString()
    const lastDayOfMonthISO = lastDayOfMonth.toISOString()

    // OPTIMIZATION: Parallelize all initial queries with Promise.all
    const [
      goals,
      totalCardsResult,
      cardsDueTodayResult,
      cardsDueWeekResult,
      recentReviews,
      userTitle,
      user,
      dailyActivity,
      upcomingReviewsData,
    ] = await Promise.all([
      // Get goals stats
      db
        .select({
          id: learningGoals.id,
          status: learningGoals.status,
          masteryPercentage: learningGoals.masteryPercentage,
          totalTimeSeconds: learningGoals.totalTimeSeconds,
        })
        .from(learningGoals)
        .where(eq(learningGoals.userId, userId)),

      // Get total flashcards count
      db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(flashcards)
        .where(eq(flashcards.userId, userId)),

      // Get cards due today (due is stored as epoch milliseconds)
      db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(flashcards)
        .where(
          and(
            eq(flashcards.userId, userId),
            lte(
              sql`to_timestamp((${flashcards.fsrsState}->>'due')::bigint / 1000)`,
              sql`${todayISO}::timestamp`
            )
          )
        ),

      // Get cards due this week
      db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(flashcards)
        .where(
          and(
            eq(flashcards.userId, userId),
            lte(
              sql`to_timestamp((${flashcards.fsrsState}->>'due')::bigint / 1000)`,
              sql`${weekFromNowISO}::timestamp`
            )
          )
        ),

      // Calculate overall retention from recent reviews
      db
        .select({
          rating: reviewLogs.rating,
        })
        .from(reviewLogs)
        .where(and(eq(reviewLogs.userId, userId), gte(reviewLogs.createdAt, weekAgo))),

      // Get current title
      db
        .select({
          currentTitle: userTitles.currentTitle,
          totalCardsMastered: userTitles.totalCardsMastered,
        })
        .from(userTitles)
        .where(eq(userTitles.userId, userId))
        .limit(1),

      // Get user's join date
      db
        .select({
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1),

      // OPTIMIZATION: Single aggregated query for daily activity
      db
        .select({
          date: sql<string>`DATE(${reviewLogs.createdAt})`,
          cardsStudied: sql<number>`count(*)`,
        })
        .from(reviewLogs)
        .where(
          and(
            eq(reviewLogs.userId, userId),
            gte(reviewLogs.createdAt, sql`${firstDayOfMonthISO}::timestamp`),
            lte(reviewLogs.createdAt, sql`${lastDayOfMonthISO}::timestamp`)
          )
        )
        .groupBy(sql`DATE(${reviewLogs.createdAt})`),

      // OPTIMIZATION: Single aggregated query for upcoming reviews (due is epoch ms)
      db
        .select({
          dueDate: sql<string>`DATE(to_timestamp((${flashcards.fsrsState}->>'due')::bigint / 1000))`,
          cardCount: sql<number>`count(*)`,
        })
        .from(flashcards)
        .where(
          and(
            eq(flashcards.userId, userId),
            gte(
              sql`to_timestamp((${flashcards.fsrsState}->>'due')::bigint / 1000)`,
              sql`${todayISO}::timestamp`
            ),
            lte(
              sql`to_timestamp((${flashcards.fsrsState}->>'due')::bigint / 1000)`,
              sql`${lastDayOfMonthISO}::timestamp`
            )
          )
        )
        .groupBy(sql`DATE(to_timestamp((${flashcards.fsrsState}->>'due')::bigint / 1000))`),
    ])

    const activeGoals = goals.filter((g) => g.status === 'active').length
    const completedGoals = goals.filter((g) => g.status === 'completed').length
    const totalTimeHours = goals.reduce((sum, g) => sum + g.totalTimeSeconds, 0) / 3600

    const totalCards = Number(totalCardsResult[0]?.count || 0)
    const cardsDueToday = Number(cardsDueTodayResult[0]?.count || 0)
    const cardsDueThisWeek = Number(cardsDueWeekResult[0]?.count || 0)

    const totalReviews = recentReviews.length
    const correctReviews = recentReviews.filter((r) => r.rating >= 3).length
    const overallRetention =
      totalReviews > 0 ? Math.round((correctReviews / totalReviews) * 100) : 0

    const currentTitle = {
      title: userTitle[0]?.currentTitle || 'Novice',
      nextTitle: 'Apprentice', // Simplified for now
      progressToNext: Math.min(100, Math.round(totalCards / 10)), // Progress based on card count
    }

    const userJoinDate = user[0]?.createdAt || now

    // OPTIMIZATION: Build recent activity from aggregated data
    const daysInMonth = lastDayOfMonth.getDate()
    const activityByDate = new Map(
      dailyActivity.map((row) => {
        const cardsStudied = Number(row.cardsStudied)
        // Estimate 30 seconds per card (0.5 minutes)
        const minutesSpent = Math.round(cardsStudied * 0.5)
        // Normalize date to YYYY-MM-DD format
        const dateKey = String(row.date).split('T')[0]
        return [dateKey, { cardsStudied, minutesSpent }]
      })
    )

    const recentActivity: { date: string; cardsStudied: number; minutesSpent: number }[] = []
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateStr = date.toISOString().split('T')[0]
      const activity = activityByDate.get(dateStr) || { cardsStudied: 0, minutesSpent: 0 }

      recentActivity.push({
        date: dateStr,
        cardsStudied: activity.cardsStudied,
        minutesSpent: activity.minutesSpent,
      })
    }

    // OPTIMIZATION: Build upcoming reviews from aggregated data
    const reviewsByDate = new Map(
      upcomingReviewsData.map((row) => {
        // Normalize date to YYYY-MM-DD format
        const dateKey = String(row.dueDate).split('T')[0]
        return [dateKey, Number(row.cardCount)]
      })
    )

    const upcomingReviews: { date: string; cardCount: number }[] = []
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)

      // Only include future days (including today)
      if (date >= today) {
        const dateStr = date.toISOString().split('T')[0]
        const cardCount = reviewsByDate.get(dateStr) || 0

        upcomingReviews.push({
          date: dateStr,
          cardCount,
        })
      }
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
      userJoinDate: userJoinDate.toISOString(),
      selectedMonth: month,
      selectedYear: year,
    })
  } catch (error) {
    logger.error('Failed to get dashboard stats', error as Error, {
      path: '/api/analytics/dashboard',
    })

    return NextResponse.json({ error: 'Failed to get dashboard stats' }, { status: 500 })
  }
}
