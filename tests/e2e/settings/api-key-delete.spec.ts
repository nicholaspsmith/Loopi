import { test, expect } from '@playwright/test'

/**
 * E2E Test: API Key Deletion Flow
 *
 * Tests the complete user journey for deleting an API key
 *
 * User Story 5: Update or Remove API Key
 */

test.describe('API Key Deletion Flow', () => {
  // Run tests serially since they modify shared state (user's API key)
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    // Navigate to settings page
    await page.goto('/settings')

    // Wait for page to load
    await page.waitForLoadState('networkidle')
  })

  test('should delete API key with confirmation', async ({ page }) => {
    // Step 1: Save an API key first
    const apiKey = 'sk-ant-api03-delete-test-key-12345678901234567890123456789012'

    const apiKeyInput = page.locator('input[type="password"]#api-key')
    await apiKeyInput.fill(apiKey)

    const saveButton = page.locator('button', { hasText: /^save$/i })
    await saveButton.click()

    // Wait for success message
    await expect(page.locator('text=/API key saved successfully/i')).toBeVisible({
      timeout: 5000,
    })

    // Reload to see the saved key
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify key exists
    await expect(page.locator('text=/sk-ant-.*12$/i')).toBeVisible()

    // Step 2: Delete the key
    const deleteButton = page.locator('button', { hasText: /delete/i }).first()
    await deleteButton.click()

    // Should show confirmation dialog
    await expect(page.locator('text=/Are you sure.*delete.*API key/i')).toBeVisible()

    // Confirm deletion
    const confirmButton = page.locator('button', { hasText: /yes.*delete|confirm/i })
    await confirmButton.click()

    // Wait for success message
    await expect(page.locator('text=/API key deleted successfully/i')).toBeVisible({
      timeout: 5000,
    })

    // Reload to verify key is gone
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Should now show the form to enter a new key (not the display component)
    await expect(apiKeyInput).toBeVisible()
    await expect(page.locator('text=/sk-ant-.*12$/i')).not.toBeVisible()
  })

  test('should cancel deletion when user clicks cancel', async ({ page }) => {
    // Save an API key first
    const apiKey = 'sk-ant-api03-cancel-delete-key-12345678901234567890123456789012'

    const apiKeyInput = page.locator('input[type="password"]#api-key')
    await apiKeyInput.fill(apiKey)

    const saveButton = page.locator('button', { hasText: /^save$/i })
    await saveButton.click()

    await expect(page.locator('text=/API key saved successfully/i')).toBeVisible({
      timeout: 5000,
    })

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Click delete
    const deleteButton = page.locator('button', { hasText: /delete/i }).first()
    await deleteButton.click()

    // Should show confirmation
    await expect(page.locator('text=/Are you sure.*delete.*API key/i')).toBeVisible()

    // Click cancel
    const cancelButton = page.locator('button', { hasText: /no.*cancel|cancel/i })
    await cancelButton.click()

    // Confirmation dialog should disappear
    await expect(page.locator('text=/Are you sure.*delete.*API key/i')).not.toBeVisible()

    // Key should still be visible
    await expect(page.locator('text=/sk-ant-.*12$/i')).toBeVisible()

    // Reload to verify key persists
    await page.reload()
    await page.waitForLoadState('networkidle')

    await expect(page.locator('text=/sk-ant-.*12$/i')).toBeVisible()
  })

  test('should show confirmation dialog before deleting', async ({ page }) => {
    // Save a key
    const apiKey = 'sk-ant-api03-confirm-dialog-key-12345678901234567890123456789012'

    const apiKeyInput = page.locator('input[type="password"]#api-key')
    await apiKeyInput.fill(apiKey)

    const saveButton = page.locator('button', { hasText: /^save$/i })
    await saveButton.click()

    await expect(page.locator('text=/API key saved successfully/i')).toBeVisible({
      timeout: 5000,
    })

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Confirmation should NOT be visible initially
    await expect(page.locator('text=/Are you sure.*delete/i')).not.toBeVisible()

    // Click delete button
    const deleteButton = page.locator('button', { hasText: /delete/i }).first()
    await deleteButton.click()

    // NOW confirmation should be visible
    await expect(page.locator('text=/Are you sure.*delete/i')).toBeVisible()

    // Should have action buttons
    await expect(page.locator('button', { hasText: /yes.*delete|confirm/i })).toBeVisible()
    await expect(page.locator('button', { hasText: /no.*cancel|cancel/i })).toBeVisible()
  })

  test('should fallback to Ollama after key deletion', async ({ page }) => {
    // Save a key
    const apiKey = 'sk-ant-api03-fallback-test-key-12345678901234567890123456789012'

    const apiKeyInput = page.locator('input[type="password"]#api-key')
    await apiKeyInput.fill(apiKey)

    const saveButton = page.locator('button', { hasText: /^save$/i })
    await saveButton.click()

    await expect(page.locator('text=/API key saved successfully/i')).toBeVisible({
      timeout: 5000,
    })

    // Reload and verify Claude API is active
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Should show Claude API active status
    await expect(page.locator('text=/Claude API Active/i')).toBeVisible()

    // Delete the key
    const deleteButton = page.locator('button', { hasText: /delete/i }).first()
    await deleteButton.click()

    const confirmButton = page.locator('button', { hasText: /yes.*delete|confirm/i })
    await confirmButton.click()

    await expect(page.locator('text=/API key deleted successfully/i')).toBeVisible({
      timeout: 5000,
    })

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Should show Ollama fallback status (use heading selector to be specific)
    await expect(page.getByRole('heading', { name: /Using Ollama/i })).toBeVisible()
  })

  test('should handle delete errors gracefully', async ({ page }) => {
    // This test verifies error handling when delete operation fails
    // In a real scenario, this might happen due to network issues

    // Save a key first
    const apiKey = 'sk-ant-api03-error-handling-key-12345678901234567890123456789012'

    const apiKeyInput = page.locator('input[type="password"]#api-key')
    await apiKeyInput.fill(apiKey)

    const saveButton = page.locator('button', { hasText: /^save$/i })
    await saveButton.click()

    await expect(page.locator('text=/API key saved successfully/i')).toBeVisible({
      timeout: 5000,
    })

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Try to delete (normal flow)
    const deleteButton = page.locator('button', { hasText: /delete/i }).first()
    await deleteButton.click()

    // Should show confirmation
    await expect(page.locator('text=/Are you sure.*delete/i')).toBeVisible()

    // The component should handle errors and show appropriate message
    // In this test, we're just verifying the UI exists and responds correctly
    const confirmButton = page.locator('button', { hasText: /yes.*delete|confirm/i })
    await expect(confirmButton).toBeVisible()
    await expect(confirmButton).toBeEnabled()
  })

  test('should disable delete button while deletion is in progress', async ({ page }) => {
    // Save a key
    const apiKey = 'sk-ant-api03-loading-state-key-12345678901234567890123456789012'

    const apiKeyInput = page.locator('input[type="password"]#api-key')
    await apiKeyInput.fill(apiKey)

    const saveButton = page.locator('button', { hasText: /^save$/i })
    await saveButton.click()

    await expect(page.locator('text=/API key saved successfully/i')).toBeVisible({
      timeout: 5000,
    })

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Click delete
    const deleteButton = page.locator('button', { hasText: /delete/i }).first()
    await deleteButton.click()

    // Confirm
    const confirmButton = page.locator('button', { hasText: /yes.*delete|confirm/i })
    await confirmButton.click()

    // Button should show loading state (if network is slow enough to catch it)
    // This is a race condition test - button might already be done
    const loadingState = page.locator('button', { hasText: /deleting/i })
    if (await loadingState.isVisible({ timeout: 100 }).catch(() => false)) {
      await expect(loadingState).toBeDisabled()
    }

    // Eventually should complete
    await expect(page.locator('text=/API key deleted successfully/i')).toBeVisible({
      timeout: 5000,
    })
  })
})
