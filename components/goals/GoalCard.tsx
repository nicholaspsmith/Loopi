'use client'

import Link from 'next/link'

/**
 * GoalCard Component (T027)
 *
 * Displays a learning goal summary with:
 * - Goal title and description
 * - Mastery progress bar
 * - Status indicator
 * - Skill tree node count
 */

interface GoalCardProps {
  goal: {
    id: string
    title: string
    description: string | null
    status: 'active' | 'paused' | 'completed' | 'archived'
    masteryPercentage: number
    totalTimeSeconds: number
    createdAt: string
    skillTree: {
      id: string
      nodeCount: number
      maxDepth: number
    } | null
  }
  selectionMode?: boolean
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
  onRestore?: (id: string) => void
  canRestore?: boolean
  isRestoring?: boolean
}

export default function GoalCard({
  goal,
  selectionMode = false,
  isSelected = false,
  onToggleSelect,
  onRestore,
  canRestore = false,
  isRestoring = false,
}: GoalCardProps) {
  // Format time for display
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  // Status color mapping
  const statusColors = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    archived: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  }

  // Mastery color based on percentage
  const getMasteryColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500'
    if (percentage >= 50) return 'bg-blue-500'
    if (percentage >= 20) return 'bg-yellow-500'
    return 'bg-gray-400'
  }

  const handleClick = () => {
    if (selectionMode && onToggleSelect) {
      onToggleSelect(goal.id)
    }
  }

  const handleRestoreClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onRestore) {
      onRestore(goal.id)
    }
  }

  // Base card classes - more compact on mobile
  const baseCardClasses = `relative flex flex-col p-3 sm:p-6 bg-white dark:bg-gray-800 rounded-lg border transition-all ${
    isSelected
      ? 'border-blue-500 dark:border-blue-400 shadow-md'
      : 'border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md'
  }`

  // Card content component (shared between Link and div versions)
  const cardContent = (
    <>
      <div className="flex-1">
        <div className="flex items-start gap-3 mb-3 sm:mb-4">
          {selectionMode && (
            <div className="flex-shrink-0 pt-1">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect?.(goal.id)}
                data-testid={`goal-checkbox-${goal.id}`}
                className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base sm:text-xl font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
                {goal.title}
              </h3>
              <span
                className={`flex-shrink-0 px-2 py-1 text-xs font-medium rounded-full ${statusColors[goal.status]}`}
              >
                {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Hide description on mobile to save space */}
        {goal.description && (
          <p className="hidden sm:block text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
            {goal.description}
          </p>
        )}

        <div className="space-y-3">
          {/* Mastery Progress */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">Mastery</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {goal.masteryPercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${getMasteryColor(goal.masteryPercentage)}`}
                style={{ width: `${goal.masteryPercentage}%` }}
              />
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{formatTime(goal.totalTimeSeconds)} studied</span>
            </div>
            {goal.skillTree && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
                <span>{goal.skillTree.nodeCount} topics</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CTA button for non-selection mode */}
      {!selectionMode && (
        <>
          {goal.status === 'archived' && onRestore ? (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleRestoreClick}
                disabled={!canRestore || isRestoring}
                data-testid={`restore-button-${goal.id}`}
                className="w-full px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isRestoring && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent" />
                )}
                {canRestore ? 'Restore Goal' : 'Active Limit Reached'}
              </button>
            </div>
          ) : (
            goal.status !== 'archived' && (
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2">
                  <span>View Goal</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>
            )
          )}
        </>
      )}
    </>
  )

  // Render as clickable div in selection mode, Link otherwise
  if (selectionMode) {
    return (
      <div
        onClick={handleClick}
        data-testid={`goal-card-${goal.id}`}
        className={`${baseCardClasses} cursor-pointer`}
      >
        {cardContent}
      </div>
    )
  }

  return (
    <Link
      href={`/goals/${goal.id}`}
      data-testid={`goal-card-${goal.id}`}
      className={`${baseCardClasses} block`}
    >
      {cardContent}
    </Link>
  )
}
