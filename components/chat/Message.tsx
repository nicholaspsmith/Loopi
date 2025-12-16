'use client'

import type { Message as MessageType } from '@/types'
import GenerateFlashcardsButton from './GenerateFlashcardsButton'

/**
 * Message Component
 *
 * Displays a single message in the chat interface.
 * Shows different styling for user vs assistant messages.
 * Includes GenerateFlashcardsButton for assistant messages (FR-008).
 */

interface MessageProps {
  message: MessageType
  isStreaming?: boolean
}

export default function Message({ message, isStreaming = false }: MessageProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      data-testid="chat-message"
      data-role={message.role}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900 border border-gray-200'
        }`}
      >
        {/* Role label */}
        <div className="text-xs font-semibold mb-1 opacity-70">
          {isUser ? 'You' : 'Claude'}
        </div>

        {/* Message content */}
        <div className="whitespace-pre-wrap break-words">
          {message.content}
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
          )}
        </div>

        {/* Timestamp */}
        <div className="text-xs mt-2 opacity-60">
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>

        {/* Generate Flashcards Button (FR-008: only for assistant messages) */}
        {isAssistant && !isStreaming && (
          <GenerateFlashcardsButton
            messageId={message.id}
            conversationId={message.conversationId}
            hasFlashcards={message.hasFlashcards || false}
          />
        )}
      </div>
    </div>
  )
}
