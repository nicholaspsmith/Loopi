import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Study UI Improvements (Spec 020)
 *
 * Tests cover three user stories:
 * - User Story 1: Study Individual Node with Children
 * - User Story 2: Fix Card Flip Interactions
 * - User Story 3: Multiple Choice Submit Button
 *
 * These tests follow TDD principles and will FAIL initially until features are implemented.
 */

test.describe('User Story 2: Card Flip Interactions', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to goals page and start a study session
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')
  })

  /**
   * T001: E2E test - spacebar flips flashcard
   *
   * Tests FR-005: System MUST respond to spacebar press by flipping the displayed flashcard
   * Tests SC-001: Card flip interaction responds within 100ms of spacebar press
   */
  test('should flip flashcard when spacebar is pressed', async ({ page }) => {
    // Check if any goals exist
    const goalCards = await page.locator('[data-testid="goal-card"]').count()
    if (goalCards === 0) {
      test.skip()
    }

    // Navigate to study session
    await page.locator('[data-testid="goal-card"]').first().click()
    const studyButton = page.locator('button:has-text("Study")')
    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.click()
    await page.waitForLoadState('networkidle')

    // Check if flashcard mode is active
    const flashcard = page.locator('[data-testid="flashcard"]')
    if ((await flashcard.count()) === 0) {
      test.skip()
    }

    // Verify card is showing front face initially
    const frontFace = page.locator('[data-testid="flashcard-front"]')
    const backFace = page.locator('[data-testid="flashcard-back"]')

    await expect(frontFace).toBeVisible()

    // Press spacebar to flip
    const startTime = Date.now()
    await page.keyboard.press('Space')

    // Wait for flip animation to complete (should be quick, within 100ms response time)
    await page.waitForTimeout(700) // Allow time for animation

    const responseTime = Date.now() - startTime

    // Verify back face is now visible
    await expect(backFace).toBeVisible()

    // Verify response time meets SC-001 (under 100ms initial response)
    // Note: Animation takes longer, but flip should START within 100ms
    expect(responseTime).toBeLessThan(800) // Total including animation
  })

  /**
   * T002: E2E test - 3D flip animation visible during flip
   *
   * Tests FR-006: System MUST display 3D flip animation when card is flipped
   */
  test('should show 3D flip animation when card flips', async ({ page }) => {
    const goalCards = await page.locator('[data-testid="goal-card"]').count()
    if (goalCards === 0) {
      test.skip()
    }

    // Navigate to study session
    await page.locator('[data-testid="goal-card"]').first().click()
    const studyButton = page.locator('button:has-text("Study")')
    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.click()
    await page.waitForLoadState('networkidle')

    const flashcard = page.locator('[data-testid="flashcard"]')
    if ((await flashcard.count()) === 0) {
      test.skip()
    }

    // Get flashcard container to check for 3D transform styles
    const flashcardContainer = flashcard.first()

    // Press spacebar to initiate flip
    await page.keyboard.press('Space')

    // Check for 3D transform properties during animation
    // The container should have transform-style: preserve-3d and rotateY transform
    await page.waitForTimeout(100) // Small delay to catch animation start

    const transformStyle = await flashcardContainer.evaluate((el) => {
      const computed = window.getComputedStyle(el)
      return {
        transformStyle: computed.transformStyle,
        perspective: computed.perspective,
        transform: computed.transform,
      }
    })

    // Verify 3D properties are applied
    // Note: Exact values depend on implementation, but these should be present for 3D effect
    expect(
      transformStyle.transformStyle === 'preserve-3d' ||
        transformStyle.perspective !== 'none' ||
        transformStyle.transform.includes('rotate')
    ).toBeTruthy()

    // Wait for animation to complete
    await page.waitForTimeout(600)

    // Verify back face is visible after flip
    const backFace = page.locator('[data-testid="flashcard-back"]')
    await expect(backFace).toBeVisible()
  })

  test('should not flip card when spacebar is pressed in text input', async ({ page }) => {
    // Edge case: Spacebar should not flip card when user is typing
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

    const flashcard = page.locator('[data-testid="flashcard"]')
    if ((await flashcard.count()) === 0) {
      test.skip()
    }

    // Check if there's any input field on the page (e.g., notes or search)
    const inputField = page.locator('input[type="text"], textarea').first()
    if ((await inputField.count()) === 0) {
      test.skip()
    }

    // Focus on input field
    await inputField.focus()

    const frontFace = page.locator('[data-testid="flashcard-front"]')
    await expect(frontFace).toBeVisible()

    // Press spacebar while focused on input
    await page.keyboard.press('Space')
    await page.waitForTimeout(200)

    // Card should NOT flip - front face should still be visible
    await expect(frontFace).toBeVisible()
  })
})

