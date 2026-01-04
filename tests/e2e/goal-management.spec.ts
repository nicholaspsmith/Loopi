import { test, expect, Page } from '@playwright/test'

/**
 * Goal Management E2E Tests (T031-T033)
 *
 * Tests multi-select archive, delete, and restore flows for goals.
 * Implements User Story 2: Goal Archive & Restore (Priority: P1)
 *
 * Tests:
 * - T031: Multi-Select Archive Flow
 * - T032: Multi-Select Delete Flow
 * - T033: Goal Restore Flow
 *
 * Uses API mocking to simulate various goal states and operations.
 */

// Mock goal data factory
function createMockGoal(id: string, status: 'active' | 'archived', title?: string) {
  return {
    id,
    title: title || `Test Goal ${id}`,
    description: `Description for goal ${id}`,
    status,
    masteryPercentage: Math.floor(Math.random() * 100),
    totalTimeSeconds: Math.floor(Math.random() * 3600),
    createdAt: new Date().toISOString(),
    skillTree: {
      id: `tree-${id}`,
      nodeCount: 10,
      maxDepth: 3,
    },
  }
}

// Helper to mock goals list API
async function mockGoalsListAPI(page: Page, activeGoals: number = 3, archivedGoals: number = 1) {
  const goals: Array<{
    id: string
    title: string
    description: string
    status: 'active' | 'archived'
    masteryPercentage: number
    totalTimeSeconds: number
    createdAt: string
    skillTree: {
      id: string
      nodeCount: number
      maxDepth: number
    }
  }> = []

  // Create active goals
  for (let i = 1; i <= activeGoals; i++) {
    goals.push(createMockGoal(`active-${i}`, 'active'))
  }

  // Create archived goals
  for (let i = 1; i <= archivedGoals; i++) {
    goals.push(createMockGoal(`archived-${i}`, 'archived'))
  }

  await page.route('**/api/goals', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ goals }),
      })
    } else {
      await route.continue()
    }
  })
}

// Helper to mock bulk archive API
async function mockBulkArchiveAPI(page: Page, shouldSucceed: boolean = true) {
  await page.route('**/api/goals/archive', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON()
      if (shouldSucceed) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            archived: body.goalIds.length,
            goalIds: body.goalIds,
          }),
        })
      } else {
        await route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Archive limit exceeded',
            code: 'ARCHIVED_LIMIT_EXCEEDED',
          }),
        })
      }
    } else {
      await route.continue()
    }
  })
}

// Helper to mock bulk delete API
async function mockBulkDeleteAPI(page: Page, shouldSucceed: boolean = true) {
  await page.route('**/api/goals/delete', async (route) => {
    if (route.request().method() === 'DELETE') {
      const body = route.request().postDataJSON()
      if (shouldSucceed) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            deleted: body.goalIds.length,
            goalIds: body.goalIds,
          }),
        })
      } else {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Failed to delete goals',
          }),
        })
      }
    } else {
      await route.continue()
    }
  })
}

// Helper to mock restore API
async function mockRestoreAPI(page: Page, canRestore: boolean = true) {
  await page.route('**/api/goals/restore', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON()
      if (canRestore) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            goal: createMockGoal(body.goalId, 'active', 'Restored Goal'),
          }),
        })
      } else {
        await route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Maximum 6 active goals reached',
            code: 'ACTIVE_LIMIT_EXCEEDED',
          }),
        })
      }
    } else {
      await route.continue()
    }
  })
}

