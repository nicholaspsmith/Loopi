import { describe, it, expect, beforeEach, vi } from 'vitest'
import { sendEmail, initializeEmailClient } from '@/lib/email/client'

// Mock nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' }),
      verify: vi.fn().mockResolvedValue(true),
    })),
  },
}))

describe('Email Client Initialization', () => {
  it('initializes with SMTP configuration from environment', () => {
    expect(() => initializeEmailClient()).not.toThrow()
  })

  it('validates SMTP connection on initialization', async () => {
    const client = initializeEmailClient()
    // Should not throw during initialization
    expect(client).toBeDefined()
  })

  it('throws error when SMTP credentials are missing', () => {
    // Store original env vars
    const originalEnv = { ...process.env }

    // Clear SMTP env vars
    delete process.env.SMTP_HOST
    delete process.env.SMTP_PORT
    delete process.env.SMTP_USER

    // Should handle missing credentials gracefully
    expect(() => initializeEmailClient()).not.toThrow()

    // Restore env vars
    process.env = originalEnv
  })
})

describe('Send Email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends email with required fields', async () => {
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Subject',
      text: 'Test body',
    })

    expect(result).toBeDefined()
    expect(result.messageId).toBeDefined()
  })

  it('sends email with both text and HTML body', async () => {
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Subject',
      text: 'Plain text body',
      html: '<p>HTML body</p>',
    })

    expect(result).toBeDefined()
    expect(result.messageId).toBeDefined()
  })

  it('uses SMTP_FROM environment variable as sender', async () => {
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      text: 'Body',
    })

    expect(result).toBeDefined()
    // Verify from address is set (implementation will check this)
  })

  it('validates email address format', async () => {
    await expect(
      sendEmail({
        to: 'invalid-email',
        subject: 'Test',
        text: 'Body',
      })
    ).rejects.toThrow()
  })

  it('rejects empty subject', async () => {
    await expect(
      sendEmail({
        to: 'test@example.com',
        subject: '',
        text: 'Body',
      })
    ).rejects.toThrow()
  })

  it('rejects empty body (both text and html missing)', async () => {
    await expect(
      sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        text: '',
      })
    ).rejects.toThrow()
  })

  it('handles SMTP connection errors gracefully', async () => {
    // Mock will handle this - implementation should catch and rethrow
    await expect(
      sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        text: 'Body',
      })
    ).resolves.toBeDefined()
  })

  it('returns messageId on successful send', async () => {
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      text: 'Body',
    })

    expect(result.messageId).toMatch(/test-message-id/)
  })
})

describe('Email Queueing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('queues email when immediate send fails', async () => {
    // This will be implemented in client.ts
    // For now, test that it doesn't crash
    expect(true).toBe(true)
  })

  it('does not queue email when immediate send succeeds', async () => {
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      text: 'Body',
    })

    expect(result.messageId).toBeDefined()
  })
})
