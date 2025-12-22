import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { streamChatCompletion, getChatCompletion } from '@/lib/claude/client'
import type { ClaudeMessage } from '@/lib/claude/client'

/**
 * Integration Tests for Claude Client with User API Keys
 *
 * Tests verify that Claude client routes requests through Anthropic SDK
 * when user API key is provided.
 *
 * These tests require either:
 * - ANTHROPIC_API_KEY env var for Claude API tests
 * - Running Ollama instance for fallback tests
 *
 * Tests are skipped when required services are unavailable.
 */

// Check for real API key - tests requiring Claude will be skipped without it
// Key must exist AND look like a real Anthropic key (not a placeholder)
const CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY
const hasClaudeKey = !!CLAUDE_API_KEY && CLAUDE_API_KEY.startsWith('sk-ant-')

// Check if Ollama is available with a working model
async function isOllamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(2000),
    })
    if (!response.ok) return false

    // Check that at least one model is available
    const data = await response.json()
    const hasModels = data.models && data.models.length > 0
    if (!hasModels) {
      console.log('Ollama running but no models available')
      return false
    }
    return true
  } catch {
    return false
  }
}

// Run sequentially to avoid Ollama resource contention
describe.sequential('Claude Client with User API Keys', () => {
  const mockMessages: ClaudeMessage[] = [{ role: 'user', content: 'What is machine learning?' }]
  const systemPrompt = 'You are a helpful educational tutor.'
  let ollamaAvailable = false

  beforeAll(async () => {
    ollamaAvailable = await isOllamaAvailable()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('streamChatCompletion with user API key', () => {
    it.skipIf(!hasClaudeKey)(
      'should use Anthropic SDK when userApiKey is provided',
      async () => {
        let receivedChunks: string[] = []
        let fullText = ''

        await streamChatCompletion({
          messages: mockMessages,
          systemPrompt,
          userApiKey: CLAUDE_API_KEY!,
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
      },
      15000
    )

    it('should fall back to Ollama when userApiKey is null', async function () {
      if (!ollamaAvailable) {
        console.log('Skipping: Ollama not available')
        return
      }

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
    }, 15000)

    it.skipIf(!hasClaudeKey)(
      'should handle authentication errors with invalid API key',
      async () => {
        const invalidKey = 'sk-ant-api03-invalid-key-for-testing-purposes-1234567890'
        let errorCaught = false

        await streamChatCompletion({
          messages: mockMessages,
          systemPrompt,
          userApiKey: invalidKey,
          onChunk: () => {},
          onComplete: () => {},
          onError: (error) => {
            errorCaught = true
            expect(error.message).toMatch(/authentication|unauthorized|invalid/i)
          },
        })

        expect(errorCaught).toBe(true)
      },
      10000
    )

    it.skipIf(!hasClaudeKey)(
      'should stream chunks progressively from Claude API',
      async () => {
        let chunkCount = 0
        let firstChunkTime: number | null = null
        let lastChunkTime: number | null = null

        await streamChatCompletion({
          messages: mockMessages,
          systemPrompt,
          userApiKey: CLAUDE_API_KEY!,
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
        // Streaming should take some time
        expect(lastChunkTime! - firstChunkTime!).toBeGreaterThanOrEqual(0)
      },
      30000
    )
  })

  describe('getChatCompletion with user API key', () => {
    it.skipIf(!hasClaudeKey)(
      'should use Anthropic SDK when userApiKey is provided',
      async () => {
        const response = await getChatCompletion({
          messages: mockMessages,
          systemPrompt,
          userApiKey: CLAUDE_API_KEY!,
        })

        expect(response).toBeTruthy()
        expect(typeof response).toBe('string')
        expect(response.length).toBeGreaterThan(10)
      },
      15000
    )

    it('should fall back to Ollama when userApiKey is null', async function () {
      if (!ollamaAvailable) {
        console.log('Skipping: Ollama not available')
        return
      }

      const response = await getChatCompletion({
        messages: mockMessages,
        systemPrompt,
        userApiKey: null,
      })

      expect(response).toBeTruthy()
      expect(typeof response).toBe('string')
    }, 15000)

    it.skipIf(!hasClaudeKey)(
      'should handle authentication errors with invalid API key',
      async () => {
        const invalidKey = 'sk-ant-api03-invalid-key-for-testing-purposes-1234567890'

        await expect(
          getChatCompletion({
            messages: mockMessages,
            systemPrompt,
            userApiKey: invalidKey,
          })
        ).rejects.toThrow(/authentication|unauthorized|invalid/i)
      },
      10000
    )

    it.skipIf(!hasClaudeKey)(
      'should return complete response from Claude API',
      async () => {
        const response = await getChatCompletion({
          messages: [{ role: 'user', content: 'Say exactly: TEST_RESPONSE_123' }],
          systemPrompt: 'Repeat exactly what the user says.',
          userApiKey: CLAUDE_API_KEY!,
        })

        expect(response).toContain('TEST_RESPONSE_123')
      },
      15000
    )
  })

  describe('Provider selection logic', () => {
    it.skipIf(!hasClaudeKey)(
      'should use Claude when valid API key is provided',
      async () => {
        // Test that Anthropic SDK is used (not Ollama endpoint)
        const fetchSpy = vi.spyOn(global, 'fetch')

        await getChatCompletion({
          messages: mockMessages,
          systemPrompt,
          userApiKey: CLAUDE_API_KEY!,
        })

        // Should NOT call Ollama endpoint
        const ollamaCalls = fetchSpy.mock.calls.filter((call) =>
          call[0]?.toString().includes('localhost:11434')
        )
        expect(ollamaCalls).toHaveLength(0)

        fetchSpy.mockRestore()
      },
      15000
    )

    it('should use Ollama when no API key is provided', async function () {
      if (!ollamaAvailable) {
        console.log('Skipping: Ollama not available')
        return
      }

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
    }, 15000)
  })
})
