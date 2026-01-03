import { test, expect, Page } from '@playwright/test'

/**
 * Flashcard Duplicate Detection E2E Tests (T031)
 *
 * Tests the flashcard duplicate detection warning flow.
 * Implements duplicate detection before flashcard creation.
 *
 * Uses API mocking to simulate duplicate check responses.
 */

// Mock duplicate detection response when duplicate is found
const mockDuplicateFoundResponse = {
  isDuplicate: true,
  similarItems: [
    {
      id: '00000000-0000-4000-8000-000000000001',
      score: 0.89,
      displayText: 'What is TypeScript and what are its benefits?',
      type: 'flashcard',
    },
    {
      id: '00000000-0000-4000-8000-000000000002',
      score: 0.82,
      displayText: 'Explain TypeScript core features',
      type: 'flashcard',
    },
  ],
  topScore: 0.89,
  checkSkipped: false,
}

// Mock duplicate detection response when item is unique
const mockNoDuplicateResponse = {
  isDuplicate: false,
  similarItems: [],
  topScore: 0,
  checkSkipped: false,
}

// Mock successful flashcard creation response
const mockFlashcardCreationResponse = {
  id: '00000000-0000-4000-8000-000000000003',
  userId: '00000000-0000-4000-8000-000000000004',
  question: 'What is TypeScript?',
  answer: 'TypeScript is a typed superset of JavaScript',
  skillNodeId: '00000000-0000-4000-8000-000000000005',
  cardType: 'flashcard',
  fsrsState: {
    state: 'New',
    due: new Date().toISOString(),
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
  },
  createdAt: new Date().toISOString(),
}

// Mock goal with skill tree
const mockGoalResponse = {
  id: '00000000-0000-4000-8000-000000000006',
  title: 'Learn TypeScript',
  description: 'Master TypeScript programming',
  status: 'active',
  masteryPercentage: 25,
  totalTimeSeconds: 1200,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  skillTree: {
    id: '00000000-0000-4000-8000-000000000007',
    nodeCount: 8,
    maxDepth: 2,
    nodes: [
      {
        id: 'node-1',
        name: 'TypeScript Basics',
        depth: 1,
        masteryPercentage: 50,
        cardCount: 5,
        children: [],
      },
    ],
  },
}

