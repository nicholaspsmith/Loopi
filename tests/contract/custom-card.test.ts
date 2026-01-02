import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { hashPassword } from '@/lib/auth/helpers'
import { createUser } from '@/lib/db/operations/users'
import { createGoal } from '@/lib/db/operations/goals'
import { createSkillTree } from '@/lib/db/operations/skill-trees'
import { createSkillNode } from '@/lib/db/operations/skill-nodes'
import { getSkillNodeById } from '@/lib/db/operations/skill-nodes'
import { closeDbConnection } from '@/lib/db/client'
import * as customCardRoute from '@/app/api/flashcards/custom/route'
import { testPOST, type MockSession } from '@/tests/helpers/route-test-helper'
import { auth } from '@/auth'
import type { Flashcard } from '@/lib/db/drizzle-schema'

/**
 * Contract Tests for Custom Card Creation API
 *
 * Tests API contracts for custom flashcard creation per
 * specs/021-custom-cards-archive/contracts/custom-cards.md
 *
 * Endpoint: POST /api/flashcards/custom
 *
 * Test scenarios (TDD - will FAIL until implementation):
 * 1. Creates a card linked to the specified node
 * 2. Rejects cards for nodes not owned by user (403)
 * 3. Rejects non-existent node (404)
 * 4. Validates question length (5-1000 chars)
 * 5. Validates answer length (5-5000 chars)
 * 6. Initializes card with New FSRS state (state: 0)
 * 7. Increments node cardCount
 */

// Mock auth module
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

