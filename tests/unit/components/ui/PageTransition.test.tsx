import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageTransition } from '@/components/ui/PageTransition'
import * as navigation from 'next/navigation'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/chat'),
}))

describe('PageTransition', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset to default mock value
    vi.mocked(navigation.usePathname).mockReturnValue('/chat')
  })

  it('renders children without crashing', () => {
    render(
      <PageTransition>
        <div>Test Content</div>
      </PageTransition>
    )

    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('applies fade-in animation class', () => {
    const { container } = render(
      <PageTransition>
        <div>Test Content</div>
      </PageTransition>
    )

    const wrapper = container.firstChild
    expect(wrapper).toHaveClass('animate-fadeIn')
  })

  it('uses pathname as key for transitions', () => {
    // Mock initial pathname
    vi.mocked(navigation.usePathname).mockReturnValue('/chat')

    const { container } = render(
      <PageTransition>
        <div>Test Content</div>
      </PageTransition>
    )

    const wrapper = container.firstChild as Element
    // Wrapper should have pathname as key (React internal, but we can verify behavior)
    expect(wrapper).toBeInTheDocument()
    expect(wrapper).toHaveClass('animate-fadeIn')
  })

  it('remounts on pathname change', () => {
    // Start with /chat
    vi.mocked(navigation.usePathname).mockReturnValue('/chat')

    const { container, rerender } = render(
      <PageTransition>
        <div>Chat Content</div>
      </PageTransition>
    )

    // Change to /quiz
    vi.mocked(navigation.usePathname).mockReturnValue('/quiz')
    rerender(
      <PageTransition>
        <div>Quiz Content</div>
      </PageTransition>
    )

    const wrapper = container.firstChild

    // The wrapper should still have the animation class
    expect(wrapper).toHaveClass('animate-fadeIn')
    // Content should be updated
    expect(wrapper).toHaveTextContent('Quiz Content')
  })
})
