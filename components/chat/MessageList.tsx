'use client'

import { useEffect, useRef } from 'react'
import Message from './Message'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { Message as MessageType } from '@/types'

/**
 * MessageList Component
 *
 * Displays a scrollable list of chat messages.
 * Auto-scrolls to bottom when new messages arrive.
 */

interface MessageListProps {
  messages: MessageType[]
  streamingMessageId?: string | null
  isLoading?: boolean
}

export default function MessageList({
  messages,
  streamingMessageId = null,
  isLoading = false,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Show loading spinner while fetching initial messages
  if (messages.length === 0 && isLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <LoadingSpinner />
      </div>
    )
  }

  // Show empty state if no messages
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center min-h-full text-center">
          <div className="max-w-md">
            <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Start a conversation
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Ask me anything! I&apos;m here to help you learn and understand new concepts.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      role="log"
      aria-live="polite"
      aria-label="Chat conversation"
    >
      {messages.map((message) => (
        <Message
          key={message.id}
          message={message}
          isStreaming={message.id === streamingMessageId}
        />
      ))}

      {isLoading && messages.length > 0 && (
        <div className="flex justify-start mb-4" role="status" aria-label="Assistant is thinking">
          <div className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-3">
            <div className="text-xs font-semibold mb-1 text-gray-600">Assistant</div>
            <div className="flex items-center gap-2 text-gray-600">
              <span>Thinking</span>
              <div className="flex gap-1" aria-hidden="true">
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invisible div to scroll to */}
      <div ref={messagesEndRef} aria-hidden="true" />
    </div>
  )
}