describe('Custom Card Creation API Contract Tests', () => {
  let testUserId: string
  let otherUserId: string
  let testGoalId: string
  let otherGoalId: string
  let testTreeId: string
  let testNodeId: string
  let mockSession: MockSession
  let otherMockSession: MockSession

  beforeAll(async () => {
    const timestamp = Date.now()

    // Create test user 1
    const passwordHash = await hashPassword('TestPass123!')
    const user = await createUser({
      email: `test-custom-cards-${timestamp}@example.com`,
      passwordHash,
      name: 'Custom Card Test User',
    })
    testUserId = user.id

    mockSession = {
      user: {
        id: testUserId,
        email: user.email,
        name: user.name ?? undefined,
      },
    }

    // Create test goal and skill tree for user 1
    const goal = await createGoal({
      userId: testUserId,
      title: 'Test Learning Goal',
      description: 'Goal for custom card tests',
    })
    testGoalId = goal.id

    const tree = await createSkillTree({
      goalId: testGoalId,
    })
    testTreeId = tree.id

    // Create test node for user 1
    const node = await createSkillNode({
      treeId: testTreeId,
      parentId: null,
      title: 'Test Node',
      description: 'Node for custom card tests',
      depth: 0,
      path: '1',
      sortOrder: 0,
    })
    testNodeId = node.id

    // Create test user 2 (for permission tests)
    const otherUser = await createUser({
      email: `test-custom-cards-other-${timestamp}@example.com`,
      passwordHash,
      name: 'Other Test User',
    })
    otherUserId = otherUser.id

    otherMockSession = {
      user: {
        id: otherUserId,
        email: otherUser.email,
        name: otherUser.name ?? undefined,
      },
    }

    // Create goal, tree, and node for user 2
    const otherGoal = await createGoal({
      userId: otherUserId,
      title: 'Other User Goal',
      description: 'Goal owned by other user',
    })
    otherGoalId = otherGoal.id

    // Create tree for other user (needed for goal relationship)
    await createSkillTree({
      goalId: otherGoalId,
    })
  })

  beforeEach(() => {
    // Set up auth mock before each test (default to testUser)
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession)
  })

  afterAll(async () => {
    await closeDbConnection()
    vi.clearAllMocks()
  })

  describe('POST /api/flashcards/custom', () => {
    it('should create a card linked to the specified node (201)', async () => {
      const response = await testPOST(customCardRoute.POST, '/api/flashcards/custom', {
        body: {
          nodeId: testNodeId,
          question: 'What is the purpose of a constructor?',
          answer: 'A constructor is a special method that initializes a new object instance.',
        },
        session: mockSession,
      })

      expect(response.status).toBe(201)

      const data = response.data as Flashcard
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('userId', testUserId)
      expect(data).toHaveProperty('skillNodeId', testNodeId)
      expect(data).toHaveProperty('question', 'What is the purpose of a constructor?')
      expect(data).toHaveProperty(
        'answer',
        'A constructor is a special method that initializes a new object instance.'
      )
      expect(data).toHaveProperty('cardType', 'flashcard')
      expect(data).toHaveProperty('createdAt')
    })

    it('should initialize card with New FSRS state (state: 0)', async () => {
      const response = await testPOST(customCardRoute.POST, '/api/flashcards/custom', {
        body: {
          nodeId: testNodeId,
          question: 'What is encapsulation in OOP?',
          answer: 'Encapsulation is the bundling of data and methods that operate on that data.',
        },
        session: mockSession,
      })

      expect(response.status).toBe(201)

      const data = response.data as Flashcard
      expect(data).toHaveProperty('fsrsState')
      expect(data.fsrsState).toHaveProperty('state', 0) // New state
      expect(data.fsrsState).toHaveProperty('due')
      expect(data.fsrsState).toHaveProperty('stability', 0)
      expect(data.fsrsState).toHaveProperty('difficulty', 0)
      expect(data.fsrsState).toHaveProperty('elapsedDays', 0)
      expect(data.fsrsState).toHaveProperty('scheduledDays', 0)
      expect(data.fsrsState).toHaveProperty('reps', 0)
      expect(data.fsrsState).toHaveProperty('lapses', 0)
    })

    it('should increment node cardCount', async () => {
      // Get initial card count
      const nodeBefore = await getSkillNodeById(testNodeId)
      const initialCount = nodeBefore?.cardCount ?? 0

      const response = await testPOST(customCardRoute.POST, '/api/flashcards/custom', {
        body: {
          nodeId: testNodeId,
          question: 'What is polymorphism?',
          answer: 'Polymorphism allows objects of different types to be treated as the same type.',
        },
        session: mockSession,
      })

      expect(response.status).toBe(201)

      // Get updated card count
      const nodeAfter = await getSkillNodeById(testNodeId)
      expect(nodeAfter?.cardCount).toBe(initialCount + 1)
    })

    it('should reject cards for nodes not owned by user (403)', async () => {
      // Use otherMockSession to try to create card on testUser's node
      ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(otherMockSession)

      const response = await testPOST(customCardRoute.POST, '/api/flashcards/custom', {
        body: {
          nodeId: testNodeId, // This node belongs to testUser, not otherUser
          question: 'What is inheritance?',
          answer:
            'Inheritance allows a class to inherit properties and methods from another class.',
        },
        session: otherMockSession,
      })

      expect(response.status).toBe(403)

      const data = response.data as { error: string }
      expect(data).toHaveProperty('error')
      expect(data.error.toLowerCase()).toContain('permission')
    })

    it('should reject non-existent node (404)', async () => {
      const response = await testPOST(customCardRoute.POST, '/api/flashcards/custom', {
        body: {
          nodeId: '00000000-0000-0000-0000-000000000000',
          question: 'What is abstraction?',
          answer: 'Abstraction hides complex implementation details.',
        },
        session: mockSession,
      })

      expect(response.status).toBe(404)

      const data = response.data as { error: string }
      expect(data).toHaveProperty('error')
      expect(data.error.toLowerCase()).toContain('not found')
    })

    it('should validate question length - too short (400)', async () => {
      const response = await testPOST(customCardRoute.POST, '/api/flashcards/custom', {
        body: {
          nodeId: testNodeId,
          question: 'Why?', // Only 4 chars, needs 5+
          answer: 'This is a valid answer with enough characters.',
        },
        session: mockSession,
      })

      expect(response.status).toBe(400)

      const data = response.data as { error: string; details?: unknown }
      expect(data).toHaveProperty('error')
      expect(data.error.toLowerCase()).toContain('validation')
    })

    it('should validate question length - too long (400)', async () => {
      const response = await testPOST(customCardRoute.POST, '/api/flashcards/custom', {
        body: {
          nodeId: testNodeId,
          question: 'A'.repeat(1001), // Exceeds 1000 char limit
          answer: 'This is a valid answer.',
        },
        session: mockSession,
      })

      expect(response.status).toBe(400)

      const data = response.data as { error: string; details?: unknown }
      expect(data).toHaveProperty('error')
      expect(data.error.toLowerCase()).toContain('validation')
    })

    it('should validate answer length - too short (400)', async () => {
      const response = await testPOST(customCardRoute.POST, '/api/flashcards/custom', {
        body: {
          nodeId: testNodeId,
          question: 'What is the answer to this question?',
          answer: 'Yes', // Only 3 chars, needs 5+
        },
        session: mockSession,
      })

      expect(response.status).toBe(400)

      const data = response.data as { error: string; details?: unknown }
      expect(data).toHaveProperty('error')
      expect(data.error.toLowerCase()).toContain('validation')
    })

    it('should validate answer length - too long (400)', async () => {
      const response = await testPOST(customCardRoute.POST, '/api/flashcards/custom', {
        body: {
          nodeId: testNodeId,
          question: 'What is a very long answer?',
          answer: 'A'.repeat(5001), // Exceeds 5000 char limit
        },
        session: mockSession,
      })

      expect(response.status).toBe(400)

      const data = response.data as { error: string; details?: unknown }
      expect(data).toHaveProperty('error')
      expect(data.error.toLowerCase()).toContain('validation')
    })

    it('should reject invalid node ID format (400)', async () => {
      const response = await testPOST(customCardRoute.POST, '/api/flashcards/custom', {
        body: {
          nodeId: 'not-a-valid-uuid',
          question: 'What is the answer?',
          answer: 'This is the answer.',
        },
        session: mockSession,
      })

      expect(response.status).toBe(400)

      const data = response.data as { error: string; details?: unknown }
      expect(data).toHaveProperty('error')
      expect(data.error.toLowerCase()).toContain('validation')
    })

    it('should accept question at minimum length (5 chars)', async () => {
      const response = await testPOST(customCardRoute.POST, '/api/flashcards/custom', {
        body: {
          nodeId: testNodeId,
          question: 'Why??', // Exactly 5 chars
          answer: 'Because this is the answer.',
        },
        session: mockSession,
      })

      expect(response.status).toBe(201)
    })

    it('should accept question at maximum length (1000 chars)', async () => {
      const response = await testPOST(customCardRoute.POST, '/api/flashcards/custom', {
        body: {
          nodeId: testNodeId,
          question: 'A'.repeat(1000), // Exactly 1000 chars
          answer: 'This is the answer.',
        },
        session: mockSession,
      })

      expect(response.status).toBe(201)
    })

    it('should accept answer at minimum length (5 chars)', async () => {
      const response = await testPOST(customCardRoute.POST, '/api/flashcards/custom', {
        body: {
          nodeId: testNodeId,
          question: 'What is the shortest answer?',
          answer: 'Short', // Exactly 5 chars
        },
        session: mockSession,
      })

      expect(response.status).toBe(201)
    })

    it('should accept answer at maximum length (5000 chars)', async () => {
      const response = await testPOST(customCardRoute.POST, '/api/flashcards/custom', {
        body: {
          nodeId: testNodeId,
          question: 'What is the longest answer?',
          answer: 'A'.repeat(5000), // Exactly 5000 chars
        },
        session: mockSession,
      })

      expect(response.status).toBe(201)
    })

    it('should return 401 for unauthenticated request', async () => {
      // Mock no session
      ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const response = await testPOST(customCardRoute.POST, '/api/flashcards/custom', {
        body: {
          nodeId: testNodeId,
          question: 'What is authentication?',
          answer: 'Authentication verifies user identity.',
        },
        session: null,
      })

      expect(response.status).toBe(401)

      const data = response.data as { error: string }
      expect(data).toHaveProperty('error')
      expect(data.error.toLowerCase()).toContain('unauthorized')
    })
  })
})
