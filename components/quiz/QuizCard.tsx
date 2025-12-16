'use client'

import { useState } from 'react'
import RatingButtons from './RatingButtons'

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
}

export default function QuizCard({ flashcard, onRate }: QuizCardProps) {
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false)

  const handleRevealAnswer = () => {
    setIsAnswerRevealed(true)
  }

  const handleRating = (rating: number) => {
    onRate(flashcard.id, rating)
  }

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg"
      role="region"
      aria-label="Flashcard"
    >
      {/* Question Section */}
      <div className="w-full max-w-2xl mb-8">
        <h2
          id="flashcard-question-label"
          className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2"
        >
          Question
        </h2>
        <p
          className="text-2xl font-medium text-gray-900 dark:text-gray-100 leading-relaxed"
          aria-labelledby="flashcard-question-label"
        >
          {flashcard.question}
        </p>
      </div>

      {/* Answer Section - Only shown after reveal */}
      {isAnswerRevealed && (
        <div
          className="w-full max-w-2xl mb-8 pt-8 border-t border-gray-200 dark:border-gray-700"
          role="region"
          aria-live="polite"
        >
          <h2
            id="flashcard-answer-label"
            className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2"
          >
            Answer
          </h2>
          <p
            className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed"
            aria-labelledby="flashcard-answer-label"
          >
            {flashcard.answer}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="w-full max-w-2xl mt-auto">
        {!isAnswerRevealed ? (
          /* Show Answer Button */
          <button
            onClick={handleRevealAnswer}
            aria-label="Reveal answer to this flashcard"
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Show Answer
          </button>
        ) : (
          /* Rating Buttons */
          <RatingButtons onRate={handleRating} />
        )}
      </div>
    </div>
  )
}
