import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateEmbedding, generateEmbeddings, EMBEDDING_DIMENSIONS } from '@/lib/embeddings'

/**
 * Unit Tests for Jina AI Embeddings Client
 *
 * Tests verify the Jina API client with proper mocking to avoid requiring
 * a real API key during test execution.
 */

// Mock fetch globally
global.fetch = vi.fn()

describe('Jina AI Embeddings Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateEmbedding', () => {
    it('should return 1024-dimension array on success', async () => {
      const mockEmbedding = new Array(1024).fill(0.5)
      const mockResponse = {
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }],
        }),
      }

      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const result = await generateEmbedding('Test message content')

      expect(result).toHaveLength(1024)
      expect(result).toEqual(mockEmbedding)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.jina.ai/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('Test message content'),
        })
      )
    })

    it('should return null for empty text', async () => {
      const result = await generateEmbedding('')
      expect(result).toBeNull()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should return null for whitespace-only text', async () => {
      const result = await generateEmbedding('   \n  \t  ')
      expect(result).toBeNull()
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should return null on API error', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      }

      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const result = await generateEmbedding('Test text')

      expect(result).toBeNull()
    })

    it('should return null on network error', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

      const result = await generateEmbedding('Test text')

      expect(result).toBeNull()
    })

    it('should handle very long text', async () => {
      const longText = 'a'.repeat(10000)
      const mockEmbedding = new Array(1024).fill(0.7)
      const mockResponse = {
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }],
        }),
      }

      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const result = await generateEmbedding(longText)

      expect(result).toHaveLength(1024)
    })
  })

  describe('generateEmbeddings', () => {
    it('should return arrays of 1024-dimension vectors', async () => {
      const mockEmbeddings = [
        new Array(1024).fill(0.1),
        new Array(1024).fill(0.2),
        new Array(1024).fill(0.3),
      ]
      const mockResponse = {
        ok: true,
        json: async () => ({
          data: mockEmbeddings.map((embedding) => ({ embedding })),
        }),
      }

      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const texts = ['First text', 'Second text', 'Third text']
      const result = await generateEmbeddings(texts)

      expect(result).toHaveLength(3)
      expect(result[0]).toHaveLength(1024)
      expect(result[1]).toHaveLength(1024)
      expect(result[2]).toHaveLength(1024)
    })

    it('should return empty array for empty input', async () => {
      const result = await generateEmbeddings([])

      expect(result).toEqual([])
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should filter out empty texts', async () => {
      const mockEmbedding = new Array(1024).fill(0.5)
      const mockResponse = {
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }, { embedding: mockEmbedding }],
        }),
      }

      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const texts = ['Valid text', '', '   ', 'Another valid']
      await generateEmbeddings(texts)

      // Should only send valid texts to API
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.jina.ai/v1/embeddings',
        expect.objectContaining({
          body: expect.stringContaining('Valid text'),
        })
      )
    })

    it('should return empty array on API error', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      }

      ;(global.fetch as any).mockResolvedValue(mockResponse)

      const texts = ['First text', 'Second text']
      const result = await generateEmbeddings(texts)

      expect(result).toEqual([])
    })

    it('should return empty array on network error', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('Network error'))

      const texts = ['First text', 'Second text']
      const result = await generateEmbeddings(texts)

      expect(result).toEqual([])
    })
  })

  describe('Constants', () => {
    it('EMBEDDING_DIMENSIONS should equal 1024', () => {
      expect(EMBEDDING_DIMENSIONS).toBe(1024)
    })
  })
})
