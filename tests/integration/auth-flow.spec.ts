import { test, expect } from '@playwright/test'

/**
 * Integration Test for Authentication Flow
 *
 * Tests the complete user authentication journey:
 * 1. Navigate to app → see login screen
 * 2. Sign up with email/password → automatically logged in and redirected to chat
 * 3. Log out → redirected to login screen
 * 4. Log in with credentials → access chat interface
 *
 * Following TDD - these should FAIL until implementation is complete.
 */

test.describe('Authentication Flow', () => {
  const testEmail = `test-${Date.now()}@example.com`
  const testPassword = 'SecurePass123!'
  const testName = 'Integration Test User'

  test('should show login screen for unauthenticated users', async ({ page }) => {
    await page.goto('/')

    // Should be redirected to login page
    await expect(page).toHaveURL('/login')

    // Login form should be visible
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('should allow new user signup and auto-login', async ({ page }) => {
    await page.goto('/signup')

    // Fill signup form
    await page.getByLabel(/email/i).fill(testEmail)
    await page.getByLabel(/^password$/i).fill(testPassword)
    await page.getByLabel(/name/i).fill(testName)

    // Submit form
    await page.getByRole('button', { name: /sign up/i }).click()

    // Should be redirected to chat after successful signup
    await expect(page).toHaveURL('/chat', { timeout: 10000 })

    // Should see chat interface
    await expect(page.getByRole('heading', { name: /chat/i })).toBeVisible()
  })

  test('should redirect authenticated users from login to chat', async ({ page }) => {
    // First sign up
    await page.goto('/signup')
    const uniqueEmail = `test-redirect-${Date.now()}@example.com`
    await page.getByLabel(/email/i).fill(uniqueEmail)
    await page.getByLabel(/^password$/i).fill(testPassword)
    await page.getByLabel(/name/i).fill(testName)
    await page.getByRole('button', { name: /sign up/i }).click()

    // Wait for redirect to chat
    await expect(page).toHaveURL('/chat', { timeout: 10000 })

    // Try to navigate to login page
    await page.goto('/login')

    // Should be redirected back to chat
    await expect(page).toHaveURL('/chat')
  })

  test('should allow user to log out', async ({ page }) => {
    // First sign up
    await page.goto('/signup')
    const uniqueEmail = `test-logout-${Date.now()}@example.com`
    await page.getByLabel(/email/i).fill(uniqueEmail)
    await page.getByLabel(/^password$/i).fill(testPassword)
    await page.getByLabel(/name/i).fill(testName)
    await page.getByRole('button', { name: /sign up/i }).click()

    // Wait for redirect to chat
    await expect(page).toHaveURL('/chat', { timeout: 10000 })

    // Find and click logout button
    await page.getByRole('button', { name: /log out|sign out/i }).click()

    // Should be redirected to login page
    await expect(page).toHaveURL('/login', { timeout: 10000 })

    // Should see login form again
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  })

  test('should allow existing user to log in', async ({ page }) => {
    // First create a user
    await page.goto('/signup')
    const uniqueEmail = `test-signin-${Date.now()}@example.com`
    await page.getByLabel(/email/i).fill(uniqueEmail)
    await page.getByLabel(/^password$/i).fill(testPassword)
    await page.getByLabel(/name/i).fill(testName)
    await page.getByRole('button', { name: /sign up/i }).click()

    // Wait for redirect to chat
    await expect(page).toHaveURL('/chat', { timeout: 10000 })

    // Log out
    await page.getByRole('button', { name: /log out|sign out/i }).click()
    await expect(page).toHaveURL('/login', { timeout: 10000 })

    // Now log back in with same credentials
    await page.getByLabel(/email/i).fill(uniqueEmail)
    await page.getByLabel(/password/i).fill(testPassword)
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should be redirected to chat
    await expect(page).toHaveURL('/chat', { timeout: 10000 })

    // Should see chat interface
    await expect(page.getByRole('heading', { name: /chat/i })).toBeVisible()
  })

  test('should show error for invalid login credentials', async ({ page }) => {
    await page.goto('/login')

    // Try to login with non-existent credentials
    await page.getByLabel(/email/i).fill('nonexistent@example.com')
    await page.getByLabel(/password/i).fill('WrongPassword123!')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should show error message
    await expect(page.getByText(/invalid.*credentials|incorrect.*password|user.*not.*found/i)).toBeVisible()

    // Should still be on login page
    await expect(page).toHaveURL('/login')
  })

  test('should show error for duplicate email signup', async ({ page }) => {
    // First signup
    await page.goto('/signup')
    const duplicateEmail = `test-duplicate-${Date.now()}@example.com`
    await page.getByLabel(/email/i).fill(duplicateEmail)
    await page.getByLabel(/^password$/i).fill(testPassword)
    await page.getByLabel(/name/i).fill(testName)
    await page.getByRole('button', { name: /sign up/i }).click()

    // Wait for successful signup
    await expect(page).toHaveURL('/chat', { timeout: 10000 })

    // Log out
    await page.getByRole('button', { name: /log out|sign out/i }).click()
    await expect(page).toHaveURL('/login', { timeout: 10000 })

    // Try to signup again with same email
    await page.goto('/signup')
    await page.getByLabel(/email/i).fill(duplicateEmail)
    await page.getByLabel(/^password$/i).fill(testPassword)
    await page.getByLabel(/name/i).fill('Different Name')
    await page.getByRole('button', { name: /sign up/i }).click()

    // Should show error message
    await expect(page.getByText(/email.*already.*exists|email.*taken/i)).toBeVisible()

    // Should still be on signup page
    await expect(page).toHaveURL('/signup')
  })

  test('should protect /chat route from unauthenticated access', async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies()

    // Try to access protected route directly
    await page.goto('/chat')

    // Should be redirected to login
    await expect(page).toHaveURL('/login', { timeout: 10000 })
  })

  test('should persist authentication across page reloads', async ({ page }) => {
    // Sign up
    await page.goto('/signup')
    const uniqueEmail = `test-persist-${Date.now()}@example.com`
    await page.getByLabel(/email/i).fill(uniqueEmail)
    await page.getByLabel(/^password$/i).fill(testPassword)
    await page.getByLabel(/name/i).fill(testName)
    await page.getByRole('button', { name: /sign up/i }).click()

    // Wait for redirect to chat
    await expect(page).toHaveURL('/chat', { timeout: 10000 })

    // Reload the page
    await page.reload()

    // Should still be on chat page (authenticated)
    await expect(page).toHaveURL('/chat')
    await expect(page.getByRole('heading', { name: /chat/i })).toBeVisible()
  })
})
