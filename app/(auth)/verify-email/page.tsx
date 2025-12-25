'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>(
    !token ? 'error' : 'verifying'
  )
  const [error, setError] = useState<string | null>(
    !token ? 'Invalid verification link. No token provided.' : null
  )

  useEffect(() => {
    if (!token) {
      return
    }

    async function verifyEmail() {
      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })

        const data = await response.json()

        if (!response.ok) {
          setStatus('error')
          setError(data.error || 'Verification failed. Please try again.')
          return
        }

        setStatus('success')

        // Redirect to home/dashboard after 3 seconds
        setTimeout(() => {
          router.push('/chat')
          router.refresh()
        }, 3000)
      } catch {
        setStatus('error')
        setError('Network error. Please check your connection and try again.')
      }
    }

    verifyEmail()
  }, [token, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {status === 'verifying' && (
          <div className="rounded-lg bg-white p-8 text-center shadow-md dark:bg-gray-800">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-gray-100">
              Verifying your email...
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Please wait while we verify your email address.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="rounded-lg bg-white p-8 text-center shadow-md dark:bg-gray-800">
            <svg
              className="mx-auto h-16 w-16 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-gray-100">
              Email verified!
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Your email address has been successfully verified.
            </p>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
              Redirecting you to the app...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-6 rounded-lg bg-white p-8 text-center shadow-md dark:bg-gray-800">
            <div>
              <svg
                className="mx-auto h-16 w-16 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-gray-100">
                Verification failed
              </h2>
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href="/chat"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Go to dashboard
              </a>
              <button
                onClick={() => router.push('/chat')}
                className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                Request new verification email
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-gray-600 dark:text-gray-400">Loading...</div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  )
}
