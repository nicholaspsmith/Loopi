import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { triggerConfetti, clearConfetti } from '@/lib/animations/confetti'

/**
 * Unit Tests for Confetti Animation
 *
 * Tests confetti cleanup and proper handling of canvas elements
 * Maps to GitHub issue #185 - UI Polish follow-ups
 */

// Mock canvas-confetti library
vi.mock('canvas-confetti', () => {
  const mockReset = vi.fn()
  const mockConfetti = Object.assign(vi.fn().mockResolvedValue(undefined), {
    reset: mockReset,
  })
  return {
    default: mockConfetti,
  }
})

describe('Confetti', () => {
  let mockConfetti: any
  let mockReset: any

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()

    // Get mocked confetti module
    const confettiModule = await import('canvas-confetti')
    mockConfetti = confettiModule.default
    mockReset = (mockConfetti as any).reset

    // Mock window.matchMedia
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('triggerConfetti', () => {
    it('should trigger confetti animation successfully', async () => {
      await triggerConfetti()

      expect(mockConfetti).toHaveBeenCalledWith(
        expect.objectContaining({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        })
      )
    })

    it('should skip confetti when prefers-reduced-motion is enabled', async () => {
      // Mock reduced motion preference
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      await triggerConfetti()

      // Should not call confetti when reduced motion is preferred
      expect(mockConfetti).not.toHaveBeenCalled()
    })

    it('should handle errors gracefully', async () => {
      // Make confetti throw an error
      mockConfetti.mockRejectedValueOnce(new Error('Canvas error'))

      // Should not throw
      await expect(triggerConfetti()).resolves.toBeUndefined()
    })

    it('should handle missing matchMedia gracefully', async () => {
      vi.stubGlobal('matchMedia', undefined)

      // Should not throw
      await expect(triggerConfetti()).resolves.toBeUndefined()
    })
  })

  describe('clearConfetti', () => {
    it('should properly clean up confetti', async () => {
      // Trigger confetti first
      await triggerConfetti()

      // Clear confetti
      clearConfetti()

      // Should call reset
      expect(mockReset).toHaveBeenCalled()
    })

    it('should handle cleanup errors gracefully', async () => {
      // Make reset throw an error
      mockReset.mockImplementationOnce(() => {
        throw new Error('Cleanup error')
      })

      // Should not throw
      expect(() => clearConfetti()).not.toThrow()
    })

    it('should work when called multiple times', async () => {
      clearConfetti()
      clearConfetti()
      clearConfetti()

      // Should handle multiple cleanup calls
      expect(mockReset).toHaveBeenCalledTimes(3)
    })

    it('should clean up without prior confetti trigger', () => {
      // Should not throw even if confetti was never triggered
      expect(() => clearConfetti()).not.toThrow()
    })
  })

  describe('Component Unmount Cleanup', () => {
    it('should not leave canvas elements after cleanup', async () => {
      // Trigger confetti
      await triggerConfetti()

      // Clear confetti (simulating component unmount)
      clearConfetti()

      // Verify cleanup was called
      expect(mockReset).toHaveBeenCalled()
    })

    it('should handle rapid trigger and cleanup', async () => {
      // Simulate rapid component mount/unmount
      await triggerConfetti()
      clearConfetti()
      await triggerConfetti()
      clearConfetti()

      // Should handle rapid cycles without errors
      expect(mockReset).toHaveBeenCalledTimes(2)
    })
  })
})