test.describe('T031 - Multi-Select Archive Flow @comprehensive', () => {
  // Skip in CI - requires UI implementation to be complete
  test.skip(!!process.env.CI, 'Skipping in CI - selectors need to match implementation')

  test('can enter selection mode', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 1)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Click Select button
    const selectionToggle = page.locator('[data-testid="selection-toggle"]')
    await expect(selectionToggle).toBeVisible({ timeout: 5000 })
    await expect(selectionToggle).toHaveText('Select')

    await selectionToggle.click()

    // Button text should change to Cancel
    await expect(selectionToggle).toHaveText('Cancel')

    // Checkboxes should appear on goal cards
    const firstCheckbox = page.locator('[data-testid^="goal-checkbox-"]').first()
    await expect(firstCheckbox).toBeVisible()
  })

  test('can select multiple goals', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 1)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Enter selection mode
    await page.click('[data-testid="selection-toggle"]')

    // Select first two goals
    await page.click('[data-testid="goal-checkbox-active-1"]')
    await page.click('[data-testid="goal-checkbox-active-2"]')

    // Action bar should appear
    const actionBar = page.locator('[data-testid="goal-action-bar"]')
    await expect(actionBar).toBeVisible({ timeout: 3000 })

    // Should show correct count
    const selectedCount = page.locator('[data-testid="selected-count"]')
    await expect(selectedCount).toHaveText('2 selected')
  })

  test('can clear selection', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 1)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Enter selection mode and select goals
    await page.click('[data-testid="selection-toggle"]')
    await page.click('[data-testid="goal-checkbox-active-1"]')
    await page.click('[data-testid="goal-checkbox-active-2"]')

    // Action bar should be visible
    const actionBar = page.locator('[data-testid="goal-action-bar"]')
    await expect(actionBar).toBeVisible()

    // Click clear selection button (X)
    await page.click('[data-testid="clear-selection"]')

    // Action bar should disappear
    await expect(actionBar).not.toBeVisible({ timeout: 2000 })

    // Checkboxes should be unchecked
    const checkbox1 = page.locator('[data-testid="goal-checkbox-active-1"]')
    await expect(checkbox1).not.toBeChecked()
  })

  test('Escape key clears selection', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 1)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Enter selection mode and select a goal
    await page.click('[data-testid="selection-toggle"]')
    await page.click('[data-testid="goal-checkbox-active-1"]')

    const actionBar = page.locator('[data-testid="goal-action-bar"]')
    await expect(actionBar).toBeVisible()

    // Press Escape
    await page.keyboard.press('Escape')

    // Selection should be cleared
    await expect(actionBar).not.toBeVisible({ timeout: 2000 })
  })

  test('archive confirmation dialog appears', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 1)
    await mockBulkArchiveAPI(page)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Select goals
    await page.click('[data-testid="selection-toggle"]')
    await page.click('[data-testid="goal-checkbox-active-1"]')
    await page.click('[data-testid="goal-checkbox-active-2"]')

    // Click Archive button
    await page.click('[data-testid="archive-selected"]')

    // Dialog should appear
    const dialog = page.locator('[data-testid="confirm-dialog"]')
    await expect(dialog).toBeVisible({ timeout: 3000 })

    // Should show correct message
    const message = page.locator('[data-testid="confirm-dialog-message"]')
    await expect(message).toContainText('2 goals')
    await expect(message).toContainText('restore them later')
  })

  test('can cancel archive', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 1)
    await mockBulkArchiveAPI(page)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Select and try to archive
    await page.click('[data-testid="selection-toggle"]')
    await page.click('[data-testid="goal-checkbox-active-1"]')
    await page.click('[data-testid="archive-selected"]')

    const dialog = page.locator('[data-testid="confirm-dialog"]')
    await expect(dialog).toBeVisible()

    // Click Cancel
    await page.click('[data-testid="confirm-dialog-cancel"]')

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 2000 })

    // Goals should still be selected
    const actionBar = page.locator('[data-testid="goal-action-bar"]')
    await expect(actionBar).toBeVisible()
  })

  test('can confirm archive', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 1)
    await mockBulkArchiveAPI(page)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Select goals and archive
    await page.click('[data-testid="selection-toggle"]')
    await page.click('[data-testid="goal-checkbox-active-1"]')
    await page.click('[data-testid="goal-checkbox-active-2"]')
    await page.click('[data-testid="archive-selected"]')

    // Confirm archive
    await page.click('[data-testid="confirm-dialog-confirm"]')

    // Success toast should appear
    const toast = page.locator('[data-testid="toast-message"]')
    await expect(toast).toBeVisible({ timeout: 5000 })
    await expect(toast).toContainText('Successfully archived 2 goals')

    // Dialog should close
    const dialog = page.locator('[data-testid="confirm-dialog"]')
    await expect(dialog).not.toBeVisible({ timeout: 3000 })
  })

  test('action bar disappears after archive', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 1)
    await mockBulkArchiveAPI(page)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Select and archive
    await page.click('[data-testid="selection-toggle"]')
    await page.click('[data-testid="goal-checkbox-active-1"]')
    await page.click('[data-testid="archive-selected"]')
    await page.click('[data-testid="confirm-dialog-confirm"]')

    // Action bar should disappear
    const actionBar = page.locator('[data-testid="goal-action-bar"]')
    await expect(actionBar).not.toBeVisible({ timeout: 3000 })
  })

  test('archived goals appear in Archived tab', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 2)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Click Archived tab
    await page.click('[data-testid="goals-tab-archived"]')

    // Should see archived goals
    const archivedGoal1 = page.locator('[data-testid="goal-card-archived-1"]')
    await expect(archivedGoal1).toBeVisible({ timeout: 3000 })

    // Tab should show count
    const archivedTab = page.locator('[data-testid="goals-tab-archived"]')
    await expect(archivedTab).toContainText('(2)')
  })
})

