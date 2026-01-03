import { test, expect, Page } from '@playwright/test'

/**
 * Goal Duplicate Detection E2E Tests (T032)
 *
 * Tests the goal duplicate detection warning flow.
 * Implements duplicate detection before goal creation.
 *
 * Uses API mocking to simulate duplicate check responses.
 */

// Mock duplicate detection response when duplicate is found
const mockDuplicateFoundResponse = {
  isDuplicate: true,
  similarItems: [
    {
      id: '00000000-0000-4000-8000-000000000001',
      score: 0.92,
      displayText: 'Learn TypeScript Programming',
      type: 'goal',
    },
    {
      id: '00000000-0000-4000-8000-000000000002',
      score: 0.85,
      displayText: 'Master TypeScript Development',
      type: 'goal',
    },
  ],
  topScore: 0.92,
  checkSkipped: false,
}

// Mock duplicate detection response when item is unique
const mockNoDuplicateResponse = {
  isDuplicate: false,
  similarItems: [],
  topScore: 0,
  checkSkipped: false,
}

// Mock successful goal creation response with skill tree
const mockGoalCreationResponse = {
  id: '00000000-0000-4000-8000-000000000003',
  title: 'Learn Kubernetes',
  description: 'Master Kubernetes administration',
  status: 'active',
  masteryPercentage: 0,
  totalTimeSeconds: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  skillTree: {
    id: '00000000-0000-4000-8000-000000000004',
    nodeCount: 12,
    maxDepth: 3,
    nodes: [
      {
        id: 'node-1',
        name: 'Core Concepts',
        depth: 1,
        masteryPercentage: 0,
        children: [
          { id: 'node-1-1', name: 'Pods', depth: 2, masteryPercentage: 0, children: [] },
          { id: 'node-1-2', name: 'Services', depth: 2, masteryPercentage: 0, children: [] },
        ],
      },
    ],
  },
}

// Helper to mock duplicate check API
async function mockDuplicateCheckAPI(page: Page, response: object, status: number = 200) {
  await page.route('**/api/goals/check-duplicate', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response),
      })
    } else {
      await route.continue()
    }
  })
}

// Helper to mock goal creation API
async function mockGoalCreationAPI(
  page: Page,
  response: object = mockGoalCreationResponse,
  status: number = 201,
  delayMs: number = 100
) {
  await page.route('**/api/goals', async (route) => {
    if (route.request().method() === 'POST') {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response),
      })
    } else {
      await route.continue()
    }
  })
}

