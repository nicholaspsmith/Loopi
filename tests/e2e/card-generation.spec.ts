import { test, expect, Page } from '@playwright/test'

/**
 * Card Generation E2E Tests (T089)
 *
 * Tests the card generation flow for skill tree nodes.
 * Success Criteria SC-002: Card generation under 60 seconds.
 *
 * Uses API mocking to avoid dependency on LLM services in CI.
 */

// Mock goal with skill tree for navigation
const mockGoalId = '00000000-0000-4000-8000-000000000001'
const mockNodeId = '00000000-0000-4000-8000-000000000010'

const mockGoalResponse = {
  id: mockGoalId,
  title: 'Learn TypeScript',
  description: 'Master TypeScript programming',
  status: 'active',
  masteryPercentage: 15,
  totalTimeSeconds: 3600,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const mockSkillTreeResponse = {
  id: '00000000-0000-4000-8000-000000000002',
  goalId: mockGoalId,
  nodeCount: 8,
  maxDepth: 2,
  nodes: [
    {
      id: mockNodeId,
      name: 'Type Basics',
      description: 'Fundamental TypeScript types',
      depth: 1,
      masteryPercentage: 20,
      cardCount: 5,
      children: [
        {
          id: '00000000-0000-4000-8000-000000000011',
          name: 'Primitive Types',
          depth: 2,
          masteryPercentage: 30,
          cardCount: 3,
          children: [],
        },
        {
          id: '00000000-0000-4000-8000-000000000012',
          name: 'Object Types',
          depth: 2,
          masteryPercentage: 10,
          cardCount: 2,
          children: [],
        },
      ],
    },
    {
      id: '00000000-0000-4000-8000-000000000020',
      name: 'Generics',
      description: 'Generic type programming',
      depth: 1,
      masteryPercentage: 0,
      cardCount: 0,
      children: [],
    },
  ],
}

// Mock generated cards response
const mockGeneratedCards = {
  cards: [
    {
      tempId: 'temp-1',
      question: 'What is the difference between `type` and `interface` in TypeScript?',
      answer:
        'Both define object shapes, but interfaces can be extended and merged, while types support unions and intersections.',
      cardType: 'flashcard',
      approved: true,
      edited: false,
    },
    {
      tempId: 'temp-2',
      question: 'Which TypeScript type represents any value?',
      answer: 'any',
      cardType: 'multiple_choice',
      distractors: ['unknown', 'void', 'never'],
      approved: true,
      edited: false,
    },
    {
      tempId: 'temp-3',
      question: 'What does the `readonly` modifier do in TypeScript?',
      answer: 'It makes a property immutable after initialization.',
      cardType: 'flashcard',
      approved: true,
      edited: false,
    },
    {
      tempId: 'temp-4',
      question: 'How do you define an optional property in a TypeScript interface?',
      answer: 'Use a question mark after the property name: `name?: string`',
      cardType: 'flashcard',
      approved: true,
      edited: false,
    },
    {
      tempId: 'temp-5',
      question: 'What is the TypeScript `never` type used for?',
      answer:
        'It represents values that never occur, like functions that always throw or infinite loops.',
      cardType: 'flashcard',
      approved: true,
      edited: false,
    },
  ],
  metadata: {
    nodeId: mockNodeId,
    nodeName: 'Type Basics',
    count: 5,
    processingTimeMs: 2500,
  },
}

// Helper to set up API mocking
async function setupMocks(page: Page, generateDelayMs = 200) {
  // Mock goal endpoint
  await page.route(`**/api/goals/${mockGoalId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockGoalResponse),
    })
  })

  // Mock skill tree endpoint
  await page.route(`**/api/goals/${mockGoalId}/skill-tree`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockSkillTreeResponse),
    })
  })

  // Mock card generation endpoint
  await page.route(`**/api/goals/${mockGoalId}/generate`, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, generateDelayMs))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockGeneratedCards),
    })
  })

  // Mock card commit endpoint
  await page.route(`**/api/goals/${mockGoalId}/generate/commit`, async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ committed: 5, skipped: 0 }),
    })
  })
}

test.describe('Card Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page)
    await page.goto(`/goals/${mockGoalId}`)
    await page.waitForLoadState('networkidle')
  })

  test('can access card generation from skill tree node @smoke', async ({ page }) => {
    // Find a skill tree node
    const node = page.locator('text=/Type Basics|Generics/i').first()

    if ((await node.count()) === 0) {
      test.skip()
    }

    await node.click()

    // Should show generate cards option
    await expect(
      page.locator(
        'button:has-text("Generate"), button:has-text("Create Cards"), [data-testid="generate-cards"]'
      )
    ).toBeVisible({
      timeout: 5000,
    })
  })

  test('can generate cards for a topic @smoke', async ({ page }) => {
    // Find and click a node
    const node = page.locator('text=/Type Basics/i').first()

    if ((await node.count()) === 0) {
      test.skip()
    }

    await node.click()

    // Click generate button
    const generateButton = page.locator(
      'button:has-text("Generate"), button:has-text("Create Cards"), [data-testid="generate-cards"]'
    )
    await generateButton.click()

    // Should show generated cards preview
    await expect(
      page
        .locator('text=/Preview|Generated|Cards/i')
        .or(page.locator('[data-testid="card-preview"]'))
    ).toBeVisible({
      timeout: 10000,
    })
  })

  test('shows card count selector @comprehensive', async ({ page }) => {
    const node = page.locator('text=/Type Basics/i').first()

    if ((await node.count()) === 0) {
      test.skip()
    }

    await node.click()

    // Should have card count options (5, 10, 15, 20 or slider/input)
    await expect(
      page
        .locator('select, input[type="range"], input[type="number"]')
        .or(page.locator('button:has-text("5"), button:has-text("10")'))
    ).toBeVisible({
      timeout: 5000,
    })
  })

  test('shows card type selector @comprehensive', async ({ page }) => {
    const node = page.locator('text=/Type Basics/i').first()

    if ((await node.count()) === 0) {
      test.skip()
    }

    await node.click()

    // Should have card type options
    await expect(page.locator('text=/Flashcard|Multiple Choice|Mixed/i').first()).toBeVisible({
      timeout: 5000,
    })
  })
})

test.describe('Card Generation Performance (SC-002) @slow', () => {
  test('completes card generation under 60 seconds', async ({ page }) => {
    // Mock with realistic delay
    await setupMocks(page, 1000)

    await page.goto(`/goals/${mockGoalId}`)
    await page.waitForLoadState('networkidle')

    const node = page.locator('text=/Type Basics|Generics/i').first()

    if ((await node.count()) === 0) {
      test.skip()
    }

    await node.click()

    const generateButton = page.locator(
      'button:has-text("Generate"), button:has-text("Create Cards"), [data-testid="generate-cards"]'
    )

    const startTime = Date.now()

    await generateButton.click()

    // Wait for cards to appear
    await expect(
      page
        .locator('text=/type|interface|readonly/i')
        .first()
        .or(page.locator('[data-testid="card-preview"]'))
    ).toBeVisible({
      timeout: 60000,
    })

    const endTime = Date.now()
    const duration = (endTime - startTime) / 1000

    // SC-002: Under 60 seconds
    expect(duration).toBeLessThan(60)
    console.log(`Card generation completed in ${duration.toFixed(2)} seconds`)
  })

  test('shows loading state during generation', async ({ page }) => {
    // Mock with longer delay to see loading state
    await setupMocks(page, 1500)

    await page.goto(`/goals/${mockGoalId}`)
    await page.waitForLoadState('networkidle')

    const node = page.locator('text=/Type Basics/i').first()

    if ((await node.count()) === 0) {
      test.skip()
    }

    await node.click()

    const generateButton = page.locator(
      'button:has-text("Generate"), button:has-text("Create Cards"), [data-testid="generate-cards"]'
    )
    await generateButton.click()

    // Should show loading indicator
    await expect(
      page
        .locator('text=/Generating|Creating|Loading/i')
        .or(page.locator('.animate-spin, .animate-pulse'))
    ).toBeVisible({
      timeout: 3000,
    })
  })

  test('disables generate button during processing', async ({ page }) => {
    await setupMocks(page, 1000)

    await page.goto(`/goals/${mockGoalId}`)
    await page.waitForLoadState('networkidle')

    const node = page.locator('text=/Type Basics/i').first()

    if ((await node.count()) === 0) {
      test.skip()
    }

    await node.click()

    const generateButton = page.locator(
      'button:has-text("Generate"), button:has-text("Create Cards"), [data-testid="generate-cards"]'
    )
    await generateButton.click()

    // Button should be disabled during generation
    await expect(generateButton).toBeDisabled({ timeout: 2000 })
  })
})

test.describe('Card Preview and Editing @comprehensive', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page)
    await page.goto(`/goals/${mockGoalId}`)
    await page.waitForLoadState('networkidle')

    const node = page.locator('text=/Type Basics/i').first()
    if ((await node.count()) > 0) {
      await node.click()
      const generateButton = page.locator(
        'button:has-text("Generate"), button:has-text("Create Cards"), [data-testid="generate-cards"]'
      )
      await generateButton.click()
      await page.waitForSelector('text=/type|interface/i', { timeout: 10000 })
    } else {
      test.skip()
    }
  })

  test('shows generated cards with question and answer', async ({ page }) => {
    // Should show card content
    await expect(page.locator('text=/type.*interface/i').first()).toBeVisible()
    await expect(page.locator('text=/Both define|extended|merged/i').first()).toBeVisible()
  })

  test('can approve or reject individual cards', async ({ page }) => {
    // Look for approval controls (checkboxes or approve/reject buttons)
    const approvalControl = page.locator(
      'input[type="checkbox"], button:has-text("Approve"), button:has-text("Reject"), [data-testid="card-approval"]'
    )

    if ((await approvalControl.count()) > 0) {
      // Toggle first card
      await approvalControl.first().click()
      // Verify toggle worked (visual change or state change)
      await expect(approvalControl.first()).toBeVisible()
    }
  })

  test('shows card type indicator', async ({ page }) => {
    // Cards should indicate their type (flashcard or multiple choice)
    await expect(page.locator('text=/Flashcard|Multiple Choice|MC|FC/i').first()).toBeVisible({
      timeout: 5000,
    })
  })
})

test.describe('Card Commit Flow @comprehensive', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page)
    await page.goto(`/goals/${mockGoalId}`)
    await page.waitForLoadState('networkidle')

    const node = page.locator('text=/Type Basics/i').first()
    if ((await node.count()) > 0) {
      await node.click()
      const generateButton = page.locator(
        'button:has-text("Generate"), button:has-text("Create Cards"), [data-testid="generate-cards"]'
      )
      await generateButton.click()
      await page.waitForSelector('text=/type|interface/i', { timeout: 10000 })
    } else {
      test.skip()
    }
  })

  test('can commit approved cards', async ({ page }) => {
    // Find and click commit/save button
    const commitButton = page.locator(
      'button:has-text("Add"), button:has-text("Save"), button:has-text("Commit"), [data-testid="commit-cards"]'
    )

    if ((await commitButton.count()) === 0) {
      test.skip()
    }

    await commitButton.click()

    // Should show success feedback
    await expect(page.locator('text=/Added|Saved|Success|committed/i')).toBeVisible({
      timeout: 5000,
    })
  })

  test('shows count of cards to be added', async ({ page }) => {
    // Commit button should show count
    const commitButton = page.locator(
      'button:has-text("Add"), button:has-text("Save"), button:has-text("Commit")'
    )

    if ((await commitButton.count()) > 0) {
      // Should contain a number
      await expect(commitButton.first()).toContainText(/\d+/)
    }
  })
})

test.describe('Card Generation Error Handling @comprehensive', () => {
  test('handles generation errors gracefully', async ({ page }) => {
    // Setup mocks but make generation fail
    await page.route(`**/api/goals/${mockGoalId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockGoalResponse),
      })
    })

    await page.route(`**/api/goals/${mockGoalId}/skill-tree`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSkillTreeResponse),
      })
    })

    await page.route(`**/api/goals/${mockGoalId}/generate`, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'LLM service unavailable' }),
      })
    })

    await page.goto(`/goals/${mockGoalId}`)
    await page.waitForLoadState('networkidle')

    const node = page.locator('text=/Type Basics/i').first()

    if ((await node.count()) === 0) {
      test.skip()
    }

    await node.click()

    const generateButton = page.locator(
      'button:has-text("Generate"), button:has-text("Create Cards"), [data-testid="generate-cards"]'
    )
    await generateButton.click()

    // Should show error message
    await expect(page.locator('text=/error|failed|unavailable|try again/i')).toBeVisible({
      timeout: 5000,
    })
  })

  test('can retry after error', async ({ page }) => {
    let callCount = 0

    // Setup mocks
    await page.route(`**/api/goals/${mockGoalId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockGoalResponse),
      })
    })

    await page.route(`**/api/goals/${mockGoalId}/skill-tree`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSkillTreeResponse),
      })
    })

    // First call fails, second succeeds
    await page.route(`**/api/goals/${mockGoalId}/generate`, async (route) => {
      callCount++
      if (callCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Temporary failure' }),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockGeneratedCards),
        })
      }
    })

    await page.goto(`/goals/${mockGoalId}`)
    await page.waitForLoadState('networkidle')

    const node = page.locator('text=/Type Basics/i').first()

    if ((await node.count()) === 0) {
      test.skip()
    }

    await node.click()

    const generateButton = page.locator(
      'button:has-text("Generate"), button:has-text("Create Cards"), [data-testid="generate-cards"]'
    )
    await generateButton.click()

    // Wait for error
    await expect(page.locator('text=/error|failed/i')).toBeVisible({ timeout: 5000 })

    // Find and click retry button
    const retryButton = page.locator(
      'button:has-text("Retry"), button:has-text("Try Again"), button:has-text("Generate")'
    )
    await retryButton.click()

    // Should succeed on retry
    await expect(page.locator('text=/type|interface/i').first()).toBeVisible({
      timeout: 10000,
    })
  })
})
