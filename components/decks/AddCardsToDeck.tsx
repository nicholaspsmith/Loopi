'use client'

import { useState, useEffect } from 'react'

/**
 * AddCardsToDeck Component
 *
 * Modal for selecting and adding flashcards to a deck.
 * Shows user's flashcards that aren't already in the deck.
 *
 * Features:
 * - Search/filter flashcards
 * - Bulk selection
 * - Limit enforcement (1000 cards per deck)
 * - Loading and error states
 */

interface Flashcard {
  id: string
  question: string
  answer: string
  createdAt: number
}

interface AddCardsToDeckProps {
  deckId: string
  currentCardCount: number
  onClose: () => void
  onSuccess: () => void
}

export default function AddCardsToDeck({
  deckId,
  currentCardCount,
  onClose,
  onSuccess,
}: AddCardsToDeckProps) {
  const [availableCards, setAvailableCards] = useState<Flashcard[]>([])
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const maxCards = 1000
  const remainingCapacity = maxCards - currentCardCount

  useEffect(() => {
    fetchAvailableCards()
  }, [deckId])

  const fetchAvailableCards = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch all user's flashcards
      const response = await fetch('/api/flashcards')
      if (!response.ok) {
        throw new Error('Failed to load flashcards')
      }

      const allCards = await response.json()

      // Fetch cards already in deck
      const deckResponse = await fetch(`/api/decks/${deckId}`)
      if (!deckResponse.ok || !allCards.flashcards) {
        throw new Error('Failed to load deck')
      }

      const deckData = await deckResponse.json()
      const cardIdsInDeck = new Set(deckData.flashcards?.map((c: Flashcard) => c.id) || [])

      // Filter out cards already in deck
      const available = allCards.flashcards.filter((card: Flashcard) => !cardIdsInDeck.has(card.id))
      setAvailableCards(available)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flashcards')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectCard = (cardId: string) => {
    const newSelection = new Set(selectedCards)
    if (newSelection.has(cardId)) {
      newSelection.delete(cardId)
    } else {
      // Check if adding this card would exceed limit
      if (currentCardCount + newSelection.size >= maxCards) {
        setError(`Cannot add more than ${maxCards} cards to a deck`)
        return
      }
      newSelection.add(cardId)
    }
    setSelectedCards(newSelection)
    setError(null)
  }

  const handleSelectAll = () => {
    if (selectedCards.size === filteredCards.length) {
      setSelectedCards(new Set())
    } else {
      // Only select up to remaining capacity
      const cardsToSelect = filteredCards.slice(0, remainingCapacity)
      setSelectedCards(new Set(cardsToSelect.map((c) => c.id)))
    }
  }

  const handleAddCards = async () => {
    if (selectedCards.size === 0) return

    setIsAdding(true)
    setError(null)

    try {
      const response = await fetch(`/api/decks/${deckId}/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flashcardIds: Array.from(selectedCards),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add cards')
      }

      // Success - notify parent (parent will refresh)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add cards')
      setIsAdding(false)
    }
  }

  // Filter cards based on search query
  const filteredCards = availableCards.filter(
    (card) =>
      card.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.answer.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Add Cards</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Capacity indicator */}
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-900 dark:text-blue-100">
                Deck capacity: {currentCardCount} / {maxCards}
              </span>
              <span className="text-blue-700 dark:text-blue-300">
                {remainingCapacity} slots available
              </span>
            </div>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search flashcards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Card list */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading flashcards...</p>
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center py-12">
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
                {searchQuery
                  ? 'No matching flashcards'
                  : availableCards.length === 0
                    ? 'All your flashcards are already in this deck'
                    : 'No flashcards available'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Create flashcards by starting a conversation'}
              </p>
            </div>
          ) : (
            <>
              {/* Select all */}
              <div className="mb-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedCards.size === filteredCards.length && filteredCards.length > 0}
                  onChange={handleSelectAll}
                  disabled={remainingCapacity === 0}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Select all ({selectedCards.size} selected)
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-3">
                {filteredCards.map((card) => (
                  <div
                    key={card.id}
                    className={`p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border transition-all cursor-pointer ${
                      selectedCards.has(card.id)
                        ? 'border-blue-500 dark:border-blue-400'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                    onClick={() => handleSelectCard(card.id)}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedCards.has(card.id)}
                        onChange={() => handleSelectCard(card.id)}
                        disabled={
                          !selectedCards.has(card.id) &&
                          currentCardCount + selectedCards.size >= maxCards
                        }
                        className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                          {card.question}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {card.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              disabled={isAdding}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleAddCards}
              disabled={selectedCards.size === 0 || isAdding}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isAdding
                ? 'Adding...'
                : `Add ${selectedCards.size} Card${selectedCards.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
