'use client'

/**
 * GoalStats Component (T066)
 *
 * Shows time invested and retention rate statistics.
 */

interface GoalStatsProps {
  activeGoals: number
  completedGoals: number
  totalCards: number
  cardsDueToday: number
  overallRetention: number
  totalTimeHours: number
}

export default function GoalStats({
  activeGoals,
  completedGoals,
  totalCards,
  cardsDueToday,
  overallRetention,
  totalTimeHours,
}: GoalStatsProps) {
  const stats = [
    {
      label: 'Active Goals',
      value: activeGoals.toString(),
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Completed',
      value: completedGoals.toString(),
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Total Cards',
      value: totalCards.toString(),
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      label: 'Due Today',
      value: cardsDueToday.toString(),
      color:
        cardsDueToday > 20
          ? 'text-orange-600 dark:text-orange-400'
          : 'text-gray-600 dark:text-gray-400',
      bgColor:
        cardsDueToday > 20 ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-gray-50 dark:bg-gray-800',
    },
    {
      label: 'Retention',
      value: `${overallRetention}%`,
      color:
        overallRetention >= 80
          ? 'text-green-600 dark:text-green-400'
          : overallRetention >= 60
            ? 'text-yellow-600 dark:text-yellow-400'
            : 'text-red-600 dark:text-red-400',
      bgColor:
        overallRetention >= 80
          ? 'bg-green-50 dark:bg-green-900/20'
          : overallRetention >= 60
            ? 'bg-yellow-50 dark:bg-yellow-900/20'
            : 'bg-red-50 dark:bg-red-900/20',
    },
    {
      label: 'Time Invested',
      value: totalTimeHours < 1 ? `${Math.round(totalTimeHours * 60)}m` : `${totalTimeHours}h`,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    },
  ]

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={`${stat.bgColor} rounded-lg p-2 sm:p-3 text-center transition-transform hover:scale-105`}
        >
          <p className={`text-base sm:text-xl font-bold ${stat.color}`}>{stat.value}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 sm:mt-1">{stat.label}</p>
        </div>
      ))}
    </div>
  )
}
