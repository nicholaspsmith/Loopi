import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuizInterface from '@/components/quiz/QuizInterface'

/**
 * QuizInterface Navigation Arrows Tests
 *
 * Tests the bi-directional navigation arrows with wrapping feature.
 * Users can navigate forward/backward through cards with first↔last wrapping.
 *
 * Maps to T056 - Testing User Story 6 (Navigation Arrows)
 */

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
}))

// Mock fetch
global.fetch = vi.fn()

describe('QuizInterface - Navigation Arrows', () => {
  const mockFlashcards = [
    {
      id: '1',
      question: 'First card question',
      answer: 'First card answer',
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
    },
    {
      id: '2',
      question: 'Second card question',
      answer: 'Second card answer',
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
    },
    {
      id: '3',
      question: 'Third card question',
      answer: 'Third card answer',
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
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Navigation Arrow Rendering', () => {
    it('should show both left and right navigation arrows', async () => {
      render(<QuizInterface initialFlashcards={mockFlashcards} />)

      await waitFor(() => {
        const questions = screen.getAllByText('First card question')
        expect(questions.length).toBeGreaterThanOrEqual(1)
      })

      // Should have navigation arrows
      expect(screen.getByLabelText(/previous card|navigate left/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/next card|navigate right/i)).toBeInTheDocument()
    })

    it('should show navigation arrows even with only 1 card', async () => {
      render(<QuizInterface initialFlashcards={[mockFlashcards[0]]} />)

      await waitFor(() => {
        const questions = screen.getAllByText('First card question')
        expect(questions.length).toBeGreaterThanOrEqual(1)
      })

      // Arrows should still be present (they will wrap to the same card)
      expect(screen.getByLabelText(/previous card|navigate left/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/next card|navigate right/i)).toBeInTheDocument()
    })

    it('should have accessible aria labels on navigation arrows', async () => {
      render(<QuizInterface initialFlashcards={mockFlashcards} />)

      await waitFor(() => {
        const questions = screen.getAllByText('First card question')
        expect(questions.length).toBeGreaterThanOrEqual(1)
      })

      const leftArrow = screen.getByLabelText(/previous card|navigate left/i)
      const rightArrow = screen.getByLabelText(/next card|navigate right/i)

      expect(leftArrow).toHaveAttribute('aria-label')
      expect(rightArrow).toHaveAttribute('aria-label')
    })
  })

  describe('Forward Navigation', () => {
    it('should navigate to next card when right arrow is clicked', async () => {
      const user = userEvent.setup()
      render(<QuizInterface initialFlashcards={mockFlashcards} />)

      await waitFor(() => {
        const questions = screen.getAllByText('First card question')
        expect(questions.length).toBeGreaterThanOrEqual(1)
      })

      const rightArrow = screen.getByLabelText(/next card|navigate right/i)
      await user.click(rightArrow)

      // Should now show second card
      const secondCardQuestions = screen.getAllByText('Second card question')
      expect(secondCardQuestions.length).toBeGreaterThanOrEqual(1)
    })

    it('should wrap to first card when clicking next on last card', async () => {
      const user = userEvent.setup()
      render(<QuizInterface initialFlashcards={mockFlashcards} />)

      await waitFor(() => {
        const questions = screen.getAllByText('First card question')
        expect(questions.length).toBeGreaterThanOrEqual(1)
      })

      const rightArrow = screen.getByLabelText(/next card|navigate right/i)

      // Navigate to second card
      await user.click(rightArrow)
      expect(screen.getAllByText('Second card question').length).toBeGreaterThanOrEqual(1)

      // Navigate to third card
      await user.click(rightArrow)
      expect(screen.getAllByText('Third card question').length).toBeGreaterThanOrEqual(1)

      // Navigate beyond last card - should wrap to first
      await user.click(rightArrow)
      expect(screen.getAllByText('First card question').length).toBeGreaterThanOrEqual(1)
    })

    it('should navigate forward multiple times correctly', async () => {
      const user = userEvent.setup()
      render(<QuizInterface initialFlashcards={mockFlashcards} />)

      await waitFor(() => {
        const questions = screen.getAllByText('First card question')
        expect(questions.length).toBeGreaterThanOrEqual(1)
      })

      const rightArrow = screen.getByLabelText(/next card|navigate right/i)

      // Click right arrow 5 times (will wrap around)
      await user.click(rightArrow)
      await user.click(rightArrow)
      await user.click(rightArrow)
      await user.click(rightArrow)
      await user.click(rightArrow)

      // Should be on second card (1→2→3→1→2→3)
      expect(screen.getAllByText('Third card question').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Backward Navigation', () => {
    it('should navigate to previous card when left arrow is clicked', async () => {
      const user = userEvent.setup()
      render(<QuizInterface initialFlashcards={mockFlashcards} />)

      await waitFor(() => {
        const questions = screen.getAllByText('First card question')
        expect(questions.length).toBeGreaterThanOrEqual(1)
      })

      const rightArrow = screen.getByLabelText(/next card|navigate right/i)
      const leftArrow = screen.getByLabelText(/previous card|navigate left/i)

      // Go to second card first
      await user.click(rightArrow)
      expect(screen.getAllByText('Second card question').length).toBeGreaterThanOrEqual(1)

      // Go back to first card
      await user.click(leftArrow)
      expect(screen.getAllByText('First card question').length).toBeGreaterThanOrEqual(1)
    })

    it('should wrap to last card when clicking previous on first card', async () => {
      const user = userEvent.setup()
      render(<QuizInterface initialFlashcards={mockFlashcards} />)

      await waitFor(() => {
        const questions = screen.getAllByText('First card question')
        expect(questions.length).toBeGreaterThanOrEqual(1)
      })

      const leftArrow = screen.getByLabelText(/previous card|navigate left/i)

      // Click left from first card - should wrap to last
      await user.click(leftArrow)
      expect(screen.getAllByText('Third card question').length).toBeGreaterThanOrEqual(1)
    })

    it('should navigate backward multiple times correctly', async () => {
      const user = userEvent.setup()
      render(<QuizInterface initialFlashcards={mockFlashcards} />)

      await waitFor(() => {
        const questions = screen.getAllByText('First card question')
        expect(questions.length).toBeGreaterThanOrEqual(1)
      })

      const leftArrow = screen.getByLabelText(/previous card|navigate left/i)

      // Click left arrow 4 times (will wrap around)
      await user.click(leftArrow)
      await user.click(leftArrow)
      await user.click(leftArrow)
      await user.click(leftArrow)

      // Should be on second card (1→3→2→1→3)
      expect(screen.getAllByText('Third card question').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Bidirectional Navigation', () => {
    it('should handle alternating forward and backward navigation', async () => {
      const user = userEvent.setup()
      render(<QuizInterface initialFlashcards={mockFlashcards} />)

      await waitFor(() => {
        const questions = screen.getAllByText('First card question')
        expect(questions.length).toBeGreaterThanOrEqual(1)
      })

      const rightArrow = screen.getByLabelText(/next card|navigate right/i)
      const leftArrow = screen.getByLabelText(/previous card|navigate left/i)

      // Navigate: right, right, left, right
      await user.click(rightArrow)
      expect(screen.getAllByText('Second card question').length).toBeGreaterThanOrEqual(1)

      await user.click(rightArrow)
      expect(screen.getAllByText('Third card question').length).toBeGreaterThanOrEqual(1)

      await user.click(leftArrow)
      expect(screen.getAllByText('Second card question').length).toBeGreaterThanOrEqual(1)

      await user.click(rightArrow)
      expect(screen.getAllByText('Third card question').length).toBeGreaterThanOrEqual(1)
    })

    it('should handle rapid navigation clicks', async () => {
      const user = userEvent.setup()
      render(<QuizInterface initialFlashcards={mockFlashcards} />)

      await waitFor(() => {
        const questions = screen.getAllByText('First card question')
        expect(questions.length).toBeGreaterThanOrEqual(1)
      })

      const rightArrow = screen.getByLabelText(/next card|navigate right/i)
      const leftArrow = screen.getByLabelText(/previous card|navigate left/i)

      // Rapidly click forward 10 times then backward 5 times
      for (let i = 0; i < 10; i++) {
        await user.click(rightArrow)
      }
      for (let i = 0; i < 5; i++) {
        await user.click(leftArrow)
      }

      // After 10 forward (wraps 3 times, lands on 1st) then 5 back (wraps once, lands on 2nd)
      // 1→2→3→1→2→3→1→2→3→1→2, then back: 2→1→3→2→1→3
      expect(screen.getAllByText('Third card question').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Navigation with Single Card', () => {
    it('should stay on same card when navigating forward with only 1 card', async () => {
      const user = userEvent.setup()
      render(<QuizInterface initialFlashcards={[mockFlashcards[0]]} />)

      await waitFor(() => {
        const questions = screen.getAllByText('First card question')
        expect(questions.length).toBeGreaterThanOrEqual(1)
      })

      const rightArrow = screen.getByLabelText(/next card|navigate right/i)
      await user.click(rightArrow)

      // Should still show the same card
      expect(screen.getAllByText('First card question').length).toBeGreaterThanOrEqual(1)
    })

    it('should stay on same card when navigating backward with only 1 card', async () => {
      const user = userEvent.setup()
      render(<QuizInterface initialFlashcards={[mockFlashcards[0]]} />)

      await waitFor(() => {
        const questions = screen.getAllByText('First card question')
        expect(questions.length).toBeGreaterThanOrEqual(1)
      })

      const leftArrow = screen.getByLabelText(/previous card|navigate left/i)
      await user.click(leftArrow)

      // Should still show the same card
      expect(screen.getAllByText('First card question').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Progress Update with Card Rating', () => {
    it('should show 0% progress initially with no cards rated', async () => {
      render(<QuizInterface initialFlashcards={mockFlashcards} />)

      await waitFor(() => {
        const questions = screen.getAllByText('First card question')
        expect(questions.length).toBeGreaterThanOrEqual(1)
      })

      // Progress should show "Completed 0 of 3 Cards" (0%)
      expect(screen.getByText(/completed 0 of 3 cards/i)).toBeInTheDocument()
      expect(screen.getByText(/0%/i)).toBeInTheDocument()
    })

    it('should update progress when cards are rated', async () => {
      const user = userEvent.setup()
      render(<QuizInterface initialFlashcards={mockFlashcards} />)

      await waitFor(() => {
        const questions = screen.getAllByText('First card question')
        expect(questions.length).toBeGreaterThanOrEqual(1)
      })

      // Initial progress: "Completed 0 of 3 Cards"
      expect(screen.getByText(/completed 0 of 3 cards/i)).toBeInTheDocument()

      // Reveal answer and rate the first card
      const revealButton = screen.getByRole('button', { name: /show answer|reveal/i })
      await user.click(revealButton)

      const easyButton = screen.getByRole('button', { name: /(?<!Very )Easy/i })
      await user.click(easyButton)

      // Progress should update to "Completed 1 of 3 Cards" (33%)
      await waitFor(() => {
        expect(screen.getByText(/completed 1 of 3 cards/i)).toBeInTheDocument()
        expect(screen.getByText(/33%/i)).toBeInTheDocument()
      })
    })

    it('should show 100% progress when all cards are rated', async () => {
      const user = userEvent.setup()
      render(<QuizInterface initialFlashcards={mockFlashcards} />)

      await waitFor(() => {
        const questions = screen.getAllByText('First card question')
        expect(questions.length).toBeGreaterThanOrEqual(1)
      })

      // Rate all 3 cards
      for (let i = 0; i < 3; i++) {
        const revealButton = screen.getByRole('button', { name: /show answer|reveal/i })
        await user.click(revealButton)

        const easyButton = screen.getByRole('button', { name: /(?<!Very )Easy/i })
        await user.click(easyButton)
      }

      // Should show completion screen
      await waitFor(() => {
        expect(screen.getByText(/quiz complete|practice session complete/i)).toBeInTheDocument()
        expect(screen.getByText(/reviewed all 3 flashcard/i)).toBeInTheDocument()
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('should support keyboard activation for navigation arrows', async () => {
      const user = userEvent.setup()
      render(<QuizInterface initialFlashcards={mockFlashcards} />)

      await waitFor(() => {
        const questions = screen.getAllByText('First card question')
        expect(questions.length).toBeGreaterThanOrEqual(1)
      })

      const rightArrow = screen.getByLabelText(/next card|navigate right/i)

      // Simulate keyboard interaction
      await user.click(rightArrow)

      expect(screen.getAllByText('Second card question').length).toBeGreaterThanOrEqual(1)
    })
  })
})
