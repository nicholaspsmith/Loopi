'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * CreateDeckForm Component
 *
 * Client-side form for creating a new deck.
 * Handles validation, error display, and submission.
 *
 * Features:
 * - Name validation (1-200 characters)
 * - Optional FSRS override settings
 * - Error handling with user-friendly messages
 * - Redirect to deck detail page on success
 *
 * Maps to T026 in Phase 3 (User Story 1)
 */

export default function CreateDeckForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [newCardsPerDay, setNewCardsPerDay] = useState<string>('')
  const [cardsPerSession, setCardsPerSession] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      // Validate name
      const trimmedName = name.trim()
      if (trimmedName.length === 0) {
        setError('Deck name cannot be empty')
        setIsSubmitting(false)
        return
      }

      if (trimmedName.length > 200) {
        setError('Deck name must not exceed 200 characters')
        setIsSubmitting(false)
        return
      }

      // Prepare request body
      const body: {
        name: string
        newCardsPerDayOverride?: number | null
        cardsPerSessionOverride?: number | null
      } = {
        name: trimmedName,
      }

      // Add overrides if provided
      if (showAdvanced) {
        if (newCardsPerDay) {
          const value = parseInt(newCardsPerDay, 10)
          if (isNaN(value) || value < 0) {
            setError('New cards per day must be a non-negative number')
            setIsSubmitting(false)
            return
          }
          body.newCardsPerDayOverride = value
        }

        if (cardsPerSession) {
          const value = parseInt(cardsPerSession, 10)
          if (isNaN(value) || value < 0) {
            setError('Cards per session must be a non-negative number')
            setIsSubmitting(false)
            return
          }
          body.cardsPerSessionOverride = value
        }
      }

      const response = await fetch('/api/decks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create deck')
      }

      const deck = await response.json()

      // Redirect to deck detail page
      router.push(`/decks/${deck.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create deck')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="text-red-600 dark:text-red-400 mt-0.5">
              <svg
                className="w-5 h-5"
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
            </div>
            <div className="flex-1">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Deck Name *
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Spanish Vocabulary, JavaScript Concepts"
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          maxLength={200}
          required
        />
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {name.length} / 200 characters
        </p>
      </div>

      {/* Advanced Settings (Optional) */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          <svg
            className={`w-4 h-4 transition-transform ${
              showAdvanced ? 'rotate-90' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
          Advanced FSRS Settings (Optional)
        </button>

        {showAdvanced && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Override global FSRS settings for this deck. Leave empty to use
              defaults.
            </p>

            <div>
              <label
                htmlFor="newCardsPerDay"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                New Cards Per Day
              </label>
              <input
                type="number"
                id="newCardsPerDay"
                value={newCardsPerDay}
                onChange={(e) => setNewCardsPerDay(e.target.value)}
                placeholder="Default: 20"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div>
              <label
                htmlFor="cardsPerSession"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Cards Per Session
              </label>
              <input
                type="number"
                id="cardsPerSession"
                value={cardsPerSession}
                onChange={(e) => setCardsPerSession(e.target.value)}
                placeholder="Default: 50"
                min="0"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating...' : 'Create Deck'}
        </button>
      </div>
    </form>
  )
}
