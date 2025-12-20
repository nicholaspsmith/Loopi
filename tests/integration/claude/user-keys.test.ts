import { describe, it, expect, vi, beforeEach } from 'vitest'
import { streamChatCompletion, getChatCompletion } from '@/lib/claude/client'
import type { ClaudeMessage } from '@/lib/claude/client'

/**
 * Integration Tests for Claude Client with User API Keys
 *
 * Tests verify that Claude client routes requests through Anthropic SDK
 * when user API key is provided.
 * Following TDD - these should FAIL until implementation is complete.
 */

describe('Claude Client with User API Keys', () => {
  const mockApiKey = 'sk-ant-api03-test-key-long-enough-for-validation-1234567890abcdef'
  const mockMessages: ClaudeMessage[] = [
    { role: 'user', content: 'What is machine learning?' },
  ]
  const systemPrompt = 'You are a helpful educational tutor.'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('streamChatCompletion with user API key', () => {
    it('should use Anthropic SDK when userApiKey is provided', async () => {
      let receivedChunks: string[] = []
      let fullText = ''

      await streamChatCompletion({
        messages: mockMessages,
        systemPrompt,
        userApiKey: mockApiKey,
        onChunk: (text) => {
          receivedChunks.push(text)
        },
        onComplete: (text) => {
          fullText = text
        },
        onError: (error) => {
          throw error
        },
      })

      expect(receivedChunks.length).toBeGreaterThan(0)
      expect(fullText).toBeTruthy()
      expect(fullText).toContain('machine learning')
    })

    it('should fall back to Ollama when userApiKey is null', async () => {
      let fullText = ''

      await streamChatCompletion({
        messages: mockMessages,
        systemPrompt,
        userApiKey: null,
        onChunk: () => {},
        onComplete: (text) => {
          fullText = text
        },
        onError: (error) => {
          throw error
        },
      })

      expect(fullText).toBeTruthy()
    })

    it('should handle authentication errors with invalid API key', async () => {
      const invalidKey = 'sk-ant-api03-invalid-key'
      let errorCaught = false

      await streamChatCompletion({
        messages: mockMessages,
        systemPrompt,
        userApiKey: invalidKey,
        onChunk: () => {},
        onComplete: () => {},
        onError: (error) => {
          errorCaught = true
          expect(error.message).toMatch(/authentication|unauthorized/i)
        },
      })

      expect(errorCaught).toBe(true)
    })

    it('should stream chunks progressively from Claude API', async () => {
      let chunkCount = 0
      let firstChunkTime: number | null = null
      let lastChunkTime: number | null = null

      await streamChatCompletion({
        messages: mockMessages,
        systemPrompt,
        userApiKey: mockApiKey,
        onChunk: () => {
          chunkCount++
          if (!firstChunkTime) firstChunkTime = Date.now()
          lastChunkTime = Date.now()
        },
        onComplete: () => {},
        onError: (error) => {
          throw error
        },
      })

      expect(chunkCount).toBeGreaterThan(1)
      expect(lastChunkTime! - firstChunkTime!).toBeGreaterThan(0)
    })
  })

  describe('getChatCompletion with user API key', () => {
    it('should use Anthropic SDK when userApiKey is provided', async () => {
      const response = await getChatCompletion({
        messages: mockMessages,
        systemPrompt,
        userApiKey: mockApiKey,
      })

      expect(response).toBeTruthy()
      expect(typeof response).toBe('string')
      expect(response.length).toBeGreaterThan(10)
    })

    it('should fall back to Ollama when userApiKey is null', async () => {
      const response = await getChatCompletion({
        messages: mockMessages,
        systemPrompt,
        userApiKey: null,
      })

      expect(response).toBeTruthy()
      expect(typeof response).toBe('string')
    })

    it('should handle authentication errors with invalid API key', async () => {
      const invalidKey = 'sk-ant-api03-invalid-key'

      await expect(
        getChatCompletion({
          messages: mockMessages,
          systemPrompt,
          userApiKey: invalidKey,
        })
      ).rejects.toThrow(/authentication|unauthorized/i)
    })

    it('should return complete response from Claude API', async () => {
      const response = await getChatCompletion({
        messages: [{ role: 'user', content: 'Say exactly: TEST_RESPONSE_123' }],
        systemPrompt: 'Repeat exactly what the user says.',
        userApiKey: mockApiKey,
      })

      expect(response).toContain('TEST_RESPONSE_123')
    })
  })

  describe('Provider selection logic', () => {
    it('should use Claude when valid API key is provided', async () => {
      // Test that Anthropic SDK is used (not Ollama endpoint)
      const fetchSpy = vi.spyOn(global, 'fetch')

      await getChatCompletion({
        messages: mockMessages,
        systemPrompt,
        userApiKey: mockApiKey,
      })

      // Should NOT call Ollama endpoint
      const ollamaCalls = fetchSpy.mock.calls.filter((call) =>
        call[0]?.toString().includes('localhost:11434')
      )
      expect(ollamaCalls).toHaveLength(0)

      fetchSpy.mockRestore()
    })

    it('should use Ollama when no API key is provided', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch')

      await getChatCompletion({
        messages: mockMessages,
        systemPrompt,
        userApiKey: null,
      })

      // Should call Ollama endpoint
      const ollamaCalls = fetchSpy.mock.calls.filter((call) =>
        call[0]?.toString().includes('localhost:11434')
      )
      expect(ollamaCalls.length).toBeGreaterThan(0)

      fetchSpy.mockRestore()
    })
  })
})
