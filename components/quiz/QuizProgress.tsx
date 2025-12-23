/**
 * QuizProgress Component
 *
 * Displays quiz progress indicator showing current position and total cards.
 * Shows "Card X of Y" and optional progress bar with percentage.
 *
 * Implements:
 * - FR-020: Display user's progress through flashcard deck during quiz session
 *
 * Maps to T115 in Phase 6 (User Story 4)
 */

interface QuizProgressProps {
  current: number
  total: number
  showPercentage?: boolean
}

export default function QuizProgress({
  current,
  total,
  showPercentage = false,
}: QuizProgressProps) {
  // Calculate percentage (handle edge cases)
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0

  // Calculate progress value for progress bar (0 to 100)
  const progressValue = total > 0 ? (current / total) * 100 : 0

  return (
    <div className="w-full">
      {/* Progress Text */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Completed {current} of {total} Cards
        </p>
        {showPercentage && (
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{percentage}%</p>
        )}
      </div>

      {/* Progress Bar */}
      <div
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={`Quiz progress: Completed ${current} of ${total} cards${showPercentage ? `, ${percentage}%` : ''}`}
        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
        data-testid="progress-bar"
      >
        <div
          className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300 ease-out"
          style={{ width: `${progressValue}%` }}
        />
      </div>
    </div>
  )
}