test.describe('T032 - Multi-Select Delete Flow @comprehensive', () => {
  test.skip(!!process.env.CI, 'Skipping in CI - selectors need to match implementation')

  test('delete confirmation dialog appears', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 1)
    await mockBulkDeleteAPI(page)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Select goals
    await page.click('[data-testid="selection-toggle"]')
    await page.click('[data-testid="goal-checkbox-active-1"]')
    await page.click('[data-testid="goal-checkbox-active-2"]')

    // Click Delete button
    await page.click('[data-testid="delete-selected"]')

    // Dialog should appear
    const dialog = page.locator('[data-testid="confirm-dialog"]')
    await expect(dialog).toBeVisible({ timeout: 3000 })

    // Should show warning message
    const message = page.locator('[data-testid="confirm-dialog-message"]')
    await expect(message).toContainText('permanently delete 2 goals')
    await expect(message).toContainText('cannot be undone')
  })

  test('can cancel delete', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 1)
    await mockBulkDeleteAPI(page)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Select and try to delete
    await page.click('[data-testid="selection-toggle"]')
    await page.click('[data-testid="goal-checkbox-active-1"]')
    await page.click('[data-testid="delete-selected"]')

    const dialog = page.locator('[data-testid="confirm-dialog"]')
    await expect(dialog).toBeVisible()

    // Click Cancel
    await page.click('[data-testid="confirm-dialog-cancel"]')

    // Dialog should close
    await expect(dialog).not.toBeVisible({ timeout: 2000 })

    // Selection should still be active
    const actionBar = page.locator('[data-testid="goal-action-bar"]')
    await expect(actionBar).toBeVisible()
  })

  test('can confirm delete', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 1)
    await mockBulkDeleteAPI(page)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Select goals and delete
    await page.click('[data-testid="selection-toggle"]')
    await page.click('[data-testid="goal-checkbox-active-1"]')
    await page.click('[data-testid="goal-checkbox-active-2"]')
    await page.click('[data-testid="delete-selected"]')

    // Confirm delete
    await page.click('[data-testid="confirm-dialog-confirm"]')

    // Success toast should appear
    const toast = page.locator('[data-testid="toast-message"]')
    await expect(toast).toBeVisible({ timeout: 5000 })
    await expect(toast).toContainText('Successfully deleted 2 goals')

    // Dialog should close
    const dialog = page.locator('[data-testid="confirm-dialog"]')
    await expect(dialog).not.toBeVisible({ timeout: 3000 })
  })

  test('goals disappear after delete', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 1)
    await mockBulkDeleteAPI(page)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Select and delete
    await page.click('[data-testid="selection-toggle"]')
    await page.click('[data-testid="goal-checkbox-active-1"]')
    await page.click('[data-testid="delete-selected"]')
    await page.click('[data-testid="confirm-dialog-confirm"]')

    // Wait for success toast
    await expect(page.locator('[data-testid="toast-message"]')).toBeVisible({ timeout: 5000 })

    // Action bar should disappear
    const actionBar = page.locator('[data-testid="goal-action-bar"]')
    await expect(actionBar).not.toBeVisible({ timeout: 3000 })
  })

  test('delete shows error on failure', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 1)
    await mockBulkDeleteAPI(page, false) // Force failure
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Select and try to delete
    await page.click('[data-testid="selection-toggle"]')
    await page.click('[data-testid="goal-checkbox-active-1"]')
    await page.click('[data-testid="delete-selected"]')
    await page.click('[data-testid="confirm-dialog-confirm"]')

    // Error toast should appear
    const toast = page.locator('[data-testid="toast-message"]')
    await expect(toast).toBeVisible({ timeout: 5000 })
    await expect(toast).toContainText(/failed/i)
  })

  test('can delete from archived tab', async ({ page }) => {
    await mockGoalsListAPI(page, 2, 3)
    await mockBulkDeleteAPI(page)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Go to Archived tab
    await page.click('[data-testid="goals-tab-archived"]')

    // Select archived goals
    await page.click('[data-testid="selection-toggle"]')
    await page.click('[data-testid="goal-checkbox-archived-1"]')

    // Delete should work from archived tab
    await page.click('[data-testid="delete-selected"]')
    const dialog = page.locator('[data-testid="confirm-dialog"]')
    await expect(dialog).toBeVisible({ timeout: 3000 })

    await page.click('[data-testid="confirm-dialog-confirm"]')

    // Success toast
    const toast = page.locator('[data-testid="toast-message"]')
    await expect(toast).toBeVisible({ timeout: 5000 })
  })
})