// Helper to mock duplicate check API
async function mockDuplicateCheckAPI(page: Page, response: object, status: number = 200) {
  await page.route('**/api/flashcards/check-duplicate', async (route) => {
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

// Helper to mock flashcard creation API
async function mockFlashcardCreationAPI(
  page: Page,
  response: object = mockFlashcardCreationResponse,
  status: number = 201
) {
  await page.route('**/api/flashcards/custom', async (route) => {
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

// Helper to mock goal detail API
async function mockGoalDetailAPI(page: Page, goalId: string = mockGoalResponse.id) {
  await page.route(`**/api/goals/${goalId}`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockGoalResponse),
      })
    } else {
      await route.continue()
    }
  })
}

test.describe('Flashcard Duplicate Detection', () => {
  // Skip in CI - requires UI implementation to be complete
  test.skip(!!process.env.CI, 'Skipping in CI - requires full app running')

  test.beforeEach(async ({ page }) => {
    await mockGoalDetailAPI(page)
    await page.goto(`/goals/${mockGoalResponse.id}`)
    await page.waitForLoadState('networkidle')

    // Open custom card creation form
    const skillNode = page.locator('[data-testid="skill-node"]').first()
    if ((await skillNode.count()) > 0) {
      await skillNode.click()
    } else {
      await page.locator('text=/TypeScript Basics/i').first().click()
    }

    await page.click('[data-testid="add-custom-card-button"]')
    await page.waitForSelector('[data-testid="custom-card-modal"]', { timeout: 3000 })
  })

  test('shows no warning when flashcard is unique', async ({ page }) => {
    await mockDuplicateCheckAPI(page, mockNoDuplicateResponse)
    await mockFlashcardCreationAPI(page)

    const questionInput = page.locator('[data-testid="custom-card-question"]')
    const answerInput = page.locator('[data-testid="custom-card-answer"]')

    await questionInput.fill('What is a unique concept in TypeScript?')
    await answerInput.fill('This is a completely unique answer that has no duplicates')

    const submitButton = page.locator('[data-testid="custom-card-submit"]')
    await submitButton.click()

    await page.waitForTimeout(500)

    const duplicateModal = page.locator('[data-testid="duplicate-warning-modal"]')
    await expect(duplicateModal).not.toBeVisible()

    await expect(page.locator('[data-testid="custom-card-modal"]')).not.toBeVisible({
      timeout: 3000,
    })
  })

  test('shows DuplicateWarningModal when duplicate detected', async ({ page }) => {
    await mockDuplicateCheckAPI(page, mockDuplicateFoundResponse)
    await mockFlashcardCreationAPI(page)

    const questionInput = page.locator('[data-testid="custom-card-question"]')
    const answerInput = page.locator('[data-testid="custom-card-answer"]')

    await questionInput.fill('What is TypeScript?')
    await answerInput.fill('TypeScript is a typed superset of JavaScript')

    const submitButton = page.locator('[data-testid="custom-card-submit"]')
    await submitButton.click()

    const duplicateModal = page.locator('[data-testid="duplicate-warning-modal"]')
    await expect(duplicateModal).toBeVisible({ timeout: 5000 })

    await expect(page.locator('text=/89%|0.89|similar/i')).toBeVisible()
    await expect(page.locator('text=/What is TypeScript and what are its benefits/i')).toBeVisible()

    await expect(page.locator('button:has-text("Cancel")')).toBeVisible()
    await expect(
      page.locator('button:has-text("Create Anyway"), button:has-text("Proceed")')
    ).toBeVisible()
  })

  test('can cancel creation from duplicate warning', async ({ page }) => {
    await mockDuplicateCheckAPI(page, mockDuplicateFoundResponse)

    const questionInput = page.locator('[data-testid="custom-card-question"]')
    const answerInput = page.locator('[data-testid="custom-card-answer"]')

    await questionInput.fill('What is TypeScript?')
    await answerInput.fill('TypeScript is a typed superset of JavaScript')

    const submitButton = page.locator('[data-testid="custom-card-submit"]')
    await submitButton.click()

    const duplicateModal = page.locator('[data-testid="duplicate-warning-modal"]')
    await expect(duplicateModal).toBeVisible({ timeout: 5000 })

    const cancelButton = page.locator(
      '[data-testid="duplicate-warning-modal"] button:has-text("Cancel")'
    )
    await cancelButton.click()

    await expect(duplicateModal).not.toBeVisible({ timeout: 3000 })
    await expect(page.locator('[data-testid="custom-card-modal"]')).toBeVisible()
    await expect(questionInput).toHaveValue('What is TypeScript?')
    await expect(answerInput).toHaveValue('TypeScript is a typed superset of JavaScript')
  })

  test('can proceed with creation despite duplicate warning', async ({ page }) => {
    await mockDuplicateCheckAPI(page, mockDuplicateFoundResponse)
    await mockFlashcardCreationAPI(page)

    const questionInput = page.locator('[data-testid="custom-card-question"]')
    const answerInput = page.locator('[data-testid="custom-card-answer"]')

    await questionInput.fill('What is TypeScript?')
    await answerInput.fill('TypeScript is a typed superset of JavaScript')

    const submitButton = page.locator('[data-testid="custom-card-submit"]')
    await submitButton.click()

    const duplicateModal = page.locator('[data-testid="duplicate-warning-modal"]')
    await expect(duplicateModal).toBeVisible({ timeout: 5000 })

    const proceedButton = page.locator(
      '[data-testid="duplicate-warning-modal"] button:has-text("Create Anyway"), [data-testid="duplicate-warning-modal"] button:has-text("Proceed")'
    )
    await proceedButton.click()

    await expect(duplicateModal).not.toBeVisible({ timeout: 3000 })
    await expect(page.locator('[data-testid="custom-card-modal"]')).not.toBeVisible({
      timeout: 3000,
    })
  })

  test('can close duplicate warning modal with Escape key', async ({ page }) => {
    await mockDuplicateCheckAPI(page, mockDuplicateFoundResponse)

    const questionInput = page.locator('[data-testid="custom-card-question"]')
    const answerInput = page.locator('[data-testid="custom-card-answer"]')

    await questionInput.fill('What is TypeScript?')
    await answerInput.fill('TypeScript is a typed superset of JavaScript')

    const submitButton = page.locator('[data-testid="custom-card-submit"]')
    await submitButton.click()

    const duplicateModal = page.locator('[data-testid="duplicate-warning-modal"]')
    await expect(duplicateModal).toBeVisible({ timeout: 5000 })

    await page.keyboard.press('Escape')

    await expect(duplicateModal).not.toBeVisible({ timeout: 2000 })
    await expect(page.locator('[data-testid="custom-card-modal"]')).toBeVisible()
  })
})
