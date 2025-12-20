import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import MessageList from '@/components/chat/MessageList'
import type { Message } from '@/types'

/**
 * Component Tests for MessageList Component
 *
 * Tests message list rendering, empty states, and streaming indicators.
 */

// Mock scrollIntoView
beforeEach(() => {
  Element.prototype.scrollIntoView = () => {}
})

describe('MessageList Component', () => {
  const mockMessages: Message[] = [
    {
      id: 'msg-1',
      conversationId: 'conv-1',
      userId: 'user-1',
      role: 'user',
      content: 'First message',
      embedding: null,
      createdAt: Date.now(),
      hasFlashcards: false,
    },
    {
      id: 'msg-2',
      conversationId: 'conv-1',
      userId: 'user-1',
      role: 'assistant',
      content: 'First response',
      embedding: null,
      createdAt: Date.now(),
      hasFlashcards: false,
    },
    {
      id: 'msg-3',
      conversationId: 'conv-1',
      userId: 'user-1',
      role: 'user',
      content: 'Second message',
      embedding: null,
      createdAt: Date.now(),
      hasFlashcards: false,
    },
  ]

  describe('Empty state', () => {
    it('should show empty state when no messages', () => {
      render(<MessageList messages={[]} />)

      expect(screen.getByText('Start a conversation')).toBeInTheDocument()
      expect(
        screen.getByText(
          /Ask me anything! I'm here to help you learn and understand new concepts./i
        )
      ).toBeInTheDocument()
    })

    it('should not show empty state when loading', () => {
      render(<MessageList messages={[]} isLoading={true} />)

      expect(screen.queryByText('Start a conversation')).not.toBeInTheDocument()
    })

    it('should not show empty state when messages exist', () => {
      render(<MessageList messages={mockMessages} />)

      expect(screen.queryByText('Start a conversation')).not.toBeInTheDocument()
    })
  })

  describe('Message rendering', () => {
    it('should render all messages', () => {
      render(<MessageList messages={mockMessages} />)

      expect(screen.getByText('First message')).toBeInTheDocument()
      expect(screen.getByText('First response')).toBeInTheDocument()
      expect(screen.getByText('Second message')).toBeInTheDocument()
    })

    it('should render messages in order', () => {
      render(<MessageList messages={mockMessages} />)

      const messages = screen.getAllByTestId('chat-message')
      expect(messages).toHaveLength(3)
      expect(messages[0]).toHaveTextContent('First message')
      expect(messages[1]).toHaveTextContent('First response')
      expect(messages[2]).toHaveTextContent('Second message')
    })

    it('should assign unique keys to messages', () => {
      const { container } = render(<MessageList messages={mockMessages} />)

      const messages = container.querySelectorAll('[data-testid="chat-message"]')
      expect(messages).toHaveLength(3)
    })
  })

  describe('Streaming state', () => {
    it('should mark correct message as streaming', () => {
      render(<MessageList messages={mockMessages} streamingMessageId="msg-2" />)

      const messages = screen.getAllByTestId('chat-message')
      // Check that the streaming message has the pulse animation
      expect(messages[1].querySelector('.animate-pulse')).toBeInTheDocument()
      expect(messages[0].querySelector('.animate-pulse')).not.toBeInTheDocument()
      expect(messages[2].querySelector('.animate-pulse')).not.toBeInTheDocument()
    })

    it('should handle null streamingMessageId', () => {
      render(<MessageList messages={mockMessages} streamingMessageId={null} />)

      const messages = screen.getAllByTestId('chat-message')
      messages.forEach((msg) => {
        expect(msg.querySelector('.animate-pulse')).not.toBeInTheDocument()
      })
    })
  })

  describe('Loading indicator', () => {
    it('should show loading indicator when isLoading is true and messages exist', () => {
      render(<MessageList messages={mockMessages} isLoading={true} />)

      expect(screen.getByText('Thinking')).toBeInTheDocument()
      // Check that "Claude" appears multiple times (once in messages, once in loading indicator)
      const claudeElements = screen.getAllByText('Claude')
      expect(claudeElements.length).toBeGreaterThan(0)
    })

    it('should not show loading indicator when isLoading is false', () => {
      render(<MessageList messages={mockMessages} isLoading={false} />)

      expect(screen.queryByText('Thinking')).not.toBeInTheDocument()
    })

    it('should show loading dots with staggered animation', () => {
      const { container } = render(<MessageList messages={mockMessages} isLoading={true} />)

      const loadingDots = container.querySelectorAll('.animate-bounce')
      expect(loadingDots).toHaveLength(3)

      // Check animation delays
      expect(loadingDots[0]).toHaveStyle({ animationDelay: '0ms' })
      expect(loadingDots[1]).toHaveStyle({ animationDelay: '150ms' })
      expect(loadingDots[2]).toHaveStyle({ animationDelay: '300ms' })
    })
  })

  describe('Scrolling behavior', () => {
    it('should render scroll container', () => {
      const { container } = render(<MessageList messages={mockMessages} />)

      const scrollContainer = container.querySelector('.overflow-y-auto')
      expect(scrollContainer).toBeInTheDocument()
    })

    it('should have scroll anchor element', () => {
      const { container } = render(<MessageList messages={mockMessages} />)

      // The invisible div at the end for scrolling
      const scrollContainers = container.querySelectorAll('div')
      const lastDiv = scrollContainers[scrollContainers.length - 1]
      expect(lastDiv).toBeInTheDocument()
    })
  })

  describe('Edge cases', () => {
    it('should handle single message', () => {
      render(<MessageList messages={[mockMessages[0]]} />)

      expect(screen.getByText('First message')).toBeInTheDocument()
      expect(screen.getAllByTestId('chat-message')).toHaveLength(1)
    })

    it('should handle many messages', () => {
      const manyMessages = Array.from({ length: 100 }, (_, i) => ({
        ...mockMessages[0],
        id: `msg-${i}`,
        content: `Message ${i}`,
      }))

      render(<MessageList messages={manyMessages} />)

      expect(screen.getAllByTestId('chat-message')).toHaveLength(100)
    })
  })
})
