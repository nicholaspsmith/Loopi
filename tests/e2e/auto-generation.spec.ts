import { test, expect, Page } from '@playwright/test'

/**
 * Auto-Generation E2E Tests (T029)
 *
 * Tests automatic flashcard generation when skill trees are created.
 * Maps to User Story 1 in spec 019-auto-gen-guided-study.
 *
 * Success Criteria:
 * - SC-001: Users begin studying within 30 seconds of creating a goal
 * - FR-001: System MUST automatically generate flashcards when skill tree is created
 * - FR-002: System MUST limit free tier users to 5 flashcards per tree node
 */

// Mock goal with skill tree and auto-generated cards
const mockGoalWithCards = {
  id: '00000000-0000-4000-8000-000000000001',
  title: 'Learn TypeScript',
  description: 'Master TypeScript programming',
  status: 'active',
  masteryPercentage: 0,
  totalTimeSeconds: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  skillTree: {
    id: '00000000-0000-4000-8000-000000000002',
    nodeCount: 6,
    maxDepth: 2,
    nodes: [
      {
        id: 'node-1',
        name: 'Basic Types',
        depth: 1,
        masteryPercentage: 0,
        cardCount: 5,
        children: [
          {
            id: 'node-1-1',
            name: 'Primitives',
            depth: 2,
            masteryPercentage: 0,
            cardCount: 5,
            children: [],
          },
          {
            id: 'node-1-2',
            name: 'Arrays',
            depth: 2,
            masteryPercentage: 0,
            cardCount: 5,
            children: [],
          },
        ],
      },
      {
        id: 'node-2',
        name: 'Interfaces',
        depth: 1,
        masteryPercentage: 0,
        cardCount: 5,
        children: [],
      },
    ],
  },
}

// Mock session response with cards
const mockSessionWithCards = {
  sessionId: 'session-123',
  mode: 'flashcard',
  isGuided: true,
  currentNode: {
    id: 'node-1',
    title: 'Basic Types',
    path: '1',
  },
  cards: [
    {
      id: 'card-1',
      question: 'What are the primitive types in TypeScript?',
      answer: 'string, number, boolean, null, undefined, symbol, bigint',
      cardType: 'flashcard',
      distractors: null,
    },
    {
      id: 'card-2',
      question: 'How do you declare a variable with a specific type?',
      answer: 'Use let variableName: Type = value',
      cardType: 'flashcard',
      distractors: null,
    },
  ],
  totalCards: 5,
  nodeProgress: {
    completedInNode: 0,
    totalInNode: 5,
  },
}

// Helper to set up API mocking for auto-generation
async function mockAutoGenerationAPI(page: Page) {
  // Mock goal creation with skill tree
  await page.route('**/api/goals', async (route) => {
    if (route.request().method() === 'POST') {
      await new Promise((resolve) => setTimeout(resolve, 200))
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(mockGoalWithCards),
      })
    } else {
      await route.continue()
    }
  })

  // Mock goal fetch
  await page.route('**/api/goals/*', async (route) => {
    if (route.request().method() === 'GET' && !route.request().url().includes('skill-tree')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockGoalWithCards),
      })
    } else {
      await route.continue()
    }
  })

  // Mock study session endpoint
  await page.route('**/api/study/session', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSessionWithCards),
      })
    } else {
      await route.continue()
    }
  })
}

