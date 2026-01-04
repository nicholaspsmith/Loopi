'use client'

/**
 * GoalStatsCards Component
 *
 * Displays 3 key stats for the goals page:
 * - Active Goals (with limit indicator and color coding)
 * - Completed Goals
 * - Average Mastery percentage
 *
 * Mobile-optimized with responsive sizing
 */

import { GOAL_LIMITS } from '@/lib/constants/goals'

interface GoalStatsCardsProps {
  activeCount: number
  completedCount: number
  averageMastery: number
}

export default function GoalStatsCards({
  activeCount,
  completedCount,
  averageMastery,
}: GoalStatsCardsProps) {
  // Color coding for active goals based on limit proximity
  const getActiveColor = () => {
    if (activeCount >= GOAL_LIMITS.ACTIVE) {
      return {
        text: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-900/20',
      }
    } else if (activeCount >= GOAL_LIMITS.ACTIVE - 1) {
      return {
        text: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-900/20',
      }
    } else {
      return {
        text: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
      }
    }
  }

  const activeColor = getActiveColor()

  const stats = [
    {
      label: 'Active Goals',
      value: `${activeCount}/${GOAL_LIMITS.ACTIVE}`,
      color: activeColor.text,
      bgColor: activeColor.bg,
    },
    {
      label: 'Completed',
      value: completedCount.toString(),
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Avg. Mastery',
      value: `${Math.round(averageMastery)}%`,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`${stat.bgColor} rounded-lg p-2 sm:p-4 text-center transition-transform hover:scale-105`}
        >
          <p className={`text-lg sm:text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  )
}