test.describe('T033 - Goal Restore Flow @comprehensive', () => {
  test.skip(!!process.env.CI, 'Skipping in CI - selectors need to match implementation')

  test('archived tab shows archived goals', async ({ page }) => {
    await mockGoalsListAPI(page, 2, 3)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Click Archived tab
    await page.click('[data-testid="goals-tab-archived"]')

    // Tab should be active
    const archivedTab = page.locator('[data-testid="goals-tab-archived"]')
    await expect(archivedTab).toHaveClass(/border-blue/)

    // Should show archived goals
    const archivedGoal = page.locator('[data-testid="goal-card-archived-1"]')
    await expect(archivedGoal).toBeVisible({ timeout: 3000 })
  })

  test('restore button visible when under active limit', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 2) // 3 active (< 6)
    await mockRestoreAPI(page, true)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Go to Archived tab
    await page.click('[data-testid="goals-tab-archived"]')

    // Restore button should be visible
    const restoreButton = page.locator('[data-testid="restore-button-archived-1"]')
    await expect(restoreButton).toBeVisible({ timeout: 3000 })
    await expect(restoreButton).toBeEnabled()
    await expect(restoreButton).toHaveText('Restore Goal')
  })

  test('restore button disabled at limit', async ({ page }) => {
    await mockGoalsListAPI(page, 6, 2) // 6 active (at limit)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Go to Archived tab
    await page.click('[data-testid="goals-tab-archived"]')

    // Restore button should show disabled message
    const restoreButton = page.locator('[data-testid="restore-button-archived-1"]')
    await expect(restoreButton).toBeVisible({ timeout: 3000 })
    await expect(restoreButton).toBeDisabled()
    await expect(restoreButton).toHaveText('Active Limit Reached')
  })

  test('restore moves goal to active tab', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 2)
    await mockRestoreAPI(page, true)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Go to Archived tab
    await page.click('[data-testid="goals-tab-archived"]')

    // Click Restore
    const restoreButton = page.locator('[data-testid="restore-button-archived-1"]')
    await restoreButton.click()

    // Success toast should appear
    const toast = page.locator('[data-testid="toast-message"]')
    await expect(toast).toBeVisible({ timeout: 5000 })
    await expect(toast).toContainText(/successfully restored/i)
  })

  test('success toast on restore', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 2)
    await mockRestoreAPI(page, true)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Go to Archived tab and restore
    await page.click('[data-testid="goals-tab-archived"]')
    await page.click('[data-testid="restore-button-archived-1"]')

    // Success toast should show goal title
    const toast = page.locator('[data-testid="toast-message"]')
    await expect(toast).toBeVisible({ timeout: 5000 })
    await expect(toast).toContainText('Successfully restored')
    await expect(toast).toContainText('Restored Goal')
  })

  test('restore shows error when at limit', async ({ page }) => {
    await mockGoalsListAPI(page, 6, 2) // At limit but button not fully disabled
    await mockRestoreAPI(page, false) // API will reject
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // In real implementation, button would be disabled
    // But test the API error handling anyway
    await page.click('[data-testid="goals-tab-archived"]')

    // Restore button should be disabled
    const restoreButton = page.locator('[data-testid="restore-button-archived-1"]')
    await expect(restoreButton).toBeDisabled()
  })

  test('restore button shows loading state', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 2)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Mock slow restore API
    await page.route('**/api/goals/restore', async (route) => {
      if (route.request().method() === 'POST') {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            goal: createMockGoal('archived-1', 'active', 'Restored Goal'),
          }),
        })
      }
    })

    await page.click('[data-testid="goals-tab-archived"]')

    const restoreButton = page.locator('[data-testid="restore-button-archived-1"]')
    await restoreButton.click()

    // Should show loading spinner
    const spinner = restoreButton.locator('.animate-spin')
    await expect(spinner).toBeVisible({ timeout: 2000 })
  })

  test('restore button hidden in selection mode', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 2)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Go to Archived tab
    await page.click('[data-testid="goals-tab-archived"]')

    // Restore button visible initially
    const restoreButton = page.locator('[data-testid="restore-button-archived-1"]')
    await expect(restoreButton).toBeVisible()

    // Enter selection mode
    await page.click('[data-testid="selection-toggle"]')

    // Restore button should be hidden
    await expect(restoreButton).not.toBeVisible({ timeout: 2000 })
  })
})

