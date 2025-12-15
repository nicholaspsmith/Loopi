import Anthropic from '@anthropic-ai/sdk'
import type { Message, MessageRole } from '@/types'

/**
 * Claude Client Wrapper
 *
 * Provides interface to Anthropic's Claude API with streaming support.
 * Uses Claude Sonnet 4.5 for educational tutoring interactions.
 */

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Model configuration
export const CLAUDE_MODEL = 'claude-sonnet-4-5-20250929' // Claude Sonnet 4.5
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
 * Stream a chat completion from Claude
 *
 * @param messages - Conversation history
 * @param systemPrompt - System prompt for Claude's behavior
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
    const stream = await anthropic.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages,
    })

    let fullText = ''

    // Handle text deltas
    stream.on('text', (text) => {
      fullText += text
      onChunk(text)
    })

    // Handle completion
    stream.on('message', () => {
      onComplete(fullText)
    })

    // Handle errors
    stream.on('error', (error) => {
      onError(error)
    })

  } catch (error) {
    onError(error instanceof Error ? error : new Error('Unknown error'))
  }
}

/**
 * Get a non-streaming chat completion from Claude
 * (Useful for when we don't need streaming, like flashcard generation)
 *
 * @param messages - Conversation history
 * @param systemPrompt - System prompt for Claude's behavior
 * @returns The complete response text
 */
export async function getChatCompletion(params: {
  messages: ClaudeMessage[]
  systemPrompt: string
}): Promise<string> {
  const { messages, systemPrompt } = params

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages,
  })

  // Extract text from response
  const textContent = response.content.find((block) => block.type === 'text')

  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Claude response')
  }

  return textContent.text
}

/**
 * Validate that API key is configured
 */
export function validateApiKey(): void {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set')
  }
}
