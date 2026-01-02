'use client'

import { useState, useRef } from 'react'

/**
 * MultipleChoiceMode Component
 *
 * 4-option quiz interface for multiple choice study mode.
 * Tracks response time and passes it to onRate for time-based FSRS rating.
 *
 * Per spec 017-multi-choice-distractors:
 * - Time threshold: 10 seconds
 * - Fast correct (≤10s) → Good (rating 3)
 * - Slow correct (>10s) → Hard (rating 2) - adjusted server-side
 * - Incorrect → Again (rating 1)
 */

interface MultipleChoiceModeProps {
  question: string
  answer: string
  distractors: string[]
  onRate: (rating: 1 | 2 | 3, responseTimeMs: number) => void
  cardNumber: number
  totalCards: number
}

// Fisher-Yates shuffle (called outside render)
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// Create shuffled options (stable function for memoization)
function createShuffledOptions(answer: string, distractors: string[]): string[] {
  const allOptions = [answer, ...distractors.slice(0, 3)]
  return shuffleArray(allOptions)
}

export default function MultipleChoiceMode({
  question,
  answer,
  distractors,
  onRate,
  cardNumber,
  totalCards,
}: MultipleChoiceModeProps) {
  // T012: Add selectedOption state (separate from submission)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  // T013: Add isSubmitted state to track submission status
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Track previous answer to detect card changes and store shuffled options
  const prevAnswerRef = useRef<string>('')
  const optionsRef = useRef<string[]>([])

  // Track response time from question display to submission
  const startTimeRef = useRef<number>(Date.now())

  // Compute options: only reshuffle when answer changes
  // Also reset state when card changes
  if (prevAnswerRef.current !== answer) {
    prevAnswerRef.current = answer
    optionsRef.current = createShuffledOptions(answer, distractors)
    startTimeRef.current = Date.now() // Reset timer for new card
    // Reset state for new card
    setSelectedOption(null)
    setIsSubmitted(false)
  }
  const options = optionsRef.current

  // T014: Handle option selection (highlighting only, no submission)
  const handleSelect = (option: string) => {
    // T019: Disable option selection after submission
    if (isSubmitted) return
    setSelectedOption(option)
  }

  // T016: Handle submission - show correct/incorrect feedback
  const handleSubmit = () => {
    if (!selectedOption) return
    setIsSubmitted(true)
  }

  // T017: Handle Next button - proceed to next card
  const handleNext = () => {
    if (!selectedOption) return

    const isCorrect = selectedOption === answer
    const responseTimeMs = Date.now() - startTimeRef.current
    // Rating: correct = 3 (server will adjust to 2 if slow), incorrect = 1
    const rating: 1 | 2 | 3 = isCorrect ? 3 : 1

    // Call onRate which will trigger next card
    onRate(rating, responseTimeMs)
  }

  const getOptionClass = (option: string) => {
    // T016: After submission, show correct (green) / incorrect (red) feedback
    if (isSubmitted) {
      if (option === answer) {
        return 'bg-green-50 dark:bg-green-900/30 border-green-500 dark:border-green-600'
      }

      if (option === selectedOption && option !== answer) {
        return 'bg-red-50 dark:bg-red-900/30 border-red-500 dark:border-red-600'
      }

      return 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-50'
    }

    // T014: Before submission, show blue border for selected option
    if (option === selectedOption) {
      return 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-600'
    }

    return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      {/* Progress */}
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Card {cardNumber} of {totalCards}
      </div>

      {/* Question */}
      <div className="w-full max-w-2xl mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Question</p>
          <p className="text-xl text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{question}</p>
        </div>
      </div>

      {/* Options */}
      <div className="w-full max-w-2xl grid grid-cols-1 gap-3">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleSelect(option)}
            disabled={isSubmitted}
            data-testid="mc-option"
            className={`p-4 rounded-lg border-2 text-left transition-all ${getOptionClass(option)} ${
              isSubmitted ? 'cursor-default' : 'cursor-pointer'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-full text-sm font-medium ${
                  isSubmitted && option === answer
                    ? 'bg-green-500 text-white'
                    : isSubmitted && option === selectedOption && option !== answer
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {String.fromCharCode(65 + index)}
              </span>
              <span className="text-gray-900 dark:text-gray-100">{option}</span>
              {isSubmitted && option === answer && (
                <span className="text-nowrap ml-auto text-green-600 dark:text-green-400">
                  ✓ Correct
                </span>
              )}
              {isSubmitted && option === selectedOption && option !== answer && (
                <span className="text-nowrap ml-auto text-red-600 dark:text-red-400">
                  ✗ Incorrect
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* T015: Submit button (disabled until selection, hidden after submission) */}
      {!isSubmitted && (
        <div className="mt-6">
          <button
            onClick={handleSubmit}
            disabled={!selectedOption}
            data-testid="mc-submit"
            className={`px-8 py-3 rounded-lg font-medium transition-all ${
              selectedOption
                ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            Submit
          </button>
        </div>
      )}

      {/* Result feedback */}
      {isSubmitted && (
        <div
          className={`mt-6 px-6 py-3 rounded-lg ${
            selectedOption === answer
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}
        >
          {selectedOption === answer
            ? 'Correct! Well done.'
            : `Incorrect. The answer was: ${answer}`}
        </div>
      )}

      {/* T017: Next button (visible after submission) */}
      {isSubmitted && (
        <div className="mt-4">
          <button
            onClick={handleNext}
            data-testid="mc-next"
            className="px-8 py-3 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white transition-all"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
