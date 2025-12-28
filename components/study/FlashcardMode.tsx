'use client'

import { useState } from 'react'

/**
 * FlashcardMode Component (T054)
 *
 * Classic flip-to-reveal flashcard interaction.
 * User flips card then rates 1-4.
 */

interface FlashcardModeProps {
  question: string
  answer: string
  onRate: (rating: 1 | 2 | 3 | 4) => void
  cardNumber: number
  totalCards: number
}

const ratingOptions: { value: 1 | 2 | 3 | 4; label: string; color: string; description: string }[] =
  [
    {
      value: 1,
      label: 'Again',
      color: 'bg-red-500 hover:bg-red-600',
      description: 'Forgot completely',
    },
    {
      value: 2,
      label: 'Hard',
      color: 'bg-orange-500 hover:bg-orange-600',
      description: 'Struggled to remember',
    },
    {
      value: 3,
      label: 'Good',
      color: 'bg-green-500 hover:bg-green-600',
      description: 'Recalled correctly',
    },
    {
      value: 4,
      label: 'Easy',
      color: 'bg-blue-500 hover:bg-blue-600',
      description: 'Knew it instantly',
    },
  ]

export default function FlashcardMode({
  question,
  answer,
  onRate,
  cardNumber,
  totalCards,
}: FlashcardModeProps) {
  const [isFlipped, setIsFlipped] = useState(false)

  const handleFlip = () => {
    if (!isFlipped) {
      setIsFlipped(true)
    }
  }

  const handleRate = (rating: 1 | 2 | 3 | 4) => {
    setIsFlipped(false)
    onRate(rating)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      {/* Progress */}
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Card {cardNumber} of {totalCards}
      </div>

      {/* Card */}
      <div
        onClick={handleFlip}
        className={`w-full max-w-2xl min-h-[300px] rounded-xl shadow-lg cursor-pointer transition-transform duration-300 ${
          !isFlipped ? 'hover:scale-[1.02]' : ''
        }`}
      >
        <div
          className={`h-full p-8 rounded-xl ${
            isFlipped
              ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800'
              : 'bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700'
          }`}
        >
          {!isFlipped ? (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Question</p>
              <p className="text-xl text-center text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                {question}
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-8">
                Click to reveal answer
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex-1">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Answer</p>
                <p className="text-lg text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                  {answer}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rating Buttons */}
      {isFlipped && (
        <div className="mt-6 w-full max-w-2xl">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
            How well did you remember?
          </p>
          <div className="grid grid-cols-4 gap-2">
            {ratingOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleRate(option.value)}
                className={`py-3 px-2 rounded-lg text-white font-medium transition-colors ${option.color}`}
              >
                <span className="block text-lg">{option.label}</span>
                <span className="block text-xs opacity-80">{option.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard hint */}
      {!isFlipped && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">Press Space to flip</p>
      )}
    </div>
  )
}