test.describe('Goal Duplicate Detection', () => {
  // Skip in CI - requires UI implementation to be complete
  test.skip(!!process.env.CI, 'Skipping in CI - requires full app running')

  test.beforeEach(async ({ page }) => {
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    // Open goal creation form
    const createButton = page.locator(
      'button:has-text("New Goal"), a:has-text("New Goal"), button:has-text("Create")'
    )

    if ((await createButton.count()) > 0) {
      await createButton.first().click()
    } else {
      const ctaButton = page.locator('button:has-text("Create"), a:has-text("Get Started")')
      if ((await ctaButton.count()) > 0) {
        await ctaButton.first().click()
      }
    }

    const goalInput = page.locator(
      'input[placeholder*="goal"], input[name="title"], [data-testid="goal-input"]'
    )
    await goalInput.waitFor({ timeout: 5000 })
  })

  test('shows no warning when goal is unique', async ({ page }) => {
    await mockDuplicateCheckAPI(page, mockNoDuplicateResponse)
    await mockGoalCreationAPI(page)

    const goalInput = page.locator(
      'input[placeholder*="goal"], input[name="title"], [data-testid="goal-input"]'
    )
    await goalInput.fill('Learn Rust programming language basics')

    const submitButton = page.locator(
      'button[type="submit"], button:has-text("Create"), button:has-text("Generate")'
    )
    await submitButton.click()

    await page.waitForTimeout(500)

    const duplicateModal = page.locator('[data-testid="duplicate-warning-modal"]')
    await expect(duplicateModal).not.toBeVisible()

    await expect(
      page.locator('text=/Generating|Creating|Loading/i').or(page.locator('h1:has-text("Rust")'))
    ).toBeVisible({
      timeout: 10000,
    })
  })

  test('shows DuplicateWarningModal when duplicate detected', async ({ page }) => {
    await mockDuplicateCheckAPI(page, mockDuplicateFoundResponse)
    await mockGoalCreationAPI(page)

    const goalInput = page.locator(
      'input[placeholder*="goal"], input[name="title"], [data-testid="goal-input"]'
    )
    await goalInput.fill('Learn TypeScript programming')

    const submitButton = page.locator(
      'button[type="submit"], button:has-text("Create"), button:has-text("Generate")'
    )
    await submitButton.click()

    const duplicateModal = page.locator('[data-testid="duplicate-warning-modal"]')
    await expect(duplicateModal).toBeVisible({ timeout: 5000 })

    await expect(page.locator('text=/92%|0.92|similar/i')).toBeVisible()
    await expect(page.locator('text=/Learn TypeScript Programming/i')).toBeVisible()
    await expect(page.locator('text=/Master TypeScript Development/i')).toBeVisible()

    await expect(page.locator('button:has-text("Cancel")')).toBeVisible()
    await expect(
      page.locator('button:has-text("Create Anyway"), button:has-text("Proceed")')
    ).toBeVisible()
  })

  test('can cancel creation from duplicate warning', async ({ page }) => {
    await mockDuplicateCheckAPI(page, mockDuplicateFoundResponse)

    const goalInput = page.locator(
      'input[placeholder*="goal"], input[name="title"], [data-testid="goal-input"]'
    )
    await goalInput.fill('Learn TypeScript programming')

    const submitButton = page.locator(
      'button[type="submit"], button:has-text("Create"), button:has-text("Generate")'
    )
    await submitButton.click()

    const duplicateModal = page.locator('[data-testid="duplicate-warning-modal"]')
    await expect(duplicateModal).toBeVisible({ timeout: 5000 })

    const cancelButton = page.locator(
      '[data-testid="duplicate-warning-modal"] button:has-text("Cancel")'
    )
    await cancelButton.click()

    await expect(duplicateModal).not.toBeVisible({ timeout: 3000 })

    const goalInputAfterCancel = page.locator(
      'input[placeholder*="goal"], input[name="title"], [data-testid="goal-input"]'
    )
    await expect(goalInputAfterCancel).toBeVisible()
    await expect(goalInputAfterCancel).toHaveValue('Learn TypeScript programming')
  })

  test('can proceed with creation despite duplicate warning', async ({ page }) => {
    await mockDuplicateCheckAPI(page, mockDuplicateFoundResponse)
    await mockGoalCreationAPI(page)

    const goalInput = page.locator(
      'input[placeholder*="goal"], input[name="title"], [data-testid="goal-input"]'
    )
    await goalInput.fill('Learn TypeScript programming')

    const submitButton = page.locator(
      'button[type="submit"], button:has-text("Create"), button:has-text("Generate")'
    )
    await submitButton.click()

    const duplicateModal = page.locator('[data-testid="duplicate-warning-modal"]')
    await expect(duplicateModal).toBeVisible({ timeout: 5000 })

    const proceedButton = page.locator(
      '[data-testid="duplicate-warning-modal"] button:has-text("Create Anyway"), [data-testid="duplicate-warning-modal"] button:has-text("Proceed")'
    )
    await proceedButton.click()

    await expect(duplicateModal).not.toBeVisible({ timeout: 3000 })

    await expect(
      page
        .locator('text=/Generating|Creating|Analyzing|Building/i')
        .or(page.locator('.animate-spin, .animate-pulse'))
        .or(page.locator('h1:has-text("TypeScript")'))
    ).toBeVisible({
      timeout: 10000,
    })
  })

  test('can close duplicate warning modal with Escape key', async ({ page }) => {
    await mockDuplicateCheckAPI(page, mockDuplicateFoundResponse)

    const goalInput = page.locator(
      'input[placeholder*="goal"], input[name="title"], [data-testid="goal-input"]'
    )
    await goalInput.fill('Learn TypeScript programming')

    const submitButton = page.locator(
      'button[type="submit"], button:has-text("Create"), button:has-text("Generate")'
    )
    await submitButton.click()

    const duplicateModal = page.locator('[data-testid="duplicate-warning-modal"]')
    await expect(duplicateModal).toBeVisible({ timeout: 5000 })

    await page.keyboard.press('Escape')

    await expect(duplicateModal).not.toBeVisible({ timeout: 2000 })

    const goalInputAfterEscape = page.locator(
      'input[placeholder*="goal"], input[name="title"], [data-testid="goal-input"]'
    )
    await expect(goalInputAfterEscape).toBeVisible()
  })
})
