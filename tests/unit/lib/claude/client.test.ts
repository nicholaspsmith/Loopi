import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  streamChatCompletion,
  getChatCompletion,
  validateOllamaConnection,
  toClaudeMessages,
  OLLAMA_MODEL,
} from '@/lib/claude/client'
import type { Message } from '@/types'

/**
 * Unit Tests for Claude/Ollama Client
 *
 * Tests streaming and non-streaming chat completions, connection validation,
 * and message format conversion.
 */

describe('Ollama Client', () => {
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

  describe('streamChatCompletion', () => {
    it('should call onChunk for each text chunk', async () => {
      const mockChunks = [
        { message: { content: 'Hello' }, done: false },
        { message: { content: ' world' }, done: false },
        { done: true }, // Final chunk with no content, just done flag
      ]

      // Mock fetch to return a streaming response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => {
            let index = 0
            return {
              read: async () => {
                if (index >= mockChunks.length) {
                  return { done: true }
                }
                const chunk = mockChunks[index++]
                const encoder = new TextEncoder()
                return {
                  done: false,
                  value: encoder.encode(JSON.stringify(chunk) + '\n'),
                }
              },
            }
          },
        },
      })

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

      expect(onChunk).toHaveBeenCalledTimes(2)
      expect(onChunk).toHaveBeenNthCalledWith(1, 'Hello')
      expect(onChunk).toHaveBeenNthCalledWith(2, ' world')

      expect(onComplete).toHaveBeenCalledTimes(1)
      expect(onComplete).toHaveBeenCalledWith('Hello world')

      expect(onError).not.toHaveBeenCalled()
    })

    it('should call onComplete with full text', async () => {
      const mockChunks = [
        { message: { content: 'Test' }, done: false },
        { done: true }, // Final chunk just has done flag
      ]

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => {
            let index = 0
            return {
              read: async () => {
                if (index >= mockChunks.length) {
                  return { done: true }
                }
                const chunk = mockChunks[index++]
                const encoder = new TextEncoder()
                return {
                  done: false,
                  value: encoder.encode(JSON.stringify(chunk) + '\n'),
                }
              },
            }
          },
        },
      })

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

      expect(onComplete).toHaveBeenCalledWith('Test')
    })

    it('should call onError on fetch failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      })

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
          message: expect.stringContaining('Ollama API error'),
        })
      )

      expect(onChunk).not.toHaveBeenCalled()
      expect(onComplete).not.toHaveBeenCalled()
    })

    it('should send correct request to Ollama', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: {
          getReader: () => ({
            read: async () => ({ done: true }),
          }),
        },
      })

      const messages = [{ role: 'user' as const, content: 'Hello' }]
      const systemPrompt = 'You are a helpful assistant'

      await streamChatCompletion({
        messages,
        systemPrompt,
        onChunk: vi.fn(),
        onComplete: vi.fn(),
        onError: vi.fn(),
      })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: OLLAMA_MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: 'Hello' },
            ],
            stream: true,
          }),
        })
      )
    })

    it('should handle empty response body', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: null,
      })

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

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No response body',
        })
      )
    })
  })

  describe('getChatCompletion', () => {
    it('should return complete response text', async () => {
      const mockResponse = {
        message: {
          content: 'This is a complete response',
        },
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      })

      const result = await getChatCompletion({
        messages: [{ role: 'user', content: 'Test' }],
        systemPrompt: 'You are a helpful assistant',
      })

      expect(result).toBe('This is a complete response')
    })

    it('should send correct request for non-streaming', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          message: { content: 'Response' },
        }),
      })

      const messages = [{ role: 'user' as const, content: 'Hello' }]
      const systemPrompt = 'You are a helpful assistant'

      await getChatCompletion({
        messages,
        systemPrompt,
      })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: OLLAMA_MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: 'Hello' },
            ],
            stream: false,
          }),
        })
      )
    })

    it('should throw error on API failure', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
      })

      await expect(
        getChatCompletion({
          messages: [{ role: 'user', content: 'Test' }],
          systemPrompt: 'You are a helpful assistant',
        })
      ).rejects.toThrow('Ollama API error')
    })

    it('should throw error if no content in response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          message: {},
        }),
      })

      await expect(
        getChatCompletion({
          messages: [{ role: 'user', content: 'Test' }],
          systemPrompt: 'You are a helpful assistant',
        })
      ).rejects.toThrow('No text content in Ollama response')
    })
  })

  describe('validateOllamaConnection', () => {
    it('should succeed when Ollama is accessible', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
      })

      await expect(validateOllamaConnection()).resolves.toBeUndefined()
    })

    it('should throw error when Ollama is not accessible', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
      })

      await expect(validateOllamaConnection()).rejects.toThrow('Ollama is not running')
    })

    it('should throw error when fetch fails', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      await expect(validateOllamaConnection()).rejects.toThrow('Ollama is not running')
    })

    it('should call correct endpoint', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
      })

      await validateOllamaConnection()

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/tags'))
    })
  })
})
