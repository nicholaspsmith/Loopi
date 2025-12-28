'use client'

/**
 * GoalProgress Component (T029)
 *
 * Displays mastery progress for a goal with:
 * - Circular progress indicator
 * - Percentage display
 * - Status label
 */

interface GoalProgressProps {
  masteryPercentage: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export default function GoalProgress({
  masteryPercentage,
  size = 'md',
  showLabel = true,
}: GoalProgressProps) {
  // Size mappings
  const sizeMap = {
    sm: { container: 'w-16 h-16', text: 'text-sm', stroke: 4 },
    md: { container: 'w-24 h-24', text: 'text-xl', stroke: 6 },
    lg: { container: 'w-32 h-32', text: 'text-2xl', stroke: 8 },
  }

  const { container, text, stroke } = sizeMap[size]

  // Circle dimensions
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (masteryPercentage / 100) * circumference

  // Color based on percentage
  const getColor = (percentage: number) => {
    if (percentage >= 80) return { stroke: 'stroke-green-500', text: 'text-green-600' }
    if (percentage >= 50) return { stroke: 'stroke-blue-500', text: 'text-blue-600' }
    if (percentage >= 20) return { stroke: 'stroke-yellow-500', text: 'text-yellow-600' }
    return { stroke: 'stroke-gray-400', text: 'text-gray-600' }
  }

  const colors = getColor(masteryPercentage)

  // Status label
  const getLabel = (percentage: number) => {
    if (percentage >= 100) return 'Mastered'
    if (percentage >= 80) return 'Advanced'
    if (percentage >= 50) return 'Intermediate'
    if (percentage >= 20) return 'Learning'
    if (percentage > 0) return 'Getting Started'
    return 'Not Started'
  }

  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${container}`}>
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-gray-200 dark:stroke-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx="50%"
            cy="50%"
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            className={`${colors.stroke} transition-all duration-500`}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
            }}
          />
        </svg>
        {/* Percentage text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-bold ${text} ${colors.text} dark:opacity-90`}>
            {masteryPercentage}%
          </span>
        </div>
      </div>
      {showLabel && (
        <span className="mt-2 text-sm font-medium text-gray-600 dark:text-gray-400">
          {getLabel(masteryPercentage)}
        </span>
      )}
    </div>
  )
}
