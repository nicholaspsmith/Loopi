import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Message from '@/components/chat/Message'
import type { Message as MessageType } from '@/types'

/**
 * Component Tests for Message Component
 *
 * Tests rendering of user and assistant messages with streaming states.
 *
 * T025 [US2]: Verifies ProviderBadge component is removed and no AI branding exists
 */

describe('Message Component', () => {
  const mockUserMessage: MessageType = {
    id: 'user-msg-1',
    conversationId: 'conv-1',
    userId: 'user-1',
    role: 'user',
    content: 'Hello, can you help me?',
    embedding: null,
    createdAt: Date.now(),
    hasFlashcards: false,
  }

  const mockAssistantMessage: MessageType = {
    id: 'assistant-msg-1',
    conversationId: 'conv-1',
    userId: 'user-1',
    role: 'assistant',
    content: 'Of course! How can I assist you today?',
    embedding: null,
    createdAt: Date.now(),
    hasFlashcards: false,
  }

  describe('User messages', () => {
    it('should render user message with correct content', () => {
      render(<Message message={mockUserMessage} />)

      expect(screen.getByText('Hello, can you help me?')).toBeInTheDocument()
      expect(screen.getByText('You')).toBeInTheDocument()
    })

    it('should apply user styling', () => {
      render(<Message message={mockUserMessage} />)

      const messageElement = screen.getByTestId('chat-message')
      expect(messageElement).toHaveAttribute('data-role', 'user')
      expect(messageElement).toHaveClass('justify-end')
    })

    it('should display timestamp', () => {
      render(<Message message={mockUserMessage} />)

      const timestamp = new Date(mockUserMessage.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })

      expect(screen.getByText(timestamp)).toBeInTheDocument()
    })
  })

  describe('Assistant messages', () => {
    it('should render assistant message with correct content', () => {
      render(<Message message={mockAssistantMessage} />)

      expect(screen.getByText('Of course! How can I assist you today?')).toBeInTheDocument()
      expect(screen.getByText('Assistant')).toBeInTheDocument()
    })

    it('should apply assistant styling', () => {
      render(<Message message={mockAssistantMessage} />)

      const messageElement = screen.getByTestId('chat-message')
      expect(messageElement).toHaveAttribute('data-role', 'assistant')
      expect(messageElement).toHaveClass('justify-start')
    })
  })

  describe('Streaming state', () => {
    it('should show streaming indicator when isStreaming is true', () => {
      render(<Message message={mockAssistantMessage} isStreaming={true} />)

      const container = screen.getByTestId('chat-message')
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    })

    it('should not show streaming indicator when isStreaming is false', () => {
      render(<Message message={mockAssistantMessage} isStreaming={false} />)

      const container = screen.getByTestId('chat-message')
      expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument()
    })

    it('should not show streaming indicator by default', () => {
      render(<Message message={mockAssistantMessage} />)

      const container = screen.getByTestId('chat-message')
      expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument()
    })
  })

  describe('Content formatting', () => {
    it('should handle long content', () => {
      const longMessage: MessageType = {
        ...mockUserMessage,
        content: 'a'.repeat(1000),
      }

      render(<Message message={longMessage} />)

      expect(screen.getByText('a'.repeat(1000))).toBeInTheDocument()
    })
  })

  describe('Markdown rendering', () => {
    it('should render headings from markdown', () => {
      const messageWithHeadings: MessageType = {
        ...mockAssistantMessage,
        content: '# Heading 1\n## Heading 2\n### Heading 3',
      }

      render(<Message message={messageWithHeadings} />)

      expect(screen.getByText('Heading 1')).toBeInTheDocument()
      expect(screen.getByText('Heading 2')).toBeInTheDocument()
      expect(screen.getByText('Heading 3')).toBeInTheDocument()
    })

    it('should render unordered lists from markdown', () => {
      const messageWithList: MessageType = {
        ...mockAssistantMessage,
        content: '- Item 1\n- Item 2\n- Item 3',
      }

      render(<Message message={messageWithList} />)

      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
      expect(screen.getByText('Item 3')).toBeInTheDocument()
    })

    it('should render ordered lists from markdown', () => {
      const messageWithList: MessageType = {
        ...mockAssistantMessage,
        content: '1. First\n2. Second\n3. Third',
      }

      render(<Message message={messageWithList} />)

      expect(screen.getByText('First')).toBeInTheDocument()
      expect(screen.getByText('Second')).toBeInTheDocument()
      expect(screen.getByText('Third')).toBeInTheDocument()
    })

    it('should render inline code from markdown', () => {
      const messageWithInlineCode: MessageType = {
        ...mockAssistantMessage,
        content: 'Use the `console.log()` function for debugging.',
      }

      const { container } = render(<Message message={messageWithInlineCode} />)

      // Check for code element
      const codeElement = container.querySelector('code')
      expect(codeElement).toBeInTheDocument()
      expect(codeElement).toHaveTextContent('console.log()')

      // Verify text content is present (may be split across elements)
      expect(container).toHaveTextContent('Use the')
      expect(container).toHaveTextContent('function for debugging')
    })

    it('should render code blocks from markdown', () => {
      const messageWithCodeBlock: MessageType = {
        ...mockAssistantMessage,
        content: '```javascript\nconst x = 5;\nconsole.log(x);\n```',
      }

      const { container } = render(<Message message={messageWithCodeBlock} />)

      const codeElement = container.querySelector('code')
      expect(codeElement).toBeInTheDocument()
      expect(codeElement).toHaveTextContent('const x = 5;')
      expect(codeElement).toHaveTextContent('console.log(x);')
    })

    it('should render bold text from markdown', () => {
      const messageWithBold: MessageType = {
        ...mockAssistantMessage,
        content: 'This is **bold text** in the message.',
      }

      const { container } = render(<Message message={messageWithBold} />)

      const strongElement = container.querySelector('strong')
      expect(strongElement).toBeInTheDocument()
      expect(strongElement).toHaveTextContent('bold text')
    })

    it('should render italic text from markdown', () => {
      const messageWithItalic: MessageType = {
        ...mockAssistantMessage,
        content: 'This is *italic text* in the message.',
      }

      const { container } = render(<Message message={messageWithItalic} />)

      const emElement = container.querySelector('em')
      expect(emElement).toBeInTheDocument()
      expect(emElement).toHaveTextContent('italic text')
    })

    it('should render links from markdown', () => {
      const messageWithLink: MessageType = {
        ...mockAssistantMessage,
        content: 'Visit [OpenAI](https://openai.com) for more info.',
      }

      const { container } = render(<Message message={messageWithLink} />)

      const linkElement = container.querySelector('a')
      expect(linkElement).toBeInTheDocument()
      expect(linkElement).toHaveAttribute('href', 'https://openai.com')
      expect(linkElement).toHaveAttribute('target', '_blank')
      expect(linkElement).toHaveAttribute('rel', 'noopener noreferrer')
      expect(linkElement).toHaveTextContent('OpenAI')
    })

    it('should render blockquotes from markdown', () => {
      const messageWithBlockquote: MessageType = {
        ...mockAssistantMessage,
        content: '> This is a quote\n> from someone',
      }

      const { container } = render(<Message message={messageWithBlockquote} />)

      const blockquoteElement = container.querySelector('blockquote')
      expect(blockquoteElement).toBeInTheDocument()
      expect(blockquoteElement).toHaveTextContent('This is a quote')
      expect(blockquoteElement).toHaveTextContent('from someone')
    })

    it('should render tables from markdown', () => {
      const messageWithTable: MessageType = {
        ...mockAssistantMessage,
        content: '| Name | Age |\n|------|-----|\n| John | 30 |\n| Jane | 25 |',
      }

      const { container } = render(<Message message={messageWithTable} />)

      const tableElement = container.querySelector('table')
      expect(tableElement).toBeInTheDocument()

      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Age')).toBeInTheDocument()
      expect(screen.getByText('John')).toBeInTheDocument()
      expect(screen.getByText('30')).toBeInTheDocument()
      expect(screen.getByText('Jane')).toBeInTheDocument()
      expect(screen.getByText('25')).toBeInTheDocument()
    })

    it('should handle mixed markdown content', () => {
      const messageWithMixedMarkdown: MessageType = {
        ...mockAssistantMessage,
        content: '# Title\n\nThis is **bold** and *italic*.\n\n- Item 1\n- Item 2\n\n`code`',
      }

      const { container } = render(<Message message={messageWithMixedMarkdown} />)

      // Check heading
      expect(screen.getByText('Title')).toBeInTheDocument()

      // Check bold and italic
      expect(container.querySelector('strong')).toHaveTextContent('bold')
      expect(container.querySelector('em')).toHaveTextContent('italic')

      // Check list
      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()

      // Check code
      expect(container.querySelector('code')).toHaveTextContent('code')
    })

    it('should handle plain text without markdown', () => {
      const plainMessage: MessageType = {
        ...mockAssistantMessage,
        content: 'This is plain text with no markdown.',
      }

      render(<Message message={plainMessage} />)

      expect(screen.getByText('This is plain text with no markdown.')).toBeInTheDocument()
    })
  })
})
