import type { Message } from '@/types'

/**
 * Ollama Client Wrapper
 *
 * Provides interface to local Ollama LLM with streaming support.
 * Uses Llama 3.2 for educational tutoring interactions.
 * 100% FREE - runs locally, no API costs!
 */

// Ollama configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2'
export const MAX_TOKENS = 4096

// Message history type for Claude API
export type ClaudeMessage = {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Convert our Message type to Claude's format
 */
export function toClaudeMessages(messages: Message[]): ClaudeMessage[] {
  return messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }))
}

/**
 * Stream a chat completion from Ollama
 *
 * @param messages - Conversation history
 * @param systemPrompt - System prompt for LLM behavior
 * @param onChunk - Callback for each text chunk
 * @param onComplete - Callback when stream completes
 * @param onError - Callback for errors
 */
export async function streamChatCompletion(params: {
  messages: ClaudeMessage[]
  systemPrompt: string
  onChunk: (text: string) => void
  onComplete: (fullText: string) => void
  onError: (error: Error) => void
}): Promise<void> {
  const { messages, systemPrompt, onChunk, onComplete, onError } = params

  try {
    // Format messages for Ollama
    const ollamaMessages = [{ role: 'system', content: systemPrompt }, ...messages]

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: ollamaMessages,
        stream: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error('No response body')
    }

    let fullText = ''
    let done = false

    while (!done) {
      const { value, done: streamDone } = await reader.read()
      done = streamDone

      if (value) {
        const chunk = decoder.decode(value, { stream: !streamDone })
        const lines = chunk.split('\n').filter((line) => line.trim())

        for (const line of lines) {
          try {
            const data = JSON.parse(line)

            // Check if stream is complete
            if (data.done) {
              done = true
              break
            }

            // Add content if available
            if (data.message?.content) {
              const text = data.message.content
              fullText += text
              onChunk(text)
            }
          } catch (e) {
            // Ignore parse errors for incomplete lines
          }
        }
      }
    }

    await onComplete(fullText)
  } catch (error) {
    onError(error instanceof Error ? error : new Error('Unknown error'))
  }
}

/**
 * Get a non-streaming chat completion from Ollama
 * (Useful for when we don't need streaming, like flashcard generation)
 *
 * @param messages - Conversation history
 * @param systemPrompt - System prompt for LLM behavior
 * @returns The complete response text
 */
export async function getChatCompletion(params: {
  messages: ClaudeMessage[]
  systemPrompt: string
}): Promise<string> {
  const { messages, systemPrompt } = params

  // Format messages for Ollama
  const ollamaMessages = [{ role: 'system', content: systemPrompt }, ...messages]

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: ollamaMessages,
      stream: false,
    }),
  })

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.statusText}`)
  }

  const data = await response.json()

  if (!data.message?.content) {
    throw new Error('No text content in Ollama response')
  }

  return data.message.content
}

/**
 * Validate that Ollama is running and accessible
 */
export async function validateOllamaConnection(): Promise<void> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`)
    if (!response.ok) {
      throw new Error(`Ollama not accessible at ${OLLAMA_BASE_URL}`)
    }
  } catch (error) {
    throw new Error(`Ollama is not running. Start it with: brew services start ollama`)
  }
}