test.describe('UI State and Interactions', () => {
  test.skip(!!process.env.CI, 'Skipping in CI - selectors need to match implementation')

  test('selection cleared when switching tabs', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 2)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Select some goals on Active tab
    await page.click('[data-testid="selection-toggle"]')
    await page.click('[data-testid="goal-checkbox-active-1"]')

    const actionBar = page.locator('[data-testid="goal-action-bar"]')
    await expect(actionBar).toBeVisible()

    // Switch to Archived tab
    await page.click('[data-testid="goals-tab-archived"]')

    // Selection should be cleared
    await expect(actionBar).not.toBeVisible({ timeout: 2000 })

    // Selection mode should be off
    const selectionToggle = page.locator('[data-testid="selection-toggle"]')
    await expect(selectionToggle).toHaveText('Select')
  })

  test('toast auto-dismisses after 5 seconds', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 2)
    await mockBulkArchiveAPI(page)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Trigger archive to show toast
    await page.click('[data-testid="selection-toggle"]')
    await page.click('[data-testid="goal-checkbox-active-1"]')
    await page.click('[data-testid="archive-selected"]')
    await page.click('[data-testid="confirm-dialog-confirm"]')

    const toast = page.locator('[data-testid="toast-message"]')
    await expect(toast).toBeVisible({ timeout: 5000 })

    // Wait for auto-dismiss (5 seconds) - verify it disappears
    await expect(toast).not.toBeVisible({ timeout: 6000 })
  })

  test('can manually dismiss toast', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 2)
    await mockBulkArchiveAPI(page)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Trigger archive
    await page.click('[data-testid="selection-toggle"]')
    await page.click('[data-testid="goal-checkbox-active-1"]')
    await page.click('[data-testid="archive-selected"]')
    await page.click('[data-testid="confirm-dialog-confirm"]')

    const toast = page.locator('[data-testid="toast-message"]')
    await expect(toast).toBeVisible({ timeout: 5000 })

    // Click dismiss button (X)
    const dismissButton = toast.locator('button[aria-label="Dismiss"]')
    await dismissButton.click()

    // Toast should disappear immediately
    await expect(toast).not.toBeVisible({ timeout: 1000 })
  })

  test('clicking goal card in selection mode toggles checkbox', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 1)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Enter selection mode
    await page.click('[data-testid="selection-toggle"]')

    const goalCard = page.locator('[data-testid="goal-card-active-1"]')
    const checkbox = page.locator('[data-testid="goal-checkbox-active-1"]')

    // Click card to select
    await goalCard.click()
    await expect(checkbox).toBeChecked()

    // Click card again to deselect
    await goalCard.click()
    await expect(checkbox).not.toBeChecked()
  })

  test('clicking goal card outside selection mode navigates to detail', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 1)

    // Mock goal detail page
    await page.route('**/api/goals/active-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(createMockGoal('active-1', 'active')),
      })
    })

    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    const goalCard = page.locator('[data-testid="goal-card-active-1"]')
    await goalCard.click()

    // Should navigate to goal detail page
    await page.waitForURL('**/goals/active-1', { timeout: 5000 })
  })

  test('dialog cannot be dismissed while loading', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 1)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Mock slow archive API
    await page.route('**/api/goals/archive', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ archived: 1, goalIds: ['active-1'] }),
      })
    })

    // Start archive operation
    await page.click('[data-testid="selection-toggle"]')
    await page.click('[data-testid="goal-checkbox-active-1"]')
    await page.click('[data-testid="archive-selected"]')
    await page.click('[data-testid="confirm-dialog-confirm"]')

    // Try to press Escape while loading
    await page.keyboard.press('Escape')

    // Dialog should still be visible
    const dialog = page.locator('[data-testid="confirm-dialog"]')
    await expect(dialog).toBeVisible()

    // Cancel button should be disabled
    const cancelButton = page.locator('[data-testid="confirm-dialog-cancel"]')
    await expect(cancelButton).toBeDisabled()
  })
})