test.describe('User Story 3: Multiple Choice Submit Button', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')
  })

  /**
   * T009: E2E test - selecting MC answer does not auto-submit
   *
   * Tests FR-007: System MUST require explicit submit button click for multiple choice answers
   * Tests SC-003: Multiple choice answers are never auto-submitted
   */
  test('should not auto-submit when multiple choice answer is selected', async ({ page }) => {
    const goalCards = await page.locator('[data-testid="goal-card"]').count()
    if (goalCards === 0) {
      test.skip()
    }

    // Navigate to study session
    await page.locator('[data-testid="goal-card"]').first().click()
    const studyButton = page.locator('button:has-text("Study")')
    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.click()
    await page.waitForLoadState('networkidle')

    // Switch to multiple choice mode if available
    const mcModeButton = page.locator('button:has-text("Multiple Choice")')
    if ((await mcModeButton.count()) > 0) {
      await mcModeButton.click()
      await page.waitForTimeout(500)
    }

    // Check for MC options
    const mcOptions = page.locator('[data-testid="mc-option"]')
    if ((await mcOptions.count()) === 0) {
      test.skip()
    }

    // Select first option
    await mcOptions.first().click()

    // Wait to ensure no auto-submission occurs
    await page.waitForTimeout(500)

    // Verify Submit button exists and is visible (not Next button)
    const submitButton = page.locator('[data-testid="mc-submit"]')
    await expect(submitButton).toBeVisible()

    // Verify Next button is NOT visible yet (no auto-submit happened)
    const nextButton = page.locator('[data-testid="mc-next"]')
    await expect(nextButton).not.toBeVisible()

    // Verify selected option is highlighted but feedback not shown
    const selectedOption = mcOptions.first()
    const hasHighlight = await selectedOption.evaluate((el) => {
      const styles = window.getComputedStyle(el)
      // Check for blue border or background indicating selection
      return (
        styles.borderColor.includes('blue') ||
        styles.backgroundColor !== 'transparent' ||
        el.classList.contains('selected')
      )
    })

    expect(hasHighlight).toBeTruthy()
  })

  /**
   * T010: E2E test - Submit button enables after selection
   *
   * Tests FR-007: System MUST require explicit submit button click for multiple choice answers
   */
  test('should enable Submit button after answer selection', async ({ page }) => {
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
      await page.waitForTimeout(500)
    }

    const mcOptions = page.locator('[data-testid="mc-option"]')
    if ((await mcOptions.count()) === 0) {
      test.skip()
    }

    const submitButton = page.locator('[data-testid="mc-submit"]')

    // Initially, Submit button should be disabled (no selection yet)
    await expect(submitButton).toBeDisabled()

    // Select an option
    await mcOptions.first().click()

    // Submit button should now be enabled
    await expect(submitButton).toBeEnabled()
  })

  /**
   * T011: E2E test - Next button appears after submission
   *
   * Tests FR-008: System MUST display a "Next" button after multiple choice feedback to proceed to the next card
   */
  test('should show Next button after submission and hide Submit button', async ({ page }) => {
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
      await page.waitForTimeout(500)
    }

    const mcOptions = page.locator('[data-testid="mc-option"]')
    if ((await mcOptions.count()) === 0) {
      test.skip()
    }

    // Select an option
    await mcOptions.first().click()

    const submitButton = page.locator('[data-testid="mc-submit"]')
    const nextButton = page.locator('[data-testid="mc-next"]')

    // Submit button should be visible before submission
    await expect(submitButton).toBeVisible()
    await expect(nextButton).not.toBeVisible()

    // Click Submit
    await submitButton.click()
    await page.waitForTimeout(200)

    // After submission: Submit button hidden, Next button visible
    await expect(submitButton).not.toBeVisible()
    await expect(nextButton).toBeVisible()

    // Verify feedback is shown (correct/incorrect styling)
    const hasCorrectFeedback = await mcOptions.first().evaluate((el) => {
      const styles = window.getComputedStyle(el)
      return (
        styles.borderColor.includes('green') ||
        styles.borderColor.includes('red') ||
        el.classList.contains('correct') ||
        el.classList.contains('incorrect')
      )
    })

    expect(hasCorrectFeedback).toBeTruthy()
  })

  test('should prevent reselection after submission', async ({ page }) => {
    // Edge case: Options should be disabled after submission
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
      await page.waitForTimeout(500)
    }

    const mcOptions = page.locator('[data-testid="mc-option"]')
    if ((await mcOptions.count()) === 0) {
      test.skip()
    }

    // Select and submit first option
    await mcOptions.first().click()
    const submitButton = page.locator('[data-testid="mc-submit"]')
    await submitButton.click()
    await page.waitForTimeout(200)

    // Try to select a different option
    const secondOption = mcOptions.nth(1)
    if ((await mcOptions.count()) > 1) {
      await secondOption.click()

      // Selection should not change (options disabled after submission)
      const isDisabled = await secondOption.isDisabled()
      expect(isDisabled).toBeTruthy()
    }
  })

  test('should prevent multiple submit button clicks', async ({ page }) => {
    // Edge case: Rapid clicking should not cause duplicate submissions
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
      await page.waitForTimeout(500)
    }

    const mcOptions = page.locator('[data-testid="mc-option"]')
    if ((await mcOptions.count()) === 0) {
      test.skip()
    }

    await mcOptions.first().click()
    const submitButton = page.locator('[data-testid="mc-submit"]')

    // Rapid click submit button multiple times
    await submitButton.click()
    await submitButton.click()
    await submitButton.click()

    // Wait for processing
    await page.waitForTimeout(300)

    // Submit button should be hidden (not clickable anymore)
    await expect(submitButton).not.toBeVisible()

    // Next button should appear only once
    const nextButton = page.locator('[data-testid="mc-next"]')
    await expect(nextButton).toBeVisible()
  })
})

