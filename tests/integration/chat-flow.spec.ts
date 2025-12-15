import { test, expect } from '@playwright/test'

/**
 * Integration Test for Chat Conversation Flow
 *
 * Tests the complete user journey for chat interaction with Claude.
 * Following TDD - this should FAIL until implementation is complete.
 */

test.describe('Chat Conversation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Create and login with a test user
    await page.goto('/signup')

    const timestamp = Date.now()
    await page.getByLabel(/email/i).fill(`chat-test-${timestamp}@example.com`)
    await page.getByLabel(/^password$/i).fill('SecurePass123!')
    await page.getByLabel(/name/i).fill('Chat Test User')
    await page.getByRole('button', { name: /sign up/i }).click()

    // Should redirect to chat page after signup
    await expect(page).toHaveURL('/chat')
  })

  test('should display empty chat interface on first visit', async ({ page }) => {
    // Check for chat interface elements
    await expect(page.getByRole('heading', { name: /memoryloop/i })).toBeVisible()
    await expect(page.getByPlaceholder(/type your message/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /send/i })).toBeVisible()

    // Should show empty state or welcome message
    await expect(page.getByText(/start a conversation/i)).toBeVisible()
  })

  test('should send message and receive Claude response', async ({ page }) => {
    const userMessage = 'Can you explain what JavaScript closures are?'

    // Type and send message
    await page.getByPlaceholder(/type your message/i).fill(userMessage)
    await page.getByRole('button', { name: /send/i }).click()

    // User message should appear
    await expect(page.getByText(userMessage)).toBeVisible()

    // Should show loading indicator
    await expect(page.getByText(/thinking|generating/i)).toBeVisible()

    // Claude response should appear (wait up to 30s for AI response)
    await expect(page.getByText(/closure/i).first()).toBeVisible({
      timeout: 30000,
    })

    // Loading indicator should disappear
    await expect(page.getByText(/thinking|generating/i)).not.toBeVisible()
  })

  test('should display messages in correct order', async ({ page }) => {
    // Send first message
    await page.getByPlaceholder(/type your message/i).fill('What is 2 + 2?')
    await page.getByRole('button', { name: /send/i }).click()

    // Wait for response
    await page.waitForSelector('text=/4/', { timeout: 30000 })

    // Send second message
    await page.getByPlaceholder(/type your message/i).fill('What is 3 + 3?')
    await page.getByRole('button', { name: /send/i }).click()

    // Wait for second response
    await page.waitForSelector('text=/6/', { timeout: 30000 })

    // Check message order - should see both Q&A pairs
    const messages = await page.locator('[data-testid="chat-message"]').all()
    expect(messages.length).toBeGreaterThanOrEqual(4) // 2 user + 2 assistant
  })

  test('should preserve conversation history on page reload', async ({ page }) => {
    // Send a message
    const uniqueMessage = `Test message ${Date.now()}`
    await page.getByPlaceholder(/type your message/i).fill(uniqueMessage)
    await page.getByRole('button', { name: /send/i }).click()

    // Wait for response
    await page.waitForTimeout(5000)

    // Reload page
    await page.reload()

    // Message should still be visible
    await expect(page.getByText(uniqueMessage)).toBeVisible()
  })

  test('should disable send button while message is being generated', async ({ page }) => {
    // Send message
    await page.getByPlaceholder(/type your message/i).fill('Hello')
    const sendButton = page.getByRole('button', { name: /send/i })
    await sendButton.click()

    // Send button should be disabled during generation
    await expect(sendButton).toBeDisabled()

    // Wait for response to complete
    await page.waitForTimeout(5000)

    // Send button should be enabled again
    await expect(sendButton).toBeEnabled()
  })

  test('should not send empty messages', async ({ page }) => {
    const sendButton = page.getByRole('button', { name: /send/i })

    // Button should be disabled with empty input
    await expect(sendButton).toBeDisabled()

    // Type and delete message
    await page.getByPlaceholder(/type your message/i).fill('test')
    await expect(sendButton).toBeEnabled()

    await page.getByPlaceholder(/type your message/i).clear()
    await expect(sendButton).toBeDisabled()
  })

  test('should handle very long messages', async ({ page }) => {
    // Create a long message (500 words)
    const longMessage =
      'This is a very long message. ' +
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(50)

    await page.getByPlaceholder(/type your message/i).fill(longMessage)
    await page.getByRole('button', { name: /send/i }).click()

    // Message should be sent and visible
    await expect(page.getByText(longMessage)).toBeVisible()

    // Should receive response
    await page.waitForSelector('[data-testid="chat-message"][data-role="assistant"]', {
      timeout: 60000,
    })
  })

  test('should display user name in header', async ({ page }) => {
    await expect(page.getByText(/welcome.*chat test user/i)).toBeVisible()
  })

  test('should have logout functionality', async ({ page }) => {
    await page.getByRole('button', { name: /log out/i }).click()

    // Should redirect to login page
    await expect(page).toHaveURL('/login')
  })

  test('should stream Claude responses word-by-word', async ({ page }) => {
    await page.getByPlaceholder(/type your message/i).fill('Write a short story')
    await page.getByRole('button', { name: /send/i }).click()

    // Wait for first word to appear
    await page.waitForSelector('[data-testid="chat-message"][data-role="assistant"]', {
      timeout: 10000,
    })

    const assistantMessage = page
      .locator('[data-testid="chat-message"][data-role="assistant"]')
      .last()

    // Get initial text length
    const initialText = await assistantMessage.textContent()
    const initialLength = initialText?.length || 0

    // Wait a bit and check if text is growing (streaming)
    await page.waitForTimeout(1000)
    const laterText = await assistantMessage.textContent()
    const laterLength = laterText?.length || 0

    // Text should be growing if streaming is working
    expect(laterLength).toBeGreaterThan(initialLength)
  })
})
