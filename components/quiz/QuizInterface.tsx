'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import QuizCard from './QuizCard'
import QuizProgress from './QuizProgress'

const MAX_RETRIES = 2 // Reduced from 3 to minimize delay before showing error (max 3s vs 7s)
const INITIAL_RETRY_DELAY = 1000 // 1 second

/**
 * QuizInterface Component
 *
 * Orchestrates the quiz flow for reviewing flashcards with FSRS scheduling.
 *
 * Implements:
 * - FR-011: Quiz interface in second tab
 * - FR-012: Present flashcards one at a time
 * - FR-015: Navigate to next flashcard
 * - FR-020: Display progress through deck
 * - FR-021: Completion notification
 *
 * Maps to T118 in Phase 6 (User Story 4)
 */

interface FSRSState {
  due: Date
  stability: number
  difficulty: number
  state: number
  reps: number
  lapses: number
  elapsed_days: number
  scheduled_days: number
  last_review: Date
}

interface Flashcard {
  id: string
  question: string
  answer: string
  fsrsState: FSRSState
}

interface QuizInterfaceProps {
  initialFlashcards?: Flashcard[]
}

interface FailedRating {
  flashcardId: string
  flashcardQuestion: string
  rating: number
  retrying: boolean
  retryCount: number
}

interface LastRating {
  flashcardId: string
  flashcardIndex: number
  rating: number
  timestamp: number
}

const UNDO_TIMEOUT_MS = 5000 // 5 seconds to undo
const FAILED_RATINGS_STORAGE_KEY = 'memoryloop_failed_ratings'

