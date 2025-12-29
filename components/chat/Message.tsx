'use client'

import type { Message as MessageType } from '@/types'
import GenerateFlashcardsButton from './GenerateFlashcardsButton'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

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
      role="article"
      aria-label={`Message from ${isUser ? 'You' : 'Assistant'}`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
        }`}
      >
        {/* Role label */}
        <div className="text-xs font-semibold mb-1 opacity-70" aria-label="Sender">
          {isUser ? 'You' : 'Assistant'}
        </div>

        {/* Message content */}
        <div className="break-words" role="text">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Customize rendering for better styling
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>,
              ol: ({ children }) => (
                <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>
              ),
              li: ({ children }) => <li>{children}</li>,
              code: ({ inline, children, ...props }: any) =>
                inline ? (
                  <code
                    className="px-1.5 py-0.5 rounded text-sm font-mono bg-black/10 dark:bg-white/10"
                    {...props}
                  >
                    {children}
                  </code>
                ) : (
                  <code
                    className="block p-3 my-2 rounded text-sm font-mono bg-black/10 dark:bg-white/10 overflow-x-auto"
                    {...props}
                  >
                    {children}
                  </code>
                ),
              pre: ({ children }) => <>{children}</>,
              h1: ({ children }) => (
                <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-bold mb-2 mt-2 first:mt-0">{children}</h3>
              ),
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              a: ({ children, href }) => (
                <a
                  href={href}
                  className="text-blue-400 hover:text-blue-300 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-gray-400 dark:border-gray-600 pl-4 my-2 italic">
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-2">
                  <table className="min-w-full border border-gray-300 dark:border-gray-600">
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-100 dark:bg-gray-700 font-semibold text-left">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-gray-300 dark:border-gray-600 px-3 py-2">
                  {children}
                </td>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
          {isStreaming && (
            <span
              className="inline-block w-2 h-4 ml-1 bg-current animate-pulse"
              aria-label="Message is being typed"
            />
          )}
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-2 mt-2">
          <time className="text-xs opacity-60" dateTime={new Date(message.createdAt).toISOString()}>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
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
