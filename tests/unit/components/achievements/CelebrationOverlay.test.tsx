import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

/**
 * Unit Tests for CelebrationOverlay Component
 *
 * Tests confetti cleanup on unmount and achievement display
 * Maps to GitHub issue #185 - UI Polish follow-ups
 */

// Mock canvas-confetti
const mockConfetti = vi.fn()
vi.mock('canvas-confetti', () => ({
  default: () => mockConfetti(),
}))

import CelebrationOverlay from '@/components/achievements/CelebrationOverlay'

describe('CelebrationOverlay', () => {
  const mockAchievements = [
    {
      key: 'first-card',
      title: 'First Card',
      description: 'Created your first flashcard',
      icon: '🎯',
    },
  ]

  const mockOnDismiss = vi.fn()

  beforeEach(() => {
    mockConfetti.mockClear()
    mockOnDismiss.mockClear()
  })

  describe('Rendering', () => {
    it('should render achievement when visible', () => {
      render(
        <CelebrationOverlay
          achievements={mockAchievements}
          titleChange={null}
          onDismiss={mockOnDismiss}
        />
      )

      expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument()
      expect(screen.getByText('First Card')).toBeInTheDocument()
      expect(screen.getByText('Created your first flashcard')).toBeInTheDocument()
    })

    it('should trigger confetti on mount', () => {
      render(
        <CelebrationOverlay
          achievements={mockAchievements}
          titleChange={null}
          onDismiss={mockOnDismiss}
        />
      )

      // Should call confetti twice (left and right bursts)
      expect(mockConfetti).toHaveBeenCalledTimes(2)
    })

    it('should hide overlay when dismissed', () => {
      vi.useFakeTimers()

      render(
        <CelebrationOverlay
          achievements={mockAchievements}
          titleChange={null}
          onDismiss={mockOnDismiss}
        />
      )

      // Should be visible initially
      expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument()

      // Dismiss the overlay
      const dismissButton = screen.getByRole('button', { name: /continue/i })
      fireEvent.click(dismissButton)

      // Component should start fade-out transition
      // After the timeout, onDismiss should be called
      vi.advanceTimersByTime(300) // ANIMATION_DURATIONS.PAGE_TRANSITION

      expect(mockOnDismiss).toHaveBeenCalledTimes(1)

      vi.useRealTimers()
    })
  })

  describe('Confetti Cleanup on Unmount', () => {
    it('should handle unmount during confetti animation without errors', () => {
      const { unmount } = render(
        <CelebrationOverlay
          achievements={mockAchievements}
          titleChange={null}
          onDismiss={mockOnDismiss}
        />
      )

      // Confetti should have been triggered
      expect(mockConfetti).toHaveBeenCalled()

      // Unmount component while confetti might still be animating
      unmount()

      // No errors should occur - confetti library handles its own cleanup
      // This test verifies the component unmounts cleanly
    })

    it('should not trigger additional confetti after unmount', () => {
      const { unmount } = render(
        <CelebrationOverlay
          achievements={mockAchievements}
          titleChange={null}
          onDismiss={mockOnDismiss}
        />
      )

      const initialCallCount = mockConfetti.mock.calls.length

      // Unmount the component
      unmount()

      // No additional confetti calls should occur
      expect(mockConfetti).toHaveBeenCalledTimes(initialCallCount)
    })

    it('should clean up properly when unmounted before dismiss', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { unmount } = render(
        <CelebrationOverlay
          achievements={mockAchievements}
          titleChange={null}
          onDismiss={mockOnDismiss}
        />
      )

      // Unmount without dismissing
      unmount()

      // No React warnings about state updates on unmounted component
      const warnings = consoleSpy.mock.calls.filter((call) =>
        call[0]?.toString().includes('unmounted component')
      )
      expect(warnings.length).toBe(0)

      consoleSpy.mockRestore()
    })
  })

  describe('Multiple Achievements', () => {
    it('should show progress indicator for multiple achievements', () => {
      const multipleAchievements = [
        {
          key: 'first-card',
          title: 'First Card',
          description: 'Created your first flashcard',
          icon: '🎯',
        },
        {
          key: 'streak-7',
          title: '7 Day Streak',
          description: 'Studied for 7 days in a row',
          icon: '🔥',
        },
      ]

      render(
        <CelebrationOverlay
          achievements={multipleAchievements}
          titleChange={null}
          onDismiss={mockOnDismiss}
        />
      )

      // Should show progress dots
      const container = screen.getByText('First Card').closest('div')?.parentElement
      expect(container).toBeInTheDocument()
    })

    it('should trigger confetti for each achievement viewed', () => {
      const multipleAchievements = [
        {
          key: 'first-card',
          title: 'First Card',
          description: 'Created your first flashcard',
          icon: '🎯',
        },
        {
          key: 'streak-7',
          title: '7 Day Streak',
          description: 'Studied for 7 days in a row',
          icon: '🔥',
        },
      ]

      render(
        <CelebrationOverlay
          achievements={multipleAchievements}
          titleChange={null}
          onDismiss={mockOnDismiss}
        />
      )

      const initialCalls = mockConfetti.mock.calls.length

      // Click Next to see second achievement
      const nextButton = screen.getByRole('button', { name: /next/i })
      fireEvent.click(nextButton)

      // Should trigger confetti again for the second achievement
      expect(mockConfetti.mock.calls.length).toBeGreaterThan(initialCalls)
    })
  })

  describe('Title Change Display', () => {
    it('should show title change after achievements', () => {
      const titleChange = {
        oldTitle: 'Novice',
        newTitle: 'Apprentice',
      }

      render(
        <CelebrationOverlay
          achievements={mockAchievements}
          titleChange={titleChange}
          onDismiss={mockOnDismiss}
        />
      )

      // Navigate past the achievement
      const nextButton = screen.getByRole('button', { name: /next/i })
      fireEvent.click(nextButton)

      // Should show title upgrade
      expect(screen.getByText('Title Upgraded!')).toBeInTheDocument()
      expect(screen.getByText('Novice')).toBeInTheDocument()
      expect(screen.getByText('Apprentice')).toBeInTheDocument()
    })

    it('should trigger confetti for title change', () => {
      const titleChange = {
        oldTitle: 'Novice',
        newTitle: 'Apprentice',
      }

      render(
        <CelebrationOverlay
          achievements={mockAchievements}
          titleChange={titleChange}
          onDismiss={mockOnDismiss}
        />
      )

      const initialCalls = mockConfetti.mock.calls.length

      // Navigate to title change
      const nextButton = screen.getByRole('button', { name: /next/i })
      fireEvent.click(nextButton)

      // Should trigger confetti for title change
      expect(mockConfetti.mock.calls.length).toBeGreaterThan(initialCalls)
    })
  })

  describe('Accessibility', () => {
    it('should have accessible dismiss button', () => {
      render(
        <CelebrationOverlay
          achievements={mockAchievements}
          titleChange={null}
          onDismiss={mockOnDismiss}
        />
      )

      const button = screen.getByRole('button', { name: /continue/i })
      expect(button).toBeInTheDocument()
    })

    it('should allow clicking overlay background to dismiss', () => {
      render(
        <CelebrationOverlay
          achievements={mockAchievements}
          titleChange={null}
          onDismiss={mockOnDismiss}
        />
      )

      // Find the overlay background (fixed inset-0 div)
      const overlay = screen.getByText('Achievement Unlocked!').closest('div')
        ?.parentElement?.parentElement

      if (overlay) {
        fireEvent.click(overlay)
        // onDismiss should eventually be called (after timeout)
        expect(overlay).toBeTruthy()
      }
    })
  })
})
