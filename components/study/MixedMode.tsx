'use client'

import { useEffect, useRef } from 'react'
import FlashcardMode from './FlashcardMode'
import MultipleChoiceMode from './MultipleChoiceMode'

/**
 * MixedMode Component
 *
 * Renders either MultipleChoiceMode or FlashcardMode based on card type
 * and distractor availability.
 *
 * Per spec 017-multi-choice-distractors:
 * - Uses MC mode when card has 3+ distractors
 * - Falls back to flashcard mode if distractors unavailable
 * - Shows toast notification on fallback (T039)
 */

interface StudyCard {
  id: string
  question: string
  answer: string
  cardType: 'flashcard' | 'multiple_choice'
  distractors?: string[]
}

interface MixedModeProps {
  cards: StudyCard[]
  currentIndex: number
  onRate: (rating: 1 | 2 | 3 | 4, responseTimeMs?: number) => void
  distractorsFailed?: boolean // T035, T037: Flag indicating distractor generation failed
  onFallbackNotify?: () => void // T039: Callback to show toast notification
}

export default function MixedMode({
  cards,
  currentIndex,
  onRate,
  distractorsFailed = false,
  onFallbackNotify,
}: MixedModeProps) {
  const currentCard = cards[currentIndex]
  const notifiedRef = useRef<string | null>(null)

  // T039: Show toast notification when falling back due to distractor failure
  useEffect(() => {
    if (
      distractorsFailed &&
      currentCard &&
      currentCard.cardType === 'multiple_choice' &&
      notifiedRef.current !== currentCard.id &&
      onFallbackNotify
    ) {
      notifiedRef.current = currentCard.id
      onFallbackNotify()
    }
  }, [distractorsFailed, currentCard, onFallbackNotify])

  if (!currentCard) {
    return null
  }

  // T037-T038: Check distractorsFailed flag and fallback if needed
  // Use multiple choice only if:
  // 1. Card type is multiple_choice
  // 2. Distractors are available (at least 3)
  // 3. Distractor generation hasn't failed
  const hasValidDistractors = currentCard.distractors && currentCard.distractors.length >= 3
  const useMultipleChoice =
    currentCard.cardType === 'multiple_choice' && hasValidDistractors && !distractorsFailed

  if (useMultipleChoice) {
    return (
      <MultipleChoiceMode
        question={currentCard.question}
        answer={currentCard.answer}
        distractors={currentCard.distractors || []}
        onRate={(rating, responseTimeMs) => onRate(rating, responseTimeMs)}
        cardNumber={currentIndex + 1}
        totalCards={cards.length}
      />
    )
  }

  // Fallback to FlashcardMode
  return (
    <FlashcardMode
      question={currentCard.question}
      answer={currentCard.answer}
      onRate={onRate}
      cardNumber={currentIndex + 1}
      totalCards={cards.length}
    />
  )
}
