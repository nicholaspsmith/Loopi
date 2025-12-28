'use client'

import FlashcardMode from './FlashcardMode'
import MultipleChoiceMode from './MultipleChoiceMode'

/**
 * MixedMode Component (T057)
 *
 * Randomly alternates between flashcard and MC modes.
 * Provides variety for engaging study sessions.
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
  onRate: (rating: 1 | 2 | 3 | 4) => void
}

export default function MixedMode({ cards, currentIndex, onRate }: MixedModeProps) {
  const currentCard = cards[currentIndex]

  if (!currentCard) {
    return null
  }

  // Use multiple choice if card has distractors, otherwise flashcard
  const useMultipleChoice =
    currentCard.cardType === 'multiple_choice' &&
    currentCard.distractors &&
    currentCard.distractors.length >= 2

  if (useMultipleChoice) {
    return (
      <MultipleChoiceMode
        question={currentCard.question}
        answer={currentCard.answer}
        distractors={currentCard.distractors || []}
        onRate={(rating, _correct) => onRate(rating)}
        cardNumber={currentIndex + 1}
        totalCards={cards.length}
      />
    )
  }

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