// Helper functions for localStorage persistence
function loadFailedRatings(): FailedRating[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(FAILED_RATINGS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveFailedRatings(ratings: FailedRating[]) {
  if (typeof window === 'undefined') return
  try {
    if (ratings.length === 0) {
      localStorage.removeItem(FAILED_RATINGS_STORAGE_KEY)
    } else {
      localStorage.setItem(FAILED_RATINGS_STORAGE_KEY, JSON.stringify(ratings))
    }
  } catch {
    // Ignore storage errors
  }
}

export default function QuizInterface({ initialFlashcards = [] }: QuizInterfaceProps) {
  const router = useRouter()
  const [flashcards, setFlashcards] = useState<Flashcard[]>(initialFlashcards)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(!initialFlashcards.length)
  const [error, setError] = useState<string | null>(null)
  const [isCompleted, setIsCompleted] = useState(false)
  const [failedRating, setFailedRating] = useState<FailedRating | null>(null)
  const [mode, setMode] = useState<'due' | 'all'>('due')
  const [totalCards, setTotalCards] = useState(0)
  const [pendingRatings, setPendingRatings] = useState(0)
  const [lastRating, setLastRating] = useState<LastRating | null>(null)
  const [undoTimeoutId, setUndoTimeoutId] = useState<NodeJS.Timeout | null>(null)
  const [storedFailedRatings, setStoredFailedRatings] = useState<FailedRating[]>([])

  // Fetch due flashcards on mount if not provided
  useEffect(() => {
    if (initialFlashcards.length === 0) {
      fetchFlashcards('due')
    }
  }, [])

  // Load stored failed ratings on mount and attempt to retry them
  useEffect(() => {
    const stored = loadFailedRatings()
    if (stored.length > 0) {
      setStoredFailedRatings(stored)
      // Auto-retry stored ratings
      retryStoredRatings(stored)
    }
  }, [])

  // Warn user if they try to leave with pending ratings
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingRatings > 0) {
        e.preventDefault()
        // Modern browsers ignore custom messages, but we need to set returnValue
        e.returnValue = ''
        return ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [pendingRatings])

  // Clear undo timeout on unmount
  useEffect(() => {
    return () => {
      if (undoTimeoutId) {
        clearTimeout(undoTimeoutId)
      }
    }
  }, [undoTimeoutId])

  const fetchFlashcards = async (fetchMode: 'due' | 'all' = 'due') => {
    try {
      setIsLoading(true)
      setError(null)
      setMode(fetchMode)

      const response = await fetch(`/api/quiz/due?mode=${fetchMode}`)

      if (!response.ok) {
        throw new Error('Failed to fetch flashcards')
      }

      const data = await response.json()

      if (data.success && data.flashcards) {
        setFlashcards(data.flashcards)
        setTotalCards(data.totalCards || 0)

        if (data.flashcards.length === 0) {
          // No cards - show empty state
          setIsCompleted(false)
        }
      } else {
        throw new Error('Invalid response from server')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRate = async (flashcardId: string, rating: number) => {
    // Get the flashcard question before moving to next card
    const ratedFlashcard = flashcards.find((f) => f.id === flashcardId)
    const flashcardQuestion = ratedFlashcard?.question || 'Unknown flashcard'
    const ratedIndex = currentIndex

    // Clear any existing undo timeout
    if (undoTimeoutId) {
      clearTimeout(undoTimeoutId)
    }

    // Track last rating for undo functionality
    setLastRating({
      flashcardId,
      flashcardIndex: ratedIndex,
      rating,
      timestamp: Date.now(),
    })

    // Set timeout to clear undo option
    const timeoutId = setTimeout(() => {
      setLastRating(null)
    }, UNDO_TIMEOUT_MS)
    setUndoTimeoutId(timeoutId)

    // Optimistic update: move to next card immediately for instant feedback
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // Completed all cards
      setIsCompleted(true)
    }

    // Track pending rating
    setPendingRatings((prev) => prev + 1)

    // Send rating to server in background
    try {
      await sendRating(flashcardId, flashcardQuestion, rating)
    } finally {
      setPendingRatings((prev) => prev - 1)
    }
  }

  const sendRating = async (
    flashcardId: string,
    flashcardQuestion: string,
    rating: number,
    retryCount: number = 0
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/quiz/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flashcardId, rating }),
      })

      if (response.ok) {
        return true
      }

      // Handle authentication errors - redirect to login
      if (response.status === 401) {
        console.error('[Quiz] Authentication expired, redirecting to login')
        router.push('/login')
        return false
      }

      // For server errors (5xx) or network issues, auto-retry with backoff
      if (response.status >= 500 && retryCount < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount)
        console.log(
          `[Quiz] Server error, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
        return sendRating(flashcardId, flashcardQuestion, rating, retryCount + 1)
      }

      // Client errors (4xx except 401) or max retries exceeded - show error and persist
      const data = await response.json().catch(() => ({}))
      console.error('[Quiz] Rating failed:', data.error || response.statusText)
      const failedRatingData = {
        flashcardId,
        flashcardQuestion,
        rating,
        retrying: false,
        retryCount: 0,
      }
      setFailedRating(failedRatingData)
      // Persist to localStorage for later retry
      const existing = loadFailedRatings()
      if (!existing.find((r) => r.flashcardId === flashcardId)) {
        saveFailedRatings([...existing, failedRatingData])
        setStoredFailedRatings([...existing, failedRatingData])
      }
      return false
    } catch (err) {
      // Network errors - auto-retry with backoff
      if (retryCount < MAX_RETRIES) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount)
        console.log(
          `[Quiz] Network error, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`
        )
        await new Promise((resolve) => setTimeout(resolve, delay))
        return sendRating(flashcardId, flashcardQuestion, rating, retryCount + 1)
      }

      console.error('[Quiz] Rating error after retries:', err)
      const failedRatingData = {
        flashcardId,
        flashcardQuestion,
        rating,
        retrying: false,
        retryCount: 0,
      }
      setFailedRating(failedRatingData)
      // Persist to localStorage for later retry
      const existing = loadFailedRatings()
      if (!existing.find((r) => r.flashcardId === flashcardId)) {
        saveFailedRatings([...existing, failedRatingData])
        setStoredFailedRatings([...existing, failedRatingData])
      }
      return false
    }
  }

  const handleRetryRating = async () => {
    if (!failedRating) return

    setFailedRating({ ...failedRating, retrying: true })

    // Use sendRating with auto-retry logic
    const success = await sendRating(
      failedRating.flashcardId,
      failedRating.flashcardQuestion,
      failedRating.rating
    )

    if (success) {
      // Clear from localStorage
      clearStoredFailedRating(failedRating.flashcardId)
      setFailedRating(null)
    }
    // If failed, sendRating will update failedRating state with new error
  }

  const handleDismissError = () => {
    // Dismiss without retrying - rating is lost but server state unchanged
    if (failedRating) {
      clearStoredFailedRating(failedRating.flashcardId)
    }
    setFailedRating(null)
  }

  const handleUndo = () => {
    if (!lastRating) return

    // Clear the undo timeout
    if (undoTimeoutId) {
      clearTimeout(undoTimeoutId)
      setUndoTimeoutId(null)
    }

    // Go back to the rated card
    setCurrentIndex(lastRating.flashcardIndex)
    setIsCompleted(false)

    // Clear the last rating (no more undo after going back)
    setLastRating(null)
  }

  // Retry all stored failed ratings (called on mount)
  const retryStoredRatings = async (ratings: FailedRating[]) => {
    const stillFailed: FailedRating[] = []

    for (const rating of ratings) {
      const success = await sendRating(rating.flashcardId, rating.flashcardQuestion, rating.rating)
      if (!success) {
        stillFailed.push(rating)
      }
    }

    // Update state and localStorage with any that still failed
    setStoredFailedRatings(stillFailed)
    saveFailedRatings(stillFailed)
  }

  // Clear a stored failed rating (after successful retry or dismiss)
  const clearStoredFailedRating = (flashcardId: string) => {
    const updated = storedFailedRatings.filter((r) => r.flashcardId !== flashcardId)
    setStoredFailedRatings(updated)
    saveFailedRatings(updated)
  }

  const handleRestart = () => {
    setCurrentIndex(0)
    setIsCompleted(false)
    fetchFlashcards(mode)
  }

  const handlePracticeAll = () => {
    setCurrentIndex(0)
    setIsCompleted(false)
    fetchFlashcards('all')
  }

  const handleDelete = async (flashcardId: string) => {
    try {
      setError(null)

      const response = await fetch(`/api/flashcards/${flashcardId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete flashcard')
      }

      const data = await response.json()

      if (data.success) {
        // Remove flashcard from state
        const updatedFlashcards = flashcards.filter((f) => f.id !== flashcardId)
        setFlashcards(updatedFlashcards)

        // Update current index if needed
        if (updatedFlashcards.length === 0) {
          // No more flashcards
          setIsCompleted(true)
        } else if (currentIndex >= updatedFlashcards.length) {
          // Current index is out of bounds, go to last card
          setCurrentIndex(updatedFlashcards.length - 1)
        }
        // If currentIndex < updatedFlashcards.length, it will automatically show the next card
      } else {
        throw new Error(data.error || 'Failed to delete flashcard')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading flashcards...</p>
        </div>
      </div>
    )
  }

  // Error state
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
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Error Loading Quiz
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => fetchFlashcards(mode)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Empty state - no flashcards due
  if (flashcards.length === 0 && !isCompleted) {
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
            All Caught Up!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {mode === 'due'
              ? 'You have no flashcards due for review right now. Great job keeping up with your studies!'
              : 'You have no flashcards yet. Start chatting to generate some!'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => fetchFlashcards('due')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              Refresh
            </button>
            {mode === 'due' && totalCards > 0 && (
              <button
                onClick={handlePracticeAll}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                Practice All ({totalCards})
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Completion state
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
            {mode === 'due' ? 'Quiz Complete!' : 'Practice Session Complete!'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You&apos;ve reviewed all {flashcards.length} flashcard
            {flashcards.length !== 1 ? 's' : ''}. Great work!
          </p>
          {/* Show pending ratings indicator */}
          {pendingRatings > 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-4 flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Saving {pendingRatings} rating{pendingRatings !== 1 ? 's' : ''}...
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRestart}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              Review Again
            </button>
            {mode === 'all' && (
              <button
                onClick={() => fetchFlashcards('due')}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                Back to Due Cards
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Quiz interface - show current flashcard
  const currentFlashcard = flashcards[currentIndex]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Practice mode indicator */}
      {mode === 'all' && (
        <div className="mb-4 text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
            Practice Mode - All Cards
          </span>
        </div>
      )}

      {/* Progress indicator */}
      <div className="mb-8">
        <QuizProgress current={currentIndex + 1} total={flashcards.length} showPercentage />
      </div>

      {/* Current flashcard */}
      <div className="mb-8">
        <QuizCard flashcard={currentFlashcard} onRate={handleRate} onDelete={handleDelete} />
      </div>

      {/* Undo snackbar - shows briefly after rating */}
      {lastRating && !failedRating && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-gray-800 dark:bg-gray-700 rounded-lg shadow-lg p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-white">
                Rated card as{' '}
                <span className="font-medium">
                  {lastRating.rating === 1
                    ? 'Very hard'
                    : lastRating.rating === 2
                      ? 'Hard'
                      : lastRating.rating === 3
                        ? 'Easy'
                        : 'Very Easy'}
                </span>
              </p>
              <button
                onClick={handleUndo}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded transition-colors duration-200"
              >
                Undo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Failed rating snackbar - non-blocking bottom notification */}
      {failedRating && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-red-50 dark:bg-red-900/90 border border-red-200 dark:border-red-800 rounded-lg shadow-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-5 h-5 text-red-600 dark:text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Failed to save rating
                </p>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300 truncate">
                  &ldquo;{failedRating.flashcardQuestion}&rdquo;
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleRetryRating}
                  disabled={failedRating.retrying}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors duration-200 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {failedRating.retrying ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Retrying
                    </>
                  ) : (
                    'Retry'
                  )}
                </button>
                <button
                  onClick={handleDismissError}
                  disabled={failedRating.retrying}
                  className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800 rounded transition-colors duration-200 disabled:opacity-50"
                  aria-label="Dismiss"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        </div>
      )}
    </div>
  )
}
