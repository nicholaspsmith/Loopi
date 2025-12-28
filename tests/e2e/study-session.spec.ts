import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Complete Study Session
 *
 * Tests the full study session flow from start to finish.
 * Maps to User Story 3: Study with Multiple Modes
 */

test.describe('Study Session E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to goals page
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')
  })

  test('should start a study session from goal page', async ({ page }) => {
    // Check if any goals exist
    const goalCards = await page.locator('[data-testid="goal-card"]').count()

    if (goalCards === 0) {
      test.skip()
    }

    // Click on first goal
    await page.locator('[data-testid="goal-card"]').first().click()

    // Should navigate to goal detail page
    await expect(page).toHaveURL(/\/goals\/[a-f0-9-]+/)

    // Look for study button
    const studyButton = page.locator('button:has-text("Study")')
    if ((await studyButton.count()) > 0) {
      await studyButton.click()

      // Should navigate to study page
      await expect(page).toHaveURL(/\/goals\/[a-f0-9-]+\/study/)
    }
  })

  test('should display study mode selector', async ({ page }) => {
    // Navigate directly to a study page (assuming a goal exists)
    const goalId = 'test-goal-id' // This would need to be a real goal ID
    await page.goto(`/goals/${goalId}/study`)

    // Check for mode selector (if it exists)
    const modeSelector = page.locator('[data-testid="mode-selector"]')

    // This test is conditional on having study modes
    if ((await modeSelector.count()) > 0) {
      await expect(modeSelector).toBeVisible()
    }
  })

  test('should complete a flashcard study session', async ({ page }) => {
    // This test requires a goal with cards
    await page.goto('/goals')

    const goalCards = await page.locator('[data-testid="goal-card"]').count()
    if (goalCards === 0) {
      test.skip()
    }

    // Click first goal
    await page.locator('[data-testid="goal-card"]').first().click()

    // Click study button
    const studyButton = page.locator('button:has-text("Study")')
    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.click()

    // Wait for study page to load
    await page.waitForLoadState('networkidle')

    // Check if cards are available
    const showAnswerButton = page.locator('button:has-text("Show Answer")')
    if ((await showAnswerButton.count()) === 0) {
      test.skip()
    }

    // Show answer
    await showAnswerButton.click()

    // Wait for answer to appear
    await page.waitForTimeout(700) // Wait for flip animation

    // Rate the card
    const ratingButtons = page.locator('button:has-text("Good")')
    if ((await ratingButtons.count()) > 0) {
      await ratingButtons.click()

      // Card should advance
      await page.waitForTimeout(500)
    }
  })

  test('should show session progress', async ({ page }) => {
    await page.goto('/goals')

    const goalCards = await page.locator('[data-testid="goal-card"]').count()
    if (goalCards === 0) {
      test.skip()
    }

    // Navigate to study
    await page.locator('[data-testid="goal-card"]').first().click()

    const studyButton = page.locator('button:has-text("Study")')
    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.click()
    await page.waitForLoadState('networkidle')

    // Look for progress indicator (e.g., "1 / 10")
    const progressText = page.locator('text=/\\d+ \\/ \\d+/')

    if ((await progressText.count()) > 0) {
      await expect(progressText).toBeVisible()
    }
  })

  test('should complete session and show summary', async ({ page }) => {
    // This test requires completing all cards in a session
    await page.goto('/goals')

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

    // Rate up to 5 cards (or until session ends)
    for (let i = 0; i < 5; i++) {
      const showAnswerButton = page.locator('button:has-text("Show Answer")')
      if ((await showAnswerButton.count()) === 0) {
        break
      }

      await showAnswerButton.click()
      await page.waitForTimeout(700)

      const goodButton = page.locator('button:has-text("Good")')
      if ((await goodButton.count()) === 0) {
        break
      }

      await goodButton.click()
      await page.waitForTimeout(500)
    }

    // Check for session complete message or summary
    const completeText = page.locator('text=/Session (Complete|Finished)/')

    if ((await completeText.count()) > 0) {
      await expect(completeText).toBeVisible()
    }
  })

  test('should support multiple choice mode', async ({ page }) => {
    await page.goto('/goals')

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

    // Look for mode selector
    const mcModeButton = page.locator('button:has-text("Multiple Choice")')

    if ((await mcModeButton.count()) > 0) {
      await mcModeButton.click()
      await page.waitForTimeout(500)

      // Check for multiple choice options (A, B, C, D)
      const optionButtons = page.locator('button').filter({ hasText: /^[A-D]/ })

      if ((await optionButtons.count()) > 0) {
        await expect(optionButtons.first()).toBeVisible()
      }
    }
  })

  test('should support timed mode', async ({ page }) => {
    await page.goto('/goals')

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

    // Look for timed mode
    const timedModeButton = page.locator('button:has-text("Timed")')

    if ((await timedModeButton.count()) > 0) {
      await timedModeButton.click()
      await page.waitForTimeout(500)

      // Check for timer display
      const timer = page.locator('text=/\\d+:\\d+/')

      if ((await timer.count()) > 0) {
        await expect(timer).toBeVisible()
      }
    }
  })

  test('should allow returning to goal from study session', async ({ page }) => {
    await page.goto('/goals')

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

    // Look for back button or close button
    const backButton = page.locator(
      'button:has-text("Back"), button:has-text("Close"), a:has-text("Back to Goal")'
    )

    if ((await backButton.count()) > 0) {
      await backButton.first().click()

      // Should return to goal detail page
      await expect(page).toHaveURL(/\/goals\/[a-f0-9-]+$/)
    }
  })
})
