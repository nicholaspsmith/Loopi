/**
 * QuizStats Component
 *
 * Displays comprehensive quiz statistics including:
 * - Due flashcards count
 * - Reviews completed today
 * - Retention rate
 * - Total flashcards
 * - FSRS state breakdown
 * - Performance metrics
 *
 * Implements:
 * - FR-020: Display quiz progress and statistics
 *
 * Maps to T116 in Phase 6 (User Story 4)
 */

interface QuizStatsData {
  dueFlashcards: number
  reviewsToday: number
  totalFlashcards: number
  retentionRate: number
  totalReviews?: number
  reviewsThisWeek?: number
  avgDifficulty?: number
  avgStability?: number
  stateBreakdown: {
    new: number
    learning: number
    review: number
    relearning: number
  }
}

interface QuizStatsProps {
  stats: QuizStatsData
}

export default function QuizStats({ stats }: QuizStatsProps) {
  // Format large numbers with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString()
  }

  // Format retention rate to 1 decimal place
  const formatRetentionRate = (rate: number): string => {
    return rate.toFixed(1)
  }

  return (
    <div className="w-full max-w-4xl p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Quiz Statistics
      </h2>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {/* Due Flashcards */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
            Due
          </p>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
            {formatNumber(stats.dueFlashcards)}
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            Flashcards ready
          </p>
        </div>

        {/* Reviews Today */}
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-sm font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">
            Today
          </p>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-1">
            {formatNumber(stats.reviewsToday)}
          </p>
          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
            Reviews completed
          </p>
        </div>

        {/* Retention Rate */}
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <p className="text-sm font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wide">
            Retention
          </p>
          <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-1">
            {formatRetentionRate(stats.retentionRate)}%
          </p>
          <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
            Success rate
          </p>
        </div>

        {/* Total Flashcards */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Total
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
            {formatNumber(stats.totalFlashcards)}
          </p>
          <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
            Cards in collection
          </p>
        </div>
      </div>

      {/* State Breakdown */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Card States
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                New
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {formatNumber(stats.stateBreakdown.new)}
              </p>
            </div>
          </div>

          <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Learning
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {formatNumber(stats.stateBreakdown.learning)}
              </p>
            </div>
          </div>

          <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Review
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {formatNumber(stats.stateBreakdown.review)}
              </p>
            </div>
          </div>

          <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Relearning
              </p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {formatNumber(stats.stateBreakdown.relearning)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      {(stats.totalReviews !== undefined ||
        stats.reviewsThisWeek !== undefined ||
        stats.avgDifficulty !== undefined ||
        stats.avgStability !== undefined) && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Additional Metrics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.totalReviews !== undefined && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Reviews
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {formatNumber(stats.totalReviews)}
                </p>
              </div>
            )}

            {stats.reviewsThisWeek !== undefined && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  This Week
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {formatNumber(stats.reviewsThisWeek)}
                </p>
              </div>
            )}

            {stats.avgDifficulty !== undefined && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Avg Difficulty
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {stats.avgDifficulty.toFixed(1)}
                </p>
              </div>
            )}

            {stats.avgStability !== undefined && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Avg Stability
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {stats.avgStability.toFixed(1)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
