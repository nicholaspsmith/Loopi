import { describe, it, expect } from 'vitest'
import { encryptApiKey, decryptApiKey, maskApiKey } from '@/lib/encryption/api-key'

/**
 * Unit Tests for API Key Encryption Service
 *
 * Tests verify encryption, decryption, and masking functionality.
 */

describe('API Key Encryption', () => {
  const testApiKey = 'sk-ant-api03-test-key-long-enough-for-validation-1234567890abcdef'

  describe('encryptApiKey', () => {
    it('should encrypt API key successfully', async () => {
      const encrypted = await encryptApiKey(testApiKey)

      expect(encrypted).toBeDefined()
      expect(typeof encrypted).toBe('string')
      expect(encrypted.length).toBeGreaterThan(0)
    })

    it('should not return plaintext', async () => {
      const encrypted = await encryptApiKey(testApiKey)

      expect(encrypted).not.toBe(testApiKey)
      expect(encrypted).not.toContain('sk-ant-')
    })

    it('should produce different ciphertexts for same plaintext', async () => {
      const encrypted1 = await encryptApiKey(testApiKey)
      const encrypted2 = await encryptApiKey(testApiKey)

      // PGP encryption with salt produces different outputs
      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should encrypt long API keys', async () => {
      const longKey = 'sk-ant-api03-' + 'a'.repeat(200)
      const encrypted = await encryptApiKey(longKey)

      expect(encrypted).toBeDefined()
      expect(encrypted.length).toBeGreaterThan(0)
    })

    it('should encrypt special characters', async () => {
      const specialKey = 'sk-ant-api03-key!@#$%^&*()_+-=[]{}|;:,.<>?~`1234567890'
      const encrypted = await encryptApiKey(specialKey)

      expect(encrypted).toBeDefined()
      const decrypted = await decryptApiKey(encrypted)
      expect(decrypted).toBe(specialKey)
    })
  })

  describe('decryptApiKey', () => {
    it('should decrypt encrypted API key successfully', async () => {
      const encrypted = await encryptApiKey(testApiKey)
      const decrypted = await decryptApiKey(encrypted)

      expect(decrypted).toBe(testApiKey)
    })

    it('should return null for invalid encrypted data', async () => {
      const invalidEncrypted = 'not-valid-base64-encrypted-data'
      const decrypted = await decryptApiKey(invalidEncrypted)

      expect(decrypted).toBeNull()
    })

    it('should return null for empty string', async () => {
      const decrypted = await decryptApiKey('')

      expect(decrypted).toBeNull()
    })

    it('should handle multiple encrypt-decrypt cycles', async () => {
      const keys = [
        'sk-ant-api03-key1-long-enough-for-validation-111111111111',
        'sk-ant-api03-key2-long-enough-for-validation-222222222222',
        'sk-ant-api03-key3-long-enough-for-validation-333333333333',
      ]

      for (const key of keys) {
        const encrypted = await encryptApiKey(key)
        const decrypted = await decryptApiKey(encrypted)
        expect(decrypted).toBe(key)
      }
    })
  })

  describe('maskApiKey', () => {
    it('should mask API key showing first 7 and last 4 characters', () => {
      const masked = maskApiKey(testApiKey)

      expect(masked).toBe('sk-ant-...cdef')
    })

    it('should handle short keys gracefully', () => {
      const shortKey = 'short'
      const masked = maskApiKey(shortKey)

      expect(masked).toBe('***')
    })

    it('should handle empty string', () => {
      const masked = maskApiKey('')

      expect(masked).toBe('***')
    })

    it('should handle exactly 11 characters', () => {
      const key = 'sk-ant-1234'
      const masked = maskApiKey(key)

      expect(masked).toBe('sk-ant-...1234')
    })

    it('should mask various Claude API key formats', () => {
      const keys = [
        { key: 'sk-ant-api03-abcdefghijklmnop', expected: 'sk-ant-...mnop' },
        { key: 'sk-ant-xyz123456789', expected: 'sk-ant-...6789' },
        { key: 'sk-ant-api03-very-long-key-with-many-characters-end', expected: 'sk-ant-...-end' },
      ]

      keys.forEach(({ key, expected }) => {
        expect(maskApiKey(key)).toBe(expected)
      })
    })
  })

  describe('Round-trip encryption', () => {
    it('should maintain data integrity through encrypt-decrypt cycle', async () => {
      const testKeys = [
        'sk-ant-api03-test1-long-enough-for-validation-aaa',
        'sk-ant-api03-test2-long-enough-for-validation-bbb',
        'sk-ant-api03-test3-long-enough-for-validation-ccc',
      ]

      for (const originalKey of testKeys) {
        const encrypted = await encryptApiKey(originalKey)
        const decrypted = await decryptApiKey(encrypted)

        expect(decrypted).toBe(originalKey)
        expect(encrypted).not.toBe(originalKey)
      }
    })

    it('should handle unicode characters', async () => {
      const unicodeKey = 'sk-ant-api03-test-with-unicode-émojis-🔑-1234567890'
      const encrypted = await encryptApiKey(unicodeKey)
      const decrypted = await decryptApiKey(encrypted)

      expect(decrypted).toBe(unicodeKey)
    })

    it('should preserve exact key length and content', async () => {
      const originalKey = 'sk-ant-api03-exact-match-test-1234567890abcdefghijklmnop'
      const encrypted = await encryptApiKey(originalKey)
      const decrypted = await decryptApiKey(encrypted)

      expect(decrypted).toBe(originalKey)
      expect(decrypted?.length).toBe(originalKey.length)
    })
  })

  describe('Security properties', () => {
    it('should not expose plaintext in encrypted output', async () => {
      const encrypted = await encryptApiKey(testApiKey)

      // Check that no part of the original key is visible
      const keyParts = testApiKey.split('-')
      keyParts.forEach((part) => {
        if (part.length > 4) {
          // Don't check very short parts as they might appear by chance
          expect(encrypted.toLowerCase()).not.toContain(part.toLowerCase())
        }
      })
    })

    it('should produce base64-encoded output', async () => {
      const encrypted = await encryptApiKey(testApiKey)

      // Base64 pattern (alphanumeric + / + = padding + newlines for formatting)
      const base64Pattern = /^[A-Za-z0-9+/\s]+=*$/
      expect(encrypted).toMatch(base64Pattern)
    })

    it('should produce encrypted data significantly different from input', async () => {
      const encrypted = await encryptApiKey(testApiKey)

      // Encrypted data should be different length and content
      expect(encrypted).not.toBe(testApiKey)
      expect(encrypted.length).not.toBe(testApiKey.length)

      // Calculate similarity (should be very low)
      let matchingChars = 0
      const minLength = Math.min(encrypted.length, testApiKey.length)
      for (let i = 0; i < minLength; i++) {
        if (encrypted[i] === testApiKey[i]) matchingChars++
      }
      const similarity = matchingChars / minLength
      expect(similarity).toBeLessThan(0.1) // Less than 10% similarity
    })
  })
})
