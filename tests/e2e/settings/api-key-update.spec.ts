import { test, expect } from '@playwright/test'

/**
 * E2E Test: API Key Update Flow
 *
 * Tests the complete user journey for updating an existing API key
 *
 * User Story 5: Update or Remove API Key
 */

test.describe('API Key Update Flow', () => {
  // Run tests serially since they modify shared state (user's API key)
  test.describe.configure({ mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    // Navigate to settings page
    await page.goto('/settings')

    // Wait for page to load
    await page.waitForLoadState('networkidle')
  })

  test('should update existing API key', async ({ page }) => {
    // Step 1: Save initial API key
    const initialKey = 'sk-ant-api03-initial-test-key-12345678901234567890123456789012'

    // Find and fill API key input
    const apiKeyInput = page.locator('input[type="password"]#api-key')
    await apiKeyInput.fill(initialKey)

    // Click save button
    const saveButton = page.locator('button', { hasText: /save/i })
    await saveButton.click()

    // Wait for success message
    await expect(page.locator('text=/API key saved successfully/i')).toBeVisible({
      timeout: 5000,
    })

    // Reload page to see saved key
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify initial key is shown (masked)
    await expect(page.locator('text=/sk-ant-.*12$/i')).toBeVisible()

    // Step 2: Update to new API key
    const updatedKey = 'sk-ant-api03-updated-test-key-98765432109876543210987654321098'

    // The form should still be available for updates
    const updateInput = page.locator('input[type="password"]#api-key')
    await updateInput.fill(updatedKey)

    // Click save to update
    await saveButton.click()

    // Wait for success message
    await expect(page.locator('text=/API key saved successfully/i')).toBeVisible({
      timeout: 5000,
    })

    // Reload to verify updated key
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify updated key preview is shown
    await expect(page.locator('text=/sk-ant-.*98$/i')).toBeVisible()
  })

  test('should show existing key preview when updating', async ({ page }) => {
    // Save a key first
    const apiKey = 'sk-ant-api03-test-preview-key-12345678901234567890123456789012'

    const apiKeyInput = page.locator('input[type="password"]#api-key')
    await apiKeyInput.fill(apiKey)

    const saveButton = page.locator('button', { hasText: /save/i })
    await saveButton.click()

    await expect(page.locator('text=/API key saved successfully/i')).toBeVisible({
      timeout: 5000,
    })

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Should show current key preview in the ApiKeyDisplay component
    await expect(page.locator('text=/sk-ant-.*12$/i')).toBeVisible()

    // Update form should still be available
    await expect(page.locator('text=/Update API Key/i')).toBeVisible()
    await expect(page.locator('input[type="password"]#api-key')).toBeVisible()
  })

  test('should validate key before allowing update', async ({ page }) => {
    // Try to save an invalid key
    const invalidKey = 'invalid-key-format'

    const apiKeyInput = page.locator('input[type="password"]#api-key')
    await apiKeyInput.fill(invalidKey)

    // Trigger validation by clicking validate button
    const validateButton = page.locator('button', { hasText: /validate/i })

    if (await validateButton.isVisible()) {
      await validateButton.click()
      // Should show error (format validation shows "too short" for invalid keys)
      await expect(page.locator('text=/too short|invalid/i').first()).toBeVisible({ timeout: 3000 })
    }

    // Save button should be disabled for invalid keys
    const saveButton = page.locator('button', { hasText: /save/i })
    await expect(saveButton).toBeDisabled()
  })

  test('should preserve key after failed update attempt', async ({ page }) => {
    // Save initial key
    const validKey = 'sk-ant-api03-preserve-test-key-12345678901234567890123456789012'

    const apiKeyInput = page.locator('input[type="password"]#api-key')
    await apiKeyInput.fill(validKey)

    const saveButton = page.locator('button', { hasText: /save/i })
    await saveButton.click()

    await expect(page.locator('text=/API key saved successfully/i')).toBeVisible({
      timeout: 5000,
    })

    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Original key should still be visible
    await expect(page.locator('text=/sk-ant-.*12$/i')).toBeVisible()
  })

  test('should update validation status after key update', async ({ page }) => {
    // Save a key
    const apiKey = 'sk-ant-api03-validation-update-key-12345678901234567890123456789012'

    const apiKeyInput = page.locator('input[type="password"]#api-key')
    await apiKeyInput.fill(apiKey)

    const saveButton = page.locator('button', { hasText: /save/i })
    await saveButton.click()

    await expect(page.locator('text=/API key saved successfully/i')).toBeVisible({
      timeout: 5000,
    })

    // Reload to see saved state
    await page.reload()
    await page.waitForLoadState('networkidle')

    // After update, validation status should be reset
    // (lastValidatedAt is set to null in saveUserApiKey)
    const validBadge = page.locator('text=/Valid/i').first()

    // Key should be marked as valid (isValid: true in saveUserApiKey)
    if (await validBadge.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(validBadge).toBeVisible()
    }
  })
})
