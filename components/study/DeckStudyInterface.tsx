'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import QuizCard from '@/components/quiz/QuizCard'
import QuizProgress from '@/components/quiz/QuizProgress'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { triggerConfetti } from '@/lib/animations/confetti'

/**
 * DeckStudyInterface Component
 *
 * Deck-specific study session with completion statistics.
 * Fetches deck-filtered flashcards and shows deck context in completion UI.
 *
 * Maps to T039 in Phase 4 (User Story 4)
 */

interface DeckStudyInterfaceProps {
  deckId: string
  deckName: string
}

interface FSRSState {
  state: string
  dueDate: string
  difficulty: number
  stability: number
}

interface DeckCard {
  id: string
  front: string
  back: string
  fsrs: FSRSState
}

interface DeckSessionResponse {
  sessionId: string
  deckId: string
  deckName: string
  dueCards: DeckCard[]
  totalDueCards: number
  totalNewCards: number
  appliedSettings: {
    source: string
    newCardsPerDay: number
    cardsPerSession: number
  }
  nextDueCard?: {
    dueDate: string
    count: number
  }
}

export default function DeckStudyInterface({ deckId, deckName }: DeckStudyInterfaceProps) {
  const router = useRouter()
  const [session, setSession] = useState<DeckSessionResponse | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [ratedCardIds, setRatedCardIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCompleted, setIsCompleted] = useState(false)
  const [completedCards, setCompletedCards] = useState(0)
  const [originalCardIds, setOriginalCardIds] = useState<string[]>([])
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date())
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  const fetchDeckSession = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/study/deck-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deckId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to start deck session')
      }

      const data: DeckSessionResponse = await response.json()
      setSession(data)

      // Store original card IDs for change detection (T051)
      const cardIds = data.dueCards.map((card) => card.id)
      setOriginalCardIds(cardIds)

      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deck session')
      setIsLoading(false)
    }
  }, [deckId])

  // Fetch deck session on mount
  useEffect(() => {
    fetchDeckSession()
  }, [fetchDeckSession])

  /**
   * Handle live session changes (T052-T053)
   */
  const handleSessionChanges = useCallback(
    (changes: { addedCards: DeckCard[]; removedCardIds: string[] }) => {
      if (!session) return

      let message = ''

      // Handle added cards (T052)
      if (changes.addedCards.length > 0) {
        // Append to session queue
        setSession((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            dueCards: [...prev.dueCards, ...changes.addedCards],
            totalDueCards: prev.totalDueCards + changes.addedCards.length,
          }
        })

        // Update original card IDs to include new cards
        setOriginalCardIds((prev) => [...prev, ...changes.addedCards.map((card) => card.id)])

        message = `${changes.addedCards.length} card(s) added to session`
      }

      // Handle removed cards (T053)
      if (changes.removedCardIds.length > 0) {
        // Filter out removed cards from session queue
        // Only skip cards that haven't been rated yet
        setSession((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            dueCards: prev.dueCards.filter(
              (card) => !changes.removedCardIds.includes(card.id) || ratedCardIds.has(card.id)
            ),
            totalDueCards: Math.max(0, prev.totalDueCards - changes.removedCardIds.length),
          }
        })

        // Update original card IDs to exclude removed cards
        setOriginalCardIds((prev) => prev.filter((id) => !changes.removedCardIds.includes(id)))

        const unratedRemoved = changes.removedCardIds.filter((id) => !ratedCardIds.has(id))
        if (unratedRemoved.length > 0) {
          message = message
            ? `${message}, ${unratedRemoved.length} card(s) removed`
            : `${unratedRemoved.length} card(s) removed from session`
        }
      }

      // Show sync message (T054)
      if (message) {
        setSyncMessage(message)
        setTimeout(() => setSyncMessage(null), 5000) // Clear after 5 seconds
      }
    },
    [session, ratedCardIds]
  )

  // Poll for deck changes every 5 seconds (T050-T053)
  useEffect(() => {
    if (!session || isCompleted || originalCardIds.length === 0) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/study/deck-session/changes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deckId,
            originalCardIds,
          }),
        })

        if (!response.ok) {
          console.error('[SessionSync] Poll failed:', response.statusText)
          return
        }

        const data = await response.json()

        if (data.hasChanges) {
          handleSessionChanges(data)
          setLastSyncTime(new Date())
        }
      } catch (err) {
        console.error('[SessionSync] Poll error:', err)
      }
    }, 5000) // Poll every 5 seconds

    return () => clearInterval(pollInterval)
  }, [session, isCompleted, originalCardIds, deckId, handleSessionChanges])

  // Check completion
  useEffect(() => {
    if (!session) return

    const remaining = session.dueCards.filter((card) => !ratedCardIds.has(card.id))
    if (remaining.length === 0 && session.dueCards.length > 0) {
      setIsCompleted(true)
      setCompletedCards(session.dueCards.length)
      triggerConfetti()
    }
  }, [ratedCardIds, session])

  const handleRating = async (flashcardId: string, rating: number) => {
    if (!session) return

    // Optimistically mark as rated
    setRatedCardIds((prev) => new Set([...prev, flashcardId]))

    // Send rating to server (fire and forget for now)
    try {
      await fetch('/api/quiz/rate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          flashcardId,
          rating,
        }),
      })
    } catch (err) {
      console.error('Failed to save rating:', err)
      // Could add retry logic here
    }

    // Move to next card
    const remainingCards = session.dueCards.filter(
      (card) => !ratedCardIds.has(card.id) && card.id !== flashcardId
    )

    if (remainingCards.length === 0) {
      setIsCompleted(true)
      setCompletedCards(session.dueCards.length)
    } else {
      setCurrentIndex(0) // Always show first remaining card
    }
  }

  const handleRestart = () => {
    setRatedCardIds(new Set())
    setCurrentIndex(0)
    setIsCompleted(false)
    fetchDeckSession()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
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
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Unable to Start Session
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push(`/decks/${deckId}`)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Deck
          </button>
        </div>
      </div>
    )
  }

  if (!session || session.dueCards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="text-gray-400 dark:text-gray-600 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No Cards Due
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            All cards in &quot;{deckName}&quot; are up to date!
          </p>
          {session?.nextDueCard && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
              Next review: {new Date(session.nextDueCard.dueDate).toLocaleDateString()}
            </p>
          )}
          <button
            onClick={() => router.push(`/decks/${deckId}`)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Deck
          </button>
        </div>
      </div>
    )
  }

  // Deck-specific completion UI (T039)
  if (isCompleted) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="text-green-600 dark:text-green-400 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Deck Complete!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You&apos;ve reviewed all {completedCards} card
            {completedCards !== 1 ? 's' : ''} from &quot;{deckName}&quot;. Great work!
          </p>

          {/* Deck-specific statistics */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-3">
              Session Statistics
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-blue-700 dark:text-blue-300 font-medium">
                  {session.totalDueCards}
                </p>
                <p className="text-blue-600 dark:text-blue-400">Due Cards</p>
              </div>
              <div>
                <p className="text-blue-700 dark:text-blue-300 font-medium">
                  {session.totalNewCards}
                </p>
                <p className="text-blue-600 dark:text-blue-400">New Cards</p>
              </div>
            </div>
            {session.appliedSettings.source !== 'global' && (
              <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Using {session.appliedSettings.source === 'deck' ? 'deck' : 'session'}{' '}
                  settings
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRestart}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Review Again
            </button>
            <button
              onClick={() => router.push(`/decks/${deckId}`)}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Back to Deck
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Get remaining cards
  const remainingCards = session.dueCards.filter((card) => !ratedCardIds.has(card.id))
  const currentCard = remainingCards[currentIndex]

  if (!currentCard) {
    return null
  }

  return (
    <div className="flex flex-col h-full">
      {/* Session Sync Indicator (T054) */}
      {syncMessage && (
        <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-blue-600 dark:text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <p className="text-sm text-blue-800 dark:text-blue-200">{syncMessage}</p>
          </div>
        </div>
      )}

      <QuizProgress
        current={ratedCardIds.size + 1}
        total={session.dueCards.length}
        deckName={deckName}
      />

      {/* Sync Status Indicator */}
      <div className="flex justify-between items-center mb-2">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Last synced: {lastSyncTime.toLocaleTimeString()}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <QuizCard
          flashcard={{
            id: currentCard.id,
            question: currentCard.front,
            answer: currentCard.back,
            fsrsState: {
              state: 0, // Simplified for now
              due: new Date(),
              stability: currentCard.fsrs.stability,
              difficulty: currentCard.fsrs.difficulty,
              reps: 0,
              lapses: 0,
              elapsed_days: 0,
              scheduled_days: 0,
              last_review: new Date(),
            },
          }}
          onRate={handleRating}
        />
      </div>
    </div>
  )
}
