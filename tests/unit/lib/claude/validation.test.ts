import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateClaudeApiKey } from '@/lib/claude/validation'

/**
 * Unit Tests for Claude API Key Validation
 *
 * Tests the validateClaudeApiKey function that validates API keys
 * both for format and by making actual API calls to Anthropic.
 */

describe('Claude API Key Validation', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.restoreAllMocks()
  })

  describe('Format validation', () => {
    it('should reject empty string', async () => {
      const result = await validateClaudeApiKey('')

      expect(result.valid).toBe(false)
      expect(result.code).toBe('INVALID_FORMAT')
      expect(result.error).toContain('empty')
    })

    it('should reject null or undefined', async () => {
      const result1 = await validateClaudeApiKey(null as any)
      const result2 = await validateClaudeApiKey(undefined as any)

      expect(result1.valid).toBe(false)
      expect(result2.valid).toBe(false)
    })

    it('should reject keys without sk-ant prefix', async () => {
      const result = await validateClaudeApiKey('invalid-key-format')

      expect(result.valid).toBe(false)
      expect(result.code).toBe('INVALID_FORMAT')
      expect(result.error).toContain('format')
    })

    it('should reject keys with wrong prefix', async () => {
      const invalidPrefixes = [
        'sk-openai-abc123',
        'api-key-123',
        'claude-key-123',
        'sk-123',
      ]

      for (const key of invalidPrefixes) {
        const result = await validateClaudeApiKey(key)
        expect(result.valid).toBe(false)
        expect(result.code).toBe('INVALID_FORMAT')
      }
    })

    it('should reject keys that are too short', async () => {
      const result = await validateClaudeApiKey('sk-ant-api03-tooshort')

      expect(result.valid).toBe(false)
      expect(result.code).toBe('INVALID_FORMAT')
      expect(result.error).toContain('format')
    })

    it('should reject keys that are too long', async () => {
      const tooLong = 'sk-ant-api03-' + 'x'.repeat(500)
      const result = await validateClaudeApiKey(tooLong)

      expect(result.valid).toBe(false)
      expect(result.code).toBe('INVALID_FORMAT')
    })

    it('should accept well-formed Claude API keys', async () => {
      // Mock the Anthropic API to return success
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ type: 'message', content: [] }),
      })

      const wellFormed = 'sk-ant-api03-' + 'a'.repeat(95)
      const result = await validateClaudeApiKey(wellFormed)

      // Should pass format validation (actual API call might fail, but format is OK)
      expect(result.code).not.toBe('INVALID_FORMAT')
    })
  })

  describe('API authentication validation', () => {
    // Helper to create a valid-format test key
    const makeTestKey = (suffix: string) => `sk-ant-api03-${'x'.repeat(85)}${suffix.padEnd(10, 'x')}`

    it('should detect invalid API keys via 401 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          type: 'error',
          error: {
            type: 'authentication_error',
            message: 'invalid x-api-key',
          },
        }),
      })

      const result = await validateClaudeApiKey(makeTestKey('fake'))

      expect(result.valid).toBe(false)
      expect(result.code).toBe('AUTHENTICATION_FAILED')
      expect(result.error).toContain('authentication')
    })

    it('should detect invalid API keys via 403 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          type: 'error',
          error: {
            type: 'permission_error',
            message: 'forbidden',
          },
        }),
      })

      const result = await validateClaudeApiKey(makeTestKey('forbidden'))

      expect(result.valid).toBe(false)
      expect(result.code).toBe('AUTHENTICATION_FAILED')
    })

    it('should validate successful API keys', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          type: 'message',
          id: 'msg_test',
          content: [{ type: 'text', text: 'test' }],
        }),
      })

      const result = await validateClaudeApiKey(makeTestKey('valid'))

      expect(result.valid).toBe(true)
      expect(result.message).toBeDefined()
      expect(result.error).toBeUndefined()
    })

    it('should handle network errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await validateClaudeApiKey(makeTestKey('network'))

      expect(result.valid).toBe(false)
      expect(result.code).toBe('NETWORK_ERROR')
      expect(result.error?.toLowerCase()).toContain('network')
    })

    it('should handle timeout errors', async () => {
      global.fetch = vi.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100)
        })
      })

      const result = await validateClaudeApiKey(makeTestKey('timeout'))

      expect(result.valid).toBe(false)
      expect(result.code).toBe('NETWORK_ERROR')
    })

    it('should handle rate limiting (429) responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({
          type: 'error',
          error: {
            type: 'rate_limit_error',
            message: 'rate limit exceeded',
          },
        }),
      })

      const result = await validateClaudeApiKey(makeTestKey('ratelimit'))

      expect(result.valid).toBe(false)
      expect(result.code).toBe('RATE_LIMITED')
      expect(result.error?.toLowerCase()).toContain('rate limit')
    })

    it('should handle API errors (500) gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          type: 'error',
          error: {
            type: 'api_error',
            message: 'internal server error',
          },
        }),
      })

      const result = await validateClaudeApiKey(makeTestKey('apierror'))

      expect(result.valid).toBe(false)
      expect(result.code).toBe('API_ERROR')
    })
  })

  describe('Security and edge cases', () => {
    const makeTestKey = (suffix: string) => `sk-ant-api03-${'x'.repeat(85)}${suffix.padEnd(10, 'x')}`

    it('should trim whitespace from API keys', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ type: 'message', content: [] }),
      })

      const keyWithSpaces = '  ' + makeTestKey('trimtest') + '  '
      const result = await validateClaudeApiKey(keyWithSpaces)

      // Should handle trimming and validate
      expect(global.fetch).toHaveBeenCalled()
      const callArg = (global.fetch as any).mock.calls[0][1]
      expect(callArg.headers['x-api-key']).not.toContain('  ')
    })

    it('should not log or expose API keys in errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      global.fetch = vi.fn().mockRejectedValue(new Error('Test error'))

      const sensitiveKey = makeTestKey('secret')
      await validateClaudeApiKey(sensitiveKey)

      // Check that key is not in any console.error calls
      const errorCalls = consoleSpy.mock.calls.map((call) => JSON.stringify(call))
      const hasExposedKey = errorCalls.some((call) => call.includes(sensitiveKey))

      expect(hasExposedKey).toBe(false)

      consoleSpy.mockRestore()
    })

    it('should validate in under 5 seconds (performance)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ type: 'message', content: [] }),
      })

      const startTime = Date.now()
      await validateClaudeApiKey(makeTestKey('perf'))
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(5000)
    })

    it('should handle malformed JSON responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      const result = await validateClaudeApiKey(makeTestKey('badjson'))

      expect(result.valid).toBe(false)
      expect(result.code).toBe('API_ERROR') // Malformed API responses are API errors
    })

    it('should provide user-friendly error messages', async () => {
      const testCases = [
        { input: '', expectedMessage: /empty/i },
        { input: 'invalid', expectedMessage: /format/i },
      ]

      for (const { input, expectedMessage } of testCases) {
        const result = await validateClaudeApiKey(input)
        expect(result.error).toMatch(expectedMessage)
      }
    })
  })

  describe('API call details', () => {
    const makeTestKey = (suffix: string) => `sk-ant-api03-${'x'.repeat(85)}${suffix.padEnd(10, 'x')}`

    it('should make a minimal test request to Anthropic API', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ type: 'message', content: [] }),
      })

      const testKey = makeTestKey('api')
      await validateClaudeApiKey(testKey)

      expect(global.fetch).toHaveBeenCalledTimes(1)

      const [url, options] = (global.fetch as any).mock.calls[0]
      expect(url).toContain('anthropic.com')
      expect(options.method).toBe('POST')
      expect(options.headers['x-api-key']).toBe(testKey)
      expect(options.headers['anthropic-version']).toBeDefined()
    })

    it('should include required Anthropic API headers', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ type: 'message', content: [] }),
      })

      await validateClaudeApiKey(makeTestKey('headers'))

      const [_, options] = (global.fetch as any).mock.calls[0]

      expect(options.headers).toHaveProperty('x-api-key')
      expect(options.headers).toHaveProperty('Content-Type', 'application/json')
      expect(options.headers).toHaveProperty('anthropic-version')
    })

    it('should use minimal token count for validation', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ type: 'message', content: [] }),
      })

      await validateClaudeApiKey(makeTestKey('tokens'))

      const [_, options] = (global.fetch as any).mock.calls[0]
      const body = JSON.parse(options.body)

      // Should request minimal tokens to save costs
      expect(body.max_tokens).toBeLessThanOrEqual(10)
    })
  })
})
