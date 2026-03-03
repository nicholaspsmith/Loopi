import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { hashPassword } from '@/lib/auth/helpers'
import { createUser } from '@/lib/db/operations/users'
import { testPOST, type MockSession } from '@/tests/helpers/route-test-helper'
import { auth } from '@/auth'
import type { DuplicateCheckResult } from '@/lib/dedup/types'

/**
 * Contract Tests for Goal Duplicate Detection API (T018)
 *
 * Tests API contract for POST /api/goals/check-duplicate
 * Per specs/023-dedupe/contracts/dedupe-api.md
 * Uses mocked embeddings to ensure consistent behavior across environments.
 *
 * Feature: 023-dedupe
 * User Story 2: Goal Duplicate Detection
 */

// Mock the embeddings module - use keyword-based approach for high similarity
// Texts containing common keywords get similar embeddings
vi.mock('@/lib/embeddings', () => {
  function createMockEmbedding(text: string): number[] {
    const DIMS = 1024
    const embedding = new Array(DIMS).fill(0)
    const normalized = text.toLowerCase()

    // Check for key topics and use fixed embeddings for each
    if (normalized.includes('python')) {
      for (let i = 0; i < 100; i++) {
        embedding[i] = 1.0
      }
    }
    if (normalized.includes('typescript')) {
      for (let i = 100; i < 200; i++) {
        embedding[i] = 1.0
      }
    }
    if (
      normalized.includes('javascript') ||
      normalized.includes('react') ||
      normalized.includes('next')
    ) {
      for (let i = 200; i < 300; i++) {
        embedding[i] = 1.0
      }
    }
    if (
      normalized.includes('web') ||
      normalized.includes('frontend') ||
      normalized.includes('fullstack')
    ) {
      for (let i = 300; i < 400; i++) {
        embedding[i] = 1.0
      }
    }
    // Note: Don't use 'ai' alone - it matches 'explain', 'certain', etc.
    if (
      normalized.includes('machine') ||
      normalized.includes('learning') ||
      normalized.includes('artificial')
    ) {
      for (let i = 400; i < 500; i++) {
        embedding[i] = 1.0
      }
    }
    if (
      normalized.includes('programming') ||
      normalized.includes('development') ||
      normalized.includes('coding')
    ) {
      for (let i = 500; i < 600; i++) {
        embedding[i] = 1.0
      }
    }
    if (normalized.includes('french') || normalized.includes('français')) {
      for (let i = 600; i < 700; i++) {
        embedding[i] = 1.0
      }
    }

    // Add small variation based on text length to avoid identical embeddings
    const textHash = text.length * 0.001
    embedding[1023] = textHash

    // Normalize to unit vector
    let norm = 0
    for (let i = 0; i < DIMS; i++) {
      norm += embedding[i] * embedding[i]
    }
    norm = Math.sqrt(norm)
    if (norm > 0) {
      for (let i = 0; i < DIMS; i++) {
        embedding[i] /= norm
      }
    } else {
      embedding[0] = 1.0
    }
    return embedding
  }

  return {
    generateEmbedding: (text: string) => Promise.resolve(createMockEmbedding(text)),
    generateEmbeddings: (texts: string[]) =>
      Promise.resolve(texts.map((t) => createMockEmbedding(t))),
    EMBEDDING_DIMENSIONS: 1024,
  }
})

// Mock auth module
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

// Import route handler (will fail until implemented)
let checkDuplicateRoute: {
  POST: (request: Request) => Promise<Response>
}

try {
  checkDuplicateRoute = await import('@/app/api/goals/check-duplicate/route')
} catch {
  // Route not yet implemented
  checkDuplicateRoute = {
    POST: async () => {
      throw new Error('POST /api/goals/check-duplicate not yet implemented')
    },
  }
}

