'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DeckWithMetadata } from '@/lib/db/operations/decks'
import type { FlashcardInDeck } from '@/lib/db/operations/deck-cards'
import DeckSettings from './DeckSettings'

/**
 * DeckEditor Component
 *
 * Client-side component for managing deck contents.
 * Handles adding/removing cards with limit enforcement.
 *
 * Features:
 * - Display cards in deck
 * - Remove cards (preserves flashcards)
 * - Delete deck (with confirmation)
 * - Limit violation error handling (1000 cards)
 *
 * Maps to T029-T030 in Phase 3 (FR-004, FR-005, FR-032, FR-034, FR-035)
 */

interface DeckEditorProps {
  deck: DeckWithMetadata
  cards: FlashcardInDeck[]
}

export default function DeckEditor({ deck, cards: initialCards }: DeckEditorProps) {
  const router = useRouter()
  const [cards, setCards] = useState(initialCards)
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editedName, setEditedName] = useState(deck.name)
  const [isSavingName, setIsSavingName] = useState(false)

  const maxCards = 1000
  const cardCountPercentage = (cards.length / maxCards) * 100
  const isNearLimit = cardCountPercentage >= 90

  const handleSelectCard = (cardId: string) => {
    const newSelection = new Set(selectedCards)
    if (newSelection.has(cardId)) {
      newSelection.delete(cardId)
    } else {
      newSelection.add(cardId)
    }
    setSelectedCards(newSelection)
  }

  const handleSelectAll = () => {
    if (selectedCards.size === cards.length) {
      setSelectedCards(new Set())
    } else {
      setSelectedCards(new Set(cards.map((c) => c.id)))
    }
  }

  const handleRemoveSelected = async () => {
    if (selectedCards.size === 0) return

    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`/api/decks/${deck.id}/cards`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flashcardIds: Array.from(selectedCards),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove cards')
      }

      const data = await response.json()

      // Update local state
      setCards(cards.filter((c) => !selectedCards.has(c.id)))
      setSelectedCards(new Set())
      setSuccess(data.message)

      // Refresh the page to update deck metadata
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove cards')
    }
  }

  const handleDeleteDeck = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/decks/${deck.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete deck')
      }

      // Redirect to decks list
      router.push('/decks')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete deck')
      setIsDeleting(false)
    }
  }

  const handleSaveName = async () => {
    const trimmedName = editedName.trim()

    // Validate name
    if (trimmedName.length === 0) {
      setError('Deck name cannot be empty')
      return
    }

    if (trimmedName.length > 200) {
      setError('Deck name must not exceed 200 characters')
      return
    }

    // No change
    if (trimmedName === deck.name) {
      setIsEditingName(false)
      return
    }

    setIsSavingName(true)
    setError(null)

    try {
      const response = await fetch(`/api/decks/${deck.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to rename deck')
      }

      setSuccess('Deck renamed successfully')
      setIsEditingName(false)

      // Refresh the page to update metadata
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename deck')
    } finally {
      setIsSavingName(false)
    }
  }

  const handleCancelRename = () => {
    setEditedName(deck.name)
    setIsEditingName(false)
    setError(null)
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Deck Name Editing */}
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Deck Name
          </h3>
          {!isEditingName && (
            <button
              onClick={() => setIsEditingName(true)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              Edit
            </button>
          )}
        </div>
        {isEditingName ? (
          <div className="space-y-3">
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              maxLength={200}
              placeholder="Deck name"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {editedName.length} / 200 characters
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleCancelRename}
                  disabled={isSavingName}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveName}
                  disabled={isSavingName}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isSavingName ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-900 dark:text-gray-100 font-medium">{deck.name}</p>
        )}
      </div>

      {/* FSRS Settings */}
      <DeckSettings deck={deck} />

      {/* Error/Success Messages */}
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
              {error.includes('Deck limit reached') && (
                <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                  This deck has reached the maximum capacity of {maxCards} cards. Remove
                  some cards before adding more.
                </p>
              )}
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      )}

      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="text-green-600 dark:text-green-400 mt-0.5">
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="flex-1 text-sm text-green-800 dark:text-green-200">{success}</p>
            <button
              onClick={() => setSuccess(null)}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      )}

      {/* Card Count Progress */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Deck Capacity
          </span>
          <span
            className={`text-sm font-medium ${
              isNearLimit
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-gray-900 dark:text-gray-100'
            }`}
          >
            {cards.length} / {maxCards} cards
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              isNearLimit ? 'bg-orange-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(cardCountPercentage, 100)}%` }}
          />
        </div>
        {isNearLimit && (
          <p className="mt-2 text-xs text-orange-600 dark:text-orange-400">
            Warning: Approaching deck limit ({Math.floor(cardCountPercentage)}% full)
          </p>
        )}
      </div>

      {/* Bulk Actions */}
      {cards.length > 0 && (
        <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedCards.size === cards.length && cards.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Select All ({selectedCards.size} selected)
              </span>
            </label>
          </div>
          <button
            onClick={handleRemoveSelected}
            disabled={selectedCards.size === 0}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            Remove Selected
          </button>
        </div>
      )}

      {/* Cards List */}
      {cards.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-gray-400 dark:text-gray-600 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No cards in this deck
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Add flashcards to start studying this deck
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`p-4 bg-white dark:bg-gray-800 rounded-lg border transition-all ${
                selectedCards.has(card.id)
                  ? 'border-blue-500 dark:border-blue-400'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={selectedCards.has(card.id)}
                  onChange={() => handleSelectCard(card.id)}
                  className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="mb-2">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {card.question}
                    </p>
                  </div>
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {card.answer}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-500">
                    Added {formatDate(card.addedAt)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Deck */}
      <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium"
          >
            Delete Deck
          </button>
        ) : (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <h3 className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
              Delete this deck?
            </h3>
            <p className="text-sm text-red-800 dark:text-red-200 mb-4">
              This will permanently delete the deck. Your flashcards will be preserved.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteDeck}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
