import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  clearFeatureCache,
  prefersReducedMotion,
  supports3DTransforms,
  supportsCanvas,
  supportsCSS,
} from '@/lib/utils/feature-detection'

/**
 * Unit Tests for Feature Detection Utilities
 *
 * Tests cache invalidation and feature detection functions
 * Maps to GitHub issue #185 - UI Polish follow-ups
 */

describe('Feature Detection', () => {
  describe('clearFeatureCache', () => {
    beforeEach(() => {
      // Clear cache before each test
      clearFeatureCache()
    })

    it('should clear cached feature detection results', () => {
      // Call detection function to populate cache
      const firstResult = supports3DTransforms()

      // Clear the cache
      clearFeatureCache()

      // Call again - should re-detect (not use cached value)
      const secondResult = supports3DTransforms()

      // Both should work correctly
      expect(typeof firstResult).toBe('boolean')
      expect(typeof secondResult).toBe('boolean')
    })

    it('should reset all cached features', () => {
      // Populate cache with multiple detections
      supports3DTransforms()
      supportsCanvas()
      supportsCSS()

      // Clear cache
      clearFeatureCache()

      // All detection functions should work after cache clear
      expect(typeof supports3DTransforms()).toBe('boolean')
      expect(typeof supportsCanvas()).toBe('boolean')
      expect(typeof supportsCSS()).toBe('boolean')
    })

    it('should allow detection functions to work correctly after cache clear', () => {
      // First detection
      const firstCanvas = supportsCanvas()

      // Clear cache
      clearFeatureCache()

      // Second detection should still return same result (feature hasn't changed)
      const secondCanvas = supportsCanvas()

      expect(firstCanvas).toBe(secondCanvas)
    })
  })

  describe('supports3DTransforms', () => {
    it('should return a boolean value', () => {
      const result = supports3DTransforms()
      expect(typeof result).toBe('boolean')
    })

    it('should cache the result on subsequent calls', () => {
      const firstCall = supports3DTransforms()
      const secondCall = supports3DTransforms()

      // Should return same result (from cache)
      expect(firstCall).toBe(secondCall)
    })

    it('should re-detect after cache is cleared', () => {
      const beforeClear = supports3DTransforms()
      clearFeatureCache()
      const afterClear = supports3DTransforms()

      // Results should be consistent
      expect(beforeClear).toBe(afterClear)
    })
  })

  describe('supportsCanvas', () => {
    it('should return a boolean value', () => {
      const result = supportsCanvas()
      expect(typeof result).toBe('boolean')
    })

    it('should cache the result on subsequent calls', () => {
      const firstCall = supportsCanvas()
      const secondCall = supportsCanvas()

      expect(firstCall).toBe(secondCall)
    })

    it('should detect canvas support correctly', () => {
      const result = supportsCanvas()

      // In jsdom/test environment, canvas may or may not be supported
      expect(typeof result).toBe('boolean')
    })
  })

  describe('supportsCSS', () => {
    it('should return a boolean value', () => {
      const result = supportsCSS()
      expect(typeof result).toBe('boolean')
    })

    it('should cache the result on subsequent calls', () => {
      const firstCall = supportsCSS()
      const secondCall = supportsCSS()

      expect(firstCall).toBe(secondCall)
    })
  })

  describe('prefersReducedMotion', () => {
    beforeEach(() => {
      // Reset matchMedia mock before each test
      vi.unstubAllGlobals()
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('should return false when matchMedia is not available', () => {
      vi.stubGlobal('matchMedia', undefined)

      const result = prefersReducedMotion()

      expect(result).toBe(false)
    })

    it('should return true when prefers-reduced-motion is set', () => {
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      const result = prefersReducedMotion()

      expect(result).toBe(true)
    })

    it('should return false when prefers-reduced-motion is not set', () => {
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      const result = prefersReducedMotion()

      expect(result).toBe(false)
    })

    it('should handle errors gracefully', () => {
      vi.stubGlobal('matchMedia', () => {
        throw new Error('matchMedia error')
      })

      const result = prefersReducedMotion()

      // Should return false on error
      expect(result).toBe(false)
    })

    it('should not cache results (user can change preferences at runtime)', () => {
      // First call with reduced motion disabled
      vi.stubGlobal('matchMedia', () => ({
        matches: false,
        media: '(prefers-reduced-motion: reduce)',
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      const firstResult = prefersReducedMotion()

      // Second call with reduced motion enabled
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      const secondResult = prefersReducedMotion()

      // Results can differ because it's not cached
      expect(firstResult).toBe(false)
      expect(secondResult).toBe(true)
    })
  })
})
