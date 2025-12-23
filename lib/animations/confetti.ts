/**
 * Confetti Animation Wrapper
 *
 * Wraps canvas-confetti library with:
 * - Graceful failure handling
 * - Prefers-reduced-motion detection
 * - TypeScript types
 *
 * Maps to T069, T070, T073 in Phase 8 (User Story 7)
 */

import confetti from 'canvas-confetti'

/**
 * Triggers confetti animation with accessibility and error handling
 *
 * @returns Promise that resolves when animation completes or is skipped
 */
export async function triggerConfetti(): Promise<void> {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return
    }

    // Check for prefers-reduced-motion (with fallback for test environments)
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      console.info('[Confetti] Skipped due to prefers-reduced-motion setting')
      return
    }

    // Fire confetti burst
    await confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
      disableForReducedMotion: true, // Double check for reduced motion
    })

    console.info('[Confetti] Animation completed successfully')
  } catch (error) {
    // Graceful failure - log warning but don't break UX
    console.warn('[Confetti] Failed to trigger animation:', error)
  }
}

/**
 * Clears any active confetti animations
 */
export function clearConfetti(): void {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return
    }

    confetti.reset()
  } catch (error) {
    console.warn('[Confetti] Failed to clear animation:', error)
  }
}