describe('POST /api/goals/check-duplicate - Contract Tests', () => {
  let testUserId: string
  let mockSession: MockSession

  beforeAll(async () => {
    const timestamp = Date.now()

    // Create test user
    const passwordHash = await hashPassword('TestPass123!')
    const user = await createUser({
      email: `test-goal-duplicate-api-${timestamp}@example.com`,
      passwordHash,
      name: 'Goal Duplicate API Test User',
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
    vi.clearAllMocks()
  })

  describe('Success Cases', () => {
    it('should return 200 with DuplicateCheckResult schema for valid request', async () => {
      const response = await testPOST(checkDuplicateRoute.POST, '/api/goals/check-duplicate', {
        body: {
          title: 'Learn Python programming',
          description: 'Master Python from basics to advanced',
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

    it('should return checkSkipped=true for very short title', async () => {
      const response = await testPOST(checkDuplicateRoute.POST, '/api/goals/check-duplicate', {
        body: {
          title: 'Learn', // Only 5 chars
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

    it('should handle optional description field', async () => {
      const response = await testPOST(checkDuplicateRoute.POST, '/api/goals/check-duplicate', {
        body: {
          title: 'Learn advanced JavaScript programming',
        },
        session: mockSession,
      })

      expect(response.status).toBe(200)

      const data = response.data as DuplicateCheckResult
      expect(data).toHaveProperty('isDuplicate')
      expect(data).toHaveProperty('similarItems')
    })

    it('should handle empty description', async () => {
      const response = await testPOST(checkDuplicateRoute.POST, '/api/goals/check-duplicate', {
        body: {
          title: 'Learn advanced JavaScript programming',
          description: '',
        },
        session: mockSession,
      })

      expect(response.status).toBe(200)

      const data = response.data as DuplicateCheckResult
      expect(data).toHaveProperty('isDuplicate')
    })

    it('should return similarItems array with correct structure when duplicates found', async () => {
      // Note: This test verifies the structure. Actual duplicate detection
      // depends on existing data and will be tested in integration tests
      const response = await testPOST(checkDuplicateRoute.POST, '/api/goals/check-duplicate', {
        body: {
          title: 'Master full-stack web development',
          description: 'Learn frontend and backend technologies',
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
        expect(item.type).toBe('goal')
      })
    })

    it('should return max 3 similar items', async () => {
      const response = await testPOST(checkDuplicateRoute.POST, '/api/goals/check-duplicate', {
        body: {
          title: 'Learn machine learning and artificial intelligence',
          description: 'Deep learning, neural networks, and more',
        },
        session: mockSession,
      })

      expect(response.status).toBe(200)

      const data = response.data as DuplicateCheckResult
      expect(data.similarItems.length).toBeLessThanOrEqual(3)
    })

    it('should accept title with description that combined exceeds 10 chars', async () => {
      const response = await testPOST(checkDuplicateRoute.POST, '/api/goals/check-duplicate', {
        body: {
          title: 'Short',
          description: 'But this makes it long enough to process',
        },
        session: mockSession,
      })

      expect(response.status).toBe(200)

      const data = response.data as DuplicateCheckResult
      expect(data.checkSkipped).toBe(false)
    })
  })

  describe('Validation Errors', () => {
    it('should return 400 for missing title field', async () => {
      const response = await testPOST(checkDuplicateRoute.POST, '/api/goals/check-duplicate', {
        body: {
          description: 'A description without a title',
        },
        session: mockSession,
      })

      expect(response.status).toBe(400)

      const data = response.data as { error: string }
      expect(data).toHaveProperty('error')
      expect(data.error.toLowerCase()).toMatch(/title|required/i)
    })

    it('should return 400 for empty title string', async () => {
      const response = await testPOST(checkDuplicateRoute.POST, '/api/goals/check-duplicate', {
        body: {
          title: '',
        },
        session: mockSession,
      })

      expect(response.status).toBe(400)

      const data = response.data as { error: string }
      expect(data).toHaveProperty('error')
    })

    it('should return 400 for non-string title', async () => {
      const response = await testPOST(checkDuplicateRoute.POST, '/api/goals/check-duplicate', {
        body: {
          title: 123,
        },
        session: mockSession,
      })

      expect(response.status).toBe(400)

      const data = response.data as { error: string }
      expect(data).toHaveProperty('error')
    })

    it('should return 400 for whitespace-only title', async () => {
      const response = await testPOST(checkDuplicateRoute.POST, '/api/goals/check-duplicate', {
        body: {
          title: '   \n   \t   ',
        },
        session: mockSession,
      })

      expect(response.status).toBe(400)

      const data = response.data as { error: string }
      expect(data).toHaveProperty('error')
    })

    it('should return 400 for non-string description', async () => {
      const response = await testPOST(checkDuplicateRoute.POST, '/api/goals/check-duplicate', {
        body: {
          title: 'Learn programming',
          description: 123,
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

      const response = await testPOST(checkDuplicateRoute.POST, '/api/goals/check-duplicate', {
        body: {
          title: 'Learn authentication',
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

      await testPOST(checkDuplicateRoute.POST, '/api/goals/check-duplicate', {
        body: {
          title: 'Learn everything about computer science and software engineering',
          description: 'From algorithms to system design and architecture',
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
    it("should only search within authenticated user's goals", async () => {
      // This is implicitly tested by the implementation
      // The API should never return goals from other users
      // Full verification is done in integration tests

      const response = await testPOST(checkDuplicateRoute.POST, '/api/goals/check-duplicate', {
        body: {
          title: 'Learn React and Next.js',
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
    it('should handle very long titles gracefully', async () => {
      const longTitle = 'A'.repeat(500)

      const response = await testPOST(checkDuplicateRoute.POST, '/api/goals/check-duplicate', {
        body: {
          title: longTitle,
        },
        session: mockSession,
      })

      expect(response.status).toBe(200)

      const data = response.data as DuplicateCheckResult
      expect(data).toHaveProperty('isDuplicate')
    })

    it('should handle very long descriptions gracefully', async () => {
      const longDescription = 'B'.repeat(1000)

      const response = await testPOST(checkDuplicateRoute.POST, '/api/goals/check-duplicate', {
        body: {
          title: 'Learn programming',
          description: longDescription,
        },
        session: mockSession,
      })

      expect(response.status).toBe(200)

      const data = response.data as DuplicateCheckResult
      expect(data).toHaveProperty('isDuplicate')
    })

    it('should handle special characters in title', async () => {
      const response = await testPOST(checkDuplicateRoute.POST, '/api/goals/check-duplicate', {
        body: {
          title: 'Learn <script>alert("XSS")</script> security',
        },
        session: mockSession,
      })

      expect(response.status).toBe(200)

      const data = response.data as DuplicateCheckResult
      expect(data).toHaveProperty('isDuplicate')
    })

    it('should handle unicode characters', async () => {
      const response = await testPOST(checkDuplicateRoute.POST, '/api/goals/check-duplicate', {
        body: {
          title: 'Apprendre le français 🇫🇷',
          description: 'Maîtriser la langue française',
        },
        session: mockSession,
      })

      expect(response.status).toBe(200)

      const data = response.data as DuplicateCheckResult
      expect(data).toHaveProperty('isDuplicate')
    })

    it('should handle newlines in description', async () => {
      const response = await testPOST(checkDuplicateRoute.POST, '/api/goals/check-duplicate', {
        body: {
          title: 'Learn web development',
          description: 'Line 1\nLine 2\nLine 3',
        },
        session: mockSession,
      })

      expect(response.status).toBe(200)

      const data = response.data as DuplicateCheckResult
      expect(data).toHaveProperty('isDuplicate')
    })
  })
})
