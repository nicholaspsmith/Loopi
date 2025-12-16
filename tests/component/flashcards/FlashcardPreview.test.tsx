import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import FlashcardPreview from '@/components/flashcards/FlashcardPreview'

/**
 * Component Tests for FlashcardPreview
 *
 * Tests the flashcard preview display component
 */

describe('FlashcardPreview', () => {
  const mockFlashcard = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user1',
    conversationId: 'conv1',
    messageId: 'msg1',
    question: 'What is quantum entanglement?',
    answer:
      'A phenomenon where particles remain connected regardless of distance',
    questionEmbedding: null,
    createdAt: Date.now(),
    fsrsState: {
      due: new Date(),
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      state: 0,
    },
  }

  it('should render flashcard question', () => {
    render(<FlashcardPreview flashcard={mockFlashcard} />)

    expect(screen.getByText('What is quantum entanglement?')).toBeInTheDocument()
  })

  it('should render flashcard answer', () => {
    render(<FlashcardPreview flashcard={mockFlashcard} />)

    expect(
      screen.getByText(
        /A phenomenon where particles remain connected regardless of distance/
      )
    ).toBeInTheDocument()
  })

  it('should display question and answer labels', () => {
    render(<FlashcardPreview flashcard={mockFlashcard} />)

    expect(screen.getByText(/question/i)).toBeInTheDocument()
    expect(screen.getByText(/answer/i)).toBeInTheDocument()
  })

  it('should render multiple flashcards in a list', () => {
    const flashcards = [
      { ...mockFlashcard, id: '1', question: 'Question 1', answer: 'Answer 1' },
      { ...mockFlashcard, id: '2', question: 'Question 2', answer: 'Answer 2' },
      { ...mockFlashcard, id: '3', question: 'Question 3', answer: 'Answer 3' },
    ]

    render(
      <div>
        {flashcards.map((fc) => (
          <FlashcardPreview key={fc.id} flashcard={fc} />
        ))}
      </div>
    )

    expect(screen.getByText('Question 1')).toBeInTheDocument()
    expect(screen.getByText('Question 2')).toBeInTheDocument()
    expect(screen.getByText('Question 3')).toBeInTheDocument()
  })

  it('should handle long question and answer text', () => {
    const longFlashcard = {
      ...mockFlashcard,
      question: 'Q: ' + 'a'.repeat(500),
      answer: 'A: ' + 'b'.repeat(1000),
    }

    render(<FlashcardPreview flashcard={longFlashcard} />)

    expect(screen.getByText(/Q: aaa/)).toBeInTheDocument()
    expect(screen.getByText(/A: bbb/)).toBeInTheDocument()
  })

  it('should show FSRS state indicator for new cards', () => {
    render(<FlashcardPreview flashcard={mockFlashcard} showFSRSState={true} />)

    expect(screen.getByText(/new/i)).toBeInTheDocument()
  })

  it('should show review count if provided', () => {
    const reviewedFlashcard = {
      ...mockFlashcard,
      fsrsState: {
        ...mockFlashcard.fsrsState,
        reps: 5,
        state: 2, // Review state
      },
    }

    render(
      <FlashcardPreview flashcard={reviewedFlashcard} showFSRSState={true} />
    )

    expect(screen.getByText(/5 reviews?/i)).toBeInTheDocument()
  })
})
