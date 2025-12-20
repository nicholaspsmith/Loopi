import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FallbackNotice from '@/components/chat/FallbackNotice'

/**
 * Component Tests for FallbackNotice Component
 *
 * Tests the fallback notice that displays when using Ollama
 * instead of Claude API (User Story 4)
 */

describe('FallbackNotice Component', () => {
  describe('Display and content', () => {
    it('should render the fallback notice', () => {
      render(<FallbackNotice />)

      expect(screen.getAllByText(/using.*ollama/i)[0]).toBeInTheDocument()
    })

    it('should mention free local AI', () => {
      render(<FallbackNotice />)

      expect(screen.getAllByText(/free/i)[0]).toBeInTheDocument()
    })

    it('should provide link or CTA to add API key', () => {
      render(<FallbackNotice />)

      const link = screen.getByRole('link', { name: /add.*api.*key|settings/i })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/settings')
    })

    it('should explain benefits of adding Claude API key', () => {
      render(<FallbackNotice />)

      // Should mention Claude or improved performance
      const notice = screen.getAllByText(/claude|faster|better|improved/i)[0]
      expect(notice).toBeInTheDocument()
    })
  })

  describe('Styling and appearance', () => {
    it('should have informational styling (not error)', () => {
      const { container } = render(<FallbackNotice />)

      // Should have info/neutral colors, not error colors
      const notice = container.querySelector('[class*="blue"], [class*="gray"]')
      expect(notice).toBeTruthy()
    })

    it('should be dismissible or non-intrusive', () => {
      render(<FallbackNotice />)

      // Should not be a blocking modal
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should have appropriate spacing', () => {
      const { container } = render(<FallbackNotice />)

      // Should have margin or padding classes
      const notice = container.firstChild as HTMLElement
      expect(notice.className).toMatch(/p-|padding|m-|margin|space/)
    })
  })

  describe('Accessibility', () => {
    it('should have appropriate role', () => {
      const { container } = render(<FallbackNotice />)

      // Should have status or alert role for screen readers
      const notice = screen.queryByRole('status') || screen.queryByRole('alert')
      expect(notice).toBeInTheDocument()
    })

    it('should have readable text', () => {
      render(<FallbackNotice />)

      // All text should be visible
      const text = screen.getAllByText(/using.*ollama/i)[0]
      expect(text).toBeVisible()
    })
  })

  describe('Link behavior', () => {
    it('should link to settings page', () => {
      render(<FallbackNotice />)

      const settingsLink = screen.getByRole('link', { name: /add.*api.*key|settings/i })
      expect(settingsLink).toHaveAttribute('href', '/settings')
    })

    it('should have descriptive link text', () => {
      render(<FallbackNotice />)

      // Link should be clear about what it does
      const link = screen.getByRole('link', { name: /add.*api.*key|settings/i })
      expect(link.textContent).toBeTruthy()
      expect(link.textContent!.length).toBeGreaterThan(5)
    })
  })

  describe('Dark mode support', () => {
    it('should have dark mode classes', () => {
      const { container } = render(<FallbackNotice />)

      // Should have dark: prefixed Tailwind classes
      const html = container.innerHTML
      expect(html).toMatch(/dark:/)
    })
  })
})
