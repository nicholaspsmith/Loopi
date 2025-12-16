'use client'

import { useEffect } from 'react'
import Link from 'next/link'

/**
 * Quiz Route Error Boundary
 *
 * Catches errors specific to the quiz interface.
 * Provides quiz-specific recovery options.
 */

export default function QuizError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console in development
    console.error('Quiz error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md text-center space-y-6">
        <div>
          <svg
            className="mx-auto h-12 w-12 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Quiz Error
          </h2>
          <p className="text-gray-600">
            {error.message || 'Unable to load the quiz interface. This might be due to a problem loading your flashcards or review progress.'}
          </p>
          {error.digest && (
            <p className="text-xs text-gray-500 mt-2">Error ID: {error.digest}</p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Retry loading quiz
          </button>

          <Link
            href="/chat"
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go to Chat instead
          </Link>
        </div>

        <p className="text-xs text-gray-500">
          Your flashcards and progress are safe. This is just a temporary loading issue.
        </p>
      </div>
    </div>
  )
}
