'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ResetPasswordFormProps {
  token: string
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = []

    if (pwd.length < 8) {
      errors.push('Password must be at least 8 characters')
    }
    if (!/[A-Z]/.test(pwd)) {
      errors.push('Password must contain at least one uppercase letter')
    }
    if (!/[a-z]/.test(pwd)) {
      errors.push('Password must contain at least one lowercase letter')
    }
    if (!/[0-9]/.test(pwd)) {
      errors.push('Password must contain at least one number')
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) {
      errors.push('Password must contain at least one special character')
    }

    return errors
  }

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword)
    if (newPassword) {
      setValidationErrors(validatePassword(newPassword))
    } else {
      setValidationErrors([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validate password match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    // Validate password strength
    const errors = validatePassword(password)
    if (errors.length > 0) {
      setError(errors.join('. '))
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'An error occurred. Please try again.')
        return
      }

      setSuccess(true)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login?message=Password+reset+successful.+Please+login.')
      }, 3000)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="space-y-4 text-center">
        <div className="rounded-lg border border-green-200 bg-green-50 p-6">
          <svg
            className="mx-auto h-12 w-12 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h3 className="mt-4 text-lg font-semibold text-green-900">
            Password successfully reset!
          </h3>
          <p className="mt-2 text-sm text-green-800">You can now login with your new password.</p>
          <p className="mt-2 text-sm text-green-700">Redirecting to login page...</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-700">
          New password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => handlePasswordChange(e.target.value)}
          required
          disabled={isLoading}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          placeholder="Enter new password"
        />

        {validationErrors.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-gray-600">
            {validationErrors.map((err, index) => (
              <li key={index} className="flex items-center">
                <span className="mr-1 text-red-500">•</span>
                {err}
              </li>
            ))}
          </ul>
        )}

        {password && validationErrors.length === 0 && (
          <p className="mt-2 text-xs text-green-600">✓ Password meets requirements</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-gray-700">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          disabled={isLoading}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          placeholder="Confirm new password"
        />

        {confirmPassword && password !== confirmPassword && (
          <p className="mt-2 text-xs text-red-600">Passwords do not match</p>
        )}

        {confirmPassword && password === confirmPassword && (
          <p className="mt-2 text-xs text-green-600">✓ Passwords match</p>
        )}
      </div>

      <button
        type="submit"
        disabled={
          isLoading ||
          !password ||
          !confirmPassword ||
          password !== confirmPassword ||
          validationErrors.length > 0
        }
        className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:text-gray-500"
      >
        {isLoading ? 'Resetting password...' : 'Reset password'}
      </button>
    </form>
  )
}
