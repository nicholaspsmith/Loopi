'use client'

import { useEffect } from 'react'

/**
 * Error Boundary for Settings Page (T061)
 *
 * Catches and displays errors that occur in the settings page.
 * Provides user-friendly error messages and recovery options.
 */

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('[Settings Error]', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-red-200 bg-white p-8 shadow-md dark:border-red-800 dark:bg-gray-900">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400">
            Settings Error
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            An error occurred while loading your settings
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Error:</strong> {error.message || 'Unknown error'}
          </p>
          {error.digest && (
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={reset}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Try Again
          </button>

          <button
            onClick={() => (window.location.href = '/chat')}
            className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Back to Chat
          </button>
        </div>

        <div className="rounded-md bg-yellow-50 p-4 dark:bg-yellow-900/20">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Troubleshooting Tips
              </h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                <ul className="list-disc space-y-1 pl-5">
                  <li>Try refreshing the page</li>
                  <li>Clear your browser cache</li>
                  <li>Check your internet connection</li>
                  <li>If the problem persists, contact support</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
