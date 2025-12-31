import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StudyNowButton from '@/components/goals/StudyNowButton'

/**
 * Component Test for StudyNowButton (T022)
 *
 * Tests the StudyNowButton component that initiates guided study flow.
 */

describe('StudyNowButton', () => {
  const mockOnClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render a button element', () => {
      render(<StudyNowButton onClick={mockOnClick} />)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should display "Study Now" text', () => {
      render(<StudyNowButton onClick={mockOnClick} />)
      expect(screen.getByText('Study Now')).toBeInTheDocument()
    })

    it('should have green styling', () => {
      render(<StudyNowButton onClick={mockOnClick} />)
      const button = screen.getByRole('button')
      expect(button.className).toMatch(/green/)
    })

    it('should display a play icon', () => {
      const { container } = render(<StudyNowButton onClick={mockOnClick} />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('should have type="button"', () => {
      render(<StudyNowButton onClick={mockOnClick} />)
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
    })
  })

  describe('Click Handler', () => {
    it('should call onClick handler when clicked', async () => {
      const user = userEvent.setup()
      render(<StudyNowButton onClick={mockOnClick} />)

      await user.click(screen.getByRole('button'))
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })

    it('should not call onClick when disabled', async () => {
      const user = userEvent.setup()
      render(<StudyNowButton onClick={mockOnClick} disabled />)

      await user.click(screen.getByRole('button'))
      expect(mockOnClick).not.toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    it('should disable button when loading', () => {
      render(<StudyNowButton onClick={mockOnClick} loading />)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('should display "Loading..." text when loading', () => {
      render(<StudyNowButton onClick={mockOnClick} loading />)
      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should not call onClick when loading', async () => {
      const user = userEvent.setup()
      render(<StudyNowButton onClick={mockOnClick} loading />)

      await user.click(screen.getByRole('button'))
      expect(mockOnClick).not.toHaveBeenCalled()
    })

    it('should have aria-busy when loading', () => {
      render(<StudyNowButton onClick={mockOnClick} loading />)
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
    })
  })

  describe('Disabled State', () => {
    it('should disable button when disabled prop is true', () => {
      render(<StudyNowButton onClick={mockOnClick} disabled />)
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('should have aria-disabled when disabled', () => {
      render(<StudyNowButton onClick={mockOnClick} disabled />)
      expect(screen.getByRole('button')).toHaveAttribute('aria-disabled', 'true')
    })
  })

  describe('Accessibility', () => {
    it('should be keyboard accessible', async () => {
      const user = userEvent.setup()
      render(<StudyNowButton onClick={mockOnClick} />)

      const button = screen.getByRole('button')
      button.focus()
      expect(button).toHaveFocus()

      await user.keyboard('{Enter}')
      expect(mockOnClick).toHaveBeenCalled()
    })
  })
})
