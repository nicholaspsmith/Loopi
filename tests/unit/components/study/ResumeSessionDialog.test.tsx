import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ResumeSessionDialog from '@/components/study/ResumeSessionDialog'

/**
 * Unit Tests for ResumeSessionDialog Component
 *
 * Tests the modal dialog for resuming study sessions.
 * Covers rendering, user interactions, and display of session data.
 */

describe('ResumeSessionDialog', () => {
  const mockSession = {
    sessionId: '123e4567-e89b-12d3-a456-426614174000',
    goalTitle: 'Learn TypeScript',
    mode: 'flashcard',
    progress: {
      currentIndex: 5,
      totalCards: 10,
      responsesCount: 5,
      percentComplete: 50,
    },
    startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    lastActivityAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
  }

  const mockHandlers = {
    onResume: vi.fn(),
    onStartNew: vi.fn(),
    onClose: vi.fn(),
  }

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should not render when open is false', () => {
      render(
        <ResumeSessionDialog
          open={false}
          session={mockSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      expect(screen.queryByTestId('resume-session-dialog')).not.toBeInTheDocument()
    })

    it('should render when open is true', () => {
      render(
        <ResumeSessionDialog
          open={true}
          session={mockSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      expect(screen.getByTestId('resume-session-dialog')).toBeInTheDocument()
    })

    it('should display goal title', () => {
      render(
        <ResumeSessionDialog
          open={true}
          session={mockSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      expect(screen.getByText('Learn TypeScript')).toBeInTheDocument()
    })

    it('should display mode name formatted correctly', () => {
      render(
        <ResumeSessionDialog
          open={true}
          session={mockSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      expect(screen.getByText('Flashcard')).toBeInTheDocument()
    })

    it('should format multiple_choice mode name', () => {
      const mcSession = {
        ...mockSession,
        mode: 'multiple_choice',
      }

      render(
        <ResumeSessionDialog
          open={true}
          session={mcSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      expect(screen.getByText('Multiple Choice')).toBeInTheDocument()
    })

    it('should display dialog title', () => {
      render(
        <ResumeSessionDialog
          open={true}
          session={mockSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      expect(screen.getByTestId('resume-session-dialog-title')).toHaveTextContent(
        'Resume Study Session?'
      )
    })

    it('should have resume button', () => {
      render(
        <ResumeSessionDialog
          open={true}
          session={mockSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      expect(screen.getByTestId('resume-session-dialog-resume')).toBeInTheDocument()
      expect(screen.getByTestId('resume-session-dialog-resume')).toHaveTextContent('Resume Session')
    })

    it('should have start new button', () => {
      render(
        <ResumeSessionDialog
          open={true}
          session={mockSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      expect(screen.getByTestId('resume-session-dialog-start-new')).toBeInTheDocument()
      expect(screen.getByTestId('resume-session-dialog-start-new')).toHaveTextContent(
        'Start New Session'
      )
    })

    it('should have close button', () => {
      render(
        <ResumeSessionDialog
          open={true}
          session={mockSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      expect(screen.getByTestId('resume-session-dialog-close')).toBeInTheDocument()
    })

    it('should display warning message', () => {
      render(
        <ResumeSessionDialog
          open={true}
          session={mockSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      expect(
        screen.getByText('Starting a new session will abandon your current progress')
      ).toBeInTheDocument()
    })
  })

  describe('Progress Display', () => {
    it('should display progress percentage', () => {
      render(
        <ResumeSessionDialog
          open={true}
          session={mockSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      expect(screen.getByText(/5 of 10 cards \(50%\)/)).toBeInTheDocument()
    })

    it('should render progress bar', () => {
      render(
        <ResumeSessionDialog
          open={true}
          session={mockSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      const progressBar = screen.getByTestId('resume-session-progress-bar')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveStyle({ width: '50%' })
    })

    it('should display 0% progress correctly', () => {
      const newSession = {
        ...mockSession,
        progress: {
          currentIndex: 0,
          totalCards: 10,
          responsesCount: 0,
          percentComplete: 0,
        },
      }

      render(
        <ResumeSessionDialog
          open={true}
          session={newSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      expect(screen.getByText(/0 of 10 cards \(0%\)/)).toBeInTheDocument()
      const progressBar = screen.getByTestId('resume-session-progress-bar')
      expect(progressBar).toHaveStyle({ width: '0%' })
    })

    it('should display 100% progress correctly', () => {
      const completeSession = {
        ...mockSession,
        progress: {
          currentIndex: 10,
          totalCards: 10,
          responsesCount: 10,
          percentComplete: 100,
        },
      }

      render(
        <ResumeSessionDialog
          open={true}
          session={completeSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      expect(screen.getByText(/10 of 10 cards \(100%\)/)).toBeInTheDocument()
      const progressBar = screen.getByTestId('resume-session-progress-bar')
      expect(progressBar).toHaveStyle({ width: '100%' })
    })
  })

  describe('Relative Time Formatting', () => {
    it('should display "just now" for recent activity', () => {
      const recentSession = {
        ...mockSession,
        startedAt: new Date(Date.now() - 30 * 1000).toISOString(), // 30 seconds ago
      }

      render(
        <ResumeSessionDialog
          open={true}
          session={recentSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      expect(screen.getByText('just now')).toBeInTheDocument()
    })

    it('should display minutes ago', () => {
      const session = {
        ...mockSession,
        startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
      }

      render(
        <ResumeSessionDialog
          open={true}
          session={session}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      expect(screen.getByText('5 minutes ago')).toBeInTheDocument()
    })

    it('should display hours ago', () => {
      const session = {
        ...mockSession,
        startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
      }

      render(
        <ResumeSessionDialog
          open={true}
          session={session}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      expect(screen.getByText('3 hours ago')).toBeInTheDocument()
    })

    it('should display days ago', () => {
      const session = {
        ...mockSession,
        startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      }

      render(
        <ResumeSessionDialog
          open={true}
          session={session}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      expect(screen.getByText('2 days ago')).toBeInTheDocument()
    })

    it('should handle singular time units', () => {
      const session = {
        ...mockSession,
        startedAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(), // 1 minute ago
      }

      render(
        <ResumeSessionDialog
          open={true}
          session={session}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      expect(screen.getByText('1 minute ago')).toBeInTheDocument()
    })
  })

  describe('Timed Mode Display', () => {
    it('should display time remaining for timed mode', () => {
      const timedSession = {
        ...mockSession,
        mode: 'timed',
        timeRemainingMs: 150000, // 2m 30s
        score: 50,
      }

      render(
        <ResumeSessionDialog
          open={true}
          session={timedSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      expect(screen.getByText('Time Remaining')).toBeInTheDocument()
      expect(screen.getByText('2m 30s')).toBeInTheDocument()
    })

    it('should display score for timed mode', () => {
      const timedSession = {
        ...mockSession,
        mode: 'timed',
        timeRemainingMs: 150000,
        score: 85,
      }

      render(
        <ResumeSessionDialog
          open={true}
          session={timedSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      expect(screen.getByText('Current Score')).toBeInTheDocument()
      expect(screen.getByText('85 points')).toBeInTheDocument()
    })

    it('should format hours in time remaining', () => {
      const timedSession = {
        ...mockSession,
        mode: 'timed',
        timeRemainingMs: 4500000, // 1h 15m
        score: 0,
      }

      render(
        <ResumeSessionDialog
          open={true}
          session={timedSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      expect(screen.getByText('1h 15m')).toBeInTheDocument()
    })

    it('should format seconds only when less than a minute', () => {
      const timedSession = {
        ...mockSession,
        mode: 'timed',
        timeRemainingMs: 45000, // 45s
        score: 0,
      }

      render(
        <ResumeSessionDialog
          open={true}
          session={timedSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      expect(screen.getByText('45s')).toBeInTheDocument()
    })

    it('should not display timed info for non-timed modes', () => {
      render(
        <ResumeSessionDialog
          open={true}
          session={mockSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      expect(screen.queryByText('Time Remaining')).not.toBeInTheDocument()
      expect(screen.queryByText('Current Score')).not.toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should call onResume when resume button clicked', () => {
      render(
        <ResumeSessionDialog
          open={true}
          session={mockSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      const resumeButton = screen.getByTestId('resume-session-dialog-resume')
      fireEvent.click(resumeButton)

      expect(mockHandlers.onResume).toHaveBeenCalledTimes(1)
    })

    it('should call onStartNew when start new button clicked', () => {
      render(
        <ResumeSessionDialog
          open={true}
          session={mockSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      const startNewButton = screen.getByTestId('resume-session-dialog-start-new')
      fireEvent.click(startNewButton)

      expect(mockHandlers.onStartNew).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when close button clicked', () => {
      render(
        <ResumeSessionDialog
          open={true}
          session={mockSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      const closeButton = screen.getByTestId('resume-session-dialog-close')
      fireEvent.click(closeButton)

      expect(mockHandlers.onClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when backdrop clicked', () => {
      render(
        <ResumeSessionDialog
          open={true}
          session={mockSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      const backdrop = screen.getByTestId('resume-session-dialog-backdrop')
      fireEvent.click(backdrop)

      expect(mockHandlers.onClose).toHaveBeenCalledTimes(1)
    })

    it('should not call onClose when dialog content clicked', () => {
      render(
        <ResumeSessionDialog
          open={true}
          session={mockSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      const dialog = screen.getByTestId('resume-session-dialog')
      fireEvent.click(dialog)

      expect(mockHandlers.onClose).not.toHaveBeenCalled()
    })

    it('should call onClose when Escape key pressed', async () => {
      render(
        <ResumeSessionDialog
          open={true}
          session={mockSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })

      await waitFor(() => {
        expect(mockHandlers.onClose).toHaveBeenCalledTimes(1)
      })
    })

    it('should not call onClose for other keys', () => {
      render(
        <ResumeSessionDialog
          open={true}
          session={mockSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      fireEvent.keyDown(document, { key: 'Enter', code: 'Enter' })

      expect(mockHandlers.onClose).not.toHaveBeenCalled()
    })

    it('should not respond to Escape when dialog is closed', () => {
      render(
        <ResumeSessionDialog
          open={false}
          session={mockSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })

      expect(mockHandlers.onClose).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have role="dialog"', () => {
      render(
        <ResumeSessionDialog
          open={true}
          session={mockSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      const backdrop = screen.getByTestId('resume-session-dialog-backdrop')
      expect(backdrop).toHaveAttribute('role', 'dialog')
    })

    it('should have aria-modal="true"', () => {
      render(
        <ResumeSessionDialog
          open={true}
          session={mockSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      const backdrop = screen.getByTestId('resume-session-dialog-backdrop')
      expect(backdrop).toHaveAttribute('aria-modal', 'true')
    })

    it('should have aria-labelledby pointing to title', () => {
      render(
        <ResumeSessionDialog
          open={true}
          session={mockSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      const backdrop = screen.getByTestId('resume-session-dialog-backdrop')
      expect(backdrop).toHaveAttribute('aria-labelledby', 'resume-session-dialog-title')
    })

    it('should have aria-label on close button', () => {
      render(
        <ResumeSessionDialog
          open={true}
          session={mockSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      const closeButton = screen.getByTestId('resume-session-dialog-close')
      expect(closeButton).toHaveAttribute('aria-label', 'Close dialog')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long goal titles', () => {
      const longTitleSession = {
        ...mockSession,
        goalTitle: 'A'.repeat(100),
      }

      render(
        <ResumeSessionDialog
          open={true}
          session={longTitleSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      expect(screen.getByText('A'.repeat(100))).toBeInTheDocument()
    })

    it('should handle zero time remaining', () => {
      const timedSession = {
        ...mockSession,
        mode: 'timed',
        timeRemainingMs: 0,
        score: 0,
      }

      render(
        <ResumeSessionDialog
          open={true}
          session={timedSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      expect(screen.getByText('0s')).toBeInTheDocument()
    })

    it('should handle undefined timed mode fields gracefully', () => {
      const timedSession = {
        ...mockSession,
        mode: 'timed',
        timeRemainingMs: undefined,
        score: undefined,
      }

      render(
        <ResumeSessionDialog
          open={true}
          session={timedSession}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      // Should not display timed info when undefined
      expect(screen.queryByText('Time Remaining')).not.toBeInTheDocument()
      expect(screen.queryByText('Current Score')).not.toBeInTheDocument()
    })

    it('should handle very high progress percentages', () => {
      const session = {
        ...mockSession,
        progress: {
          currentIndex: 99,
          totalCards: 100,
          responsesCount: 99,
          percentComplete: 99,
        },
      }

      render(
        <ResumeSessionDialog
          open={true}
          session={session}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      expect(screen.getByText(/99 of 100 cards \(99%\)/)).toBeInTheDocument()
    })

    it('should handle fractional percentages by rounding', () => {
      const session = {
        ...mockSession,
        progress: {
          currentIndex: 3,
          totalCards: 7,
          responsesCount: 3,
          percentComplete: 42.857142857, // 3/7 * 100
        },
      }

      render(
        <ResumeSessionDialog
          open={true}
          session={session}
          onResume={mockHandlers.onResume}
          onStartNew={mockHandlers.onStartNew}
          onClose={mockHandlers.onClose}
        />
      )

      // Should round to nearest integer
      expect(screen.getByText(/3 of 7 cards \(43%\)/)).toBeInTheDocument()
    })
  })
})