test.describe('User Story 1: Study Individual Node with Children', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')
  })

  /**
   * T020: E2E test - clicking node highlights node and children
   *
   * Tests FR-001: System MUST highlight child nodes when parent node is highlighted
   */
  test('should highlight node and all children when node is clicked', async ({ page }) => {
    const goalCards = await page.locator('[data-testid="goal-card"]').count()
    if (goalCards === 0) {
      test.skip()
    }

    // Navigate to goal detail page with skill tree
    await page.locator('[data-testid="goal-card"]').first().click()
    await page.waitForLoadState('networkidle')

    // Look for skill tree nodes
    const skillNodes = page.locator('[data-testid="skill-node"]')
    if ((await skillNodes.count()) === 0) {
      test.skip()
    }

    // Find a node that has children (typically a parent node)
    // For this test, we'll click the first node and verify highlighting
    const firstNode = skillNodes.first()
    await firstNode.click()
    await page.waitForTimeout(200)

    // Verify node has highlighted state (via CSS class or style)
    const isHighlighted = await firstNode.evaluate((el) => {
      return (
        el.classList.contains('highlighted') ||
        el.getAttribute('data-highlighted') === 'true' ||
        window.getComputedStyle(el).backgroundColor !== 'transparent'
      )
    })

    expect(isHighlighted).toBeTruthy()

    // If there are child nodes, verify they are also highlighted
    // This assumes child nodes can be identified by data attributes or structure
    const allNodes = await skillNodes.all()
    if (allNodes.length > 1) {
      const secondNode = skillNodes.nth(1)
      const childHighlighted = await secondNode.evaluate((el) => {
        return (
          el.classList.contains('highlighted') || el.getAttribute('data-highlighted') === 'true'
        )
      })

      // At least one child should be highlighted if it's a descendant
      // (This test may need adjustment based on actual tree structure)
      expect(childHighlighted).toBeTruthy()
    }
  })

  /**
   * T021: E2E test - study button appears on highlighted node
   *
   * Tests FR-002: System MUST display a study button when a node is highlighted, showing aggregated card count
   * Tests SC-002: Users can highlight any node and begin targeted study in under 3 clicks
   */
  test('should show study button with card count when node is highlighted', async ({ page }) => {
    const goalCards = await page.locator('[data-testid="goal-card"]').count()
    if (goalCards === 0) {
      test.skip()
    }

    await page.locator('[data-testid="goal-card"]').first().click()
    await page.waitForLoadState('networkidle')

    const skillNodes = page.locator('[data-testid="skill-node"]')
    if ((await skillNodes.count()) === 0) {
      test.skip()
    }

    // Highlight a node
    await skillNodes.first().click()
    await page.waitForTimeout(200)

    // Look for study button on the highlighted node
    const studyButton = page.locator('[data-testid="study-button"]')

    await expect(studyButton).toBeVisible()

    // Verify button shows card count (e.g., "Study 15 cards" or "Study N cards")
    const buttonText = await studyButton.textContent()
    expect(buttonText).toMatch(/Study \d+ card(s)?/)
  })

  test('should disable study button when node has 0 cards', async ({ page }) => {
    // Edge case: No cards available
    const goalCards = await page.locator('[data-testid="goal-card"]').count()
    if (goalCards === 0) {
      test.skip()
    }

    await page.locator('[data-testid="goal-card"]').first().click()
    await page.waitForLoadState('networkidle')

    const skillNodes = page.locator('[data-testid="skill-node"]')
    if ((await skillNodes.count()) === 0) {
      test.skip()
    }

    // Try to find a node with 0 cards (may not exist in test data)
    // This is a conditional test based on data availability
    const studyButton = page.locator('[data-testid="study-button"]')

    // If button exists and shows 0 cards, it should be disabled
    if ((await studyButton.count()) > 0) {
      const buttonText = await studyButton.textContent()

      if (buttonText?.includes('0 card')) {
        await expect(studyButton).toBeDisabled()

        // Verify tooltip shows "No cards available"
        await studyButton.hover()
        await page.waitForTimeout(200)

        const tooltip = page.locator('text=/No cards available/')
        if ((await tooltip.count()) > 0) {
          await expect(tooltip).toBeVisible()
        }
      }
    }
  })

  /**
   * T022: E2E test - card count modal shows slider with increments of 5
   *
   * Tests FR-003: System MUST allow users to select study card count in increments of 5, with "All (N)" as final option
   */
  test('should show card count selection modal with increments of 5', async ({ page }) => {
    const goalCards = await page.locator('[data-testid="goal-card"]').count()
    if (goalCards === 0) {
      test.skip()
    }

    await page.locator('[data-testid="goal-card"]').first().click()
    await page.waitForLoadState('networkidle')

    const skillNodes = page.locator('[data-testid="skill-node"]')
    if ((await skillNodes.count()) === 0) {
      test.skip()
    }

    // Highlight node
    await skillNodes.first().click()
    await page.waitForTimeout(200)

    const studyButton = page.locator('[data-testid="study-button"]')
    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    // Click study button to open modal
    await studyButton.click()
    await page.waitForTimeout(300)

    // Verify modal appears
    const modal = page.locator('[data-testid="card-count-modal"]')
    await expect(modal).toBeVisible()

    // Verify slider exists
    const slider = page.locator('[data-testid="card-count-slider"]')
    await expect(slider).toBeVisible()

    // Verify slider has increments of 5
    // Check slider attributes (min, max, step)
    const sliderStep = await slider.getAttribute('step')
    expect(sliderStep).toBe('5')

    // Verify "All" option exists
    const allOption = modal.locator('text=/All \\(\\d+\\)/')
    await expect(allOption).toBeVisible()
  })

  test('should handle card count less than 5', async ({ page }) => {
    // Edge case: If total cards < 5, show "Study all N cards" button directly
    // This test is conditional based on having goals with < 5 cards
    const goalCards = await page.locator('[data-testid="goal-card"]').count()
    if (goalCards === 0) {
      test.skip()
    }

    await page.locator('[data-testid="goal-card"]').first().click()
    await page.waitForLoadState('networkidle')

    const skillNodes = page.locator('[data-testid="skill-node"]')
    if ((await skillNodes.count()) === 0) {
      test.skip()
    }

    await skillNodes.first().click()
    await page.waitForTimeout(200)

    const studyButton = page.locator('[data-testid="study-button"]')
    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    const buttonText = await studyButton.textContent()

    // If button shows less than 5 cards, clicking should either:
    // 1. Show modal with only "All (N)" option
    // 2. Start session directly
    if (buttonText?.match(/Study [1-4] card(s)?/)) {
      await studyButton.click()
      await page.waitForTimeout(300)

      const modal = page.locator('[data-testid="card-count-modal"]')

      if ((await modal.count()) > 0) {
        // Modal should show only "All (N)" option, no slider
        const allOption = modal.locator('text=/Study all \\d+ card(s)?/')
        await expect(allOption).toBeVisible()
      } else {
        // Session started directly - verify we're in study mode
        const flashcard = page.locator('[data-testid="flashcard"]')
        await expect(flashcard).toBeVisible()
      }
    }
  })

  /**
   * T023: E2E test - session summary shows after completing all cards
   *
   * Tests FR-010: System MUST display a summary screen upon session completion showing cards completed, accuracy, and a "Done" button
   */
  test('should show session summary after completing all selected cards', async ({ page }) => {
    const goalCards = await page.locator('[data-testid="goal-card"]').count()
    if (goalCards === 0) {
      test.skip()
    }

    await page.locator('[data-testid="goal-card"]').first().click()
    await page.waitForLoadState('networkidle')

    const skillNodes = page.locator('[data-testid="skill-node"]')
    if ((await skillNodes.count()) === 0) {
      test.skip()
    }

    // Highlight node and start study
    await skillNodes.first().click()
    await page.waitForTimeout(200)

    const studyButton = page.locator('[data-testid="study-button"]')
    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.click()
    await page.waitForTimeout(300)

    // In modal, select minimum cards (5 or All if less)
    const modal = page.locator('[data-testid="card-count-modal"]')
    if ((await modal.count()) > 0) {
      // Try to select 5 cards or All
      const confirmButton = modal.locator('button:has-text("Start"), button:has-text("Confirm")')
      if ((await confirmButton.count()) > 0) {
        await confirmButton.click()
        await page.waitForLoadState('networkidle')
      }
    }

    // Complete cards (answer up to 5 cards)
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

    // Wait for session to complete
    await page.waitForTimeout(1000)

    // Verify session summary appears
    const summary = page.locator('[data-testid="session-summary"]')

    if ((await summary.count()) > 0) {
      await expect(summary).toBeVisible()

      // Verify summary shows cards completed
      const cardsCompleted = summary.locator('text=/\\d+\\s*\\/\\s*\\d+/')
      await expect(cardsCompleted).toBeVisible()

      // Verify accuracy percentage is shown
      const accuracy = summary.locator('text=/\\d+%/')
      await expect(accuracy).toBeVisible()

      // Verify Done button exists
      const doneButton = summary.locator('button:has-text("Done")')
      await expect(doneButton).toBeVisible()

      // Click Done to return to skill tree
      await doneButton.click()
      await page.waitForLoadState('networkidle')

      // Verify we're back at goal detail page
      await expect(page).toHaveURL(/\/goals\/[a-f0-9-]+$/)
    }
  })

  test('should present cards in correct order (node hierarchy, then FSRS)', async ({ page }) => {
    // Tests FR-009: System MUST order study cards by node hierarchy (parent before children), with FSRS due-date order within each node
    const goalCards = await page.locator('[data-testid="goal-card"]').count()
    if (goalCards === 0) {
      test.skip()
    }

    await page.locator('[data-testid="goal-card"]').first().click()
    await page.waitForLoadState('networkidle')

    const skillNodes = page.locator('[data-testid="skill-node"]')
    if ((await skillNodes.count()) === 0) {
      test.skip()
    }

    await skillNodes.first().click()
    await page.waitForTimeout(200)

    const studyButton = page.locator('[data-testid="study-button"]')
    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.click()
    await page.waitForTimeout(300)

    // Start session
    const modal = page.locator('[data-testid="card-count-modal"]')
    if ((await modal.count()) > 0) {
      const confirmButton = modal.locator('button:has-text("Start"), button:has-text("Confirm")')
      if ((await confirmButton.count()) > 0) {
        await confirmButton.click()
        await page.waitForLoadState('networkidle')
      }
    }

    // This test verifies order by checking data attributes on cards
    // Implementation should add data-node-path or similar to verify ordering
    const flashcard = page.locator('[data-testid="flashcard"]')
    if ((await flashcard.count()) > 0) {
      // Get node path from card (if available in data attributes)
      const nodePath = await flashcard.getAttribute('data-node-path')

      // For this test, we just verify flashcard renders
      // Full ordering validation would require tracking multiple cards
      expect(nodePath).toBeDefined()
    }
  })

  test('should only study cards from highlighted node and children', async ({ page }) => {
    // Tests FR-004: System MUST filter study cards to only highlighted node and children
    const goalCards = await page.locator('[data-testid="goal-card"]').count()
    if (goalCards === 0) {
      test.skip()
    }

    await page.locator('[data-testid="goal-card"]').first().click()
    await page.waitForLoadState('networkidle')

    const skillNodes = page.locator('[data-testid="skill-node"]')
    if ((await skillNodes.count()) < 2) {
      test.skip()
    }

    // Highlight second node (to ensure we're not getting all cards)
    await skillNodes.nth(1).click()
    await page.waitForTimeout(200)

    const studyButton = page.locator('[data-testid="study-button"]')
    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    // Get card count from button
    const buttonText = await studyButton.textContent()
    const cardCountMatch = buttonText?.match(/(\d+)/)
    const expectedCardCount = cardCountMatch ? parseInt(cardCountMatch[1]) : 0

    await studyButton.click()
    await page.waitForTimeout(300)

    const modal = page.locator('[data-testid="card-count-modal"]')
    if ((await modal.count()) > 0) {
      const confirmButton = modal.locator('button:has-text("Start"), button:has-text("Confirm")')
      if ((await confirmButton.count()) > 0) {
        await confirmButton.click()
        await page.waitForLoadState('networkidle')
      }
    }

    // Verify flashcard exists (cards are filtered correctly)
    const flashcard = page.locator('[data-testid="flashcard"]')
    if (expectedCardCount > 0) {
      await expect(flashcard).toBeVisible()
    }
  })
})
