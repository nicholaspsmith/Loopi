'use client'

import { useState, FormEvent, KeyboardEvent } from 'react'

/**
 * MessageInput Component
 *
 * Text input for sending chat messages.
 * Supports Enter to send, Shift+Enter for new line.
 */

interface MessageInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export default function MessageInput({
  onSend,
  disabled = false,
  placeholder = 'Type your message...',
}: MessageInputProps) {
  const [message, setMessage] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage('')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2" aria-label="Send message">
      <label htmlFor="message-input" className="sr-only">
        Message
      </label>
      <textarea
        id="message-input"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={3}
        aria-label="Type your message"
        aria-describedby="message-hint"
        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
      />
      <span id="message-hint" className="sr-only">
        Press Enter to send, Shift+Enter for new line
      </span>

      <button
        type="submit"
        disabled={disabled || !message.trim()}
        aria-label="Send message"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors h-fit"
      >
        Send
      </button>
    </form>
  )
}
