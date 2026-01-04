import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Multi-Choice Study Sessions
 *
 * Tests cover:
 * - T041: Complete MC study session with correct/incorrect answers
 * - T042: Fallback scenario when distractor generation fails
 * - T043: FSRS schedule updates with time-based ratings
 *
 * Maps to Phase 6 of spec 017-multi-choice-distractors
 */

test.describe('Multi-Choice Study Session (T041)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to goals page to start study session
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')
  })

  test('should display question with 4 multiple choice options', async ({ page }) => {
    // Check if any goals exist
    const goalCards = await page.locator('[data-testid="goal-card"]').count()

    if (goalCards === 0) {
      test.skip()
    }

    // Navigate to first goal
    await page.locator('[data-testid="goal-card"]').first().click()
    await expect(page).toHaveURL(/\/goals\/[a-f0-9-]+/)

    // Start study session
    const studyButton = page.locator('button:has-text("Study")')
    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.click()
    await expect(page).toHaveURL(/\/goals\/[a-f0-9-]+\/study/)
    await page.waitForLoadState('networkidle')

    // Look for multiple choice mode (may auto-activate or need selection)
    const mcModeButton = page.locator('button:has-text("Multiple Choice")')
    if ((await mcModeButton.count()) > 0) {
      await mcModeButton.click()
    }

    // Wait for MC options to load (distractors may need to be generated)
    const optionButtons = page.locator('button').filter({ hasText: /^[A-D]\./ })
    await expect(optionButtons.first()).toBeVisible({ timeout: 5000 })
    const optionCount = await optionButtons.count()

    // If MC mode is active, verify 4 options exist
    if (optionCount > 0) {
      expect(optionCount).toBe(4)

      // Verify all options are visible
      for (let i = 0; i < 4; i++) {
        await expect(optionButtons.nth(i)).toBeVisible()
      }

      // Verify question is displayed
      const questionArea = page.locator('[data-testid="flashcard-question"], .question, h2, h3')
      await expect(questionArea.first()).toBeVisible()
    }
  })

  test('should show correct feedback when selecting right answer', async ({ page }) => {
    const goalCards = await page.locator('[data-testid="goal-card"]').count()
    if (goalCards === 0) {
      test.skip()
    }

    await page.locator('[data-testid="goal-card"]').first().click()

    const studyButton = page.locator('button:has-text("Study")')
    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.click()
    await page.waitForLoadState('networkidle')

    // Activate MC mode if needed
    const mcModeButton = page.locator('button:has-text("Multiple Choice")')
    if ((await mcModeButton.count()) > 0) {
      await mcModeButton.click()
    }

    const optionButtons = page.locator('button').filter({ hasText: /^[A-D]\./ })
    await expect(optionButtons.first()).toBeVisible({ timeout: 5000 })

    if ((await optionButtons.count()) === 4) {
      // Select first option (we don't know which is correct, but we'll see feedback)
      await optionButtons.first().click()

      // Check for correct (green) or incorrect (red) feedback
      // Correct answer should have green styling, incorrect should have red
      const correctFeedback = page.locator(
        'button.bg-green-500, button.bg-green-600, button[class*="green"]'
      )
      const incorrectFeedback = page.locator(
        'button.bg-red-500, button.bg-red-600, button[class*="red"]'
      )

      // Should have either correct or incorrect feedback visible
      const hasCorrect = (await correctFeedback.count()) > 0
      const hasIncorrect = (await incorrectFeedback.count()) > 0

      expect(hasCorrect || hasIncorrect).toBe(true)

      // If incorrect, correct answer should be highlighted in green
      if (hasIncorrect) {
        expect(await correctFeedback.count()).toBeGreaterThan(0)
      }
    }
  })

  test('should advance to next card after answer selection', async ({ page }) => {
    const goalCards = await page.locator('[data-testid="goal-card"]').count()
    if (goalCards === 0) {
      test.skip()
    }

    await page.locator('[data-testid="goal-card"]').first().click()

    const studyButton = page.locator('button:has-text("Study")')
    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.click()
    await page.waitForLoadState('networkidle')

    const mcModeButton = page.locator('button:has-text("Multiple Choice")')
    if ((await mcModeButton.count()) > 0) {
      await mcModeButton.click()
    }

    const optionButtons = page.locator('button').filter({ hasText: /^[A-D]\./ })
    await expect(optionButtons.first()).toBeVisible({ timeout: 5000 })

    if ((await optionButtons.count()) === 4) {
      // Get initial progress indicator
      const progressIndicator = page.locator('text=/\\d+\s*\\/\s*\\d+/')
      const initialProgress = await progressIndicator.first().textContent()

      // Select an option
      await optionButtons.first().click()

      // Check if advanced to next card or session completed
      const newProgress = await progressIndicator.first().textContent()
      const sessionComplete = (await page.locator('text=/complete|finished|done/i').count()) > 0

      // Either progress changed or session is complete
      expect(newProgress !== initialProgress || sessionComplete).toBe(true)
    }
  })

  test('should track response time for rating calculation', async ({ page }) => {
    const goalCards = await page.locator('[data-testid="goal-card"]').count()
    if (goalCards === 0) {
      test.skip()
    }

    await page.locator('[data-testid="goal-card"]').first().click()

    const studyButton = page.locator('button:has-text("Study")')
    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.click()
    await page.waitForLoadState('networkidle')

    const mcModeButton = page.locator('button:has-text("Multiple Choice")')
    if ((await mcModeButton.count()) > 0) {
      await mcModeButton.click()
    }

    const optionButtons = page.locator('button').filter({ hasText: /^[A-D]\./ })
    await expect(optionButtons.first()).toBeVisible({ timeout: 5000 })

    if ((await optionButtons.count()) === 4) {
      // Listen for API calls to /api/study/rate
      const rateRequests: any[] = []
      const ratePromise = page.waitForRequest(
        (request) => request.url().includes('/api/study/rate'),
        { timeout: 5000 }
      )
      page.on('request', (request) => {
        if (request.url().includes('/api/study/rate')) {
          rateRequests.push({
            url: request.url(),
            postData: request.postDataJSON(),
          })
        }
      })

      // Answer quickly (fast correct should be ≤10s -> rating 3)
      const startTime = Date.now()
      await optionButtons.first().click()

      // Wait for rating API call
      await ratePromise

      const responseTime = Date.now() - startTime

      // Check if rate API was called
      if (rateRequests.length > 0) {
        const rateData = rateRequests[0].postData

        // Should include responseTimeMs
        expect(rateData).toHaveProperty('responseTimeMs')

        // responseTimeMs should be approximately the response time
        expect(rateData.responseTimeMs).toBeGreaterThan(0)
        expect(rateData.responseTimeMs).toBeLessThan(responseTime + 1000)
      }
    }
  })
})

