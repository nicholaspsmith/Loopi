import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { hashPassword } from '@/lib/auth/helpers'
import { createUser } from '@/lib/db/operations/users'
import { closeDbConnection } from '@/lib/db/client'
import { testPOST, type MockSession } from '@/tests/helpers/route-test-helper'
import { auth } from '@/auth'
import type { DuplicateCheckResult } from '@/lib/dedup/types'

/**
 * Contract Tests for Flashcard Duplicate Detection API (T009)
 *
 * Tests API contract for POST /api/flashcards/check-duplicate
 * Per specs/023-dedupe/contracts/dedupe-api.md
 *
 * These tests will FAIL until the endpoint is implemented (TDD approach).
 *
 * Feature: 023-dedupe
 * User Story 1: Flashcard Duplicate Detection
 */

// Mock auth module
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

// Import route handler (will fail until implemented)
let checkDuplicateRoute: {
  POST: (request: Request) => Promise<Response>
}

try {
  checkDuplicateRoute = await import('@/app/api/flashcards/check-duplicate/route')
} catch {
  // Route not yet implemented
  checkDuplicateRoute = {
    POST: async () => {
      throw new Error('POST /api/flashcards/check-duplicate not yet implemented')
    },
  }
}

describe('POST /api/flashcards/check-duplicate - Contract Tests', () => {
  let testUserId: string
  let mockSession: MockSession

  beforeAll(async () => {
    const timestamp = Date.now()

    // Create test user
    const passwordHash = await hashPassword('TestPass123!')
    const user = await createUser({
      email: `test-duplicate-api-${timestamp}@example.com`,
      passwordHash,
      name: 'Duplicate API Test User',
    })
    testUserId = user.id

    mockSession = {
      user: {
        id: testUserId,
        email: user.email,
        name: user.name ?? undefined,
      },
    }
  })

  beforeEach(() => {
    // Set up auth mock before each test
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession)
  })

  afterAll(async () => {
    await closeDbConnection()
    vi.clearAllMocks()
  })

  describe('Success Cases', () => {
    it('should return 200 with DuplicateCheckResult schema for valid request', async () => {
      const response = await testPOST(checkDuplicateRoute.POST, '/api/flashcards/check-duplicate', {
        body: {
          question: 'What is the capital of France?',
        },
        session: mockSession,
      })

      expect(response.status).toBe(200)

      const data = response.data as DuplicateCheckResult
      expect(data).toHaveProperty('isDuplicate')
      expect(data).toHaveProperty('similarItems')
      expect(data).toHaveProperty('topScore')
      expect(data).toHaveProperty('checkSkipped')

      expect(typeof data.isDuplicate).toBe('boolean')
      expect(Array.isArray(data.similarItems)).toBe(true)
      expect(data.topScore === null || typeof data.topScore === 'number').toBe(true)
      expect(typeof data.checkSkipped).toBe('boolean')
    })

    it('should return checkSkipped=true for very short questions', async () => {
      const response = await testPOST(checkDuplicateRoute.POST, '/api/flashcards/check-duplicate', {
        body: {
          question: 'Yes?', // Only 4 chars
        },
        session: mockSession,
      })

      expect(response.status).toBe(200)

      const data = response.data as DuplicateCheckResult
      expect(data.checkSkipped).toBe(true)
      expect(data.skipReason).toBe('content_too_short')
      expect(data.isDuplicate).toBe(false)
      expect(data.similarItems).toHaveLength(0)
      expect(data.topScore).toBeNull()
    })

    it('should return similarItems array with correct structure when duplicates found', async () => {
      // Note: This test verifies the structure. Actual duplicate detection
      // depends on existing data and will be tested in integration tests
      const response = await testPOST(checkDuplicateRoute.POST, '/api/flashcards/check-duplicate', {
        body: {
          question: 'What is machine learning and how does it work?',
        },
        session: mockSession,
      })

      expect(response.status).toBe(200)

      const data = response.data as DuplicateCheckResult

      // Verify structure even if no duplicates found
      data.similarItems.forEach((item) => {
        expect(item).toHaveProperty('id')
        expect(item).toHaveProperty('score')
        expect(item).toHaveProperty('displayText')
        expect(item).toHaveProperty('type')
        expect(typeof item.id).toBe('string')
        expect(typeof item.score).toBe('number')
        expect(typeof item.displayText).toBe('string')
        expect(item.type).toBe('flashcard')
      })
    })

    it('should return max 3 similar items', async () => {
      const response = await testPOST(checkDuplicateRoute.POST, '/api/flashcards/check-duplicate', {
        body: {
          question: 'Explain neural networks in detail',
        },
        session: mockSession,
      })

      expect(response.status).toBe(200)

      const data = response.data as DuplicateCheckResult
      expect(data.similarItems.length).toBeLessThanOrEqual(3)
    })
  })

  describe('Validation Errors', () => {
    it('should return 400 for missing question field', async () => {
      const response = await testPOST(checkDuplicateRoute.POST, '/api/flashcards/check-duplicate', {
        body: {},
        session: mockSession,
      })

      expect(response.status).toBe(400)

      const data = response.data as { error: string }
      expect(data).toHaveProperty('error')
      expect(data.error.toLowerCase()).toMatch(/question|required/i)
    })

    it('should return 400 for empty question string', async () => {
      const response = await testPOST(checkDuplicateRoute.POST, '/api/flashcards/check-duplicate', {
        body: {
          question: '',
        },
        session: mockSession,
      })

      expect(response.status).toBe(400)

      const data = response.data as { error: string }
      expect(data).toHaveProperty('error')
    })

    it('should return 400 for non-string question', async () => {
      const response = await testPOST(checkDuplicateRoute.POST, '/api/flashcards/check-duplicate', {
        body: {
          question: 123,
        },
        session: mockSession,
      })

      expect(response.status).toBe(400)

      const data = response.data as { error: string }
      expect(data).toHaveProperty('error')
    })

    it('should return 400 for whitespace-only question', async () => {
      const response = await testPOST(checkDuplicateRoute.POST, '/api/flashcards/check-duplicate', {
        body: {
          question: '   \n   \t   ',
        },
        session: mockSession,
      })

      expect(response.status).toBe(400)

      const data = response.data as { error: string }
      expect(data).toHaveProperty('error')
    })
  })

  describe('Authentication', () => {
    it('should return 401 for unauthenticated requests', async () => {
      // Mock no session
      ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const response = await testPOST(checkDuplicateRoute.POST, '/api/flashcards/check-duplicate', {
        body: {
          question: 'What is authentication?',
        },
        session: null,
      })

      expect(response.status).toBe(401)

      const data = response.data as { error: string }
      expect(data).toHaveProperty('error')
      expect(data.error.toLowerCase()).toMatch(/unauthorized|authentication/i)
    })
  })

  describe('Response Time Requirements', () => {
    it('should respond within 500ms (p95 requirement)', async () => {
      const startTime = Date.now()

      await testPOST(checkDuplicateRoute.POST, '/api/flashcards/check-duplicate', {
        body: {
          question: 'What is the meaning of life, universe, and everything?',
        },
        session: mockSession,
      })

      const duration = Date.now() - startTime

      // Note: This is a soft requirement and may fail in slow CI environments
      // Allow up to 1000ms in tests to account for overhead
      expect(duration).toBeLessThan(1000)
    })
  })

  describe('User Scoping', () => {
    it("should only search within authenticated user's flashcards", async () => {
      // This is implicitly tested by the implementation
      // The API should never return flashcards from other users
      // Full verification is done in integration tests

      const response = await testPOST(checkDuplicateRoute.POST, '/api/flashcards/check-duplicate', {
        body: {
          question: 'What is TypeScript?',
        },
        session: mockSession,
      })

      expect(response.status).toBe(200)

      const data = response.data as DuplicateCheckResult

      // If there are similar items, they should not have userId exposed
      // (API contract only returns id, score, displayText, type)
      data.similarItems.forEach((item) => {
        expect(item).not.toHaveProperty('userId')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long questions gracefully', async () => {
      const longQuestion = 'A'.repeat(1000)

      const response = await testPOST(checkDuplicateRoute.POST, '/api/flashcards/check-duplicate', {
        body: {
          question: longQuestion,
        },
        session: mockSession,
      })

      expect(response.status).toBe(200)

      const data = response.data as DuplicateCheckResult
      expect(data).toHaveProperty('isDuplicate')
    })

    it('should handle special characters in question', async () => {
      const response = await testPOST(checkDuplicateRoute.POST, '/api/flashcards/check-duplicate', {
        body: {
          question: 'What is <script>alert("XSS")</script> in security?',
        },
        session: mockSession,
      })

      expect(response.status).toBe(200)

      const data = response.data as DuplicateCheckResult
      expect(data).toHaveProperty('isDuplicate')
    })

    it('should handle unicode characters', async () => {
      const response = await testPOST(checkDuplicateRoute.POST, '/api/flashcards/check-duplicate', {
        body: {
          question: "Qu'est-ce que la photosynthèse? 🌱💡",
        },
        session: mockSession,
      })

      expect(response.status).toBe(200)

      const data = response.data as DuplicateCheckResult
      expect(data).toHaveProperty('isDuplicate')
    })
  })
})
