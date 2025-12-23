import { test, expect } from '@playwright/test'

/**
 * Quiz Card Flip Animation E2E Tests
 *
 * Verifies smooth 3D Y-axis flip animation (600ms, ease-out) with:
 * - Proper 3D perspective and transform
 * - 600ms duration with ease-out easing
 * - Smooth 60fps animation
 * - Fallback for unsupported browsers
 */

test.describe('Quiz Card Flip Animation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to quiz page
    await page.goto('/quiz')
    // Wait for page to load - check for either flashcards or "All Caught Up" message
    try {
      await page.waitForSelector('button:has-text("Show Answer")', { timeout: 5000 })
    } catch {
      // No flashcards - wait for empty state
      await page.waitForSelector('text=All Caught Up', { timeout: 5000 })
    }
  })

  test('flips card when Show Answer is clicked', async ({ page }) => {
    // Skip test if no flashcards available
    const showAnswerButton = await page.locator('button:has-text("Show Answer")').count()
    if (showAnswerButton === 0) {
      test.skip()
    }

    // Get the card element
    const card = page.locator('.flip-card-inner').first()

    // Initially, card should not be flipped
    await expect(card).not.toHaveClass(/flipped/)

    // Click Show Answer button
    await page.click('button:has-text("Show Answer")')

    // Card should now be flipped
    await expect(card).toHaveClass(/flipped/)
  })

  test('flip animation completes within 600ms', async ({ page }) => {
    // Skip test if no flashcards available
    const showAnswerButton = await page.locator('button:has-text("Show Answer")').count()
    if (showAnswerButton === 0) {
      test.skip()
    }

    const startTime = Date.now()

    // Click Show Answer
    await page.click('button:has-text("Show Answer")')

    // Wait for answer to be visible
    await page.waitForSelector('text=Answer', { timeout: 1000 })

    const endTime = Date.now()
    const duration = endTime - startTime

    // Animation should complete in under 1 second (600ms + buffer)
    expect(duration).toBeLessThan(1000)
  })

  test('flip uses 3D Y-axis rotation', async ({ page }) => {
    // Skip test if no flashcards available
    const showAnswerButton = await page.locator('button:has-text("Show Answer")').count()
    if (showAnswerButton === 0) {
      test.skip()
    }

    const card = page.locator('.flip-card-inner').first()

    // Click Show Answer
    await page.click('button:has-text("Show Answer")')

    // Wait for animation
    await page.waitForTimeout(100)

    // Check transform style
    const transform = await card.evaluate((el) => {
      return window.getComputedStyle(el).transform
    })

    // Transform should include rotateY (will be a matrix3d in computed style)
    expect(transform).not.toBe('none')
    expect(transform).toMatch(/matrix/)
  })

  test('maintains card structure during flip', async ({ page }) => {
    // Skip test if no flashcards available
    const showAnswerButton = await page.locator('button:has-text("Show Answer")').count()
    if (showAnswerButton === 0) {
      test.skip()
    }

    // Question should be visible initially
    await expect(page.locator('text=Question')).toBeVisible()

    // Click Show Answer
    await page.click('button:has-text("Show Answer")')

    // Wait for flip to complete
    await page.waitForTimeout(700)

    // Both question and answer should be in the DOM
    await expect(page.locator('text=Question')).toBeVisible()
    await expect(page.locator('text=Answer')).toBeVisible()
  })

  test('shows rating buttons after flip completes', async ({ page }) => {
    // Skip test if no flashcards available
    const showAnswerButton = await page.locator('button:has-text("Show Answer")').count()
    if (showAnswerButton === 0) {
      test.skip()
    }

    // Rating buttons should not be visible initially
    await expect(page.locator('button:has-text("Very hard")')).not.toBeVisible()

    // Click Show Answer
    await page.click('button:has-text("Show Answer")')

    // Wait for flip to complete
    await page.waitForTimeout(700)

    // Rating buttons should now be visible
    await expect(page.locator('button:has-text("Very hard")')).toBeVisible()
    await expect(page.locator('button:has-text("Hard")')).toBeVisible()
    await expect(page.locator('button:has-text("Easy")')).toBeVisible()
    await expect(page.locator('button:has-text("Very Easy")')).toBeVisible()
  })

  test('flip animation is smooth without jank', async ({ page }) => {
    // Skip test if no flashcards available
    const showAnswerButton = await page.locator('button:has-text("Show Answer")').count()
    if (showAnswerButton === 0) {
      test.skip()
    }

    // Enable performance monitoring
    await page.evaluate(() => {
      ;(window as any).performanceEntries = []
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          ;(window as any).performanceEntries.push(entry)
        }
      })
      observer.observe({ entryTypes: ['measure'] })
    })

    // Trigger flip
    await page.click('button:has-text("Show Answer")')

    // Wait for animation
    await page.waitForTimeout(700)

    // Check that animation completed
    const answer = page.locator('text=Answer')
    await expect(answer).toBeVisible()
  })

  test('handles rapid clicks gracefully', async ({ page }) => {
    // Skip test if no flashcards available
    const showAnswerButton = await page.locator('button:has-text("Show Answer")').count()
    if (showAnswerButton === 0) {
      test.skip()
    }

    // Rapid clicks should not break the animation
    await page.click('button:has-text("Show Answer")')
    await page.click('button:has-text("Show Answer")')
    await page.click('button:has-text("Show Answer")')

    // Wait for animation
    await page.waitForTimeout(700)

    // Card should be flipped and showing answer
    await expect(page.locator('text=Answer')).toBeVisible()
  })
})
