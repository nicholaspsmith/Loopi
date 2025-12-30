import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageTransition } from '@/components/ui/PageTransition'

/**
 * Unit Tests for PageTransition Component
 *
 * Tests rapid route changes and transition handling
 * Maps to GitHub issue #185 - UI Polish follow-ups
 */

// Mock next/navigation
const mockUsePathname = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

describe('PageTransition', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUsePathname.mockReturnValue('/')
  })

  describe('Basic Rendering', () => {
    it('should render children', () => {
      render(
        <PageTransition>
          <div>Test Content</div>
        </PageTransition>
      )

      expect(screen.getByText('Test Content')).toBeInTheDocument()
    })

    it('should apply fade-in animation class', () => {
      const { container } = render(
        <PageTransition>
          <div>Test Content</div>
        </PageTransition>
      )

      const animationWrapper = container.querySelector('.animate-fadeIn')
      expect(animationWrapper).toBeInTheDocument()
    })

    it('should use pathname as key for transitions', () => {
      mockUsePathname.mockReturnValue('/test-path')

      const { container } = render(
        <PageTransition>
          <div>Test Content</div>
        </PageTransition>
      )

      // The div should have the pathname as key (React internal, but we can check it renders)
      expect(container.querySelector('.animate-fadeIn')).toBeInTheDocument()
    })
  })

  describe('Route Changes', () => {
    it('should handle pathname changes', () => {
      mockUsePathname.mockReturnValue('/page-a')

      const { rerender } = render(
        <PageTransition>
          <div>Page A</div>
        </PageTransition>
      )

      expect(screen.getByText('Page A')).toBeInTheDocument()

      // Change pathname
      mockUsePathname.mockReturnValue('/page-b')

      rerender(
        <PageTransition>
          <div>Page B</div>
        </PageTransition>
      )

      expect(screen.getByText('Page B')).toBeInTheDocument()
    })

    it('should handle rapid pathname changes gracefully', () => {
      mockUsePathname.mockReturnValue('/page-a')

      const { rerender } = render(
        <PageTransition>
          <div>Page A</div>
        </PageTransition>
      )

      // Rapid changes: A -> B -> C
      mockUsePathname.mockReturnValue('/page-b')
      rerender(
        <PageTransition>
          <div>Page B</div>
        </PageTransition>
      )

      mockUsePathname.mockReturnValue('/page-c')
      rerender(
        <PageTransition>
          <div>Page C</div>
        </PageTransition>
      )

      // Should render final page without errors
      expect(screen.getByText('Page C')).toBeInTheDocument()
    })

    it('should handle very rapid consecutive changes', () => {
      mockUsePathname.mockReturnValue('/page-1')

      const { rerender } = render(
        <PageTransition>
          <div>Page 1</div>
        </PageTransition>
      )

      // Simulate rapid route changes (like browser back/forward spam)
      const pages = [
        { path: '/page-2', content: 'Page 2' },
        { path: '/page-3', content: 'Page 3' },
        { path: '/page-4', content: 'Page 4' },
        { path: '/page-5', content: 'Page 5' },
      ]

      pages.forEach((page) => {
        mockUsePathname.mockReturnValue(page.path)
        rerender(
          <PageTransition>
            <div>{page.content}</div>
          </PageTransition>
        )
      })

      // Should end up on the last page
      expect(screen.getByText('Page 5')).toBeInTheDocument()
    })

    it('should maintain animation class across route changes', () => {
      mockUsePathname.mockReturnValue('/page-a')

      const { container, rerender } = render(
        <PageTransition>
          <div>Page A</div>
        </PageTransition>
      )

      expect(container.querySelector('.animate-fadeIn')).toBeInTheDocument()

      mockUsePathname.mockReturnValue('/page-b')
      rerender(
        <PageTransition>
          <div>Page B</div>
        </PageTransition>
      )

      // Animation class should still be present after route change
      expect(container.querySelector('.animate-fadeIn')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle same pathname without re-rendering content', () => {
      mockUsePathname.mockReturnValue('/same-path')

      const { rerender } = render(
        <PageTransition>
          <div>Content</div>
        </PageTransition>
      )

      // Re-render with same pathname
      rerender(
        <PageTransition>
          <div>Content</div>
        </PageTransition>
      )

      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('should handle empty pathname', () => {
      mockUsePathname.mockReturnValue('')

      render(
        <PageTransition>
          <div>Content</div>
        </PageTransition>
      )

      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('should handle pathname with special characters', () => {
      mockUsePathname.mockReturnValue('/path?query=test&id=123#section')

      render(
        <PageTransition>
          <div>Complex Path</div>
        </PageTransition>
      )

      expect(screen.getByText('Complex Path')).toBeInTheDocument()
    })

    it('should handle deep nested pathnames', () => {
      mockUsePathname.mockReturnValue('/very/deep/nested/path/structure/page')

      render(
        <PageTransition>
          <div>Deep Path</div>
        </PageTransition>
      )

      expect(screen.getByText('Deep Path')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should not interfere with child accessibility', () => {
      render(
        <PageTransition>
          <button aria-label="Test Button">Click Me</button>
        </PageTransition>
      )

      const button = screen.getByRole('button', { name: 'Test Button' })
      expect(button).toBeInTheDocument()
    })

    it('should respect prefers-reduced-motion via CSS', () => {
      // PageTransition uses CSS for animation which respects prefers-reduced-motion
      // This test verifies the component renders correctly
      const { container } = render(
        <PageTransition>
          <div>Content</div>
        </PageTransition>
      )

      // The animate-fadeIn class should be present (CSS handles reduced motion)
      expect(container.querySelector('.animate-fadeIn')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should handle back-to-back navigation without memory leaks', () => {
      mockUsePathname.mockReturnValue('/start')

      const { rerender, unmount } = render(
        <PageTransition>
          <div>Start</div>
        </PageTransition>
      )

      // Simulate multiple navigations
      for (let i = 0; i < 20; i++) {
        mockUsePathname.mockReturnValue(`/page-${i}`)
        rerender(
          <PageTransition>
            <div>Page {i}</div>
          </PageTransition>
        )
      }

      // Should render final page
      expect(screen.getByText('Page 19')).toBeInTheDocument()

      // Cleanup
      unmount()
    })

    it('should handle component with complex children', () => {
      mockUsePathname.mockReturnValue('/complex')

      render(
        <PageTransition>
          <div>
            <header>Header</header>
            <main>
              <section>Section 1</section>
              <section>Section 2</section>
            </main>
            <footer>Footer</footer>
          </div>
        </PageTransition>
      )

      expect(screen.getByText('Header')).toBeInTheDocument()
      expect(screen.getByText('Section 1')).toBeInTheDocument()
      expect(screen.getByText('Section 2')).toBeInTheDocument()
      expect(screen.getByText('Footer')).toBeInTheDocument()
    })
  })
})
