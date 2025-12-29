import type { Message } from '@/types'
import Anthropic from '@anthropic-ai/sdk'

/**
 * AI Client Wrapper
 *
 * Provides unified interface for AI chat completions using the Anthropic SDK.
 * Uses user-provided API key or falls back to server-side API key.
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

// Model configuration
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
    // Log detailed error for debugging
    console.error('[API] Authentication error:', error.message)
    return {
      type: 'authentication_error',
      message: 'Service configuration error. Please contact support.',
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
    // Log detailed error for debugging
    console.error('[API] Quota exceeded:', error.message)
    return {
      type: 'quota_exceeded',
      message: 'Service temporarily unavailable. Please try again later.',
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
    // Log detailed error for debugging
    console.error('[API] Rate limit exceeded:', error.message)
    return {
      type: 'rate_limit_error',
      message: 'Please wait a moment and try again.',
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
    // Log detailed error for debugging
    console.error('[API] Network error:', error.message)
    return {
      type: 'network_error',
      message: 'Connection error. Please check your network and try again.',
      shouldInvalidateKey: false,
      originalError: error,
    }
  }

  // Default to unknown error
  // Log detailed error for debugging
  console.error('[API] Unknown error:', error.message)
  return {
    type: 'unknown_error',
    message: 'Something went wrong. Please try again.',
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
 * Stream a chat completion (T027)
 *
 * Uses the Anthropic SDK for chat completions.
 * Falls back to server-side API key if user key not provided.
 *
 * @param messages - Conversation history
 * @param systemPrompt - System prompt for behavior
 * @param userApiKey - Optional user API key (null = use server-side key)
 * @param onChunk - Callback for each text chunk
 * @param onComplete - Callback when stream completes
 * @param onError - Callback for errors (ClassifiedError)
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

  // Determine which API key to use
  const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    console.error('[API] No API key available (user or server-side)')
    const error: ClassifiedError = {
      type: 'authentication_error',
      message: 'Service temporarily unavailable.',
      shouldInvalidateKey: false,
      originalError: new Error('No API key configured'),
    }
    onError(error)
    return
  }

  // Structured logging for provider routing (T063)
  console.log(
    JSON.stringify({
      event: 'provider_routing',
      provider: 'anthropic',
      messageCount: messages.length,
      usingUserKey: !!userApiKey,
      timestamp: new Date().toISOString(),
    })
  )

  // Create client with available key
  const client = createAnthropicClient(apiKey)

  // Handle classified errors
  const handleError = async (classifiedError: ClassifiedError) => {
    // Log error with classification (T063)
    console.log(
      JSON.stringify({
        event: 'provider_error',
        provider: 'anthropic',
        errorType: classifiedError.type,
        shouldInvalidateKey: classifiedError.shouldInvalidateKey,
        executionTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      })
    )

    // Invalidate API key if needed (T056, T059) - only for user keys
    if (classifiedError.shouldInvalidateKey && onApiKeyInvalid && userApiKey) {
      await onApiKeyInvalid()
    }

    // Pass classified error to callback
    onError(classifiedError)
  }

  const handleComplete = async (fullText: string) => {
    // Log successful completion (T063)
    console.log(
      JSON.stringify({
        event: 'provider_completion',
        provider: 'anthropic',
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
    onComplete: handleComplete,
    onError: handleError,
  })
}

/**
 * Get a non-streaming chat completion (T030)
 *
 * Uses the Anthropic SDK for chat completions.
 * Falls back to server-side API key if user key not provided.
 * Useful for non-streaming operations like flashcard generation.
 *
 * @param messages - Conversation history
 * @param systemPrompt - System prompt for behavior
 * @param userApiKey - Optional user API key (null = use server-side key)
 * @returns The complete response text
 * @throws ClassifiedError for API errors
 */
export async function getChatCompletion(params: {
  messages: ClaudeMessage[]
  systemPrompt: string
  userApiKey?: string | null
}): Promise<string> {
  const { messages, systemPrompt, userApiKey } = params

  // Determine which API key to use
  const apiKey = userApiKey || process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    console.error('[API] No API key available (user or server-side)')
    const error: ClassifiedError = {
      type: 'authentication_error',
      message: 'Service temporarily unavailable.',
      shouldInvalidateKey: false,
      originalError: new Error('No API key configured'),
    }
    throw error
  }

  // Create client with available key
  const client = createAnthropicClient(apiKey)

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
      throw new Error('No text content in response')
    }

    return textContent.text
  } catch (error) {
    // If already a ClassifiedError, rethrow it
    if ((error as ClassifiedError).type) {
      throw error
    }
    // Classify and throw classified error (T056-T058)
    const classifiedError = classifyClaudeError(
      error instanceof Error ? error : new Error('Unknown error')
    )
    throw classifiedError
  }
}
