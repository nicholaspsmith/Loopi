'use client'

import ActivitySquare from './ActivitySquare'

/**
 * MonthlyCalendar Component
 *
 * Displays unified calendar with past activity (green) and future reviews (orange)
 */

interface ActivityDay {
  date: string
  cardsStudied: number
  minutesSpent: number
  cardsDue?: number // For future days
}

interface ReviewDay {
  date: string
  cardCount: number
}

interface MonthlyCalendarProps {
  activityData: ActivityDay[]
  upcomingReviews: ReviewDay[]
  selectedMonth: number
  selectedYear: number
  userJoinDate: string
  onMonthChange: (month: number, year: number) => void
  isLoading?: boolean
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export default function MonthlyCalendar({
  activityData,
  upcomingReviews,
  selectedMonth,
  selectedYear,
  userJoinDate,
  onMonthChange,
  isLoading = false,
}: MonthlyCalendarProps) {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const joinDate = new Date(userJoinDate)
  const joinMonth = joinDate.getMonth()
  const joinYear = joinDate.getFullYear()

  // Check if we can navigate to previous/next month
  const canGoPrevious =
    selectedYear > joinYear || (selectedYear === joinYear && selectedMonth > joinMonth)
  const canGoNext =
    selectedYear < currentYear || (selectedYear === currentYear && selectedMonth < currentMonth)

  const handlePreviousMonth = () => {
    if (!canGoPrevious) return

    if (selectedMonth === 0) {
      onMonthChange(11, selectedYear - 1)
    } else {
      onMonthChange(selectedMonth - 1, selectedYear)
    }
  }

  const handleNextMonth = () => {
    if (!canGoNext) return

    if (selectedMonth === 11) {
      onMonthChange(0, selectedYear + 1)
    } else {
      onMonthChange(selectedMonth + 1, selectedYear)
    }
  }

  // Generate calendar grid structure (ALWAYS from selectedMonth/selectedYear, independent of API data)
  const generateCalendarGrid = (): (ActivityDay | null)[] => {
    const firstDay = new Date(selectedYear, selectedMonth, 1)
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay() // 0 = Sunday, 6 = Saturday

    const calendarCells: (ActivityDay | null)[] = []

    // Add empty cells for days before the month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarCells.push(null)
    }

    // Generate grid structure with date strings (merge activity data separately)
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = new Date(selectedYear, selectedMonth, day).toISOString().split('T')[0]

      // If loading, show placeholder data; otherwise merge from API data
      if (isLoading) {
        calendarCells.push({
          date: dateStr,
          cardsStudied: 0,
          minutesSpent: 0,
          cardsDue: 0,
        })
      } else {
        const activityDay = activityData.find((d) => d.date === dateStr)
        const reviewDay = upcomingReviews.find((d) => d.date === dateStr)

        calendarCells.push({
          date: dateStr,
          cardsStudied: activityDay?.cardsStudied || 0,
          minutesSpent: activityDay?.minutesSpent || 0,
          cardsDue: reviewDay?.cardCount || 0,
        })
      }
    }

    return calendarCells
  }

  const calendarCells = generateCalendarGrid()

  // Summary stats: show 0 while loading, real data otherwise
  const totalCards = isLoading ? 0 : activityData.reduce((sum, d) => sum + d.cardsStudied, 0)
  const totalMinutes = isLoading ? 0 : activityData.reduce((sum, d) => sum + d.minutesSpent, 0)
  const activeDays = isLoading ? 0 : activityData.filter((d) => d.cardsStudied > 0).length

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Activity</h3>

        <div className="flex items-center gap-2">
          {/* Previous month button */}
          <button
            onClick={handlePreviousMonth}
            disabled={!canGoPrevious || isLoading}
            className={`p-1.5 rounded-lg transition-colors ${
              canGoPrevious && !isLoading
                ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
            }`}
            aria-label="Previous month"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Month/Year display */}
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 min-w-[120px] text-center">
            {MONTH_NAMES[selectedMonth]} {selectedYear}
          </span>

          {/* Next month button */}
          <button
            onClick={handleNextMonth}
            disabled={!canGoNext || isLoading}
            className={`p-1.5 rounded-lg transition-colors ${
              canGoNext && !isLoading
                ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
            }`}
            aria-label="Next month"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEKDAY_LABELS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid - always visible, with progressive loading */}
      <div className="grid grid-cols-7 gap-1">
        {calendarCells.map((cell, index) => (
          <div key={`cell-${index}`}>
            {cell ? (
              <ActivitySquare day={cell} isLoading={isLoading} />
            ) : (
              <div className="aspect-square" aria-hidden="true" />
            )}
          </div>
        ))}
      </div>

      {/* Summary stats */}
      <div className="mt-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex flex-wrap gap-3 justify-between">
        <span>{totalCards} cards this month</span>
        <span>{totalMinutes} min studied</span>
        {activeDays > 0 && (
          <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full">
            🔥 {activeDays} active days
          </span>
        )}
      </div>
    </div>
  )
}
