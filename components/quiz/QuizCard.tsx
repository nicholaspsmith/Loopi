'use client'

import { useState, useRef, useEffect } from 'react'
import RatingButtons from './RatingButtons'
import { ANIMATION_DURATIONS } from '@/lib/constants/animations'

/**
 * QuizCard Component
 *
 * Displays a flashcard with question/answer flip functionality and FSRS rating buttons.
 *
 * Implements:
 * - FR-013: Shows only question initially
 * - FR-014: Reveals answer on user action
 * - FSRS Rating: 4-button rating system (Again=1, Hard=2, Good=3, Easy=4)
 *
 * Maps to T114 in Phase 6 (User Story 4)
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

interface QuizCardProps {
  flashcard: Flashcard
  onRate: (flashcardId: string, rating: number) => void
  onDelete?: (flashcardId: string) => void
}

export default function QuizCard({ flashcard, onRate, onDelete }: QuizCardProps) {
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [prevFlashcardId, setPrevFlashcardId] = useState(flashcard.id)
  const [isRatingDisabled, setIsRatingDisabled] = useState(false)
  const [isFlipAnimating, setIsFlipAnimating] = useState(false)
  const flipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup timeout on unmount and when flashcard changes
  useEffect(() => {
    // Clear timeout when flashcard changes or component unmounts
    return () => {
      if (flipTimeoutRef.current) {
        clearTimeout(flipTimeoutRef.current)
        flipTimeoutRef.current = null
      }
    }
  }, [flashcard.id])

  // Reset answer visibility and delete confirmation when flashcard changes
  // Uses React-recommended pattern: https://react.dev/learn/you-might-not-need-an-effect
  if (flashcard.id !== prevFlashcardId) {
    setPrevFlashcardId(flashcard.id)
    setIsAnswerRevealed(false)
    setShowDeleteConfirm(false)
    setIsRatingDisabled(false)
    setIsFlipAnimating(false)
  }

  const handleRevealAnswer = () => {
    // Prevent interaction during animation
    if (isFlipAnimating) return

    setIsFlipAnimating(true)
    setIsAnswerRevealed(true)

    // Re-enable interaction after animation completes
    flipTimeoutRef.current = setTimeout(() => {
      setIsFlipAnimating(false)
    }, ANIMATION_DURATIONS.CARD_FLIP)
  }

  const handleRating = (rating: number) => {
    // Prevent rapid double-clicks
    if (isRatingDisabled) return
    setIsRatingDisabled(true)
    onRate(flashcard.id, rating)
  }

  // const handleDeleteClick = () => {
  //   setShowDeleteConfirm(true)
  // }

  const handleDeleteConfirm = () => {
    if (onDelete) {
      onDelete(flashcard.id)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
  }

  return (
    <div className="flip-card" role="region" aria-label="Flashcard">
      <div className={`flip-card-inner ${isAnswerRevealed ? 'flipped' : ''}`}>
        {/* Front Face - Question Only */}
        <div className="flip-card-front">
          <div className="flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] max-h-[70vh] p-4 sm:p-6 md:p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-y-auto">
            {/* Question Section */}
            <div className="w-full max-w-2xl mb-6 sm:mb-8 flex-1 min-h-0 overflow-y-auto">
              <h2
                id="flashcard-question-label"
                className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2"
              >
                Question
              </h2>
              <p
                className="text-lg sm:text-xl md:text-2xl font-medium text-gray-900 dark:text-gray-100 leading-relaxed break-words"
                aria-labelledby="flashcard-question-label"
              >
                {flashcard.question}
              </p>
            </div>

            {/* Show Answer Button */}
            <div className="w-full max-w-2xl mt-auto">
              <button
                onClick={handleRevealAnswer}
                disabled={isFlipAnimating}
                aria-label="Reveal answer to this flashcard"
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Show Answer
              </button>
            </div>
          </div>
        </div>

        {/* Back Face - Question + Answer + Rating */}
        <div className="flip-card-back">
          <div className="flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] max-h-[70vh] p-4 sm:p-6 md:p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-y-auto">
            {/* Question (for context) */}
            <div className="w-full max-w-2xl mb-6 sm:mb-8 flex-1 min-h-0 overflow-y-auto">
              <h2 className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Question
              </h2>
              <p className="text-lg sm:text-xl md:text-2xl font-medium text-gray-900 dark:text-gray-100 leading-relaxed break-words">
                {flashcard.question}
              </p>
            </div>

            {/* Answer Section */}
            <div
              className="w-full max-w-2xl mb-6 sm:mb-8 pt-6 sm:pt-8 border-t border-gray-200 dark:border-gray-700 flex-1 min-h-0 overflow-y-auto"
              role="region"
              aria-live="polite"
            >
              <h2
                id="flashcard-answer-label"
                className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2"
              >
                Answer
              </h2>
              <p
                className="text-base sm:text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed break-words"
                aria-labelledby="flashcard-answer-label"
              >
                {flashcard.answer}
              </p>

              {/* Delete confirmation */}
              {showDeleteConfirm && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    Are you sure you want to delete this flashcard? This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteConfirm}
                      className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white font-medium rounded transition-colors duration-200"
                      aria-label="Confirm delete flashcard"
                    >
                      Delete
                    </button>
                    <button
                      onClick={handleDeleteCancel}
                      className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium rounded transition-colors duration-200"
                      aria-label="Cancel delete"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Rating Buttons */}
            <div className="w-full max-w-2xl mt-auto">
              <RatingButtons onRate={handleRating} disabled={isRatingDisabled} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
