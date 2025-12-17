import type { Message } from '@/types'
import Anthropic from '@anthropic-ai/sdk'

/**
 * AI Client Wrapper
 *
 * Provides unified interface for Claude API (Anthropic SDK) and Ollama.
 * Routes requests based on user API key availability:
 * - With API key: Uses Claude via Anthropic SDK
 * - Without API key: Falls back to local Ollama (100% FREE!)
 */

// Ollama configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2'
export const CLAUDE_MODEL = 'claude-3-5-sonnet-20241022'
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
 * Create an Anthropic client with user API key (T028)
 *
 * @param apiKey - User's Claude API key
 * @returns Configured Anthropic client
 */
export function createAnthropicClient(apiKey: string): Anthropic {
  return new Anthropic({ apiKey })
}

/**
 * Stream chat completion from Claude API using Anthropic SDK (T029)
 *
 * @param client - Anthropic client instance
 * @param messages - Conversation history
 * @param systemPrompt - System prompt for behavior
 * @param onChunk - Callback for each text chunk
 * @param onComplete - Callback when stream completes
 * @param onError - Callback for errors
 */
async function streamClaudeAPI(params: {
  client: Anthropic
  messages: ClaudeMessage[]
  systemPrompt: string
  onChunk: (text: string) => void
  onComplete: (fullText: string) => void
  onError: (error: Error) => void
}): Promise<void> {
  const { client, messages, systemPrompt, onChunk, onComplete, onError } = params

  try {
    let fullText = ''

    const stream = await client.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const text = event.delta.text
        fullText += text
        onChunk(text)
      }
    }

    await onComplete(fullText)
  } catch (error) {
    onError(error instanceof Error ? error : new Error('Unknown error'))
  }
}

/**
 * Stream chat completion from Ollama
 */
async function streamOllamaChat(params: {
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
 * Stream a chat completion (T027)
 *
 * Routes to Claude API when userApiKey is provided, otherwise uses Ollama.
 *
 * @param messages - Conversation history
 * @param systemPrompt - System prompt for LLM behavior
 * @param userApiKey - Optional user Claude API key (null = fallback to Ollama)
 * @param onChunk - Callback for each text chunk
 * @param onComplete - Callback when stream completes
 * @param onError - Callback for errors
 */
export async function streamChatCompletion(params: {
  messages: ClaudeMessage[]
  systemPrompt: string
  userApiKey?: string | null
  onChunk: (text: string) => void
  onComplete: (fullText: string) => void
  onError: (error: Error) => void
}): Promise<void> {
  const { messages, systemPrompt, userApiKey, onChunk, onComplete, onError } = params

  // Route based on API key availability
  if (userApiKey) {
    // Use Claude API with user's key
    const client = createAnthropicClient(userApiKey)
    await streamClaudeAPI({ client, messages, systemPrompt, onChunk, onComplete, onError })
  } else {
    // Fall back to Ollama
    await streamOllamaChat({ messages, systemPrompt, onChunk, onComplete, onError })
  }
}

/**
 * Get a non-streaming chat completion (T030)
 *
 * Routes to Claude API when userApiKey is provided, otherwise uses Ollama.
 * Useful for non-streaming operations like flashcard generation.
 *
 * @param messages - Conversation history
 * @param systemPrompt - System prompt for LLM behavior
 * @param userApiKey - Optional user Claude API key (null = fallback to Ollama)
 * @returns The complete response text
 */
export async function getChatCompletion(params: {
  messages: ClaudeMessage[]
  systemPrompt: string
  userApiKey?: string | null
}): Promise<string> {
  const { messages, systemPrompt, userApiKey } = params

  // Route based on API key availability
  if (userApiKey) {
    // Use Claude API with user's key
    const client = createAnthropicClient(userApiKey)

    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    })

    // Extract text from response
    const textContent = response.content.find((block) => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Claude response')
    }

    return textContent.text
  } else {
    // Fall back to Ollama
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
    throw new Error(
      `Ollama is not running. Start it with: brew services start ollama`
    )
  }
}