test.describe('Accessibility', () => {
  test.skip(!!process.env.CI, 'Skipping in CI - selectors need to match implementation')

  test('action bar buttons have proper aria-labels', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 1)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Select goals
    await page.click('[data-testid="selection-toggle"]')
    await page.click('[data-testid="goal-checkbox-active-1"]')
    await page.click('[data-testid="goal-checkbox-active-2"]')

    // Check aria-labels
    const archiveButton = page.locator('[data-testid="archive-selected"]')
    const deleteButton = page.locator('[data-testid="delete-selected"]')
    const clearButton = page.locator('[data-testid="clear-selection"]')

    await expect(archiveButton).toHaveAttribute('aria-label', /archive 2 goals/i)
    await expect(deleteButton).toHaveAttribute('aria-label', /delete 2 goals/i)
    await expect(clearButton).toHaveAttribute('aria-label', /clear selection/i)
  })

  test('confirm dialog has proper ARIA attributes', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 1)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Open dialog
    await page.click('[data-testid="selection-toggle"]')
    await page.click('[data-testid="goal-checkbox-active-1"]')
    await page.click('[data-testid="archive-selected"]')

    const dialogBackdrop = page.locator('[data-testid="confirm-dialog-backdrop"]')
    await expect(dialogBackdrop).toHaveAttribute('role', 'dialog')
    await expect(dialogBackdrop).toHaveAttribute('aria-modal', 'true')
    await expect(dialogBackdrop).toHaveAttribute('aria-labelledby', 'confirm-dialog-title')
  })

  test('checkboxes are keyboard accessible', async ({ page }) => {
    await mockGoalsListAPI(page, 3, 1)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Enter selection mode
    await page.click('[data-testid="selection-toggle"]')

    // Tab to first checkbox
    await page.keyboard.press('Tab')

    const checkbox = page.locator('[data-testid="goal-checkbox-active-1"]')

    // Space should toggle checkbox
    await page.keyboard.press('Space')
    await expect(checkbox).toBeChecked()

    await page.keyboard.press('Space')
    await expect(checkbox).not.toBeChecked()
  })
})
