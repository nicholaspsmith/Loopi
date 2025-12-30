/**
 * GenerationPlaceholder Component
 *
 * Shows loading/error states during background job generation.
 * Displays type-specific labels and handles retry functionality.
 */

interface GenerationPlaceholderProps {
  jobType: 'flashcard' | 'distractor' | 'skill_tree'
  status: 'pending' | 'processing' | 'failed'
  error?: string
  onRetry?: () => void
}

const typeLabels = {
  flashcard: 'flashcards',
  distractor: 'answer options',
  skill_tree: 'skill tree',
}

export function GenerationPlaceholder({
  jobType,
  status,
  error,
  onRetry,
}: GenerationPlaceholderProps) {
  const label = typeLabels[jobType]

  if (status === 'failed') {
    return (
      <div
        className="rounded-lg border border-red-200 bg-red-50 p-4"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-center gap-2 text-red-700">
          <svg
            className="h-5 w-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="font-medium">Failed to generate {label}</span>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            aria-label={`Retry generating ${label}`}
          >
            Try again
          </button>
        )}
      </div>
    )
  }

  // pending or processing
  return (
    <div
      className="rounded-lg border border-gray-200 bg-gray-50 p-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <div
          className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"
          aria-hidden="true"
        />
        <span className="text-gray-700">
          {status === 'processing' ? 'Generating' : 'Preparing to generate'} {label}...
        </span>
      </div>
    </div>
  )
}
