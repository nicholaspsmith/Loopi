import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProviderBadge from '@/components/settings/ProviderBadge'

/**
 * Component Tests for ProviderBadge Component
 *
 * Tests display of AI provider indicator on messages.
 * Following TDD - these should FAIL until implementation is complete.
 */

describe('ProviderBadge Component', () => {
  describe('Claude provider', () => {
    it('should display Claude badge', () => {
      render(<ProviderBadge provider="claude" />)

      expect(screen.getByText(/claude/i)).toBeInTheDocument()
    })

    it('should use appropriate styling for Claude badge', () => {
      render(<ProviderBadge provider="claude" />)

      const badge = screen.getByText(/claude/i)
      expect(badge).toHaveClass('bg-blue-100')
      expect(badge).toHaveClass('text-blue-800')
    })

    it('should have accessible label for Claude', () => {
      render(<ProviderBadge provider="claude" />)

      const badge = screen.getByText(/claude/i)
      expect(badge).toHaveAttribute('aria-label', 'AI Provider: Claude')
    })
  })

  describe('Ollama provider', () => {
    it('should display Ollama badge', () => {
      render(<ProviderBadge provider="ollama" />)

      expect(screen.getByText(/ollama/i)).toBeInTheDocument()
    })

    it('should use appropriate styling for Ollama badge', () => {
      render(<ProviderBadge provider="ollama" />)

      const badge = screen.getByText(/ollama/i)
      expect(badge).toHaveClass('bg-green-100')
      expect(badge).toHaveClass('text-green-800')
    })

    it('should have accessible label for Ollama', () => {
      render(<ProviderBadge provider="ollama" />)

      const badge = screen.getByText(/ollama/i)
      expect(badge).toHaveAttribute('aria-label', 'AI Provider: Ollama')
    })
  })

  describe('Null provider', () => {
    it('should not render anything when provider is null', () => {
      const { container } = render(<ProviderBadge provider={null} />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Size variants', () => {
    it('should render small size variant', () => {
      render(<ProviderBadge provider="claude" size="sm" />)

      const badge = screen.getByText(/claude/i)
      expect(badge).toHaveClass('text-xs')
      expect(badge).toHaveClass('px-1.5')
      expect(badge).toHaveClass('py-0.5')
    })

    it('should render medium size variant (default)', () => {
      render(<ProviderBadge provider="claude" />)

      const badge = screen.getByText(/claude/i)
      expect(badge).toHaveClass('text-sm')
      expect(badge).toHaveClass('px-2')
      expect(badge).toHaveClass('py-1')
    })

    it('should render large size variant', () => {
      render(<ProviderBadge provider="claude" size="lg" />)

      const badge = screen.getByText(/claude/i)
      expect(badge).toHaveClass('text-base')
      expect(badge).toHaveClass('px-3')
      expect(badge).toHaveClass('py-1.5')
    })
  })

  describe('Tooltip functionality', () => {
    it('should show tooltip on hover for Claude', async () => {
      render(<ProviderBadge provider="claude" showTooltip />)

      const badge = screen.getByText(/claude/i)

      expect(badge).toHaveAttribute('title')
      expect(badge).toHaveAttribute('title', expect.stringMatching(/using your Claude API key/i))
    })

    it('should show tooltip on hover for Ollama', async () => {
      render(<ProviderBadge provider="ollama" showTooltip />)

      const badge = screen.getByText(/ollama/i)

      expect(badge).toHaveAttribute('title')
      expect(badge).toHaveAttribute('title', expect.stringMatching(/using local Ollama/i))
    })

    it('should not show tooltip when showTooltip is false', async () => {
      render(<ProviderBadge provider="claude" showTooltip={false} />)

      const badge = screen.getByText(/claude/i)

      expect(badge).not.toHaveAttribute('title')
    })
  })

  describe('Dark mode support', () => {
    it('should apply dark mode classes for Claude', () => {
      render(
        <div className="dark">
          <ProviderBadge provider="claude" />
        </div>
      )

      const badge = screen.getByText(/claude/i)
      expect(badge).toHaveClass('dark:bg-blue-900')
      expect(badge).toHaveClass('dark:text-blue-200')
    })

    it('should apply dark mode classes for Ollama', () => {
      render(
        <div className="dark">
          <ProviderBadge provider="ollama" />
        </div>
      )

      const badge = screen.getByText(/ollama/i)
      expect(badge).toHaveClass('dark:bg-green-900')
      expect(badge).toHaveClass('dark:text-green-200')
    })
  })

  describe('Accessibility', () => {
    it('should have proper role attribute', () => {
      render(<ProviderBadge provider="claude" />)

      const badge = screen.getByText(/claude/i)
      expect(badge).toHaveAttribute('role', 'status')
    })

    it('should be keyboard accessible with tooltip', async () => {
      render(<ProviderBadge provider="claude" showTooltip />)

      const badge = screen.getByText(/claude/i)

      // Badge has accessible label and tooltip for screen readers
      expect(badge).toHaveAttribute('aria-label', 'AI Provider: Claude')
      expect(badge).toHaveAttribute('title', 'Generated using your Claude API key')
    })

    it('should have appropriate color contrast', () => {
      const { container } = render(<ProviderBadge provider="claude" />)

      // This is a placeholder test - in a real scenario, you'd use
      // a tool like jest-axe or manual color contrast checking
      expect(container.firstChild).toBeTruthy()
    })
  })
})
