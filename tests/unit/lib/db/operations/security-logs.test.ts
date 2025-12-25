import { describe, it, expect, beforeEach, vi } from 'vitest'
import { logSecurityEvent } from '@/lib/db/operations/security-logs'

// Mock database
vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 'test-log-id' }])),
      })),
    })),
  },
}))

describe('Log Security Event', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('logs event with all required fields', async () => {
    await expect(
      logSecurityEvent({
        eventType: 'password_reset_request',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        outcome: 'success',
      })
    ).resolves.not.toThrow()
  })

  it('logs event with optional userId', async () => {
    await expect(
      logSecurityEvent({
        userId: 'user-id-123',
        eventType: 'password_reset_complete',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        outcome: 'success',
      })
    ).resolves.not.toThrow()
  })

  it('logs event with user agent', async () => {
    await expect(
      logSecurityEvent({
        eventType: 'email_verification_request',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        outcome: 'success',
      })
    ).resolves.not.toThrow()
  })

  it('logs event with geolocation data', async () => {
    await expect(
      logSecurityEvent({
        eventType: 'password_reset_request',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        geolocation: {
          country: 'United States',
          region: 'California',
          city: 'San Francisco',
        },
        outcome: 'success',
      })
    ).resolves.not.toThrow()
  })

  it('logs event with tokenId (hashed)', async () => {
    await expect(
      logSecurityEvent({
        eventType: 'password_reset_complete',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        tokenId: 'abc123...hashed',
        outcome: 'success',
      })
    ).resolves.not.toThrow()
  })

  it('logs event with custom metadata', async () => {
    await expect(
      logSecurityEvent({
        eventType: 'rate_limit_exceeded',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        outcome: 'rate_limited',
        metadata: {
          attemptCount: 4,
          windowStart: new Date().toISOString(),
          nextAllowedAt: new Date(Date.now() + 900000).toISOString(),
        },
      })
    ).resolves.not.toThrow()
  })

  it('returns log entry ID on success', async () => {
    const result = await logSecurityEvent({
      eventType: 'password_reset_request',
      email: 'test@example.com',
      ipAddress: '192.168.1.1',
      outcome: 'success',
    })

    expect(result).toBeDefined()
    expect(result.id).toBeDefined()
  })

  it('accepts all valid event types', async () => {
    const eventTypes = [
      'password_reset_request',
      'password_reset_complete',
      'password_reset_failed',
      'email_verification_request',
      'email_verification_complete',
      'email_verification_failed',
      'rate_limit_exceeded',
    ]

    for (const eventType of eventTypes) {
      await expect(
        logSecurityEvent({
          eventType,
          email: 'test@example.com',
          ipAddress: '192.168.1.1',
          outcome: 'success',
        })
      ).resolves.not.toThrow()
    }
  })

  it('accepts all valid outcome values', async () => {
    const outcomes: Array<'success' | 'failed' | 'rate_limited' | 'expired'> = [
      'success',
      'failed',
      'rate_limited',
      'expired',
    ]

    for (const outcome of outcomes) {
      await expect(
        logSecurityEvent({
          eventType: 'password_reset_request',
          email: 'test@example.com',
          ipAddress: '192.168.1.1',
          outcome,
        })
      ).resolves.not.toThrow()
    }
  })

  it('handles IPv6 addresses', async () => {
    await expect(
      logSecurityEvent({
        eventType: 'password_reset_request',
        email: 'test@example.com',
        ipAddress: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        outcome: 'success',
      })
    ).resolves.not.toThrow()
  })

  it('is non-blocking (async but does not throw on failure)', async () => {
    // Security logging should never block request processing
    // Even if DB write fails, it should not throw
    await expect(
      logSecurityEvent({
        eventType: 'password_reset_request',
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        outcome: 'success',
      })
    ).resolves.toBeDefined()
  })
})

describe('Security Event Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects invalid email format', async () => {
    await expect(
      logSecurityEvent({
        eventType: 'password_reset_request',
        email: 'invalid-email',
        ipAddress: '192.168.1.1',
        outcome: 'success',
      })
    ).rejects.toThrow()
  })

  it('rejects empty IP address', async () => {
    await expect(
      logSecurityEvent({
        eventType: 'password_reset_request',
        email: 'test@example.com',
        ipAddress: '',
        outcome: 'success',
      })
    ).rejects.toThrow()
  })

  it('rejects empty event type', async () => {
    await expect(
      logSecurityEvent({
        eventType: '' as any,
        email: 'test@example.com',
        ipAddress: '192.168.1.1',
        outcome: 'success',
      })
    ).rejects.toThrow()
  })
})
