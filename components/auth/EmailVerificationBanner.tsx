'use client'

import { useState, useEffect } from 'react'

interface EmailVerificationBannerProps {
  userEmail: string
}

export function EmailVerificationBanner({ userEmail }: EmailVerificationBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Check session storage for dismissal
  useEffect(() => {
    const dismissed = sessionStorage.getItem('email-verification-banner-dismissed')
    if (dismissed === 'true') {
      setIsDismissed(true)
    }
  }, [])

  const handleDismiss = () => {
    sessionStorage.setItem('email-verification-banner-dismissed', 'true')
    setIsDismissed(true)
  }

  const handleResend = async () => {
    setIsResending(true)
    setMessage(null)
    setError(null)

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429 && data.retryAfter) {
          setError(
            `Too many requests. Please try again in ${Math.ceil(data.retryAfter / 60)} minutes.`
          )
        } else {
          setError(data.error || 'Failed to send verification email. Please try again.')
        }
        return
      }

      setMessage(data.message || 'Verification email sent! Please check your inbox.')
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsResending(false)
    }
  }

  if (isDismissed) {
    return null
  }

  return (
    <div className="relative border-b border-yellow-300 bg-yellow-50 px-4 py-3 dark:border-yellow-700 dark:bg-yellow-900">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <svg
            className="h-5 w-5 flex-shrink-0 text-yellow-600 dark:text-yellow-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>

          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Please verify your email address ({userEmail})
            </p>
            {message && (
              <p className="mt-1 text-sm text-green-700 dark:text-green-400">{message}</p>
            )}
            {error && <p className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResend}
            disabled={isResending}
            className="rounded-md bg-yellow-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 disabled:bg-yellow-400 disabled:text-yellow-100 dark:bg-yellow-700 dark:hover:bg-yellow-800"
          >
            {isResending ? 'Sending...' : 'Resend email'}
          </button>

          <button
            onClick={handleDismiss}
            className="rounded-md p-1.5 text-yellow-600 transition-colors hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 dark:text-yellow-400 dark:hover:bg-yellow-800"
            aria-label="Dismiss"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
