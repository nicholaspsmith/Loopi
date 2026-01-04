import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import { hashPassword } from '@/lib/auth/helpers'
import { createUser } from '@/lib/db/operations/users'
import { closeDbConnection } from '@/lib/db/client'
import { testPOST, type MockSession } from '@/tests/helpers/route-test-helper'
import { auth } from '@/auth'

/**
 * Contract Tests for Feedback API
 *
 * Tests API contracts for the feedback submission endpoint that creates GitHub issues.
 *
 * Endpoint: POST /api/feedback
 *
 * Test scenarios:
 * 1. Returns 401 for unauthenticated requests
 * 2. Returns 400 for missing body field
 * 3. Returns 400 for body too short (< 10 chars)
 * 4. Returns 400 for body too long (> 5000 chars)
 * 5. Returns 201 for valid feedback submission (mock GitHub API)
 * 6. Includes correct labels in GitHub issue creation
 * 7. Returns 503 if GITHUB_TOKEN not configured
 * 8. Returns 502 if GitHub API fails
 * 9. Validates title length (max 200 chars)
 * 10. Validates category enum values
 */

// Mock auth module
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

// Store original fetch
const originalFetch = global.fetch

// Set GITHUB_TOKEN before module is loaded
vi.stubEnv('GITHUB_TOKEN', 'test-github-token')

