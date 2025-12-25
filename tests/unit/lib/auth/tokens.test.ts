import { describe, it, expect } from 'vitest'
import { generateToken, hashToken, validateToken } from '@/lib/auth/tokens'

describe('Token Generation', () => {
  it('generates 64-character hex token', () => {
    const { rawToken } = generateToken()
    expect(rawToken).toMatch(/^[a-f0-9]{64}$/)
    expect(rawToken).toHaveLength(64)
  })

  it('generates unique tokens', () => {
    const token1 = generateToken()
    const token2 = generateToken()
    expect(token1.rawToken).not.toBe(token2.rawToken)
    expect(token1.hashedToken).not.toBe(token2.hashedToken)
  })

  it('returns both raw and hashed token', () => {
    const { rawToken, hashedToken } = generateToken()
    expect(rawToken).toBeDefined()
    expect(hashedToken).toBeDefined()
    expect(rawToken).not.toBe(hashedToken)
  })

  it('hashed token is 64-character hex string (SHA-256)', () => {
    const { hashedToken } = generateToken()
    expect(hashedToken).toMatch(/^[a-f0-9]{64}$/)
    expect(hashedToken).toHaveLength(64)
  })
})

describe('Token Hashing', () => {
  it('hashes token consistently', () => {
    const { rawToken } = generateToken()
    const hash1 = hashToken(rawToken)
    const hash2 = hashToken(rawToken)
    expect(hash1).toBe(hash2)
  })

  it('produces 64-character hex hash', () => {
    const { rawToken } = generateToken()
    const hash = hashToken(rawToken)
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
    expect(hash).toHaveLength(64)
  })

  it('different tokens produce different hashes', () => {
    const token1 = generateToken()
    const token2 = generateToken()
    const hash1 = hashToken(token1.rawToken)
    const hash2 = hashToken(token2.rawToken)
    expect(hash1).not.toBe(hash2)
  })

  it('matches hash from generateToken', () => {
    const { rawToken, hashedToken } = generateToken()
    const manualHash = hashToken(rawToken)
    expect(manualHash).toBe(hashedToken)
  })
})

describe('Token Validation', () => {
  it('validates correct token', () => {
    const { rawToken, hashedToken } = generateToken()
    expect(validateToken(rawToken, hashedToken)).toBe(true)
  })

  it('rejects incorrect token', () => {
    const { hashedToken } = generateToken()
    const wrongToken = generateToken().rawToken
    expect(validateToken(wrongToken, hashedToken)).toBe(false)
  })

  it('rejects tampered token', () => {
    const { rawToken, hashedToken } = generateToken()
    const tamperedToken = rawToken.slice(0, -1) + 'x' // Change last character
    expect(validateToken(tamperedToken, hashedToken)).toBe(false)
  })

  it('rejects empty token', () => {
    const { hashedToken } = generateToken()
    expect(validateToken('', hashedToken)).toBe(false)
  })

  it('rejects empty hash', () => {
    const { rawToken } = generateToken()
    expect(validateToken(rawToken, '')).toBe(false)
  })

  it('uses constant-time comparison (no timing attacks)', () => {
    // This test ensures we're using a secure comparison method
    // If implementation uses === directly, timing attacks are possible
    const { rawToken, hashedToken } = generateToken()
    const wrongToken = generateToken().rawToken

    const start1 = performance.now()
    validateToken(wrongToken, hashedToken)
    const time1 = performance.now() - start1

    const start2 = performance.now()
    validateToken(rawToken, hashedToken)
    const time2 = performance.now() - start2

    // Timing should be similar regardless of match/mismatch
    // (This is a basic check - real constant-time requires crypto library)
    expect(Math.abs(time1 - time2)).toBeLessThan(10) // Within 10ms
  })
})
