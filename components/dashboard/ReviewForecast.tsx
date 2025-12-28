'use client'

/**
 * ReviewForecast Component (T065)
 *
 * Shows upcoming reviews for the next 7 days.
 */

interface ReviewDay {
  date: string
  cardCount: number
}

interface ReviewForecastProps {
  forecast: ReviewDay[]
}

export default function ReviewForecast({ forecast }: ReviewForecastProps) {
  const maxCount = Math.max(...forecast.map((d) => d.cardCount), 1)

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000)

    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Upcoming Reviews
      </h3>

      <div className="space-y-3">
        {forecast.map((day, index) => (
          <div key={day.date} className="flex items-center gap-3">
            <span
              className={`text-sm w-20 ${
                index === 0
                  ? 'font-medium text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {formatDate(day.date)}
            </span>

            <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
              {day.cardCount > 0 && (
                <div
                  className={`h-full transition-all duration-500 ${
                    index === 0
                      ? 'bg-blue-500'
                      : day.cardCount > 20
                        ? 'bg-orange-500'
                        : 'bg-green-500'
                  }`}
                  style={{ width: `${(day.cardCount / maxCount) * 100}%` }}
                />
              )}
            </div>

            <span
              className={`text-sm w-12 text-right ${
                day.cardCount > 20
                  ? 'font-medium text-orange-600 dark:text-orange-400'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {day.cardCount}
            </span>
          </div>
        ))}
      </div>

      {/* Total due */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between text-sm">
        <span className="text-gray-500 dark:text-gray-400">This Week</span>
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {forecast.reduce((sum, d) => sum + d.cardCount, 0)} cards
        </span>
      </div>
    </div>
  )
}
