import type { Message } from '@/types'
import type { ClaudeMessage } from './client'

/**
 * Conversation Context Management
 *
 * Manages how much conversation history to include when calling Claude.
 * Balances context length vs token limits.
 */

// Maximum number of messages to include in context
const MAX_CONTEXT_MESSAGES = 20

// Approximate token limit (4096 max_tokens + ~2000 for system prompt and response buffer)
const APPROXIMATE_TOKEN_LIMIT = 6000

/**
 * Estimate tokens in a message (rough approximation: ~4 chars per token)
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Build conversation context for Claude
 *
 * Selects the most relevant messages to include while staying within
 * token limits. Prioritizes recent messages.
 *
 * @param messages - Full conversation history
 * @param maxMessages - Maximum number of messages to include
 * @returns Filtered messages for Claude context
 */
export function buildConversationContext(
  messages: Message[],
  maxMessages: number = MAX_CONTEXT_MESSAGES
): Message[] {
  if (messages.length === 0) {
    return []
  }

  // Start with most recent messages
  const recentMessages = messages.slice(-maxMessages)

  // Estimate total tokens
  let totalTokens = 0
  const contextMessages: Message[] = []

  // Add messages from most recent to oldest until we hit token limit
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const message = recentMessages[i]
    const messageTokens = estimateTokens(message.content)

    if (totalTokens + messageTokens > APPROXIMATE_TOKEN_LIMIT) {
      // Stop adding messages if we would exceed token limit
      break
    }

    contextMessages.unshift(message)
    totalTokens += messageTokens
  }

  // Ensure we have at least the most recent exchange (user + assistant)
  if (contextMessages.length === 0 && recentMessages.length > 0) {
    // Include just the last message if we're over limit
    contextMessages.push(recentMessages[recentMessages.length - 1])
  }

  return contextMessages
}

/**
 * Prepare messages for Claude API
 *
 * Converts Message objects to Claude's format and applies context management.
 */
export function prepareMessagesForClaude(messages: Message[]): ClaudeMessage[] {
  const contextMessages = buildConversationContext(messages)

  return contextMessages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }))
}

/**
 * Check if conversation history is getting long
 *
 * Returns true if we're approaching context limits and might want to
 * suggest starting a new conversation or summarizing.
 */
export function isConversationLong(messages: Message[]): boolean {
  return messages.length > MAX_CONTEXT_MESSAGES * 2
}

/**
 * Get conversation summary statistics
 */
export function getConversationStats(messages: Message[]): {
  totalMessages: number
  totalTokens: number
  userMessages: number
  assistantMessages: number
  isLong: boolean
} {
  const userMessages = messages.filter((m) => m.role === 'user').length
  const assistantMessages = messages.filter((m) => m.role === 'assistant').length
  const totalTokens = messages.reduce((sum, msg) => sum + estimateTokens(msg.content), 0)

  return {
    totalMessages: messages.length,
    totalTokens,
    userMessages,
    assistantMessages,
    isLong: isConversationLong(messages),
  }
}
