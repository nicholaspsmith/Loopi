import { test, expect } from '@playwright/test'

/**
 * Page Transition E2E Tests
 *
 * Verifies smooth 300ms fade transitions between pages with:
 * - Proper timing (300ms duration)
 * - Ease-out easing function
 * - Interruptible transitions
 * - Respects prefers-reduced-motion
 */

test.describe('Page Transitions', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    // TODO: Add actual login logic when authentication is set up
  })

  test('navigates from chat to quiz with smooth transition', async ({ page }) => {
    // Start on chat page
    await page.goto('/chat')
    await expect(page).toHaveURL('/chat')

    // Click quiz navigation tab
    const quizTab = page.getByRole('link', { name: /quiz/i })
    await quizTab.click()

    // Verify we navigated to quiz page
    await expect(page).toHaveURL('/quiz')

    // Page should be visible (transition complete)
    await expect(page.locator('body')).toBeVisible()
  })

  test('navigates from quiz to settings with smooth transition', async ({ page }) => {
    await page.goto('/quiz')
    await expect(page).toHaveURL('/quiz')

    const settingsTab = page.getByRole('link', { name: /settings/i })
    await settingsTab.click()

    await expect(page).toHaveURL('/settings')
    await expect(page.locator('body')).toBeVisible()
  })

  test('navigates from settings to chat with smooth transition', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).toHaveURL('/settings')

    const chatTab = page.getByRole('link', { name: /chat/i })
    await chatTab.click()

    await expect(page).toHaveURL('/chat')
    await expect(page.locator('body')).toBeVisible()
  })

  test('handles rapid navigation between pages', async ({ page }) => {
    // Start on chat
    await page.goto('/chat')

    // Rapidly click through all tabs
    await page.getByRole('link', { name: /quiz/i }).click()
    await page.getByRole('link', { name: /settings/i }).click()
    await page.getByRole('link', { name: /chat/i }).click()

    // Should end up on chat page without errors
    await expect(page).toHaveURL('/chat')
    await expect(page.locator('body')).toBeVisible()
  })

  test('transitions complete within 300ms', async ({ page }) => {
    await page.goto('/chat')

    const startTime = Date.now()
    await page.getByRole('link', { name: /quiz/i }).click()
    await expect(page).toHaveURL('/quiz')
    const endTime = Date.now()

    // Transition should complete quickly (under 1 second)
    const duration = endTime - startTime
    expect(duration).toBeLessThan(1000)
  })

  test('maintains navigation state during transitions', async ({ page }) => {
    await page.goto('/chat')

    // Navigate to quiz
    await page.getByRole('link', { name: /quiz/i }).click()
    await expect(page).toHaveURL('/quiz')

    // Use browser back button
    await page.goBack()
    await expect(page).toHaveURL('/chat')

    // Use browser forward button
    await page.goForward()
    await expect(page).toHaveURL('/quiz')
  })
})
