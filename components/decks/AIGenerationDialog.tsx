'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * AIGenerationDialog Component
 *
 * Dialog for Smart deck generation from topic description.
 * Implements User Story 3 (Smart Deck Creation).
 *
 * Features:
 * - Topic input form with validation (T065)
 * - Suggestions review UI with relevance scores (T066)
 * - Card accept/reject checkboxes (T067)
 * - Loading states with progress indicators (T068)
 * - Error handling with fallback options (T069)
 *
 * Maps to T065-T069 in Phase 6 (FR-013, FR-014, FR-015)
 */

interface FlashcardSuggestion {
  flashcardId: string
  front: string
  back: string
  tags: string[]
  relevanceScore: number
  relevanceReason: string | null
  vectorSimilarity: number
}

interface AIGenerationDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function AIGenerationDialog({ isOpen, onClose }: AIGenerationDialogProps) {
  const router = useRouter()
  const [topic, setTopic] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingStage, setLoadingStage] = useState<'searching' | 'analyzing' | null>(null)
  const [suggestions, setSuggestions] = useState<FlashcardSuggestion[]>([])
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  const handleGenerate = async () => {
    if (topic.length < 3 || topic.length > 500) {
      setError('Topic must be between 3 and 500 characters')
      return
    }

    setIsLoading(true)
    setLoadingStage('searching')
    setError(null)
    setWarnings([])
    setSuggestions([])

    try {
      const response = await fetch('/api/decks-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic,
          minCards: 5,
          maxCards: 15,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to generate suggestions')
      }

      setLoadingStage('analyzing')

      const data = await response.json()

      setSuggestions(data.suggestions)
      setWarnings(data.metadata.warnings || [])

      // Pre-select all cards
      const allCardIds = new Set<string>(
        data.suggestions.map((s: FlashcardSuggestion) => s.flashcardId)
      )
      setSelectedCards(allCardIds)

      setLoadingStage(null)
      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions')
      setIsLoading(false)
      setLoadingStage(null)
    }
  }

  const toggleCardSelection = (cardId: string) => {
    setSelectedCards((prev) => {
      const updated = new Set(prev)
      if (updated.has(cardId)) {
        updated.delete(cardId)
      } else {
        updated.add(cardId)
      }
      return updated
    })
  }

  const handleCreateDeck = async () => {
    if (selectedCards.size === 0) {
      setError('Please select at least one card')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Create deck
      const deckResponse = await fetch('/api/decks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: topic.substring(0, 100), // Truncate to 100 chars for deck name
        }),
      })

      if (!deckResponse.ok) {
        const data = await deckResponse.json()
        throw new Error(data.error || 'Failed to create deck')
      }

      const { id: deckId } = await deckResponse.json()

      // Add selected cards to deck
      const addCardsResponse = await fetch(`/api/decks/${deckId}/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flashcardIds: Array.from(selectedCards),
        }),
      })

      if (!addCardsResponse.ok) {
        const data = await addCardsResponse.json()
        throw new Error(data.error || 'Failed to add cards to deck')
      }

      // Navigate to the new deck
      router.push(`/decks/${deckId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create deck')
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setTopic('')
    setSuggestions([])
    setSelectedCards(new Set())
    setError(null)
    setWarnings([])
    setLoadingStage(null)
  }

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-opacity ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      data-testid="ai-generation-dialog"
      aria-hidden={!isOpen}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-labelledby="ai-dialog-title"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2
              id="ai-dialog-title"
              className="text-2xl font-bold text-gray-900 dark:text-gray-100"
            >
              Smart Deck Generation
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              disabled={isLoading}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Topic Input (T065) */}
          {suggestions.length === 0 && (
            <div className="mb-6">
              <label
                htmlFor="ai-topic-input"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                What topic would you like to study?
              </label>
              <textarea
                id="ai-topic-input"
                name="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., cellular respiration and ATP production"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                rows={3}
                maxLength={500}
                disabled={isLoading}
                data-testid="ai-topic-input"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {topic.length} / 500 characters
                </span>
                <button
                  onClick={handleGenerate}
                  disabled={isLoading || topic.length < 3}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="generate-suggestions-button"
                  type="submit"
                >
                  Generate Suggestions
                </button>
              </div>
            </div>
          )}

          {/* Loading States (T068) */}
          {isLoading && loadingStage && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-700 dark:text-gray-300 text-lg font-medium">
                {loadingStage === 'searching' && 'Searching flashcards...'}
                {loadingStage === 'analyzing' && 'Analyzing relevance...'}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                {loadingStage === 'searching' && 'Finding semantically similar cards'}
                {loadingStage === 'analyzing' && 'Ranking cards by relevance'}
              </p>
            </div>
          )}

          {/* Error Display (T069) */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                  {error.includes('Vector search service unavailable') && (
                    <button
                      onClick={() => router.push('/decks/new')}
                      className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Create deck manually instead
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              {warnings.map((warning, idx) => (
                <p key={idx} className="text-sm text-yellow-800 dark:text-yellow-200">
                  {warning}
                </p>
              ))}
            </div>
          )}

          {/* Suggestions List (T066, T067) */}
          {suggestions.length > 0 && !isLoading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Suggested Cards ({selectedCards.size} selected)
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedCards(new Set(suggestions.map((s) => s.flashcardId)))}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={() => setSelectedCards(new Set())}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.flashcardId}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedCards.has(suggestion.flashcardId)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                    onClick={() => toggleCardSelection(suggestion.flashcardId)}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedCards.has(suggestion.flashcardId)}
                        onChange={() => toggleCardSelection(suggestion.flashcardId)}
                        className="mt-1"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                            {Math.round(suggestion.relevanceScore * 100)}% relevant
                          </span>
                        </div>
                        <p className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                          {suggestion.front}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {suggestion.back.length > 150
                            ? suggestion.back.substring(0, 150) + '...'
                            : suggestion.back}
                        </p>
                        {suggestion.relevanceReason && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 italic">
                            {suggestion.relevanceReason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleCreateDeck}
                  disabled={isLoading || selectedCards.size === 0}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Create Deck ({selectedCards.size} cards)
                </button>
                <button
                  onClick={handleReset}
                  disabled={isLoading}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  Start Over
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
