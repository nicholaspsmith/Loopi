import { describe, it, expect } from 'vitest'
import {
  generateEmbedding,
  generateEmbeddings,
  EMBEDDING_DIMENSIONS,
} from '@/lib/embeddings/ollama'

/**
 * Unit Tests for Ollama Embeddings Client (Stubbed)
 *
 * Tests verify that embeddings are properly stubbed to return null/empty arrays
 * for graceful degradation while Ollama is being removed from the project.
 */

describe('Ollama Embeddings Client (Stubbed)', () => {
  describe('generateEmbedding', () => {
    it('should return null for any text input', async () => {
      const result = await generateEmbedding('Test message content')
      expect(result).toBeNull()
    })

    it('should return null for empty text', async () => {
      const result = await generateEmbedding('')
      expect(result).toBeNull()
    })

    it('should return null for whitespace-only text', async () => {
      const result = await generateEmbedding('   \n  \t  ')
      expect(result).toBeNull()
    })

    it('should return null for very long text', async () => {
      const longText = 'a'.repeat(10000)
      const result = await generateEmbedding(longText)
      expect(result).toBeNull()
    })
  })

  describe('generateEmbeddings', () => {
    it('should return empty array for multiple texts', async () => {
      const texts = ['First text', 'Second text', 'Third text']
      const result = await generateEmbeddings(texts)
      expect(result).toEqual([])
    })

    it('should return empty array for empty array input', async () => {
      const result = await generateEmbeddings([])
      expect(result).toEqual([])
    })

    it('should return empty array for single text', async () => {
      const result = await generateEmbeddings(['Single text'])
      expect(result).toEqual([])
    })

    it('should return empty array for mixed valid and empty texts', async () => {
      const texts = ['Valid text', '', '   ', 'Another valid']
      const result = await generateEmbeddings(texts)
      expect(result).toEqual([])
    })
  })

  describe('Constants', () => {
    it('should export correct dimensions for type compatibility', () => {
      expect(EMBEDDING_DIMENSIONS).toBe(768)
    })
  })
})
