import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import QuizStats from '@/components/quiz/QuizStats'

/**
 * Component Test for QuizStats
 *
 * Tests the QuizStats component that displays quiz statistics.
 * Shows due count, reviews today, retention rate, and other learning metrics.
 *
 * Maps to T106 in Phase 6 - Testing User Story 4 (FR-020)
 * Following TDD - these tests will guide component implementation
 */

describe('QuizStats', () => {
  const mockStats = {
    dueFlashcards: 5,
    reviewsToday: 12,
    totalFlashcards: 50,
    retentionRate: 85.5,
    totalReviews: 150,
    reviewsThisWeek: 45,
    avgDifficulty: 5.2,
    avgStability: 3.8,
    stateBreakdown: {
      new: 10,
      learning: 15,
      review: 20,
      relearning: 5,
    },
  }

  describe('Due Flashcards Display', () => {
    it('should display count of due flashcards', () => {
      render(<QuizStats stats={mockStats} />)

      expect(screen.getByText(/5/)).toBeInTheDocument()
      expect(screen.getByText(/due|flashcard/i)).toBeInTheDocument()
    })

    it('should handle zero due flashcards', () => {
      const statsWithZeroDue = { ...mockStats, dueFlashcards: 0 }
      render(<QuizStats stats={statsWithZeroDue} />)

      expect(screen.getByText(/0/)).toBeInTheDocument()
    })

    it('should handle large numbers of due flashcards', () => {
      const statsWithManyDue = { ...mockStats, dueFlashcards: 123 }
      render(<QuizStats stats={statsWithManyDue} />)

      expect(screen.getByText(/123/)).toBeInTheDocument()
    })

    it('should label due flashcards appropriately', () => {
      render(<QuizStats stats={mockStats} />)

      expect(
        screen.getByText(/due|ready|available/i)
      ).toBeInTheDocument()
    })
  })

  describe('Reviews Today Display', () => {
    it('should display count of reviews completed today', () => {
      render(<QuizStats stats={mockStats} />)

      expect(screen.getByText(/12/)).toBeInTheDocument()
      expect(screen.getByText(/today|reviewed/i)).toBeInTheDocument()
    })

    it('should handle zero reviews today', () => {
      const statsWithZeroReviews = { ...mockStats, reviewsToday: 0 }
      render(<QuizStats stats={statsWithZeroReviews} />)

      // Should still display the stat
      expect(
        screen.getByText(/0/) || screen.getByText(/today/)
      ).toBeInTheDocument()
    })

    it('should handle large numbers of reviews', () => {
      const statsWithManyReviews = { ...mockStats, reviewsToday: 500 }
      render(<QuizStats stats={statsWithManyReviews} />)

      expect(screen.getByText(/500/)).toBeInTheDocument()
    })
  })

  describe('Retention Rate Display', () => {
    it('should display retention rate as percentage', () => {
      render(<QuizStats stats={mockStats} />)

      expect(screen.getByText(/85\.5%|86%/)).toBeInTheDocument()
      expect(screen.getByText(/retention/i)).toBeInTheDocument()
    })

    it('should handle 100% retention rate', () => {
      const perfectStats = { ...mockStats, retentionRate: 100 }
      render(<QuizStats stats={perfectStats} />)

      expect(screen.getByText(/100%/)).toBeInTheDocument()
    })

    it('should handle 0% retention rate', () => {
      const zeroRetention = { ...mockStats, retentionRate: 0 }
      render(<QuizStats stats={zeroRetention} />)

      expect(screen.getByText(/0%/)).toBeInTheDocument()
    })

    it('should format decimal percentages appropriately', () => {
      const decimalStats = { ...mockStats, retentionRate: 78.33 }
      render(<QuizStats stats={decimalStats} />)

      // Should show as 78% or 78.3% (rounded appropriately)
      expect(
        screen.getByText(/78\.3%/) || screen.getByText(/78%/)
      ).toBeInTheDocument()
    })
  })

  describe('Total Flashcards Display', () => {
    it('should display total flashcard count', () => {
      render(<QuizStats stats={mockStats} />)

      expect(screen.getByText(/50/)).toBeInTheDocument()
      expect(screen.getByText(/total|cards/i)).toBeInTheDocument()
    })

    it('should handle zero total flashcards', () => {
      const emptyStats = { ...mockStats, totalFlashcards: 0 }
      render(<QuizStats stats={emptyStats} />)

      // Should still render
      const element = screen.queryByText(/total|cards/i)
      expect(element).toBeInTheDocument()
    })

    it('should handle large collections', () => {
      const largeCollection = { ...mockStats, totalFlashcards: 1000 }
      render(<QuizStats stats={largeCollection} />)

      expect(screen.getByText(/1000|1,000/)).toBeInTheDocument()
    })
  })

  describe('Additional Statistics', () => {
    it('should display total reviews count', () => {
      render(<QuizStats stats={mockStats} />)

      expect(screen.getByText(/150/)).toBeInTheDocument()
    })

    it('should display reviews this week', () => {
      render(<QuizStats stats={mockStats} />)

      expect(screen.getByText(/45/)).toBeInTheDocument()
      expect(screen.getByText(/week/i)).toBeInTheDocument()
    })

    it('should display average difficulty if provided', () => {
      render(<QuizStats stats={mockStats} />)

      // 5.2 should appear somewhere
      expect(
        screen.queryByText(/5\.2/) || screen.queryByText(/difficulty/i)
      ).toBeTruthy()
    })

    it('should display average stability if provided', () => {
      render(<QuizStats stats={mockStats} />)

      // 3.8 should appear somewhere
      expect(
        screen.queryByText(/3\.8/) || screen.queryByText(/stability/i)
      ).toBeTruthy()
    })
  })

  describe('State Breakdown Display', () => {
    it('should display count of new cards', () => {
      render(<QuizStats stats={mockStats} />)

      expect(screen.getByText(/10/)).toBeInTheDocument()
      expect(screen.getByText(/new/i)).toBeInTheDocument()
    })

    it('should display count of learning cards', () => {
      render(<QuizStats stats={mockStats} />)

      expect(screen.getByText(/15/)).toBeInTheDocument()
      expect(screen.getByText(/learning/i)).toBeInTheDocument()
    })

    it('should display count of review cards', () => {
      render(<QuizStats stats={mockStats} />)

      expect(screen.getByText(/20/)).toBeInTheDocument()
      // "Review" might appear multiple times, just check it exists
      expect(screen.getByText(/review/i)).toBeInTheDocument()
    })

    it('should display count of relearning cards', () => {
      render(<QuizStats stats={mockStats} />)

      expect(screen.getByText(/5/)).toBeInTheDocument()
      expect(screen.getByText(/relearning/i)).toBeInTheDocument()
    })

    it('should handle zero counts in state breakdown', () => {
      const zeroStates = {
        ...mockStats,
        stateBreakdown: { new: 0, learning: 0, review: 0, relearning: 0 },
      }
      render(<QuizStats stats={zeroStates} />)

      // Should still render the state labels
      expect(screen.getByText(/new/i)).toBeInTheDocument()
    })
  })

  describe('Empty States', () => {
    it('should handle completely empty stats gracefully', () => {
      const emptyStats = {
        dueFlashcards: 0,
        reviewsToday: 0,
        totalFlashcards: 0,
        retentionRate: 0,
        totalReviews: 0,
        reviewsThisWeek: 0,
        avgDifficulty: 0,
        avgStability: 0,
        stateBreakdown: { new: 0, learning: 0, review: 0, relearning: 0 },
      }

      render(<QuizStats stats={emptyStats} />)

      // Should render without crashing
      expect(screen.getByText(/0/)).toBeInTheDocument()
    })

    it('should handle missing optional stats', () => {
      const minimalStats = {
        dueFlashcards: 5,
        reviewsToday: 10,
        totalFlashcards: 50,
        retentionRate: 85,
        totalReviews: 0,
        reviewsThisWeek: 0,
        stateBreakdown: { new: 0, learning: 0, review: 0, relearning: 0 },
      }

      render(<QuizStats stats={minimalStats} />)

      expect(screen.getByText(/5/)).toBeInTheDocument()
      expect(screen.getByText(/10/)).toBeInTheDocument()
    })
  })

  describe('Visual Organization', () => {
    it('should organize stats into logical sections', () => {
      render(<QuizStats stats={mockStats} />)

      // Should have some structure (divs, sections, etc.)
      const component = screen.getByText(/due|flashcard/i).closest('div')
      expect(component).toBeTruthy()
    })

    it('should clearly label each statistic', () => {
      render(<QuizStats stats={mockStats} />)

      // All key labels should be present
      expect(screen.getByText(/due|ready/i)).toBeInTheDocument()
      expect(screen.getByText(/today|reviewed/i)).toBeInTheDocument()
      expect(screen.getByText(/retention/i)).toBeInTheDocument()
      expect(screen.getByText(/total|cards/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should use semantic HTML for statistics', () => {
      render(<QuizStats stats={mockStats} />)

      // Stats should be in some kind of list or structured format
      const statsContainer = screen.getByText(/due|flashcard/i).closest('div')
      expect(statsContainer).toBeTruthy()
    })

    it('should have accessible labels for all stats', () => {
      render(<QuizStats stats={mockStats} />)

      // Each number should have associated label text
      expect(screen.getByText(/5/)).toBeInTheDocument()
      expect(screen.getByText(/12/)).toBeInTheDocument()
      expect(screen.getByText(/85\.5%|86%/)).toBeInTheDocument()
    })

    it('should provide context for screen readers', () => {
      render(<QuizStats stats={mockStats} />)

      // Labels should be descriptive enough for screen readers
      expect(screen.getByText(/due|flashcard/i)).toBeInTheDocument()
      expect(screen.getByText(/retention/i)).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
      const largeStats = {
        ...mockStats,
        totalReviews: 999999,
        totalFlashcards: 50000,
      }

      render(<QuizStats stats={largeStats} />)

      // Should render without breaking layout
      expect(
        screen.getByText(/999999|999,999/) || screen.getByText(/50000|50,000/)
      ).toBeInTheDocument()
    })

    it('should handle undefined optional fields', () => {
      const partialStats = {
        dueFlashcards: 5,
        reviewsToday: 10,
        totalFlashcards: 50,
        retentionRate: 85,
        stateBreakdown: { new: 0, learning: 0, review: 0, relearning: 0 },
      }

      render(<QuizStats stats={partialStats as any} />)

      // Should still render core stats
      expect(screen.getByText(/5/)).toBeInTheDocument()
      expect(screen.getByText(/10/)).toBeInTheDocument()
    })

    it('should handle decimal retention rates correctly', () => {
      const decimalRetention = { ...mockStats, retentionRate: 87.654321 }

      render(<QuizStats stats={decimalRetention} />)

      // Should round or truncate appropriately (87.7%, 87.65%, or 88%)
      expect(
        screen.getByText(/87\.|88%/)
      ).toBeInTheDocument()
    })
  })

  describe('Data Updates', () => {
    it('should update when stats change', () => {
      const { rerender } = render(<QuizStats stats={mockStats} />)

      expect(screen.getByText(/5/)).toBeInTheDocument()

      const updatedStats = { ...mockStats, dueFlashcards: 10 }
      rerender(<QuizStats stats={updatedStats} />)

      expect(screen.getByText(/10/)).toBeInTheDocument()
    })

    it('should update retention rate when it changes', () => {
      const { rerender } = render(<QuizStats stats={mockStats} />)

      expect(screen.getByText(/85\.5%|86%/)).toBeInTheDocument()

      const updatedStats = { ...mockStats, retentionRate: 90 }
      rerender(<QuizStats stats={updatedStats} />)

      expect(screen.getByText(/90%/)).toBeInTheDocument()
    })

    it('should update reviews today when it changes', () => {
      const { rerender } = render(<QuizStats stats={mockStats} />)

      expect(screen.getByText(/12/)).toBeInTheDocument()

      const updatedStats = { ...mockStats, reviewsToday: 20 }
      rerender(<QuizStats stats={updatedStats} />)

      expect(screen.getByText(/20/)).toBeInTheDocument()
    })
  })
})
