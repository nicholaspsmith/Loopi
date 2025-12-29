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
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)

  // Track previous answer to detect card changes and store shuffled options
  const prevAnswerRef = useRef<string>('')
  const optionsRef = useRef<string[]>([])

  // T014: Track response time from question display to answer selection
  const startTimeRef = useRef<number>(Date.now())

  // Compute options: only reshuffle when answer changes
  // Also reset timer when card changes (T014)
  if (prevAnswerRef.current !== answer) {
    prevAnswerRef.current = answer
    optionsRef.current = createShuffledOptions(answer, distractors)
    startTimeRef.current = Date.now() // Reset timer for new card
  }
  const options = optionsRef.current

  // T015: Calculate responseTimeMs in handleSelect
  const handleSelect = (option: string) => {
    if (showResult) return

    setSelectedOption(option)
    setShowResult(true)

    const isCorrect = option === answer
    // T015: Calculate response time
    const responseTimeMs = Date.now() - startTimeRef.current
    // Rating: correct = 3 (server will adjust to 2 if slow), incorrect = 1
    const rating: 1 | 2 | 3 = isCorrect ? 3 : 1

    // Delay before moving to next card
    setTimeout(() => {
      // T016: Pass responseTimeMs to onRate
      onRate(rating, responseTimeMs)
      setSelectedOption(null)
      setShowResult(false)
    }, 1500)
  }

  const getOptionClass = (option: string) => {
    if (!showResult) {
      return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
    }

    if (option === answer) {
      return 'bg-green-50 dark:bg-green-900/30 border-green-500 dark:border-green-600'
    }

    if (option === selectedOption && option !== answer) {
      return 'bg-red-50 dark:bg-red-900/30 border-red-500 dark:border-red-600'
    }

    return 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-50'
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
            disabled={showResult}
            className={`p-4 rounded-lg border-2 text-left transition-all ${getOptionClass(option)} ${
              showResult ? 'cursor-default' : 'cursor-pointer'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium ${
                  showResult && option === answer
                    ? 'bg-green-500 text-white'
                    : showResult && option === selectedOption && option !== answer
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {String.fromCharCode(65 + index)}
              </span>
              <span className="text-gray-900 dark:text-gray-100">{option}</span>
              {showResult && option === answer && (
                <span className="ml-auto text-green-600 dark:text-green-400">✓ Correct</span>
              )}
              {showResult && option === selectedOption && option !== answer && (
                <span className="ml-auto text-red-600 dark:text-red-400">✗ Incorrect</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Result feedback */}
      {showResult && (
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
    </div>
  )
}