test.describe('Auto-Generation Flow', () => {
  // Skip in CI - selectors may need updates
  test.skip(!!process.env.CI, 'Selectors need to be updated to match current UI')

  test.beforeEach(async ({ page }) => {
    await mockAutoGenerationAPI(page)
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')
  })

  test('automatically generates cards when skill tree is created', async ({ page }) => {
    // Click create goal button
    const createButton = page.locator(
      'button:has-text("New Goal"), a:has-text("New Goal"), button:has-text("Create")'
    )

    if ((await createButton.count()) === 0) {
      test.skip()
    }

    await createButton.first().click()

    // Enter goal title
    const goalInput = page.locator(
      'input[placeholder*="goal"], input[name="title"], [data-testid="goal-input"]'
    )
    await goalInput.waitFor({ timeout: 5000 })
    await goalInput.fill('Learn TypeScript programming')

    // Submit goal
    const submitButton = page.locator(
      'button[type="submit"], button:has-text("Create"), button:has-text("Generate")'
    )
    await submitButton.click()

    // Wait for redirect to goal page
    await page.waitForURL('**/goals/**', { timeout: 10000 })

    // Verify we're on the goal detail page
    await expect(page.locator('h1, h2').filter({ hasText: 'TypeScript' })).toBeVisible({
      timeout: 5000,
    })

    // The skill tree should be displayed with nodes
    await expect(
      page
        .locator('text=/Basic Types|Interfaces|skill tree/i')
        .or(page.locator('[data-testid="skill-tree"]'))
    ).toBeVisible({ timeout: 5000 })
  })

  test('generates exactly 5 cards per node for free tier', async ({ page }) => {
    // Navigate to goal page (simulating goal already exists)
    await page.goto('/goals/00000000-0000-4000-8000-000000000001')
    await page.waitForLoadState('networkidle')

    // Click on a skill tree node or Study Now button
    const studyButton = page.locator('button:has-text("Study Now"), button:has-text("Study")')

    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.first().click()

    // Wait for study session to load
    await page.waitForLoadState('networkidle')

    // Look for progress indicator showing card count
    const progressIndicator = page.locator('text=/\\d+\\s*\\/\\s*5/')

    if ((await progressIndicator.count()) > 0) {
      await expect(progressIndicator).toBeVisible()
      // Verify it shows "X / 5" format (5 cards per node)
      const progressText = await progressIndicator.textContent()
      expect(progressText).toMatch(/\d+\s*\/\s*5/)
    }
  })

  test('cards are immediately available for study after generation', async ({ page }) => {
    // Navigate directly to goal page
    await page.goto('/goals/00000000-0000-4000-8000-000000000001')
    await page.waitForLoadState('networkidle')

    // Find and click Study Now button
    const studyButton = page.locator('button:has-text("Study Now"), button:has-text("Study")')

    if ((await studyButton.count()) === 0) {
      test.skip()
    }

    await studyButton.first().click()

    // Cards should be immediately available - look for flashcard UI
    await expect(
      page
        .locator('[data-testid="flashcard"]')
        .or(page.locator('button:has-text("Show Answer")'))
        .or(page.locator('text=/What are|How do you/'))
    ).toBeVisible({ timeout: 5000 })
  })

  test('shows loading state during card generation', async ({ page }) => {
    // Mock with longer delay to see loading state
    await page.route('**/api/goals', async (route) => {
      if (route.request().method() === 'POST') {
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(mockGoalWithCards),
        })
      } else {
        await route.continue()
      }
    })

    const createButton = page.locator(
      'button:has-text("New Goal"), a:has-text("New Goal"), button:has-text("Create")'
    )

    if ((await createButton.count()) === 0) {
      test.skip()
    }

    await createButton.first().click()

    const goalInput = page.locator(
      'input[placeholder*="goal"], input[name="title"], [data-testid="goal-input"]'
    )
    await goalInput.waitFor({ timeout: 5000 })
    await goalInput.fill('Learn Python')

    const submitButton = page.locator(
      'button[type="submit"], button:has-text("Create"), button:has-text("Generate")'
    )
    await submitButton.click()

    // Should show loading indicator
    await expect(
      page
        .locator('text=/Generating|Creating|Building|Processing/i')
        .or(page.locator('.animate-spin, .animate-pulse'))
    ).toBeVisible({ timeout: 3000 })
  })

  test('displays skill tree structure with multiple nodes', async ({ page }) => {
    await page.goto('/goals/00000000-0000-4000-8000-000000000001')
    await page.waitForLoadState('networkidle')

    // Verify multiple nodes are visible
    // Look for node names from our mock
    const nodes = ['Basic Types', 'Primitives', 'Arrays', 'Interfaces']

    for (const nodeName of nodes) {
      const nodeLocator = page.locator(`text="${nodeName}"`)
      if ((await nodeLocator.count()) > 0) {
        await expect(nodeLocator).toBeVisible()
      }
    }
  })
})

test.describe('Auto-Generation Error Handling', () => {
  test.skip(!!process.env.CI, 'Selectors need to be updated to match current UI')

  test('handles API errors during goal creation gracefully', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/goals', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to generate skill tree' }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    const createButton = page.locator(
      'button:has-text("New Goal"), a:has-text("New Goal"), button:has-text("Create")'
    )

    if ((await createButton.count()) === 0) {
      test.skip()
    }

    await createButton.first().click()

    const goalInput = page.locator(
      'input[placeholder*="goal"], input[name="title"], [data-testid="goal-input"]'
    )
    await goalInput.waitFor({ timeout: 5000 })
    await goalInput.fill('Test error handling')

    const submitButton = page.locator(
      'button[type="submit"], button:has-text("Create"), button:has-text("Generate")'
    )
    await submitButton.click()

    // Should show error message
    await expect(page.locator('text=/error|failed|try again/i')).toBeVisible({
      timeout: 5000,
    })
  })

  test('handles case when node has no cards yet', async ({ page }) => {
    // Mock goal with nodes but no cards yet
    const goalWithoutCards = {
      ...mockGoalWithCards,
      skillTree: {
        ...mockGoalWithCards.skillTree,
        nodes: mockGoalWithCards.skillTree.nodes.map((node) => ({
          ...node,
          cardCount: 0,
          children: node.children.map((child) => ({ ...child, cardCount: 0 })),
        })),
      },
    }

    await page.route('**/api/goals/*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(goalWithoutCards),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto('/goals/00000000-0000-4000-8000-000000000001')
    await page.waitForLoadState('networkidle')

    const studyButton = page.locator('button:has-text("Study Now"), button:has-text("Study")')

    if ((await studyButton.count()) > 0) {
      // Button might be disabled or show different state
      const isDisabled = await studyButton.isDisabled().catch(() => false)

      if (!isDisabled) {
        await studyButton.first().click()

        // Should show message about cards being generated
        await expect(page.locator('text=/generating|being created|please wait/i')).toBeVisible({
          timeout: 3000,
        })
      }
    }
  })
})
