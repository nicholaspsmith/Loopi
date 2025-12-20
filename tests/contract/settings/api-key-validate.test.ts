import { describe, it, expect, beforeAll } from 'vitest'
import { initializeSchema } from '@/lib/db/schema'

/**
 * Contract Tests for API Key Validation API
 *
 * Tests verify API contracts for POST /api/settings/api-key/validate endpoint.
 * Following TDD - these should FAIL until implementation is complete.
 *
 * User Story 3: API Key Validation and Feedback
 * - Validates Claude API key format
 * - Tests actual API key against Anthropic API
 * - Provides detailed feedback (format errors, auth errors, success)
 *
 * Note: These tests require a running dev server.
 * Run: npm run dev (in one terminal) then npm run test:contract
 */

const BASE_URL = 'http://localhost:3000'
let authCookie: string

describe('API Key Validation Contract Tests', () => {
  beforeAll(async () => {
    // Initialize test database
    await initializeSchema()

    // Create and authenticate a test user
    const signupResponse = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test-validate-${Date.now()}@example.com`,
        password: 'SecurePass123!',
        name: 'API Key Validation Test User',
      }),
    })

    const signupData = await signupResponse.json()
    expect(signupData.success).toBe(true)

    // Get auth cookie from response
    authCookie = signupResponse.headers.get('set-cookie') || ''
  })

  describe('POST /api/settings/api-key/validate', () => {
    it('should return 401 when not authenticated', async () => {
      const response = await fetch(`${BASE_URL}/api/settings/api-key/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: 'sk-ant-api03-test-key',
        }),
      })

      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.error).toBeDefined()
      expect(data.code).toBe('UNAUTHORIZED')
    })

    it('should return 400 when API key is missing', async () => {
      const response = await fetch(`${BASE_URL}/api/settings/api-key/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBeDefined()
      expect(data.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 when API key is empty string', async () => {
      const response = await fetch(`${BASE_URL}/api/settings/api-key/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          apiKey: '',
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.error).toBeDefined()
      expect(data.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for invalid API key format (wrong prefix)', async () => {
      const response = await fetch(`${BASE_URL}/api/settings/api-key/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          apiKey: 'invalid-key-format',
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.valid).toBe(false)
      expect(data.error).toContain('format')
      expect(data.code).toBe('INVALID_FORMAT')
    })

    it('should return 400 for malformed API key (correct prefix, wrong format)', async () => {
      const response = await fetch(`${BASE_URL}/api/settings/api-key/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          apiKey: 'sk-ant-123',
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data.valid).toBe(false)
      expect(data.error).toContain('format')
      expect(data.code).toBe('INVALID_FORMAT')
    })

    it('should return 401 for well-formed but invalid API key (authentication failed)', async () => {
      // Use a well-formed but definitely invalid key
      const fakeKey = 'sk-ant-api03-' + 'x'.repeat(95) // Standard Claude API key format but invalid

      const response = await fetch(`${BASE_URL}/api/settings/api-key/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          apiKey: fakeKey,
        }),
      })

      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data.valid).toBe(false)
      expect(data.error).toContain('authentication')
      expect(data.code).toBe('AUTHENTICATION_FAILED')
    })

    it('should return 200 with valid:true for a valid API key', async () => {
      // Skip this test if VALID_TEST_API_KEY is not set
      const validKey = process.env.VALID_TEST_API_KEY
      if (!validKey) {
        console.log('[Test] Skipping valid API key test - VALID_TEST_API_KEY not set')
        return
      }

      const response = await fetch(`${BASE_URL}/api/settings/api-key/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          apiKey: validKey,
        }),
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.valid).toBe(true)
      expect(data.message).toBeDefined()
      expect(data.message).toContain('valid')
    })

    it('should validate within 3 seconds (performance requirement)', async () => {
      const startTime = Date.now()

      const response = await fetch(`${BASE_URL}/api/settings/api-key/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          apiKey: 'sk-ant-api03-invalid-key-for-performance-test',
        }),
      })

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(3000) // SC-004: Validation feedback within 3 seconds
      expect(response.status).toBeDefined() // Ensure we got a response
    })

    it('should not expose sensitive error details to clients', async () => {
      const response = await fetch(`${BASE_URL}/api/settings/api-key/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          apiKey: 'sk-ant-api03-test-invalid-key',
        }),
      })

      const data = await response.json()

      // Should not expose internal error details
      expect(JSON.stringify(data).toLowerCase()).not.toContain('stack')
      expect(JSON.stringify(data).toLowerCase()).not.toContain('internal')
      expect(JSON.stringify(data).toLowerCase()).not.toContain('database')
    })

    it('should return consistent error format across all error types', async () => {
      const testCases = [
        { apiKey: '', expectedCode: 'VALIDATION_ERROR' },
        { apiKey: 'invalid-format', expectedCode: 'INVALID_FORMAT' },
        { apiKey: 'sk-ant-api03-fake-key-test', expectedCode: 'AUTHENTICATION_FAILED' },
      ]

      for (const testCase of testCases) {
        const response = await fetch(`${BASE_URL}/api/settings/api-key/validate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: authCookie,
          },
          body: JSON.stringify({
            apiKey: testCase.apiKey,
          }),
        })

        const data = await response.json()

        // All errors should have consistent structure
        expect(data).toHaveProperty('valid')
        expect(data).toHaveProperty('error')
        expect(data).toHaveProperty('code')
        expect(data.valid).toBe(false)
        expect(data.code).toBe(testCase.expectedCode)
      }
    })
  })
})
