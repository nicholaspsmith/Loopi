'use client'

import { useEffect } from 'react'
import Link from 'next/link'

/**
 * Chat Route Error Boundary
 *
 * Catches errors specific to the chat interface.
 * Provides chat-specific recovery options.
 */

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console in development
    console.error('Chat error:', error)
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
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Chat Error</h2>
          <p className="text-gray-600">
            {error.message ||
              'Unable to load the chat interface. This might be due to a connection issue or a problem loading your conversation history.'}
          </p>
          {error.digest && <p className="text-xs text-gray-500 mt-2">Error ID: {error.digest}</p>}
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Retry loading chat
          </button>

          <Link
            href="/quiz"
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go to Quiz instead
          </Link>
        </div>

        <p className="text-xs text-gray-500">
          Your chat history is safe. This is just a temporary loading issue.
        </p>
      </div>
    </div>
  )
}