describe('Feedback API Contract Tests', () => {
  let testUserId: string
  let mockSession: MockSession
  let feedbackRoute: typeof import('@/app/api/feedback/route')

  beforeAll(async () => {
    const timestamp = Date.now()

    // Create test user
    const passwordHash = await hashPassword('TestPass123!')
    const user = await createUser({
      email: `test-feedback-${timestamp}@example.com`,
      passwordHash,
      name: 'Feedback Test User',
    })
    testUserId = user.id

    mockSession = {
      user: {
        id: testUserId,
        email: user.email,
        name: user.name ?? undefined,
      },
    }

    // Import route after env is stubbed
    feedbackRoute = await import('@/app/api/feedback/route')
  })

  beforeEach(() => {
    // Set up auth mock before each test
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession)

    // Reset rate limiter between tests
    feedbackRoute._resetRateLimitForTesting()

    // Mock GitHub API by default (success)
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ number: 123 }),
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('GITHUB_TOKEN', 'test-github-token')
  })

  afterAll(async () => {
    await closeDbConnection()
    global.fetch = originalFetch
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  describe('POST /api/feedback', () => {
    it('should return 401 for unauthenticated requests', async () => {
      // Mock no session
      ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const response = await testPOST(feedbackRoute.POST, '/api/feedback', {
        body: {
          body: 'This is valid feedback with enough characters.',
          category: 'bug',
        },
        session: null,
      })

      expect(response.status).toBe(401)

      const data = response.data as { error: string; code: string }
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('code', 'UNAUTHORIZED')
      expect(data.error.toLowerCase()).toContain('logged in')
    })

    it('should return 400 for missing body field', async () => {
      const response = await testPOST(feedbackRoute.POST, '/api/feedback', {
        body: {
          category: 'bug',
          title: 'Test title',
          // body is missing
        },
        session: mockSession,
      })

      expect(response.status).toBe(400)

      const data = response.data as { error: string; code: string }
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('code', 'VALIDATION_ERROR')
    })

    it('should return 400 for body too short (< 10 chars)', async () => {
      const response = await testPOST(feedbackRoute.POST, '/api/feedback', {
        body: {
          body: 'Short', // Only 5 chars, needs 10+
          category: 'feature',
        },
        session: mockSession,
      })

      expect(response.status).toBe(400)

      const data = response.data as { error: string; code: string }
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('code', 'VALIDATION_ERROR')
      expect(data.error.toLowerCase()).toContain('10 characters')
    })

    it('should return 400 for body too long (> 5000 chars)', async () => {
      const response = await testPOST(feedbackRoute.POST, '/api/feedback', {
        body: {
          body: 'A'.repeat(5001), // Exceeds 5000 char limit
          category: 'other',
        },
        session: mockSession,
      })

      expect(response.status).toBe(400)

      const data = response.data as { error: string; code: string }
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('code', 'VALIDATION_ERROR')
    })

    it('should return 400 for title too long (> 200 chars)', async () => {
      const response = await testPOST(feedbackRoute.POST, '/api/feedback', {
        body: {
          title: 'A'.repeat(201), // Exceeds 200 char limit
          body: 'This is valid feedback with enough characters.',
          category: 'improvement',
        },
        session: mockSession,
      })

      expect(response.status).toBe(400)

      const data = response.data as { error: string; code: string }
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('code', 'VALIDATION_ERROR')
    })

    it('should return 400 for invalid category', async () => {
      const response = await testPOST(feedbackRoute.POST, '/api/feedback', {
        body: {
          body: 'This is valid feedback with enough characters.',
          category: 'invalid-category', // Not one of: bug, feature, improvement, other
        },
        session: mockSession,
      })

      expect(response.status).toBe(400)

      const data = response.data as { error: string; code: string }
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('code', 'VALIDATION_ERROR')
    })

    it('should return 201 for valid feedback submission (mocked GitHub API)', async () => {
      const response = await testPOST(feedbackRoute.POST, '/api/feedback', {
        body: {
          title: 'Test Feedback Title',
          body: 'This is a detailed feedback message with enough characters to meet the minimum requirement.',
          category: 'feature',
        },
        session: mockSession,
      })

      expect(response.status).toBe(201)

      const data = response.data as { success: boolean; message: string; issueNumber: number }
      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('message')
      expect(data).toHaveProperty('issueNumber', 123)
    })

    it('should use generated title when title is not provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ number: 456 }),
      })
      global.fetch = mockFetch

      const response = await testPOST(feedbackRoute.POST, '/api/feedback', {
        body: {
          body: 'This feedback has no title but should work fine with auto-generated title.',
          category: 'bug',
        },
        session: mockSession,
      })

      expect(response.status).toBe(201)

      // Verify GitHub API was called with auto-generated title
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.github.com/repos'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('[User Feedback]'),
        })
      )
    })

    it('should include correct labels in GitHub issue creation', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ number: 789 }),
      })
      global.fetch = mockFetch

      const response = await testPOST(feedbackRoute.POST, '/api/feedback', {
        body: {
          title: 'Check labels',
          body: 'This test verifies that correct labels are added to GitHub issues.',
          category: 'improvement',
        },
        session: mockSession,
      })

      expect(response.status).toBe(201)

      // Verify GitHub API was called with correct labels
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-github-token',
            Accept: 'application/vnd.github.v3+json',
          }),
        })
      )

      const callArgs = mockFetch.mock.calls[0]
      const requestBody = JSON.parse(callArgs[1].body as string)
      expect(requestBody.labels).toEqual(['User Feedback', 'Needs Triage'])
    })

    it('should return 503 if GITHUB_TOKEN not configured', async () => {
      // Temporarily remove GitHub token and re-import module
      vi.unstubAllEnvs()

      // Re-import the module to pick up the new env
      vi.resetModules()
      const feedbackRouteNoToken = await import('@/app/api/feedback/route')

      const response = await testPOST(feedbackRouteNoToken.POST, '/api/feedback', {
        body: {
          body: 'This feedback should fail due to missing GitHub token.',
          category: 'other',
        },
        session: mockSession,
      })

      expect(response.status).toBe(503)

      const data = response.data as { error: string; code: string }
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('code', 'NOT_CONFIGURED')
      expect(data.error.toLowerCase()).toContain('not configured')

      // Restore token for other tests
      vi.stubEnv('GITHUB_TOKEN', 'test-github-token')
      vi.resetModules()
    })

    it('should return 502 if GitHub API fails', async () => {
      // Mock GitHub API failure
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal Server Error' }),
      })

      const response = await testPOST(feedbackRoute.POST, '/api/feedback', {
        body: {
          body: 'This feedback should fail due to GitHub API error.',
          category: 'bug',
        },
        session: mockSession,
      })

      expect(response.status).toBe(502)

      const data = response.data as { error: string; code: string }
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('code', 'GITHUB_ERROR')
      expect(data.error.toLowerCase()).toContain('failed')
    })

    it('should accept feedback at minimum body length (10 chars)', async () => {
      const response = await testPOST(feedbackRoute.POST, '/api/feedback', {
        body: {
          body: '1234567890', // Exactly 10 chars
          category: 'other',
        },
        session: mockSession,
      })

      expect(response.status).toBe(201)
    })

    it('should accept feedback at maximum body length (5000 chars)', async () => {
      const response = await testPOST(feedbackRoute.POST, '/api/feedback', {
        body: {
          body: 'A'.repeat(5000), // Exactly 5000 chars
          category: 'feature',
        },
        session: mockSession,
      })

      expect(response.status).toBe(201)
    })

    it('should accept title at maximum length (200 chars)', async () => {
      const response = await testPOST(feedbackRoute.POST, '/api/feedback', {
        body: {
          title: 'A'.repeat(200), // Exactly 200 chars
          body: 'This is valid feedback with enough characters.',
          category: 'improvement',
        },
        session: mockSession,
      })

      expect(response.status).toBe(201)
    })

    it('should default category to "other" when not provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ number: 999 }),
      })
      global.fetch = mockFetch

      const response = await testPOST(feedbackRoute.POST, '/api/feedback', {
        body: {
          body: 'This feedback has no category specified.',
          // category is not provided
        },
        session: mockSession,
      })

      expect(response.status).toBe(201)

      // Verify GitHub issue body contains "other" category
      const callArgs = mockFetch.mock.calls[0]
      const requestBody = JSON.parse(callArgs[1].body as string)
      expect(requestBody.body).toContain('**Category:** other')
    })

    it('should include user ID in GitHub issue body', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ number: 111 }),
      })
      global.fetch = mockFetch

      const response = await testPOST(feedbackRoute.POST, '/api/feedback', {
        body: {
          body: 'This test verifies user ID is included in the issue.',
          category: 'bug',
        },
        session: mockSession,
      })

      expect(response.status).toBe(201)

      // Verify GitHub issue body contains hashed user ID (privacy protection)
      const callArgs = mockFetch.mock.calls[0]
      const requestBody = JSON.parse(callArgs[1].body as string)
      // The API uses SHA256 hash of user ID, so we just verify it contains "User `" with 8 hex chars
      expect(requestBody.body).toMatch(/User `[a-f0-9]{8}`/)
    })

    it('should handle all category types correctly', async () => {
      const categories = ['bug', 'feature', 'improvement', 'other'] as const

      for (const category of categories) {
        const mockFetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 201,
          json: async () => ({ number: 222 }),
        })
        global.fetch = mockFetch

        const response = await testPOST(feedbackRoute.POST, '/api/feedback', {
          body: {
            body: `Testing ${category} category feedback submission.`,
            category,
          },
          session: mockSession,
        })

        expect(response.status).toBe(201)

        // Verify category is in the issue body
        const callArgs = mockFetch.mock.calls[0]
        const requestBody = JSON.parse(callArgs[1].body as string)
        expect(requestBody.body).toContain(`**Category:** ${category}`)
      }
    })

    it('should return 429 when rate limit is exceeded', async () => {
      // Make 5 successful requests (the limit)
      for (let i = 0; i < 5; i++) {
        const response = await testPOST(feedbackRoute.POST, '/api/feedback', {
          body: {
            body: `Feedback submission ${i + 1} with enough characters`,
          },
          session: mockSession,
        })
        expect(response.status).toBe(201)
      }

      // 6th request should be rate limited
      const response = await testPOST(feedbackRoute.POST, '/api/feedback', {
        body: {
          body: 'This should be rate limited with enough characters',
        },
        session: mockSession,
      })

      expect(response.status).toBe(429)
      const data = response.data as { error: string; code: string }
      expect(data.code).toBe('RATE_LIMITED')
      expect(data.error).toContain('Too many feedback submissions')
    })

    it('should validate GITHUB_REPO format and return 503 for invalid format', async () => {
      vi.stubEnv('GITHUB_REPO', 'invalid-repo-format')

      // Re-import route with new env
      const { POST: postWithInvalidRepo } = await import('@/app/api/feedback/route')

      const response = await testPOST(postWithInvalidRepo, '/api/feedback', {
        body: {
          body: 'Feedback with invalid repo config characters enough',
        },
        session: mockSession,
      })

      expect(response.status).toBe(503)
      const data = response.data as { error: string; code: string }
      expect(data.code).toBe('CONFIG_ERROR')
    })
  })
})
