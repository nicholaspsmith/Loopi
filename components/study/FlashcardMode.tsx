'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ANIMATION_DURATIONS } from '@/lib/constants/animations'

/**
 * FlashcardMode Component (T054)
 *
 * Classic flip-to-reveal flashcard interaction.
 * User flips card then rates 1-4.
 *
 * Uses CSS 3D transforms for smooth flip animation.
 * Key prop on card container resets animation when card changes.
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
  const [isAnimating, setIsAnimating] = useState(false)
  const prevCardNumber = useRef(cardNumber)

  // Reset flip state when card changes (no animation - instant reset)
  // React 18 automatically batches these setState calls
  useEffect(() => {
    if (cardNumber !== prevCardNumber.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional batch reset on card change
      setIsFlipped(false)
      setIsAnimating(false)
      prevCardNumber.current = cardNumber
    }
  }, [cardNumber])

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => {
      if (!prev && !isAnimating) {
        setIsAnimating(true)
        // Animation completes after card flip duration
        setTimeout(() => setIsAnimating(false), ANIMATION_DURATIONS.CARD_FLIP)
        return true
      }
      return prev
    })
  }, [isAnimating])

  const handleRate = (rating: 1 | 2 | 3 | 4) => {
    // Don't reset isFlipped here - let the cardNumber change trigger instant reset
    onRate(rating)
  }

  // T003, T004: Spacebar flip with input focus guard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
      if (e.code === 'Space' && !isInput && !isFlipped && !isAnimating) {
        e.preventDefault() // T008: Prevent default scroll
        handleFlip()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isFlipped, isAnimating, handleFlip])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      {/* Screen reader announcement for card navigation */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        Card {cardNumber} of {totalCards}
      </div>

      {/* Progress */}
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-4" aria-hidden="true">
        Card {cardNumber} of {totalCards}
      </div>

      {/* Card - T005: Perspective wrapper with key to reset on card change */}
      <div
        key={cardNumber}
        className="w-full max-w-2xl h-[250px] sm:h-[300px] [perspective:1000px]"
        data-testid="flashcard"
      >
        {/* T006: 3D flip animation with transform-style and rotateY */}
        <div
          onClick={handleFlip}
          className={`relative w-full h-full cursor-pointer transition-transform duration-500 [transform-style:preserve-3d] [-webkit-transform-style:preserve-3d] ${
            isFlipped ? '[transform:rotateY(180deg)]' : '[transform:rotateY(0deg)]'
          }`}
        >
          {/* T007: Front face */}
          <div
            className="absolute inset-0 rounded-xl shadow-lg bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 [backface-visibility:hidden] [-webkit-backface-visibility:hidden] overflow-hidden"
            data-testid="flashcard-front"
          >
            <div className="flex flex-col items-center justify-center h-full p-8 overflow-y-auto">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Question</p>
              <p className="text-xl text-center text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                {question}
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-8">
                Click to reveal answer
              </p>
            </div>
          </div>

          {/* T007: Back face - pre-rotated 180deg, solid background required for backface-visibility */}
          <div
            className="absolute inset-0 rounded-xl shadow-lg bg-green-50 dark:bg-green-900 border-2 border-green-200 dark:border-green-800 [backface-visibility:hidden] [-webkit-backface-visibility:hidden] overflow-hidden [transform:rotateY(180deg)]"
            data-testid="flashcard-back"
          >
            <div className="flex flex-col h-full p-8 overflow-y-auto">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Answer</p>
              <p className="text-lg text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                {answer}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Rating Buttons */}
      {isFlipped && (
        <div className="mt-6 w-full max-w-2xl">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
            How well did you remember?
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {ratingOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleRate(option.value)}
                className={`py-3 px-2 sm:px-3 min-h-[56px] rounded-lg text-white font-medium cursor-pointer transition-all active:scale-95 ${option.color}`}
              >
                <span className="block text-base sm:text-lg">{option.label}</span>
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
