import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateEmbedding,
  generateEmbeddings,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
} from '@/lib/embeddings/openai'

/**
 * Unit Tests for OpenAI Embeddings Client
 *
 * Tests embedding generation with OpenAI API, error handling,
 * and graceful degradation.
 */

describe('OpenAI Embeddings Client', () => {
  const originalApiKey = process.env.OPENAI_API_KEY

  beforeEach(() => {
    vi.resetAllMocks()
    // Set a fake API key for tests
    process.env.OPENAI_API_KEY = 'test-api-key'
  })

  afterEach(() => {
    vi.restoreAllMocks()
    // Restore original API key
    if (originalApiKey) {
      process.env.OPENAI_API_KEY = originalApiKey
    } else {
      delete process.env.OPENAI_API_KEY
    }
  })

  describe('generateEmbedding', () => {
    it('should generate embedding for text', async () => {
      // Mock OpenAI API response
      const mockEmbedding = new Array(1536).fill(0).map((_, i) => i / 1536)

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [
            {
              embedding: mockEmbedding,
            },
          ],
        }),
      })

      const result = await generateEmbedding('Test message content')

      expect(result).toEqual(mockEmbedding)
      expect(result).toHaveLength(EMBEDDING_DIMENSIONS)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: expect.stringContaining('Bearer'),
          }),
          body: JSON.stringify({
            model: EMBEDDING_MODEL,
            input: 'Test message content',
          }),
        })
      )
    })

    it('should handle empty text gracefully', async () => {
      const result = await generateEmbedding('')

      expect(result).toBeNull()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should handle whitespace-only text gracefully', async () => {
      const result = await generateEmbedding('   \n  \t  ')

      expect(result).toBeNull()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should return null on API error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      const result = await generateEmbedding('Test content')

      expect(result).toBeNull()
    })

    it('should return null on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await generateEmbedding('Test content')

      expect(result).toBeNull()
    })

    it('should return null on invalid response format', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          // Missing 'data' field
          invalid: 'response',
        }),
      })

      const result = await generateEmbedding('Test content')

      expect(result).toBeNull()
    })

    it('should return null on missing API key', async () => {
      delete process.env.OPENAI_API_KEY

      const result = await generateEmbedding('Test content')

      expect(result).toBeNull()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should handle very long text', async () => {
      const longText = 'a'.repeat(10000)
      const mockEmbedding = new Array(1536).fill(0.5)

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }],
        }),
      })

      const result = await generateEmbedding(longText)

      expect(result).toEqual(mockEmbedding)
    })

    it('should use correct model', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: new Array(1536).fill(0) }],
        }),
      })

      await generateEmbedding('Test')

      const callArgs = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(callArgs[1].body)

      expect(body.model).toBe('text-embedding-3-small')
    })
  })

  describe('generateEmbeddings', () => {
    it('should generate embeddings for multiple texts', async () => {
      const mockEmbeddings = [
        new Array(1536).fill(0.1),
        new Array(1536).fill(0.2),
        new Array(1536).fill(0.3),
      ]

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: mockEmbeddings.map((embedding) => ({ embedding })),
        }),
      })

      const texts = ['First text', 'Second text', 'Third text']
      const result = await generateEmbeddings(texts)

      expect(result).toEqual(mockEmbeddings)
      expect(result).toHaveLength(3)
      expect(global.fetch).toHaveBeenCalledTimes(1)

      const callArgs = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(callArgs[1].body)

      expect(body.input).toEqual(texts)
    })

    it('should handle empty array', async () => {
      const result = await generateEmbeddings([])

      expect(result).toEqual([])
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should filter out empty texts', async () => {
      const mockEmbedding = new Array(1536).fill(0.5)

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }],
        }),
      })

      const texts = ['Valid text', '', '   ', 'Another valid']
      const result = await generateEmbeddings(texts)

      const callArgs = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(callArgs[1].body)

      // Should only send non-empty texts
      expect(body.input).toEqual(['Valid text', 'Another valid'])
    })

    it('should return empty array on API error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      })

      const result = await generateEmbeddings(['Text 1', 'Text 2'])

      expect(result).toEqual([])
    })

    it('should return empty array on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await generateEmbeddings(['Text 1', 'Text 2'])

      expect(result).toEqual([])
    })

    it('should handle single text', async () => {
      const mockEmbedding = new Array(1536).fill(0.7)

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }],
        }),
      })

      const result = await generateEmbeddings(['Single text'])

      expect(result).toEqual([mockEmbedding])
    })
  })

  describe('Constants', () => {
    it('should export correct model name', () => {
      expect(EMBEDDING_MODEL).toBe('text-embedding-3-small')
    })

    it('should export correct dimensions', () => {
      expect(EMBEDDING_DIMENSIONS).toBe(1536)
    })
  })
})
