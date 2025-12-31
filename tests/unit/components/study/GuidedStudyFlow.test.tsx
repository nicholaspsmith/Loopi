import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GuidedStudyFlow from '@/components/study/GuidedStudyFlow'

// Mock the confetti animation
vi.mock('@/lib/animations/confetti', () => ({
  triggerConfetti: vi.fn(),
}))

/**
 * Component Test for GuidedStudyFlow (T023)
 *
 * Tests the GuidedStudyFlow component that manages node progression.
 */

describe('GuidedStudyFlow', () => {
  const mockOnContinue = vi.fn()
  const mockOnReturn = vi.fn()

  const mockNode = {
    id: 'node-123',
    title: 'Introduction to Variables',
    path: '1.2',
  }

  const incompleteProgress = { completedInNode: 3, totalInNode: 5 }
  const completeProgress = { completedInNode: 5, totalInNode: 5 }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Node Completion State', () => {
    it('should show Continue button when node is complete', () => {
      render(
        <GuidedStudyFlow
          currentNode={mockNode}
          nodeProgress={completeProgress}
          isTreeComplete={false}
          onContinue={mockOnContinue}
          onReturn={mockOnReturn}
        />
      )

      expect(screen.getByRole('button', { name: /continue to next node/i })).toBeInTheDocument()
    })

    it('should show Return button when node is complete', () => {
      render(
        <GuidedStudyFlow
          currentNode={mockNode}
          nodeProgress={completeProgress}
          isTreeComplete={false}
          onContinue={mockOnContinue}
          onReturn={mockOnReturn}
        />
      )

      expect(screen.getByRole('button', { name: /return to goal/i })).toBeInTheDocument()
    })

    it('should not render when node is incomplete', () => {
      const { container } = render(
        <GuidedStudyFlow
          currentNode={mockNode}
          nodeProgress={incompleteProgress}
          isTreeComplete={false}
          onContinue={mockOnContinue}
          onReturn={mockOnReturn}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should call onContinue when Continue button clicked', async () => {
      const user = userEvent.setup()
      render(
        <GuidedStudyFlow
          currentNode={mockNode}
          nodeProgress={completeProgress}
          isTreeComplete={false}
          onContinue={mockOnContinue}
          onReturn={mockOnReturn}
        />
      )

      await user.click(screen.getByRole('button', { name: /continue to next node/i }))
      expect(mockOnContinue).toHaveBeenCalledTimes(1)
    })

    it('should call onReturn when Return button clicked', async () => {
      const user = userEvent.setup()
      render(
        <GuidedStudyFlow
          currentNode={mockNode}
          nodeProgress={completeProgress}
          isTreeComplete={false}
          onContinue={mockOnContinue}
          onReturn={mockOnReturn}
        />
      )

      await user.click(screen.getByRole('button', { name: /return to goal/i }))
      expect(mockOnReturn).toHaveBeenCalledTimes(1)
    })

    it('should display node title', () => {
      render(
        <GuidedStudyFlow
          currentNode={mockNode}
          nodeProgress={completeProgress}
          isTreeComplete={false}
          onContinue={mockOnContinue}
          onReturn={mockOnReturn}
        />
      )

      expect(screen.getByText(/Introduction to Variables/)).toBeInTheDocument()
    })

    it('should display progress', () => {
      render(
        <GuidedStudyFlow
          currentNode={mockNode}
          nodeProgress={completeProgress}
          isTreeComplete={false}
          onContinue={mockOnContinue}
          onReturn={mockOnReturn}
        />
      )

      expect(screen.getByText(/5 \/ 5 cards/)).toBeInTheDocument()
    })
  })

  describe('Tree Completion State', () => {
    it('should show congratulations message when tree is complete', () => {
      render(
        <GuidedStudyFlow
          currentNode={null}
          nodeProgress={{ completedInNode: 0, totalInNode: 0 }}
          isTreeComplete={true}
          onContinue={mockOnContinue}
          onReturn={mockOnReturn}
        />
      )

      expect(screen.getByText(/congratulations/i)).toBeInTheDocument()
    })

    it('should show only Return button when tree complete', () => {
      render(
        <GuidedStudyFlow
          currentNode={null}
          nodeProgress={{ completedInNode: 0, totalInNode: 0 }}
          isTreeComplete={true}
          onContinue={mockOnContinue}
          onReturn={mockOnReturn}
        />
      )

      expect(screen.getByRole('button', { name: /return to goal/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument()
    })

    it('should trigger confetti on tree complete', async () => {
      const { triggerConfetti } = await import('@/lib/animations/confetti')

      render(
        <GuidedStudyFlow
          currentNode={null}
          nodeProgress={{ completedInNode: 0, totalInNode: 0 }}
          isTreeComplete={true}
          onContinue={mockOnContinue}
          onReturn={mockOnReturn}
        />
      )

      expect(triggerConfetti).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should not render when currentNode is null and tree not complete', () => {
      const { container } = render(
        <GuidedStudyFlow
          currentNode={null}
          nodeProgress={completeProgress}
          isTreeComplete={false}
          onContinue={mockOnContinue}
          onReturn={mockOnReturn}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('should not render when totalInNode is 0', () => {
      const { container } = render(
        <GuidedStudyFlow
          currentNode={mockNode}
          nodeProgress={{ completedInNode: 0, totalInNode: 0 }}
          isTreeComplete={false}
          onContinue={mockOnContinue}
          onReturn={mockOnReturn}
        />
      )

      expect(container.firstChild).toBeNull()
    })
  })
})
