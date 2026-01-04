'use client'

/**
 * TitleBadge Component (T075)
 *
 * Displays the user's current title with visual styling based on rank.
 */

interface TitleBadgeProps {
  title: string
  size?: 'sm' | 'md' | 'lg'
  showProgress?: boolean
  nextTitle?: {
    title: string
    requirement: string
    progress: number
  } | null
  onClick?: () => void
}

const titleStyles: Record<string, { bg: string; text: string; border: string; glow?: string }> = {
  Novice: {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-300 dark:border-gray-600',
  },
  Apprentice: {
    bg: 'bg-green-100 dark:bg-green-900/30',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-400 dark:border-green-600',
  },
  Practitioner: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-400 dark:border-blue-600',
  },
  Specialist: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-400 dark:border-purple-600',
  },
  Expert: {
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-400 dark:border-orange-600',
  },
  Master: {
    bg: 'bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30',
    text: 'text-yellow-700 dark:text-yellow-300',
    border: 'border-yellow-400 dark:border-yellow-500',
    glow: 'shadow-yellow-200 dark:shadow-yellow-900/50',
  },
  Grandmaster: {
    bg: 'bg-gradient-to-r from-purple-100 via-pink-100 to-red-100 dark:from-purple-900/30 dark:via-pink-900/30 dark:to-red-900/30',
    text: 'text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-red-600',
    border: 'border-purple-400 dark:border-purple-500',
    glow: 'shadow-purple-200 dark:shadow-purple-900/50',
  },
}

const titleIcons: Record<string, string> = {
  Novice: '🌱',
  Apprentice: '📗',
  Practitioner: '📘',
  Specialist: '📕',
  Expert: '⭐',
  Master: '👑',
  Grandmaster: '💎',
}

const sizeClasses = {
  sm: 'px-[15px] py-0 sm:px-2 sm:py-1 text-sm',
  md: 'px-[15px] py-0 sm:px-3 sm:py-1.5 text-base',
  lg: 'px-[15px] py-0 sm:px-4 sm:py-2 text-lg',
}

export default function TitleBadge({
  title,
  size = 'md',
  showProgress = false,
  nextTitle,
  onClick,
}: TitleBadgeProps) {
  const styles = titleStyles[title] || titleStyles.Novice
  const icon = titleIcons[title] || '🏅'

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <div
        className={`
          inline-flex items-center gap-2 rounded-full border-2
          ${styles.bg} ${styles.border} ${sizeClasses[size]}
          ${styles.glow ? `shadow-md ${styles.glow}` : ''}
          ${onClick ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : ''}
          transition-all duration-200
        `}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={
          onClick
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onClick()
                }
              }
            : undefined
        }
        aria-label={onClick ? `View achievements for ${title} title` : undefined}
      >
        <span className={size === 'lg' ? 'text-2xl' : size === 'md' ? 'text-xl' : 'text-lg'}>
          {icon}
        </span>
        <span className={`font-bold ${styles.text}`}>{title}</span>
      </div>

      {showProgress && nextTitle && (
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Next: {nextTitle.title}</span>
            <span>{nextTitle.progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
              style={{ width: `${nextTitle.progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{nextTitle.requirement}</p>
        </div>
      )}
    </div>
  )
}
