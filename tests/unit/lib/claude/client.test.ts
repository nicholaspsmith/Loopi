import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  streamChatCompletion,
  getChatCompletion,
  toClaudeMessages,
  classifyClaudeError,
  CLAUDE_MODEL,
} from '@/lib/claude/client'
import type { Message } from '@/types'

/**
 * Unit Tests for AI Client
 *
 * Tests streaming and non-streaming chat completions, error classification,
 * and message format conversion.
 */

describe('AI Client', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('toClaudeMessages', () => {
    it('should convert Message[] to ClaudeMessage[]', () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          userId: 'user-1',
          role: 'user',
          content: 'Hello',
          embedding: null,
          createdAt: Date.now(),
          hasFlashcards: false,
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          userId: 'user-1',
          role: 'assistant',
          content: 'Hi there!',
          embedding: null,
          createdAt: Date.now(),
          hasFlashcards: false,
        },
      ]

      const claudeMessages = toClaudeMessages(messages)

      expect(claudeMessages).toHaveLength(2)
      expect(claudeMessages[0]).toEqual({ role: 'user', content: 'Hello' })
      expect(claudeMessages[1]).toEqual({
        role: 'assistant',
        content: 'Hi there!',
      })
    })

    it('should handle empty array', () => {
      const claudeMessages = toClaudeMessages([])

      expect(claudeMessages).toHaveLength(0)
      expect(claudeMessages).toEqual([])
    })

    it('should strip extra fields', () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          userId: 'user-1',
          role: 'user',
          content: 'Test',
          embedding: null,
          createdAt: Date.now(),
          hasFlashcards: false,
        },
      ]

      const claudeMessages = toClaudeMessages(messages)

      expect(claudeMessages[0]).toEqual({ role: 'user', content: 'Test' })
      expect(claudeMessages[0]).not.toHaveProperty('id')
      expect(claudeMessages[0]).not.toHaveProperty('conversationId')
      expect(claudeMessages[0]).not.toHaveProperty('embedding')
    })
  })

  describe('classifyClaudeError', () => {
    it('should classify authentication errors', () => {
      const error = new Error('authentication failed')
      const classified = classifyClaudeError(error)

      expect(classified.type).toBe('authentication_error')
      expect(classified.shouldInvalidateKey).toBe(true)
      expect(classified.message).toBe('Service configuration error. Please contact support.')
    })

    it('should classify invalid API key errors', () => {
      const error = new Error('Invalid API key provided')
      const classified = classifyClaudeError(error)

      expect(classified.type).toBe('authentication_error')
      expect(classified.shouldInvalidateKey).toBe(true)
    })

    it('should classify 401 errors as authentication', () => {
      const error = new Error('Request failed with status 401')
      const classified = classifyClaudeError(error)

      expect(classified.type).toBe('authentication_error')
      expect(classified.shouldInvalidateKey).toBe(true)
    })

    it('should classify quota exceeded errors', () => {
      const error = new Error('quota exceeded')
      const classified = classifyClaudeError(error)

      expect(classified.type).toBe('quota_exceeded')
      expect(classified.shouldInvalidateKey).toBe(false)
      expect(classified.message).toBe('Service temporarily unavailable. Please try again later.')
    })

    it('should classify rate limit errors', () => {
      const error = new Error('rate limit exceeded')
      const classified = classifyClaudeError(error)

      expect(classified.type).toBe('rate_limit_error')
      expect(classified.shouldInvalidateKey).toBe(false)
      expect(classified.message).toBe('Please wait a moment and try again.')
    })

    it('should classify network errors', () => {
      const error = new Error('network error occurred')
      const classified = classifyClaudeError(error)

      expect(classified.type).toBe('network_error')
      expect(classified.shouldInvalidateKey).toBe(false)
      expect(classified.message).toBe('Connection error. Please check your network and try again.')
    })

    it('should classify timeout errors as network errors', () => {
      const error = new Error('Request timeout')
      const classified = classifyClaudeError(error)

      expect(classified.type).toBe('network_error')
      expect(classified.shouldInvalidateKey).toBe(false)
    })

    it('should classify unknown errors with neutral message', () => {
      const error = new Error('Something unexpected happened')
      const classified = classifyClaudeError(error)

      expect(classified.type).toBe('unknown_error')
      expect(classified.shouldInvalidateKey).toBe(false)
      expect(classified.message).toBe('Something went wrong. Please try again.')
    })

    it('should preserve original error', () => {
      const originalError = new Error('Original error message')
      const classified = classifyClaudeError(originalError)

      expect(classified.originalError).toBe(originalError)
    })
  })

  describe('streamChatCompletion', () => {
    it('should call onError when no API key is available', async () => {
      // Clear any existing API key
      const originalKey = process.env.ANTHROPIC_API_KEY
      delete process.env.ANTHROPIC_API_KEY

      const onChunk = vi.fn()
      const onComplete = vi.fn()
      const onError = vi.fn()

      await streamChatCompletion({
        messages: [{ role: 'user', content: 'Test' }],
        systemPrompt: 'You are a helpful assistant',
        onChunk,
        onComplete,
        onError,
      })

      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'authentication_error',
          message: 'Service temporarily unavailable.',
        })
      )
      expect(onChunk).not.toHaveBeenCalled()
      expect(onComplete).not.toHaveBeenCalled()

      // Restore original key if it existed
      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey
      }
    })
  })

  describe('getChatCompletion', () => {
    it('should throw when no API key is available', async () => {
      // Clear any existing API key
      const originalKey = process.env.ANTHROPIC_API_KEY
      delete process.env.ANTHROPIC_API_KEY

      await expect(
        getChatCompletion({
          messages: [{ role: 'user', content: 'Test' }],
          systemPrompt: 'You are a helpful assistant',
        })
      ).rejects.toMatchObject({
        type: 'authentication_error',
        message: 'Service temporarily unavailable.',
      })

      // Restore original key if it existed
      if (originalKey) {
        process.env.ANTHROPIC_API_KEY = originalKey
      }
    })
  })

  describe('CLAUDE_MODEL constant', () => {
    it('should export the Claude model identifier', () => {
      expect(CLAUDE_MODEL).toBe('claude-sonnet-4-5-20250929')
    })
  })
})
