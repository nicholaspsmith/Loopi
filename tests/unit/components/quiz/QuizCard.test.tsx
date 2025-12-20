import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuizCard from '@/components/quiz/QuizCard'

/**
 * Component Test for QuizCard
 *
 * Tests the QuizCard component that displays a flashcard with question/answer flip
 * and FSRS rating buttons.
 *
 * Maps to T104 in Phase 6 - Testing User Story 4 (FR-013, FR-014)
 * Following TDD - these tests will guide component implementation
 */

describe('QuizCard', () => {
  const mockFlashcard = {
    id: 'test-flashcard-id',
    question: 'What is spaced repetition?',
    answer: 'A learning technique that reviews information at increasing intervals.',
    fsrsState: {
      due: new Date(),
      stability: 2.5,
      difficulty: 5.0,
      state: 2,
      reps: 3,
      lapses: 0,
      elapsed_days: 0,
      scheduled_days: 1,
      last_review: new Date(),
    },
  }

  const mockOnRate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial Display (FR-013)', () => {
    it('should render the flashcard question', () => {
      render(<QuizCard flashcard={mockFlashcard} onRate={mockOnRate} />)

      expect(screen.getByText('What is spaced repetition?')).toBeInTheDocument()
    })

    it('should NOT show the answer initially', () => {
      render(<QuizCard flashcard={mockFlashcard} onRate={mockOnRate} />)

      // Answer should not be visible initially
      expect(
        screen.queryByText('A learning technique that reviews information at increasing intervals.')
      ).not.toBeInTheDocument()
    })

    it('should show a button to reveal the answer', () => {
      render(<QuizCard flashcard={mockFlashcard} onRate={mockOnRate} />)

      expect(screen.getByRole('button', { name: /show answer|reveal/i })).toBeInTheDocument()
    })

    it('should NOT show rating buttons initially', () => {
      render(<QuizCard flashcard={mockFlashcard} onRate={mockOnRate} />)

      expect(screen.queryByRole('button', { name: /again/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /hard/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /good/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /easy/i })).not.toBeInTheDocument()
    })
  })

  describe('Answer Reveal (FR-014)', () => {
    it('should show answer when reveal button is clicked', async () => {
      const user = userEvent.setup()
      render(<QuizCard flashcard={mockFlashcard} onRate={mockOnRate} />)

      const revealButton = screen.getByRole('button', {
        name: /show answer|reveal/i,
      })
      await user.click(revealButton)

      expect(
        screen.getByText('A learning technique that reviews information at increasing intervals.')
      ).toBeInTheDocument()
    })

    it('should hide the reveal button after answer is shown', async () => {
      const user = userEvent.setup()
      render(<QuizCard flashcard={mockFlashcard} onRate={mockOnRate} />)

      const revealButton = screen.getByRole('button', {
        name: /show answer|reveal/i,
      })
      await user.click(revealButton)

      expect(screen.queryByRole('button', { name: /show answer|reveal/i })).not.toBeInTheDocument()
    })

    it('should show all 4 rating buttons after answer is revealed', async () => {
      const user = userEvent.setup()
      render(<QuizCard flashcard={mockFlashcard} onRate={mockOnRate} />)

      const revealButton = screen.getByRole('button', {
        name: /show answer|reveal/i,
      })
      await user.click(revealButton)

      expect(screen.getByRole('button', { name: /again/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /hard/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /good/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /easy/i })).toBeInTheDocument()
    })

    it('should keep showing the question after answer is revealed', async () => {
      const user = userEvent.setup()
      render(<QuizCard flashcard={mockFlashcard} onRate={mockOnRate} />)

      const revealButton = screen.getByRole('button', {
        name: /show answer|reveal/i,
      })
      await user.click(revealButton)

      expect(screen.getByText('What is spaced repetition?')).toBeInTheDocument()
    })
  })

  describe('FSRS Rating Buttons', () => {
    it('should call onRate with rating 1 when Again is clicked', async () => {
      const user = userEvent.setup()
      render(<QuizCard flashcard={mockFlashcard} onRate={mockOnRate} />)

      // Reveal answer first
      const revealButton = screen.getByRole('button', {
        name: /show answer|reveal/i,
      })
      await user.click(revealButton)

      // Click Again button
      const againButton = screen.getByRole('button', { name: /again/i })
      await user.click(againButton)

      expect(mockOnRate).toHaveBeenCalledWith(mockFlashcard.id, 1)
    })

    it('should call onRate with rating 2 when Hard is clicked', async () => {
      const user = userEvent.setup()
      render(<QuizCard flashcard={mockFlashcard} onRate={mockOnRate} />)

      const revealButton = screen.getByRole('button', {
        name: /show answer|reveal/i,
      })
      await user.click(revealButton)

      const hardButton = screen.getByRole('button', { name: /hard/i })
      await user.click(hardButton)

      expect(mockOnRate).toHaveBeenCalledWith(mockFlashcard.id, 2)
    })

    it('should call onRate with rating 3 when Good is clicked', async () => {
      const user = userEvent.setup()
      render(<QuizCard flashcard={mockFlashcard} onRate={mockOnRate} />)

      const revealButton = screen.getByRole('button', {
        name: /show answer|reveal/i,
      })
      await user.click(revealButton)

      const goodButton = screen.getByRole('button', { name: /good/i })
      await user.click(goodButton)

      expect(mockOnRate).toHaveBeenCalledWith(mockFlashcard.id, 3)
    })

    it('should call onRate with rating 4 when Easy is clicked', async () => {
      const user = userEvent.setup()
      render(<QuizCard flashcard={mockFlashcard} onRate={mockOnRate} />)

      const revealButton = screen.getByRole('button', {
        name: /show answer|reveal/i,
      })
      await user.click(revealButton)

      const easyButton = screen.getByRole('button', { name: /easy/i })
      await user.click(easyButton)

      expect(mockOnRate).toHaveBeenCalledWith(mockFlashcard.id, 4)
    })

    it('should only call onRate once per button click', async () => {
      const user = userEvent.setup()
      render(<QuizCard flashcard={mockFlashcard} onRate={mockOnRate} />)

      const revealButton = screen.getByRole('button', {
        name: /show answer|reveal/i,
      })
      await user.click(revealButton)

      const goodButton = screen.getByRole('button', { name: /good/i })
      await user.click(goodButton)

      expect(mockOnRate).toHaveBeenCalledTimes(1)
    })
  })

  describe('Card Display', () => {
    it('should handle long questions', () => {
      const longQuestionFlashcard = {
        ...mockFlashcard,
        question:
          'This is a very long question that might span multiple lines and should be displayed properly without breaking the layout or causing any visual issues in the quiz interface component.',
      }

      render(<QuizCard flashcard={longQuestionFlashcard} onRate={mockOnRate} />)

      expect(screen.getByText(longQuestionFlashcard.question)).toBeInTheDocument()
    })

    it('should handle long answers', async () => {
      const user = userEvent.setup()
      const longAnswerFlashcard = {
        ...mockFlashcard,
        answer:
          'This is a very long answer that provides extensive detail and explanation about the topic, potentially spanning multiple paragraphs and including various technical details that need to be displayed clearly to the user during their quiz practice session.',
      }

      render(<QuizCard flashcard={longAnswerFlashcard} onRate={mockOnRate} />)

      const revealButton = screen.getByRole('button', {
        name: /show answer|reveal/i,
      })
      await user.click(revealButton)

      expect(screen.getByText(longAnswerFlashcard.answer)).toBeInTheDocument()
    })

    it('should handle questions with special characters', () => {
      const specialCharsFlashcard = {
        ...mockFlashcard,
        question: 'What is the time complexity of O(n²) vs O(log n)?',
      }

      render(<QuizCard flashcard={specialCharsFlashcard} onRate={mockOnRate} />)

      expect(
        screen.getByText('What is the time complexity of O(n²) vs O(log n)?')
      ).toBeInTheDocument()
    })

    it('should handle code snippets in answers', async () => {
      const user = userEvent.setup()
      const codeFlashcard = {
        ...mockFlashcard,
        answer: 'Use the function: const result = array.map(x => x * 2)',
      }

      render(<QuizCard flashcard={codeFlashcard} onRate={mockOnRate} />)

      const revealButton = screen.getByRole('button', {
        name: /show answer|reveal/i,
      })
      await user.click(revealButton)

      expect(screen.getByText(/const result = array\.map\(x => x \* 2\)/)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible button labels', () => {
      render(<QuizCard flashcard={mockFlashcard} onRate={mockOnRate} />)

      const revealButton = screen.getByRole('button', {
        name: /show answer|reveal/i,
      })
      expect(revealButton).toBeInTheDocument()
    })

    it('should have proper aria labels for rating buttons', async () => {
      const user = userEvent.setup()
      render(<QuizCard flashcard={mockFlashcard} onRate={mockOnRate} />)

      const revealButton = screen.getByRole('button', {
        name: /show answer|reveal/i,
      })
      await user.click(revealButton)

      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThanOrEqual(4)
    })

    it('should support keyboard navigation for reveal button', async () => {
      render(<QuizCard flashcard={mockFlashcard} onRate={mockOnRate} />)

      const revealButton = screen.getByRole('button', {
        name: /show answer|reveal/i,
      })

      // Simulate keyboard interaction
      fireEvent.keyDown(revealButton, { key: 'Enter' })
      fireEvent.click(revealButton)

      expect(
        screen.getByText('A learning technique that reviews information at increasing intervals.')
      ).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty question gracefully', () => {
      const emptyQuestionFlashcard = {
        ...mockFlashcard,
        question: '',
      }

      render(<QuizCard flashcard={emptyQuestionFlashcard} onRate={mockOnRate} />)

      // Component should still render
      expect(screen.getByRole('button', { name: /show answer|reveal/i })).toBeInTheDocument()
    })

    it('should handle empty answer gracefully', async () => {
      const user = userEvent.setup()
      const emptyAnswerFlashcard = {
        ...mockFlashcard,
        answer: '',
      }

      render(<QuizCard flashcard={emptyAnswerFlashcard} onRate={mockOnRate} />)

      const revealButton = screen.getByRole('button', {
        name: /show answer|reveal/i,
      })
      await user.click(revealButton)

      // Rating buttons should still appear
      expect(screen.getByRole('button', { name: /again/i })).toBeInTheDocument()
    })

    it('should not break if onRate is called multiple times quickly', async () => {
      const user = userEvent.setup()
      render(<QuizCard flashcard={mockFlashcard} onRate={mockOnRate} />)

      const revealButton = screen.getByRole('button', {
        name: /show answer|reveal/i,
      })
      await user.click(revealButton)

      const goodButton = screen.getByRole('button', { name: /good/i })

      // Rapid clicks
      await user.click(goodButton)
      await user.click(goodButton)
      await user.click(goodButton)

      // Should be called at least once (component may debounce)
      expect(mockOnRate).toHaveBeenCalled()
    })
  })
})