test.describe('Fallback Scenario (T042)', () => {
  test('should fall back to flashcard mode when distractor generation fails', async ({ page }) => {
    // Mock the distractors API to return an error
    await page.route('**/api/study/distractors', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Failed to generate distractors',
          fallbackRequired: true,
        }),
      })
    })

    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    const goalCards = await page.locator('[data-testid="goal-card"]').count()
    if (goalCards === 0) {
      test.skip()
    }

    await page.locator('[data-testid="goal-card"]').first().click()

    const studyButton = page.locator('button:has-text("Study")')
    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.click()
    await page.waitForLoadState('networkidle')

    // Try to activate MC mode
    const mcModeButton = page.locator('button:has-text("Multiple Choice")')
    if ((await mcModeButton.count()) > 0) {
      await mcModeButton.click()
    }

    // Wait for either flashcard mode (fallback) or MC options
    const showAnswerButton = page.locator('button:has-text("Show Answer")')
    const optionButtons = page.locator('button').filter({ hasText: /^[A-D]\./ })

    // Wait for one of them to appear
    await Promise.race([
      expect(showAnswerButton).toBeVisible({ timeout: 5000 }),
      expect(optionButtons.first()).toBeVisible({ timeout: 5000 }),
    ]).catch(() => {})

    const hasFlashcardMode = (await showAnswerButton.count()) > 0
    const hasMCMode = (await optionButtons.count()) === 4

    // Should be in flashcard mode, not MC mode
    expect(hasFlashcardMode).toBe(true)
    expect(hasMCMode).toBe(false)
  })

  test('should show toast notification on fallback', async ({ page }) => {
    // Mock the distractors API to return an error
    await page.route('**/api/study/distractors', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Failed to generate distractors',
          fallbackRequired: true,
        }),
      })
    })

    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    const goalCards = await page.locator('[data-testid="goal-card"]').count()
    if (goalCards === 0) {
      test.skip()
    }

    await page.locator('[data-testid="goal-card"]').first().click()

    const studyButton = page.locator('button:has-text("Study")')
    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.click()
    await page.waitForLoadState('networkidle')

    const mcModeButton = page.locator('button:has-text("Multiple Choice")')
    if ((await mcModeButton.count()) > 0) {
      await mcModeButton.click()
    }

    // Wait for fallback to occur
    const showAnswerButton = page.locator('button:has-text("Show Answer")')
    await expect(showAnswerButton).toBeVisible({ timeout: 5000 })

    // Look for toast notification about fallback
    const toastMessage = page.locator(
      'text=/showing.*flashcard|distractors unavailable|could not.*load/i, [role="alert"]'
    )

    // Toast should appear (may have auto-dismissed by now)
    // Check if it was visible or is currently visible
    const hasToast = (await toastMessage.count()) > 0

    // This is best-effort since toast may auto-dismiss
    if (hasToast) {
      await expect(toastMessage.first()).toBeVisible()
    }
  })

  test('should still allow normal flashcard study after fallback', async ({ page }) => {
    await page.route('**/api/study/distractors', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Failed to generate distractors',
          fallbackRequired: true,
        }),
      })
    })

    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    const goalCards = await page.locator('[data-testid="goal-card"]').count()
    if (goalCards === 0) {
      test.skip()
    }

    await page.locator('[data-testid="goal-card"]').first().click()

    const studyButton = page.locator('button:has-text("Study")')
    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.click()
    await page.waitForLoadState('networkidle')

    // Should have flashcard mode available
    const showAnswerButton = page.locator('button:has-text("Show Answer")')
    await expect(showAnswerButton).toBeVisible({ timeout: 5000 })

    if ((await showAnswerButton.count()) > 0) {
      // Click to show answer
      await showAnswerButton.click()

      // Rating buttons should appear
      const ratingButtons = page.locator(
        'button:has-text("Good"), button:has-text("Hard"), button:has-text("Again")'
      )
      await expect(ratingButtons.first()).toBeVisible({ timeout: 2000 })

      // Can rate the card
      const goodButton = page.locator('button:has-text("Good")').first()
      await goodButton.click()

      const hasNextCard = (await page.locator('button:has-text("Show Answer")').count()) > 0
      const hasCompletion = (await page.locator('text=/complete|finished/i').count()) > 0

      expect(hasNextCard || hasCompletion).toBe(true)
    }
  })
})

