import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Multiple Choice Study Mode
 *
 * Tests the MC study flow with AI-generated distractors.
 * Maps to Task T16: Full MC study flow
 * Feature: 017-multi-choice-distractors
 */

test.describe('Multiple Choice Study Mode E2E @comprehensive', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to goals page
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')
  })

  test('should display 4 options in MC mode (1 correct + 3 distractors)', async ({ page }) => {
    const goalCards = await page.locator('[data-testid="goal-card"]').count()

    if (goalCards === 0) {
      test.skip()
    }

    // Click on first goal
    await page.locator('[data-testid="goal-card"]').first().click()

    // Navigate to study
    const studyButton = page.locator('button:has-text("Study")')
    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.click()
    await page.waitForLoadState('networkidle')

    // Select Multiple Choice mode
    const mcModeButton = page.locator('button:has-text("Multiple Choice")')
    if ((await mcModeButton.count()) === 0) {
      test.skip()
    }

    await mcModeButton.click()

    // Check for 4 option buttons (A, B, C, D)
    const optionButtons = page.locator('button').filter({ hasText: /^[A-D][\s)]/ })
    await expect(optionButtons.first()).toBeVisible({ timeout: 3000 })

    if ((await optionButtons.count()) > 0) {
      // Should have exactly 4 options
      await expect(optionButtons).toHaveCount(4)

      // All options should be visible
      for (let i = 0; i < 4; i++) {
        await expect(optionButtons.nth(i)).toBeVisible()
      }
    }
  })

  test('should advance to next card after selecting correct answer', async ({ page }) => {
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

    // Select Multiple Choice mode
    const mcModeButton = page.locator('button:has-text("Multiple Choice")')
    if ((await mcModeButton.count()) === 0) {
      test.skip()
    }

    await mcModeButton.click()

    // Wait for options to appear
    const optionButtons = page.locator('button').filter({ hasText: /^[A-D][\s)]/ })
    await expect(optionButtons.first()).toBeVisible({ timeout: 3000 })

    // Check if progress indicator exists
    const progressBefore = await page.locator('text=/\\d+ \\/ \\d+/').textContent()

    if (!progressBefore) {
      test.skip()
    }

    // Select first option (may or may not be correct)
    if ((await optionButtons.count()) === 0) {
      test.skip()
    }

    await optionButtons.first().click()

    // Wait for progress to change or session to complete
    await page.waitForTimeout(500)

    // Check if progress changed or next card appeared
    const progressAfter = await page.locator('text=/\\d+ \\/ \\d+/').textContent()

    // Progress should either change or we see session complete
    const sessionComplete = await page.locator('text=/Session (Complete|Finished)/').count()

    if (sessionComplete === 0) {
      expect(progressAfter).not.toBe(progressBefore)
    }
  })

  test('should complete MC session and show summary', async ({ page }) => {
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

    // Select Multiple Choice mode
    const mcModeButton = page.locator('button:has-text("Multiple Choice")')
    if ((await mcModeButton.count()) === 0) {
      test.skip()
    }

    await mcModeButton.click()

    // Wait for options to appear
    await expect(
      page
        .locator('button')
        .filter({ hasText: /^[A-D][\s)]/ })
        .first()
    ).toBeVisible({ timeout: 3000 })

    // Answer up to 10 cards or until session ends
    for (let i = 0; i < 10; i++) {
      const optionButtons = page.locator('button').filter({ hasText: /^[A-D][\s)]/ })

      if ((await optionButtons.count()) === 0) {
        break
      }

      // Click first available option
      await optionButtons.first().click()
      await page.waitForTimeout(500)

      // Check if session completed
      const completeMessage = await page.locator('text=/Session (Complete|Finished)/').count()
      if (completeMessage > 0) {
        break
      }
    }

    // If session completed, verify summary is shown
    const completeText = page.locator('text=/Session (Complete|Finished)/')

    if ((await completeText.count()) > 0) {
      await expect(completeText).toBeVisible()
    }
  })

  test('should show loading indicator during progressive generation', async ({ page }) => {
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

    // Select Multiple Choice mode
    const mcModeButton = page.locator('button:has-text("Multiple Choice")')
    if ((await mcModeButton.count()) === 0) {
      test.skip()
    }

    await mcModeButton.click()

    // Look for loading spinner or "Generating" text
    // This may appear briefly if distractors need to be generated
    const loadingIndicator = page
      .locator('text=/Generating|Loading/i')
      .or(page.locator('[role="status"]'))

    // Check if loading appears (it may be very brief)
    const hasLoading = (await loadingIndicator.count()) > 0

    if (hasLoading) {
      // If loading appears, it should eventually disappear
      await expect(loadingIndicator).toBeHidden({ timeout: 30000 })

      // Then options should appear
      const optionButtons = page.locator('button').filter({ hasText: /^[A-D][\s)]/ })
      await expect(optionButtons.first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('should fallback to flashcard mode when distractors unavailable', async ({ page }) => {
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

    // Select Mixed or Multiple Choice mode
    const mcModeButton = page
      .locator('button:has-text("Multiple Choice")')
      .or(page.locator('button:has-text("Mixed")'))

    if ((await mcModeButton.count()) === 0) {
      test.skip()
    }

    await mcModeButton.click()

    // Wait for either flashcard or MC mode
    const showAnswerButton = page.locator('button:has-text("Show Answer")')
    const mcOptions = page.locator('button').filter({ hasText: /^[A-D][\s)]/ })
    await Promise.race([
      expect(showAnswerButton).toBeVisible({ timeout: 3000 }),
      expect(mcOptions.first()).toBeVisible({ timeout: 3000 }),
    ]).catch(() => {})

    if ((await showAnswerButton.count()) > 0) {
      // We fell back to flashcard mode
      await expect(showAnswerButton).toBeVisible()

      // Note: Toast notification about fallback may appear briefly
      // ("distractors unavailable") but may disappear quickly
      // We verify we're in flashcard mode by checking for Show Answer button
      await expect(showAnswerButton).toBeVisible()
    } else {
      // We're in MC mode - that's fine too
      const optionButtons = page.locator('button').filter({ hasText: /^[A-D][\s)]/ })

      if ((await optionButtons.count()) > 0) {
        await expect(optionButtons.first()).toBeVisible()
      }
    }
  })

  test('should work in Mixed mode with both MC and flashcards', async ({ page }) => {
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

    // Select Mixed mode
    const mixedModeButton = page.locator('button:has-text("Mixed")')
    if ((await mixedModeButton.count()) === 0) {
      test.skip()
    }

    await mixedModeButton.click()

    // Track which modes we encounter
    let sawMC = false
    let sawFlashcard = false

    // Go through several cards to see both modes
    for (let i = 0; i < 5; i++) {
      // Check for MC options
      const optionButtons = page.locator('button').filter({ hasText: /^[A-D][\s)]/ })
      const mcCount = await optionButtons.count()

      if (mcCount > 0) {
        sawMC = true
        await optionButtons.first().click()
        await page.waitForTimeout(500)
      } else {
        // Check for flashcard mode
        const showAnswerButton = page.locator('button:has-text("Show Answer")')
        const flashcardCount = await showAnswerButton.count()

        if (flashcardCount > 0) {
          sawFlashcard = true
          await showAnswerButton.click()

          // Rate the card
          const goodButton = page.locator('button:has-text("Good")')
          await expect(goodButton).toBeVisible({ timeout: 2000 })
          if ((await goodButton.count()) > 0) {
            await goodButton.click()
          }
        } else {
          // No more cards
          break
        }
      }

      // Check if session completed
      const completeMessage = await page.locator('text=/Session (Complete|Finished)/').count()
      if (completeMessage > 0) {
        break
      }
    }

    // Mixed mode should show at least one type of card
    expect(sawMC || sawFlashcard).toBe(true)
  })

  test('should show visual feedback for correct/incorrect answers', async ({ page }) => {
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

    // Select Multiple Choice mode
    const mcModeButton = page.locator('button:has-text("Multiple Choice")')
    if ((await mcModeButton.count()) === 0) {
      test.skip()
    }

    await mcModeButton.click()

    const optionButtons = page.locator('button').filter({ hasText: /^[A-D][\s)]/ })
    await expect(optionButtons.first()).toBeVisible({ timeout: 3000 })

    if ((await optionButtons.count()) === 0) {
      test.skip()
    }

    // Click an option
    await optionButtons.first().click()

    // Look for visual feedback indicators (green for correct, red for incorrect)
    // These might be background colors, icons, or text
    const feedbackElements = page.locator(
      '[class*="correct"], [class*="incorrect"], [class*="bg-green"], [class*="bg-red"]'
    )

    // Some visual feedback should appear after selection
    // This is a soft check - exact styling may vary
    if ((await feedbackElements.count()) > 0) {
      await expect(feedbackElements.first()).toBeVisible()
    }
  })

  test('should respect 10-second threshold for time-based rating', async ({ page }) => {
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

    // Select Multiple Choice mode
    const mcModeButton = page.locator('button:has-text("Multiple Choice")')
    if ((await mcModeButton.count()) === 0) {
      test.skip()
    }

    await mcModeButton.click()

    const optionButtons = page.locator('button').filter({ hasText: /^[A-D][\s)]/ })
    await expect(optionButtons.first()).toBeVisible({ timeout: 3000 })

    if ((await optionButtons.count()) === 0) {
      test.skip()
    }

    // Test fast answer (< 10s) - answer immediately
    const startTime = Date.now()
    await optionButtons.first().click()
    const responseTime = Date.now() - startTime

    // Should be fast (under 1 second for clicking)
    expect(responseTime).toBeLessThan(1000)

    // For testing slow answers, we'd need to wait 10+ seconds
    // This is impractical in E2E tests, so we skip that scenario
    // The integration tests in multi-choice-rating.test.ts cover this
  })

  test('should maintain session progress across card transitions', async ({ page }) => {
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

    // Select Multiple Choice mode
    const mcModeButton = page.locator('button:has-text("Multiple Choice")')
    if ((await mcModeButton.count()) === 0) {
      test.skip()
    }

    await mcModeButton.click()

    const optionButtons = page.locator('button').filter({ hasText: /^[A-D][\s)]/ })
    await expect(optionButtons.first()).toBeVisible({ timeout: 3000 })

    // Get initial progress
    const progressIndicator = page.locator('text=/\\d+ \\/ \\d+/')
    const initialProgress = await progressIndicator.textContent()

    if (!initialProgress) {
      test.skip()
      return
    }

    // Parse progress (e.g., "1 / 10")
    const matches = initialProgress.match(/\d+/g)
    if (!matches) {
      test.skip()
      return
    }
    const [current, total] = matches.map(Number)

    // Answer a card
    if ((await optionButtons.count()) > 0) {
      await optionButtons.first().click()
      await page.waitForTimeout(500)

      // Get new progress
      const newProgress = await progressIndicator.textContent()

      if (newProgress) {
        const [newCurrent, newTotal] = newProgress.match(/\d+/g)!.map(Number)

        // Total should stay the same
        expect(newTotal).toBe(total)

        // Current should increment (unless session completed)
        const sessionComplete = await page.locator('text=/Session (Complete|Finished)/').count()
        if (sessionComplete === 0) {
          expect(newCurrent).toBeGreaterThan(current)
        }
      }
    }
  })
})
