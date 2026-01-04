'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import GoalStats from '@/components/dashboard/GoalStats'
import TitleBadge from '@/components/achievements/TitleBadge'
import AchievementsModal from '@/components/achievements/AchievementsModal'
import MonthlyCalendar from '@/components/dashboard/MonthlyCalendar'

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
  userJoinDate: string
  selectedMonth: number
  selectedYear: number
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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [calendarLoading, setCalendarLoading] = useState(false)

  // Current selected month/year for calendar
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())

  // Initial data fetch - only runs once on mount
  const fetchData = async () => {
    try {
      setLoading(true)
      const [dashboardResponse, achievementsResponse] = await Promise.all([
        fetch(`/api/analytics/dashboard?month=${now.getMonth()}&year=${now.getFullYear()}`),
        fetch('/api/achievements'),
      ])

      if (!dashboardResponse.ok) throw new Error('Failed to load dashboard')
      if (!achievementsResponse.ok) throw new Error('Failed to load achievements')

      const dashboardData = await dashboardResponse.json()
      const achievementsData = await achievementsResponse.json()

      setData(dashboardData)
      setAchievementsData(achievementsData)

      // Initialize local month/year state from API response
      setSelectedMonth(dashboardData.selectedMonth)
      setSelectedYear(dashboardData.selectedYear)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // Calendar-specific data fetch - only updates activity data
  const fetchCalendarData = async (month: number, year: number) => {
    if (!data) return

    try {
      setCalendarLoading(true)
      const response = await fetch(`/api/analytics/dashboard?month=${month}&year=${year}`)

      if (!response.ok) throw new Error('Failed to load calendar data')

      const dashboardData = await response.json()

      // Update only the calendar-related data (including upcoming reviews)
      setData((prev) => ({
        ...prev!,
        recentActivity: dashboardData.recentActivity,
        upcomingReviews: dashboardData.upcomingReviews,
        selectedMonth: dashboardData.selectedMonth,
        selectedYear: dashboardData.selectedYear,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar data')
    } finally {
      setCalendarLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleMonthChange = (month: number, year: number) => {
    setSelectedMonth(month)
    setSelectedYear(year)
    fetchCalendarData(month, year)
  }

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

  return (
    <div className="flex flex-col min-h-screen p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-4 sm:mb-8">
        <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Your Progress
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track your learning journey and upcoming reviews
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-4 sm:mb-8">
        <GoalStats
          activeGoals={data.overview.activeGoals}
          completedGoals={data.overview.completedGoals}
          totalCards={data.overview.totalCards}
          cardsDueToday={data.overview.cardsDueToday}
          overallRetention={data.overview.overallRetention}
          totalTimeHours={data.overview.totalTimeHours}
        />
      </div>

      {/* Achievements & Title */}
      {achievementsData && (
        <div className="mb-4 sm:mb-8 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            {/* Left: Title Badge and Achievement Count */}
            <div className="flex items-center gap-3 flex-wrap">
              <TitleBadge
                title={achievementsData.currentTitle.title}
                size="lg"
                showProgress={false}
                onClick={() => setIsModalOpen(true)}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {achievementsData.totalUnlocked} of {achievementsData.totalAvailable} achievements
              </p>
            </div>

            {/* Right: Progress to Next Title */}
            {achievementsData.nextTitle && (
              <div className="flex-1 sm:max-w-md">
                <div className="flex justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-0.5">
                  <span>Next: {achievementsData.nextTitle.title}</span>
                  <span>{achievementsData.nextTitle.progress}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${achievementsData.nextTitle.progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {achievementsData.nextTitle.requirement}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Unified Activity Calendar (Past Activity + Future Reviews) */}
      <div className="mb-4 sm:mb-8">
        <MonthlyCalendar
          activityData={data.recentActivity}
          upcomingReviews={data.upcomingReviews}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          userJoinDate={data.userJoinDate}
          onMonthChange={handleMonthChange}
          isLoading={calendarLoading}
        />
      </div>

      {/* Achievements Modal */}
      <AchievementsModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  )
}