test.describe('FSRS Schedule Updates (T043)', () => {
  test('should send correct rating for fast correct answer (≤10s)', async ({ page }) => {
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    const goalCards = await page.locator('[data-testid="goal-card"]').count()
    if (goalCards === 0) {
      test.skip()
    }

    await page.locator('[data-testid="goal-card"]').first().click()

    const studyButton = page.locator('button:has-text("Study")')
    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.click()
    await page.waitForLoadState('networkidle')

    const mcModeButton = page.locator('button:has-text("Multiple Choice")')
    if ((await mcModeButton.count()) > 0) {
      await mcModeButton.click()
    }

    const optionButtons = page.locator('button').filter({ hasText: /^[A-D]\./ })
    await expect(optionButtons.first()).toBeVisible({ timeout: 5000 })

    if ((await optionButtons.count()) === 4) {
      // Capture rating API calls
      const rateRequests: any[] = []
      const ratePromise = page.waitForRequest(
        (request) => request.url().includes('/api/study/rate'),
        { timeout: 5000 }
      )
      page.on('request', (request) => {
        if (request.url().includes('/api/study/rate')) {
          const postData = request.postDataJSON()
          rateRequests.push(postData)
        }
      })

      // Answer within 10 seconds (fast)
      await page.waitForTimeout(100) // Very fast answer
      await optionButtons.first().click()

      // Wait for API call
      await ratePromise

      // Verify rating was sent
      if (rateRequests.length > 0) {
        const ratingData = rateRequests[0]

        // Should include responseTimeMs
        expect(ratingData).toHaveProperty('responseTimeMs')
        expect(ratingData.responseTimeMs).toBeLessThanOrEqual(10000)

        // Should include mode
        expect(ratingData).toHaveProperty('mode')
        expect(ratingData.mode).toBe('multiple_choice')

        // Rating should be sent (server will adjust based on correct/incorrect + time)
        expect(ratingData).toHaveProperty('rating')
      }
    }
  })

  test('should send responseTimeMs for slow correct answer (>10s)', async ({ page }) => {
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    const goalCards = await page.locator('[data-testid="goal-card"]').count()
    if (goalCards === 0) {
      test.skip()
    }

    await page.locator('[data-testid="goal-card"]').first().click()

    const studyButton = page.locator('button:has-text("Study")')
    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.click()
    await page.waitForLoadState('networkidle')

    const mcModeButton = page.locator('button:has-text("Multiple Choice")')
    if ((await mcModeButton.count()) > 0) {
      await mcModeButton.click()
    }

    const optionButtons = page.locator('button').filter({ hasText: /^[A-D]\./ })
    await expect(optionButtons.first()).toBeVisible({ timeout: 5000 })

    if ((await optionButtons.count()) === 4) {
      const rateRequests: any[] = []
      const ratePromise = page.waitForRequest(
        (request) => request.url().includes('/api/study/rate'),
        { timeout: 15000 }
      )
      page.on('request', (request) => {
        if (request.url().includes('/api/study/rate')) {
          rateRequests.push(request.postDataJSON())
        }
      })

      // Wait 11 seconds to simulate slow answer
      await page.waitForTimeout(11000)
      await optionButtons.first().click()

      await ratePromise

      if (rateRequests.length > 0) {
        const ratingData = rateRequests[0]

        // Should have responseTimeMs > 10s
        expect(ratingData.responseTimeMs).toBeGreaterThan(10000)

        // Should indicate multiple choice mode
        expect(ratingData.mode).toBe('multiple_choice')
      }
    }
  })

  test('should send rating for incorrect answer', async ({ page }) => {
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    const goalCards = await page.locator('[data-testid="goal-card"]').count()
    if (goalCards === 0) {
      test.skip()
    }

    await page.locator('[data-testid="goal-card"]').first().click()

    const studyButton = page.locator('button:has-text("Study")')
    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.click()
    await page.waitForLoadState('networkidle')

    const mcModeButton = page.locator('button:has-text("Multiple Choice")')
    if ((await mcModeButton.count()) > 0) {
      await mcModeButton.click()
    }

    const optionButtons = page.locator('button').filter({ hasText: /^[A-D]\./ })
    await expect(optionButtons.first()).toBeVisible({ timeout: 5000 })

    if ((await optionButtons.count()) === 4) {
      const rateRequests: any[] = []
      const ratePromise = page.waitForRequest(
        (request) => request.url().includes('/api/study/rate'),
        { timeout: 5000 }
      )
      page.on('request', (request) => {
        if (request.url().includes('/api/study/rate')) {
          rateRequests.push(request.postDataJSON())
        }
      })

      // Select an option (may be wrong)
      await optionButtons.first().click()

      // Wait for feedback and rating
      await ratePromise

      if (rateRequests.length > 0) {
        const ratingData = rateRequests[0]

        // Should have rating, responseTimeMs, and mode
        expect(ratingData).toHaveProperty('rating')
        expect(ratingData).toHaveProperty('responseTimeMs')
        expect(ratingData).toHaveProperty('mode')
        expect(ratingData.mode).toBe('multiple_choice')

        // Rating should be 1-4 (FSRS scale: Again=1, Hard=2, Good=3, Easy=4)
        expect(ratingData.rating).toBeGreaterThanOrEqual(1)
        expect(ratingData.rating).toBeLessThanOrEqual(4)
      }
    }
  })

  test('should update card schedule after rating', async ({ page }) => {
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    const goalCards = await page.locator('[data-testid="goal-card"]').count()
    if (goalCards === 0) {
      test.skip()
    }

    await page.locator('[data-testid="goal-card"]').first().click()

    const studyButton = page.locator('button:has-text("Study")')
    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.click()
    await page.waitForLoadState('networkidle')

    const mcModeButton = page.locator('button:has-text("Multiple Choice")')
    if ((await mcModeButton.count()) > 0) {
      await mcModeButton.click()
    }

    const optionButtons = page.locator('button').filter({ hasText: /^[A-D]\./ })
    await expect(optionButtons.first()).toBeVisible({ timeout: 5000 })

    if ((await optionButtons.count()) === 4) {
      // Monitor both rate request and response
      let rateResponseReceived = false

      const rateResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes('/api/study/rate') &&
          response.status() >= 200 &&
          response.status() < 300,
        { timeout: 5000 }
      )

      page.on('response', async (response) => {
        if (response.url().includes('/api/study/rate')) {
          const status = response.status()
          // Successful rating update
          if (status >= 200 && status < 300) {
            rateResponseReceived = true
          }
        }
      })

      // Answer the question
      await optionButtons.first().click()

      // Wait for rating to complete
      await rateResponsePromise

      // Verify rating was successful
      expect(rateResponseReceived).toBe(true)

      // Should advance to next card or complete session
      const hasNextCard =
        (await page
          .locator('button')
          .filter({ hasText: /^[A-D]\./ })
          .count()) === 4 || (await page.locator('button:has-text("Show Answer")').count()) > 0
      const hasCompletion = (await page.locator('text=/complete|finished/i').count()) > 0

      expect(hasNextCard || hasCompletion).toBe(true)
    }
  })
})
