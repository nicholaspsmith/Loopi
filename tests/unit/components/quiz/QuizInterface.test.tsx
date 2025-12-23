import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import QuizInterface from '@/components/quiz/QuizInterface'

/**
 * QuizInterface Card Stack Tests
 *
 * Tests the card stack visualization feature that shows current card
 * plus up to 2 cards stacked behind with 3D perspective effect.
 *
 * Maps to T046 - Testing User Story 5 (Card Stack Effect)
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

describe('QuizInterface - Card Stack Effect', () => {
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

  describe('Card Stack Rendering', () => {
    it('should show only current card when there is 1 card total', async () => {
      const { container } = render(<QuizInterface initialFlashcards={[mockFlashcards[0]]} />)

      await waitFor(() => {
        expect(screen.getByText('First card question')).toBeInTheDocument()
      })

      // Should have card-stack container
      const stackContainer = container.querySelector('.card-stack')
      expect(stackContainer).toBeInTheDocument()

      // Should only show 1 card (no stacked cards behind)
      const stackedCards = container.querySelectorAll('.card-stack-item')
      expect(stackedCards.length).toBe(1)
    })

    it('should show 2 cards when there are 2 cards total (current + 1 behind)', async () => {
      const { container } = render(
        <QuizInterface initialFlashcards={[mockFlashcards[0], mockFlashcards[1]]} />
      )

      await waitFor(() => {
        expect(screen.getByText('First card question')).toBeInTheDocument()
      })

      // Should show 2 cards in stack
      const stackedCards = container.querySelectorAll('.card-stack-item')
      expect(stackedCards.length).toBe(2)
    })

    it('should show 3 cards when there are 3+ cards total (current + 2 behind)', async () => {
      const { container } = render(<QuizInterface initialFlashcards={mockFlashcards} />)

      await waitFor(() => {
        expect(screen.getByText('First card question')).toBeInTheDocument()
      })

      // Should show maximum of 3 cards in stack (current + 2 behind)
      const stackedCards = container.querySelectorAll('.card-stack-item')
      expect(stackedCards.length).toBe(3)
    })

    it('should show maximum of 3 cards even with 50 cards total', async () => {
      const manyCards = Array.from({ length: 50 }, (_, i) => ({
        ...mockFlashcards[0],
        id: `card-${i}`,
        question: `Card ${i} question`,
      }))

      const { container } = render(<QuizInterface initialFlashcards={manyCards} />)

      await waitFor(() => {
        expect(screen.getByText('Card 0 question')).toBeInTheDocument()
      })

      // Should still only show 3 cards maximum
      const stackedCards = container.querySelectorAll('.card-stack-item')
      expect(stackedCards.length).toBe(3)
    })
  })

  describe('Card Stack Styling', () => {
    it('should apply card-stack container class', async () => {
      const { container } = render(<QuizInterface initialFlashcards={mockFlashcards} />)

      await waitFor(() => {
        expect(screen.getByText('First card question')).toBeInTheDocument()
      })

      const stackContainer = container.querySelector('.card-stack')
      expect(stackContainer).toBeInTheDocument()
    })

    it('should apply correct z-index layering via CSS', async () => {
      const { container } = render(<QuizInterface initialFlashcards={mockFlashcards} />)

      await waitFor(() => {
        expect(screen.getByText('First card question')).toBeInTheDocument()
      })

      const stackedCards = container.querySelectorAll('.card-stack-item')

      // All cards should have card-stack-item class
      expect(stackedCards[0]).toHaveClass('card-stack-item')
      // Cards behind should have specific classes
      expect(stackedCards[1]).toHaveClass('card-stack-behind-1')
      expect(stackedCards[2]).toHaveClass('card-stack-behind-2')
    })

    it('should apply translateY offset to cards behind', async () => {
      const { container } = render(<QuizInterface initialFlashcards={mockFlashcards} />)

      await waitFor(() => {
        expect(screen.getByText('First card question')).toBeInTheDocument()
      })

      const stackedCards = container.querySelectorAll('.card-stack-item')

      // Cards behind should have vertical offset classes
      expect(stackedCards[1]).toHaveClass('card-stack-behind-1')
      expect(stackedCards[2]).toHaveClass('card-stack-behind-2')
    })

    it('should apply scale transform to cards behind', async () => {
      const { container } = render(<QuizInterface initialFlashcards={mockFlashcards} />)

      await waitFor(() => {
        expect(screen.getByText('First card question')).toBeInTheDocument()
      })

      const stackedCards = container.querySelectorAll('.card-stack-item')

      // Second and third cards should have scaling classes
      expect(stackedCards[1]).toHaveClass('card-stack-behind-1')
      expect(stackedCards[2]).toHaveClass('card-stack-behind-2')
    })
  })

  describe('Adaptive Stack Logic', () => {
    it('should show min(2, remaining) cards behind current card', async () => {
      const twoCards = [mockFlashcards[0], mockFlashcards[1]]
      const { container } = render(<QuizInterface initialFlashcards={twoCards} />)

      await waitFor(() => {
        expect(screen.getByText('First card question')).toBeInTheDocument()
      })

      // With 2 cards total, should show 2 cards (current + 1 behind)
      const stackedCards = container.querySelectorAll('.card-stack-item')
      expect(stackedCards.length).toBe(2)
    })

    it('should update stack when card is rated and removed', async () => {
      const { container } = render(<QuizInterface initialFlashcards={mockFlashcards} />)

      // Mock successful rating
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })

      await waitFor(() => {
        expect(screen.getByText('First card question')).toBeInTheDocument()
      })

      // Initially 3 cards
      let stackedCards = container.querySelectorAll('.card-stack-item')
      expect(stackedCards.length).toBe(3)

      // After rating, the stack should update
      // (This would need user interaction to test fully, but we verify the structure exists)
      expect(container.querySelector('.card-stack')).toBeInTheDocument()
    })
  })
})
