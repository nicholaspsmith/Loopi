'use client'

/**
 * AchievementCard Component (T074)
 *
 * Displays a single achievement with icon, title, and description.
 * Shows locked/unlocked state.
 */

interface AchievementCardProps {
  achievementKey: string
  title: string
  description: string
  icon: string
  category: 'mastery' | 'progress' | 'performance' | 'consistency'
  requirement: string
  isUnlocked: boolean
  unlockedAt?: string
}

const categoryColors = {
  mastery: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-800',
    text: 'text-purple-700 dark:text-purple-300',
    badge: 'bg-purple-100 dark:bg-purple-800/40',
  },
  progress: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
    badge: 'bg-blue-100 dark:bg-blue-800/40',
  },
  performance: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-200 dark:border-orange-800',
    text: 'text-orange-700 dark:text-orange-300',
    badge: 'bg-orange-100 dark:bg-orange-800/40',
  },
  consistency: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-700 dark:text-green-300',
    badge: 'bg-green-100 dark:bg-green-800/40',
  },
}

export default function AchievementCard({
  title,
  description,
  icon,
  category,
  requirement,
  isUnlocked,
  unlockedAt,
}: AchievementCardProps) {
  const colors = categoryColors[category]

  return (
    <div
      className={`
        relative rounded-lg border p-4 transition-all duration-200
        ${isUnlocked ? colors.bg : 'bg-gray-50 dark:bg-gray-800/50'}
        ${isUnlocked ? colors.border : 'border-gray-200 dark:border-gray-700'}
        ${isUnlocked ? 'hover:scale-102 hover:shadow-md' : 'opacity-60'}
      `}
    >
      {/* Category badge */}
      <div className="absolute top-2 right-2">
        <span
          className={`
            text-xs px-2 py-0.5 rounded-full capitalize
            ${isUnlocked ? colors.badge : 'bg-gray-100 dark:bg-gray-700'}
            ${isUnlocked ? colors.text : 'text-gray-500 dark:text-gray-400'}
          `}
        >
          {category}
        </span>
      </div>

      {/* Icon */}
      <div
        className={`
          text-4xl mb-3
          ${isUnlocked ? '' : 'grayscale opacity-50'}
        `}
      >
        {isUnlocked ? icon : '🔒'}
      </div>

      {/* Title */}
      <h3
        className={`
          font-semibold text-lg mb-1
          ${isUnlocked ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}
        `}
      >
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{description}</p>

      {/* Requirement / Unlock date */}
      {isUnlocked && unlockedAt ? (
        <p className={`text-xs ${colors.text}`}>
          Unlocked {new Date(unlockedAt).toLocaleDateString()}
        </p>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-500">{requirement}</p>
      )}
    </div>
  )
}
