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

// Error classification types (T056-T058)
export type ClaudeErrorType =
  | 'authentication_error'
  | 'quota_exceeded'
  | 'rate_limit_error'
  | 'network_error'
  | 'unknown_error'

export interface ClassifiedError {
  type: ClaudeErrorType
  message: string
  shouldInvalidateKey: boolean
  originalError: Error
}

// Ollama configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2'
export const CLAUDE_MODEL = 'claude-sonnet-4-5-20250929'
export const MAX_TOKENS = 4096

// Message history type for Claude API
export type ClaudeMessage = {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Classify Anthropic SDK errors by type (T056-T058)
 *
 * Analyzes error to determine if it's an authentication failure,
 * quota exceeded, rate limit, or other error type.
 *
 * @param error - Error from Anthropic SDK
 * @returns Classified error with metadata
 */
export function classifyClaudeError(error: Error): ClassifiedError {
  const errorMessage = error.message.toLowerCase()

  // Check for authentication errors (T056)
  if (
    errorMessage.includes('authentication') ||
    errorMessage.includes('invalid api key') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('401')
  ) {
    return {
      type: 'authentication_error',
      message: 'API key authentication failed. Please check your API key in settings.',
      shouldInvalidateKey: true,
      originalError: error,
    }
  }

  // Check for quota exceeded errors (T057)
  if (
    errorMessage.includes('quota') ||
    errorMessage.includes('insufficient credits') ||
    errorMessage.includes('credit balance') ||
    errorMessage.includes('429')
  ) {
    return {
      type: 'quota_exceeded',
      message:
        'Your Claude API quota has been exceeded. Please check your account usage or add credits.',
      shouldInvalidateKey: false,
      originalError: error,
    }
  }

  // Check for rate limit errors (T058)
  if (
    errorMessage.includes('rate limit') ||
    errorMessage.includes('too many requests') ||
    errorMessage.includes('429')
  ) {
    return {
      type: 'rate_limit_error',
      message: 'Rate limit exceeded. Please wait a moment and try again.',
      shouldInvalidateKey: false,
      originalError: error,
    }
  }

  // Check for network errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('timeout')
  ) {
    return {
      type: 'network_error',
      message: 'Network error occurred. Please check your connection and try again.',
      shouldInvalidateKey: false,
      originalError: error,
    }
  }

  // Default to unknown error
  return {
    type: 'unknown_error',
    message: 'An unexpected error occurred. Please try again.',
    shouldInvalidateKey: false,
    originalError: error,
  }
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
  // Runtime check: Fail fast if accidentally used in browser
  // This prevents API key exposure in client-side JavaScript
  if (typeof window !== 'undefined') {
    throw new Error(
      'createAnthropicClient cannot be called from browser code. ' +
        'This would expose your API key. Use server-side API routes instead.'
    )
  }

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
 * @param onError - Callback for errors (receives ClassifiedError)
 */
async function streamClaudeAPI(params: {
  client: Anthropic
  messages: ClaudeMessage[]
  systemPrompt: string
  onChunk: (text: string) => void
  onComplete: (fullText: string) => void
  onError: (error: ClassifiedError) => void
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
    // Classify error and provide structured error information (T056-T058)
    const classifiedError = classifyClaudeError(
      error instanceof Error ? error : new Error('Unknown error')
    )
    onError(classifiedError)
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
 * @param onError - Callback for errors (Error for Ollama, ClassifiedError for Claude)
 * @param onApiKeyInvalid - Optional callback when API key should be invalidated
 */
export async function streamChatCompletion(params: {
  messages: ClaudeMessage[]
  systemPrompt: string
  userApiKey?: string | null
  onChunk: (text: string) => void
  onComplete: (fullText: string) => void
  onError: (error: Error | ClassifiedError) => void
  onApiKeyInvalid?: () => void | Promise<void>
}): Promise<void> {
  const { messages, systemPrompt, userApiKey, onChunk, onComplete, onError, onApiKeyInvalid } =
    params

  const startTime = Date.now()

  // Route based on API key availability
  if (userApiKey) {
    // Structured logging for provider routing (T063)
    console.log(
      JSON.stringify({
        event: 'provider_routing',
        provider: 'claude',
        messageCount: messages.length,
        timestamp: new Date().toISOString(),
      })
    )

    // Use Claude API with user's key
    const client = createAnthropicClient(userApiKey)

    // Handle classified errors from Claude API
    const handleClaudeError = async (classifiedError: ClassifiedError) => {
      // Log error with classification (T063)
      console.log(
        JSON.stringify({
          event: 'provider_error',
          provider: 'claude',
          errorType: classifiedError.type,
          shouldInvalidateKey: classifiedError.shouldInvalidateKey,
          executionTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        })
      )

      // Invalidate API key if needed (T056, T059)
      if (classifiedError.shouldInvalidateKey && onApiKeyInvalid) {
        await onApiKeyInvalid()
      }

      // Pass classified error to callback
      onError(classifiedError)
    }

    const handleClaudeComplete = async (fullText: string) => {
      // Log successful completion (T063)
      console.log(
        JSON.stringify({
          event: 'provider_completion',
          provider: 'claude',
          executionTimeMs: Date.now() - startTime,
          responseLength: fullText.length,
          timestamp: new Date().toISOString(),
        })
      )

      await onComplete(fullText)
    }

    await streamClaudeAPI({
      client,
      messages,
      systemPrompt,
      onChunk,
      onComplete: handleClaudeComplete,
      onError: handleClaudeError,
    })
  } else {
    // Structured logging for Ollama fallback (T063)
    console.log(
      JSON.stringify({
        event: 'provider_routing',
        provider: 'ollama',
        messageCount: messages.length,
        timestamp: new Date().toISOString(),
      })
    )

    // Fall back to Ollama (standard Error, not classified)
    const handleOllamaError = (error: Error) => {
      // Log Ollama error (T063)
      console.log(
        JSON.stringify({
          event: 'provider_error',
          provider: 'ollama',
          error: error.message,
          executionTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        })
      )

      onError(error)
    }

    const handleOllamaComplete = async (fullText: string) => {
      // Log successful completion (T063)
      console.log(
        JSON.stringify({
          event: 'provider_completion',
          provider: 'ollama',
          executionTimeMs: Date.now() - startTime,
          responseLength: fullText.length,
          timestamp: new Date().toISOString(),
        })
      )

      await onComplete(fullText)
    }

    await streamOllamaChat({
      messages,
      systemPrompt,
      onChunk,
      onComplete: handleOllamaComplete,
      onError: handleOllamaError,
    })
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
 * @throws ClassifiedError for Claude API errors, Error for Ollama errors
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

    try {
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
    } catch (error) {
      // Classify and throw classified error (T056-T058)
      const classifiedError = classifyClaudeError(
        error instanceof Error ? error : new Error('Unknown error')
      )
      throw classifiedError
    }
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
    throw new Error(`Ollama is not running. Start it with: brew services start ollama`)
  }
}
