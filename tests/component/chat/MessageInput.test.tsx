import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MessageInput from '@/components/chat/MessageInput'

/**
 * Component Tests for MessageInput Component
 *
 * Tests message input functionality, keyboard shortcuts, and disabled states.
 */

describe('MessageInput Component', () => {
  describe('Basic rendering', () => {
    it('should render textarea and send button', () => {
      const mockOnSend = vi.fn()
      render(<MessageInput onSend={mockOnSend} />)

      expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
    })

    it('should use custom placeholder', () => {
      const mockOnSend = vi.fn()
      render(<MessageInput onSend={mockOnSend} placeholder="Custom placeholder" />)

      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument()
    })

    it('should have send button disabled when textarea is empty', () => {
      const mockOnSend = vi.fn()
      render(<MessageInput onSend={mockOnSend} />)

      const sendButton = screen.getByRole('button', { name: /send/i })
      expect(sendButton).toBeDisabled()
    })
  })

  describe('Sending messages', () => {
    it('should call onSend when send button is clicked', async () => {
      const user = userEvent.setup()
      const mockOnSend = vi.fn()
      render(<MessageInput onSend={mockOnSend} />)

      const textarea = screen.getByPlaceholderText('Type your message...')
      await user.type(textarea, 'Test message')

      const sendButton = screen.getByRole('button', { name: /send/i })
      await user.click(sendButton)

      expect(mockOnSend).toHaveBeenCalledWith('Test message')
      expect(mockOnSend).toHaveBeenCalledTimes(1)
    })

    it('should clear textarea after sending', async () => {
      const user = userEvent.setup()
      const mockOnSend = vi.fn()
      render(<MessageInput onSend={mockOnSend} />)

      const textarea = screen.getByPlaceholderText('Type your message...') as HTMLTextAreaElement
      await user.type(textarea, 'Test message')
      await user.click(screen.getByRole('button', { name: /send/i }))

      expect(textarea.value).toBe('')
    })

    it('should trim whitespace from message', async () => {
      const user = userEvent.setup()
      const mockOnSend = vi.fn()
      render(<MessageInput onSend={mockOnSend} />)

      const textarea = screen.getByPlaceholderText('Type your message...')
      await user.type(textarea, '  Test message  ')
      await user.click(screen.getByRole('button', { name: /send/i }))

      expect(mockOnSend).toHaveBeenCalledWith('Test message')
    })

    it('should not send message if only whitespace', async () => {
      const user = userEvent.setup()
      const mockOnSend = vi.fn()
      render(<MessageInput onSend={mockOnSend} />)

      const textarea = screen.getByPlaceholderText('Type your message...')
      await user.type(textarea, '   ')

      const sendButton = screen.getByRole('button', { name: /send/i })
      expect(sendButton).toBeDisabled()
    })
  })

  describe('Keyboard shortcuts', () => {
    it('should send message on Enter key', async () => {
      const user = userEvent.setup()
      const mockOnSend = vi.fn()
      render(<MessageInput onSend={mockOnSend} />)

      const textarea = screen.getByPlaceholderText('Type your message...')
      await user.type(textarea, 'Test message{Enter}')

      expect(mockOnSend).toHaveBeenCalledWith('Test message')
    })

    it('should add new line on Shift+Enter', async () => {
      const user = userEvent.setup()
      const mockOnSend = vi.fn()
      render(<MessageInput onSend={mockOnSend} />)

      const textarea = screen.getByPlaceholderText('Type your message...') as HTMLTextAreaElement
      await user.type(textarea, 'Line 1{Shift>}{Enter}{/Shift}Line 2')

      expect(textarea.value).toContain('\n')
      expect(mockOnSend).not.toHaveBeenCalled()
    })
  })

  describe('Disabled state', () => {
    it('should disable textarea when disabled prop is true', () => {
      const mockOnSend = vi.fn()
      render(<MessageInput onSend={mockOnSend} disabled={true} />)

      const textarea = screen.getByPlaceholderText('Type your message...')
      expect(textarea).toBeDisabled()
    })

    it('should disable send button when disabled prop is true', () => {
      const mockOnSend = vi.fn()
      render(<MessageInput onSend={mockOnSend} disabled={true} />)

      const sendButton = screen.getByRole('button', { name: /send/i })
      expect(sendButton).toBeDisabled()
    })

    it('should not call onSend when disabled', async () => {
      const user = userEvent.setup()
      const mockOnSend = vi.fn()
      render(<MessageInput onSend={mockOnSend} disabled={true} />)

      const textarea = screen.getByPlaceholderText('Type your message...')

      // Try to type (will be blocked by disabled state)
      await user.type(textarea, 'Test{Enter}')

      expect(mockOnSend).not.toHaveBeenCalled()
    })
  })

  describe('Form submission', () => {
    it('should handle form submit event', () => {
      const mockOnSend = vi.fn()
      render(<MessageInput onSend={mockOnSend} />)

      const textarea = screen.getByPlaceholderText('Type your message...')
      fireEvent.change(textarea, { target: { value: 'Test message' } })

      const form = textarea.closest('form')!
      fireEvent.submit(form)

      expect(mockOnSend).toHaveBeenCalledWith('Test message')
    })
  })
})
