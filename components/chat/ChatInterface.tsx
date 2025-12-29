'use client'

import { useState, useEffect, useCallback } from 'react'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import type { Message, Conversation } from '@/types'

/**
 * ChatInterface Component
 *
 * Main chat interface that manages conversation state and handles
 * streaming responses from the assistant.
 */

interface ChatInterfaceProps {
  userId: string
}

export default function ChatInterface({ userId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Initialize conversation on mount
  useEffect(() => {
    initializeConversation()
  }, [])

  // Fetch messages when conversation is set
  useEffect(() => {
    if (conversation) {
      fetchMessages()
    }
  }, [conversation])

  /**
   * Initialize or get existing conversation
   */
  const initializeConversation = async () => {
    try {
      setIsLoading(true)

      // Get existing conversations
      const response = await fetch('/api/chat/conversations')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch conversations')
      }

      // Use first conversation or create new one
      if (data.data.conversations && data.data.conversations.length > 0) {
        setConversation(data.data.conversations[0])
      } else {
        // Create new conversation
        const createResponse = await fetch('/api/chat/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'New Conversation' }),
        })

        const createData = await createResponse.json()

        if (!createResponse.ok) {
          throw new Error(createData.error || 'Failed to create conversation')
        }

        setConversation(createData.data.conversation)
      }
    } catch (err) {
      console.error('Failed to initialize chat:', err)
      setError(err instanceof Error ? err.message : 'Failed to initialize chat')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Fetch messages for current conversation
   */
  const fetchMessages = async () => {
    if (!conversation) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/chat/conversations/${conversation.id}/messages`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch messages')
      }

      setMessages(data.data.messages)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages')
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Send a message and handle streaming response
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversation || isSending) return

      try {
        setIsSending(true)
        setError(null)

        // Add user message optimistically
        const tempUserMessage: Message = {
          id: `temp-${Date.now()}`,
          conversationId: conversation.id,
          userId,
          role: 'user',
          content,
          embedding: null,
          createdAt: Date.now(),
          hasFlashcards: false,
        }

        setMessages((prev) => [...prev, tempUserMessage])

        // Send message to API
        const response = await fetch(`/api/chat/conversations/${conversation.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        })

        if (!response.ok) {
          throw new Error('Failed to send message')
        }

        // Handle SSE stream
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) {
          throw new Error('No response body')
        }

        // Create temporary assistant message for streaming
        const tempAssistantMessage: Message = {
          id: `temp-assistant-${Date.now()}`,
          conversationId: conversation.id,
          userId,
          role: 'assistant',
          content: '',
          embedding: null,
          createdAt: Date.now(),
          hasFlashcards: false,
        }

        setMessages((prev) => [...prev, tempAssistantMessage])
        setStreamingMessageId(tempAssistantMessage.id)

        let done = false
        let buffer = ''

        while (!done) {
          const { value, done: streamDone } = await reader.read()
          done = streamDone

          if (value) {
            buffer += decoder.decode(value, { stream: !streamDone })

            // Process complete SSE messages
            const lines = buffer.split('\n\n')
            buffer = lines.pop() || '' // Keep incomplete message in buffer

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = JSON.parse(line.slice(6))

                if (data.type === 'chunk') {
                  // Append chunk to assistant message
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === tempAssistantMessage.id
                        ? { ...msg, content: msg.content + data.text }
                        : msg
                    )
                  )
                } else if (data.type === 'complete') {
                  // Update with real message ID from database
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === tempAssistantMessage.id ? { ...msg, id: data.messageId } : msg
                    )
                  )
                  setStreamingMessageId(null)
                } else if (data.type === 'error') {
                  console.error('SSE error:', data.error)
                  throw new Error(data.error)
                }
              }
            }
          }
        }

        // Refresh messages to get actual IDs from server
        await fetchMessages()
      } catch (err) {
        console.error('Failed to send message:', err)
        setError(err instanceof Error ? err.message : 'Failed to send message')
        // Remove temporary messages on error
        setMessages((prev) => prev.filter((msg) => !msg.id.startsWith('temp-')))
      } finally {
        setIsSending(false)
        setStreamingMessageId(null)
      }
    },
    [conversation, isSending, userId]
  )

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="text-red-600 mb-4">Error: {error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Reload
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <MessageList
        messages={messages}
        streamingMessageId={streamingMessageId}
        isLoading={isLoading}
      />

      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
        <MessageInput onSend={sendMessage} disabled={isSending || isLoading} />
      </div>
    </div>
  )
}
