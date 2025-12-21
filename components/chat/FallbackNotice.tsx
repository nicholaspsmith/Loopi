import Link from 'next/link'

/**
 * FallbackNotice Component
 *
 * Displays an informational notice when the user is using Ollama (local AI)
 * instead of Claude API. Encourages users to add their Claude API key for
 * improved performance and features.
 *
 * User Story 4: Fallback to Ollama
 */
export default function FallbackNotice() {
  return (
    <div
      role="status"
      className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
    >
      <div className="flex items-start gap-3">
        {/* Info Icon */}
        <svg
          className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>

        {/* Notice Content */}
        <div className="flex-1">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
            Using Ollama (Free Local AI)
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
            You&apos;re currently using Ollama, a free local AI model. For faster responses and
            improved quality, consider adding your Claude API key.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
          >
            Add Claude API Key
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
