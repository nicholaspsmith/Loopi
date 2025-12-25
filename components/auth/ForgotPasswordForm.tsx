'use client'

import { useState } from 'react'

interface ForgotPasswordFormProps {
  onSuccess?: () => void
}

export function ForgotPasswordForm({ onSuccess }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429 && data.retryAfter) {
          setError(
            `Too many requests. Please try again in ${Math.ceil(data.retryAfter / 60)} minutes.`
          )
        } else {
          setError(data.error || 'An error occurred. Please try again.')
        }
        return
      }

      setSuccess(true)
      if (onSuccess) {
        onSuccess()
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900 p-4">
        <h3 className="mb-2 font-semibold text-green-900 dark:text-green-100">Check your email</h3>
        <p className="text-sm text-green-800 dark:text-green-200">
          If an account exists with that email address, you will receive a password reset link
          shortly.
        </p>
        <p className="mt-2 text-sm text-green-700 dark:text-green-300">
          The link will expire in 1 hour for security reasons.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900 p-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Email address
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400"
          placeholder="you@example.com"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Enter the email address associated with your account.
        </p>
      </div>

      <button
        type="submit"
        disabled={isLoading || !email}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:text-gray-500 dark:disabled:text-gray-400"
      >
        {isLoading ? 'Sending...' : 'Send reset link'}
      </button>

      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        <a
          href="/login"
          className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          Back to login
        </a>
      </div>
    </form>
  )
}
