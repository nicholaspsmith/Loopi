import { describe, it, expect, beforeAll } from 'vitest'
import { isServerAvailable } from '@/tests/helpers/server-check'

const serverRunning = await isServerAvailable()

import { initializeSchema } from '@/lib/db/schema'

/**
 * Contract Tests for API Key Settings API
 *
 * Tests verify API contracts for /api/settings/api-key endpoints.
 * Following TDD - these should FAIL until implementation is complete.
 *
 * Note: These tests require a running dev server.
 * Run: npm run dev (in one terminal) then npm run test:contract
 */

const BASE_URL = 'http://localhost:3000'
let authCookie: string

describe.skipIf(!serverRunning)('API Key Settings Contract Tests', () => {
  beforeAll(async () => {
    // Initialize test database
    await initializeSchema()

    // Create and authenticate a test user
    const signupResponse = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test-apikey-${Date.now()}@example.com`,
        password: 'SecurePass123!',
        name: 'API Key Test User',
      }),
    })

    // Parse the response to confirm signup succeeded
    await signupResponse.json()

    // Get auth cookie from response
    authCookie = signupResponse.headers.get('set-cookie') || ''
  })

  describe('GET /api/settings/api-key', () => {
    it('should return 200 with exists:false for user without API key', async () => {
      const response = await fetch(`${BASE_URL}/api/settings/api-key`, {
        headers: {
          Cookie: authCookie,
        },
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data.data).toHaveProperty('exists', false)
      expect(data.data).not.toHaveProperty('keyPreview')
    })

    it('should return 401 for unauthenticated user', async () => {
      const response = await fetch(`${BASE_URL}/api/settings/api-key`)

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/settings/api-key', () => {
    it('should return 201 and save valid API key', async () => {
      const response = await fetch(`${BASE_URL}/api/settings/api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          apiKey: 'sk-ant-api03-test-key-that-is-long-enough-for-validation-1234567890abcdef',
        }),
      })

      expect(response.status).toBe(201)

      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data.data).toHaveProperty('message')
      expect(data.data).toHaveProperty('keyPreview')
      expect(data.data.keyPreview).toMatch(/^sk-ant-\.\.\./)
    })

    it('should return 400 for invalid API key format', async () => {
      const response = await fetch(`${BASE_URL}/api/settings/api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          apiKey: 'invalid-key',
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('success', false)
      expect(data).toHaveProperty('error')
    })

    it('should return 400 for missing API key', async () => {
      const response = await fetch(`${BASE_URL}/api/settings/api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(400)
    })

    it('should return 401 for unauthenticated user', async () => {
      const response = await fetch(`${BASE_URL}/api/settings/api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: 'sk-ant-api03-test-key',
        }),
      })

      expect(response.status).toBe(401)
    })

    it('should update existing API key on subsequent POST', async () => {
      // First save
      await fetch(`${BASE_URL}/api/settings/api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          apiKey: 'sk-ant-api03-first-key-that-is-long-enough-for-validation-1234567890abcdef',
        }),
      })

      // Update with new key
      const response = await fetch(`${BASE_URL}/api/settings/api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          apiKey: 'sk-ant-api03-second-key-that-is-long-enough-for-validation-0987654321fedcba',
        }),
      })

      expect(response.status).toBe(201)

      const data = await response.json()
      expect(data.data.keyPreview).toMatch(/^sk-ant-\.\.\./)
    })
  })

  describe('DELETE /api/settings/api-key', () => {
    beforeAll(async () => {
      // Ensure there's an API key to delete
      await fetch(`${BASE_URL}/api/settings/api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          apiKey: 'sk-ant-api03-delete-test-key-long-enough-for-validation-1234567890abcdef',
        }),
      })
    })

    it('should return 200 and delete API key', async () => {
      const response = await fetch(`${BASE_URL}/api/settings/api-key`, {
        method: 'DELETE',
        headers: {
          Cookie: authCookie,
        },
      })

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toHaveProperty('success', true)
      expect(data.data).toHaveProperty('message')

      // Verify key is deleted
      const getResponse = await fetch(`${BASE_URL}/api/settings/api-key`, {
        headers: {
          Cookie: authCookie,
        },
      })

      const getData = await getResponse.json()
      expect(getData.data.exists).toBe(false)
    })

    it('should return 404 when deleting non-existent key', async () => {
      const response = await fetch(`${BASE_URL}/api/settings/api-key`, {
        method: 'DELETE',
        headers: {
          Cookie: authCookie,
        },
      })

      expect(response.status).toBe(404)
    })

    it('should return 401 for unauthenticated user', async () => {
      const response = await fetch(`${BASE_URL}/api/settings/api-key`, {
        method: 'DELETE',
      })

      expect(response.status).toBe(401)
    })
  })
})
