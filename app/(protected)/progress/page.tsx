'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import GoalStats from '@/components/dashboard/GoalStats'
import ReviewForecast from '@/components/dashboard/ReviewForecast'
import TitleBadge from '@/components/achievements/TitleBadge'

/**
 * Progress Dashboard Page (T067)
 *
 * Shows mastery progress, due cards, and time invested across goals.
 */

interface DashboardData {
  overview: {
    activeGoals: number
    completedGoals: number
    totalCards: number
    cardsDueToday: number
    cardsDueThisWeek: number
    overallRetention: number
    totalTimeHours: number
  }
  currentTitle: {
    title: string
    nextTitle: string | null
    progressToNext: number
  }
  recentActivity: {
    date: string
    cardsStudied: number
    minutesSpent: number
  }[]
  upcomingReviews: {
    date: string
    cardCount: number
  }[]
}

interface AchievementsData {
  achievements: unknown[]
  totalUnlocked: number
  totalAvailable: number
  currentTitle: {
    title: string
    earnedAt: string
  }
  nextTitle: {
    title: string
    requirement: string
    progress: number
  } | null
}

export default function ProgressPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [achievementsData, setAchievementsData] = useState<AchievementsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardResponse, achievementsResponse] = await Promise.all([
          fetch('/api/analytics/dashboard'),
          fetch('/api/achievements'),
        ])

        if (!dashboardResponse.ok) throw new Error('Failed to load dashboard')
        if (!achievementsResponse.ok) throw new Error('Failed to load achievements')

        const dashboardData = await dashboardResponse.json()
        const achievementsData = await achievementsResponse.json()

        setData(dashboardData)
        setAchievementsData(achievementsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <h1 className="text-2xl font-bold text-red-600 mb-4">{error || 'Failed to load'}</h1>
        <Link href="/goals" className="text-blue-600 hover:underline">
          Back to Goals
        </Link>
      </div>
    )
  }

  // Calculate activity streak
  const streak = data.recentActivity.filter((d) => d.cardsStudied > 0).length

  return (
    <div className="flex flex-col min-h-screen p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Your Progress</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track your learning journey and upcoming reviews
        </p>
      </div>

      {/* Achievements & Title */}
      {achievementsData && (
        <div className="mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Left: Title Badge */}
            <div>
              <TitleBadge
                title={achievementsData.currentTitle.title}
                size="lg"
                showProgress={false}
              />
            </div>

            {/* Right: Achievement Count and Progress */}
            <div className="flex-1 md:text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {achievementsData.totalUnlocked} of {achievementsData.totalAvailable} achievements
                unlocked
              </p>

              {achievementsData.nextTitle && (
                <div className="mt-3">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                    <span>Next: {achievementsData.nextTitle.title}</span>
                    <span>{achievementsData.nextTitle.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${achievementsData.nextTitle.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {achievementsData.nextTitle.requirement}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="mb-8">
        <GoalStats
          activeGoals={data.overview.activeGoals}
          completedGoals={data.overview.completedGoals}
          totalCards={data.overview.totalCards}
          cardsDueToday={data.overview.cardsDueToday}
          overallRetention={data.overview.overallRetention}
          totalTimeHours={data.overview.totalTimeHours}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Upcoming Reviews */}
        <ReviewForecast forecast={data.upcomingReviews} />

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Recent Activity
            </h3>
            {streak > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full">
                🔥 {streak} day streak
              </span>
            )}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {data.recentActivity.map((day) => {
              const intensity =
                day.cardsStudied === 0 ? 0 : Math.min(4, Math.ceil(day.cardsStudied / 5))
              const bgColors = [
                'bg-gray-100 dark:bg-gray-700',
                'bg-green-200 dark:bg-green-900/40',
                'bg-green-300 dark:bg-green-800/50',
                'bg-green-400 dark:bg-green-700/60',
                'bg-green-500 dark:bg-green-600/70',
              ]

              return (
                <div
                  key={day.date}
                  className={`aspect-square rounded ${bgColors[intensity]} flex items-center justify-center`}
                  title={`${day.date}: ${day.cardsStudied} cards, ${day.minutesSpent} min`}
                >
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {new Date(day.date).getDate()}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 flex justify-between">
            <span>
              {data.recentActivity.reduce((sum, d) => sum + d.cardsStudied, 0)} cards this week
            </span>
            <span>
              {data.recentActivity.reduce((sum, d) => sum + d.minutesSpent, 0)} min studied
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.overview.cardsDueToday > 0 && (
          <Link
            href="/goals"
            className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="text-2xl">📚</div>
              <div>
                <p className="font-medium text-blue-700 dark:text-blue-300">Start Studying</p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  {data.overview.cardsDueToday} cards due today
                </p>
              </div>
            </div>
          </Link>
        )}

        <Link
          href="/goals/new"
          className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="text-2xl">🎯</div>
            <div>
              <p className="font-medium text-green-700 dark:text-green-300">New Learning Goal</p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Start mastering something new
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}
