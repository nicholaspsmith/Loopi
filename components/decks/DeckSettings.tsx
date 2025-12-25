'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DeckWithMetadata } from '@/lib/db/operations/decks'

/**
 * DeckSettings Component
 *
 * FSRS override settings form for deck-specific configuration.
 * Allows users to override global FSRS settings per deck.
 *
 * Maps to T046 in Phase 5 (User Story 2)
 */

interface DeckSettingsProps {
  deck: DeckWithMetadata
}

export default function DeckSettings({ deck }: DeckSettingsProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [newCardsPerDay, setNewCardsPerDay] = useState<string>(
    deck.newCardsPerDayOverride?.toString() ?? ''
  )
  const [cardsPerSession, setCardsPerSession] = useState<string>(
    deck.cardsPerSessionOverride?.toString() ?? ''
  )
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setError(null)
    setIsSaving(true)

    try {
      // Validate inputs
      const newCardsValue = newCardsPerDay
        ? parseInt(newCardsPerDay, 10)
        : null
      const cardsSessionValue = cardsPerSession
        ? parseInt(cardsPerSession, 10)
        : null

      if (
        newCardsValue !== null &&
        (isNaN(newCardsValue) || newCardsValue < 0)
      ) {
        setError('New cards per day must be a non-negative number')
        setIsSaving(false)
        return
      }

      if (
        cardsSessionValue !== null &&
        (isNaN(cardsSessionValue) || cardsSessionValue < 1)
      ) {
        setError('Cards per session must be greater than 0')
        setIsSaving(false)
        return
      }

      const response = await fetch(`/api/decks/${deck.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newCardsPerDayOverride: newCardsValue,
          cardsPerSessionOverride: cardsSessionValue,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update settings')
      }

      setSuccess('Settings saved successfully')
      setIsEditing(false)

      // Refresh to update UI
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setNewCardsPerDay(deck.newCardsPerDayOverride?.toString() ?? '')
    setCardsPerSession(deck.cardsPerSessionOverride?.toString() ?? '')
    setIsEditing(false)
    setError(null)
  }

  const handleClearSettings = async () => {
    setError(null)
    setIsSaving(true)

    try {
      const response = await fetch(`/api/decks/${deck.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newCardsPerDayOverride: null,
          cardsPerSessionOverride: null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to clear settings')
      }

      setNewCardsPerDay('')
      setCardsPerSession('')
      setSuccess('Settings cleared - now using global defaults')
      setIsEditing(false)

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear settings')
    } finally {
      setIsSaving(false)
    }
  }

  const hasCustomSettings =
    deck.newCardsPerDayOverride !== null || deck.cardsPerSessionOverride !== null

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            FSRS Settings
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {hasCustomSettings
              ? 'Using deck-specific settings'
              : 'Using global defaults'}
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            {hasCustomSettings ? 'Edit' : 'Customize'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-sm text-green-800 dark:text-green-200">
          {success}
        </div>
      )}

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Cards Per Day
            </label>
            <input
              type="number"
              value={newCardsPerDay}
              onChange={(e) => setNewCardsPerDay(e.target.value)}
              placeholder="Global default: 20"
              min="0"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Leave empty to use global default
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cards Per Session
            </label>
            <input
              type="number"
              value={cardsPerSession}
              onChange={(e) => setCardsPerSession(e.target.value)}
              placeholder="Global default: 50"
              min="1"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
              Leave empty to use global default
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            {hasCustomSettings && (
              <button
                onClick={handleClearSettings}
                disabled={isSaving}
                className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              New Cards Per Day:
            </span>
            <span className="text-gray-900 dark:text-gray-100">
              {deck.newCardsPerDayOverride ?? 20} (
              {deck.newCardsPerDayOverride ? 'custom' : 'global'})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">
              Cards Per Session:
            </span>
            <span className="text-gray-900 dark:text-gray-100">
              {deck.cardsPerSessionOverride ?? 50} (
              {deck.cardsPerSessionOverride ? 'custom' : 'global'})
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
