import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { hashPassword } from '@/lib/auth/helpers'
import { createUser } from '@/lib/db/operations/users'
import { createGoal, getGoalCounts, archiveGoal } from '@/lib/db/operations/goals'
import { closeDbConnection } from '@/lib/db/client'
import { testPOST, type MockSession } from '@/tests/helpers/route-test-helper'
import { auth } from '@/auth'

/**
 * Contract Tests for Bulk Archive Goals API
 *
 * Tests the bulk archive endpoint per specs/021-custom-cards-archive/contracts/bulk-archive.md
 *
 * Verifies:
 * - POST /api/goals/archive accepts array of 1-6 goal IDs
 * - Archives multiple goals in one request
 * - Rejects when archive limit would be exceeded (422)
 * - Rejects goals not owned by user (403)
 * - Rejects already archived goals (409)
 * - Validates goalIds array (400)
 * - Returns 401 for unauthenticated request
 * - Returns updated goal counts after archiving
 *
 * Maps to User Story 2 (T018)
 */

// Mock auth module
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

// Import route handler AFTER mocking auth
const importRouteHandler = async () => {
  try {
    return await import('@/app/api/goals/archive/route')
  } catch (error) {
    // Route doesn't exist yet (TDD) - tests will fail gracefully
    return null
  }
}

describe('Bulk Archive Goals API Contract Tests', () => {
  let testUserId: string
  let otherUserId: string
  let mockSession: MockSession
  let routeHandler: Awaited<ReturnType<typeof importRouteHandler>>

  beforeAll(async () => {
    // Create test users
    const timestamp = Date.now()
    const passwordHash = await hashPassword('TestPass123!')

    const user = await createUser({
      email: `test-bulk-archive-${timestamp}@example.com`,
      passwordHash,
      name: 'Bulk Archive Test User',
    })
    testUserId = user.id

    const otherUser = await createUser({
      email: `test-bulk-archive-other-${timestamp}@example.com`,
      passwordHash,
      name: 'Other User',
    })
    otherUserId = otherUser.id

    // Create mock sessions
    mockSession = {
      user: {
        id: testUserId,
        email: user.email,
        name: user.name ?? undefined,
      },
    }

    // Try to import route handler
    routeHandler = await importRouteHandler()
  })

  beforeEach(() => {
    // Set up auth mock before each test
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession)
  })

  afterAll(async () => {
    await closeDbConnection()
    vi.clearAllMocks()
  })

  describe('POST /api/goals/archive', () => {
    it('should archive multiple goals in one request (200)', async () => {
      if (!routeHandler?.POST) {
        throw new Error('Route handler not implemented yet')
      }

      // Create 3 test goals
      const goal1 = await createGoal({
        userId: testUserId,
        title: 'Goal to Archive 1',
      })
      const goal2 = await createGoal({
        userId: testUserId,
        title: 'Goal to Archive 2',
      })
      const goal3 = await createGoal({
        userId: testUserId,
        title: 'Goal to Archive 3',
      })

      const response = await testPOST(routeHandler.POST, '/api/goals/archive', {
        body: {
          goalIds: [goal1.id, goal2.id, goal3.id],
        },
        session: mockSession,
      })

      expect(response.status).toBe(200)

      const data = response.data as {
        archived: number
        goals: Array<{ id: string; title: string; archivedAt: string }>
        limits: { active: number; archived: number; total: number }
      }

      expect(data.archived).toBe(3)
      expect(data.goals).toHaveLength(3)
      expect(data.goals.map((g) => g.id)).toContain(goal1.id)
      expect(data.goals.map((g) => g.id)).toContain(goal2.id)
      expect(data.goals.map((g) => g.id)).toContain(goal3.id)
      data.goals.forEach((g) => {
        expect(g.archivedAt).toBeDefined()
      })
      expect(data.limits).toHaveProperty('active')
      expect(data.limits).toHaveProperty('archived')
      expect(data.limits).toHaveProperty('total')
    })

    it('should archive a single goal (200)', async () => {
      if (!routeHandler?.POST) {
        throw new Error('Route handler not implemented yet')
      }

      const goal = await createGoal({
        userId: testUserId,
        title: 'Single Goal to Archive',
      })

      const response = await testPOST(routeHandler.POST, '/api/goals/archive', {
        body: {
          goalIds: [goal.id],
        },
        session: mockSession,
      })

      expect(response.status).toBe(200)

      const data = response.data as {
        archived: number
        goals: Array<{ id: string; title: string; archivedAt: string }>
      }

      expect(data.archived).toBe(1)
      expect(data.goals[0].id).toBe(goal.id)
    })

    it('should reject when archive limit would be exceeded (422)', async () => {
      if (!routeHandler?.POST) {
        throw new Error('Route handler not implemented yet')
      }

      // Create a fresh user for this test
      const timestamp = Date.now()
      const passwordHash = await hashPassword('TestPass123!')
      const limitUser = await createUser({
        email: `test-limit-archive-${timestamp}@example.com`,
        passwordHash,
        name: 'Limit Archive User',
      })

      const limitSession: MockSession = {
        user: {
          id: limitUser.id,
          email: limitUser.email,
          name: limitUser.name ?? undefined,
        },
      }

      // Create and archive 5 goals (near limit)
      for (let i = 0; i < 5; i++) {
        const goal = await createGoal({
          userId: limitUser.id,
          title: `Archived Goal ${i + 1}`,
        })
        await archiveGoal(goal.id)
      }

      // Create 2 more active goals to try to archive (would exceed limit)
      const goal1 = await createGoal({
        userId: limitUser.id,
        title: 'Goal to Archive 1',
      })
      const goal2 = await createGoal({
        userId: limitUser.id,
        title: 'Goal to Archive 2',
      })

      // Verify current state
      const counts = await getGoalCounts(limitUser.id)
      expect(counts.archived).toBe(5)

      // Try to archive 2 more (would exceed limit of 6)
      ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(limitSession)

      const response = await testPOST(routeHandler.POST, '/api/goals/archive', {
        body: {
          goalIds: [goal1.id, goal2.id],
        },
        session: limitSession,
      })

      expect(response.status).toBe(422)

      const data = response.data as {
        error: string
        code: string
        limits: { active: number; archived: number; total: number }
        requested: number
        available: number
      }

      expect(data.error.toLowerCase()).toContain('maximum')
      expect(data.code).toBe('ARCHIVE_LIMIT_EXCEEDED')
      expect(data.limits.archived).toBe(5)
      expect(data.requested).toBe(2)
      expect(data.available).toBe(1)
    })

    it('should reject goals not owned by user (403)', async () => {
      if (!routeHandler?.POST) {
        throw new Error('Route handler not implemented yet')
      }

      // Create a goal owned by another user
      const otherGoal = await createGoal({
        userId: otherUserId,
        title: 'Other User Goal',
      })

      const response = await testPOST(routeHandler.POST, '/api/goals/archive', {
        body: {
          goalIds: [otherGoal.id],
        },
        session: mockSession,
      })

      expect(response.status).toBe(403)

      const data = response.data as { error: string }
      expect(data.error.toLowerCase()).toContain('permission')
    })

    it('should reject already archived goals (409)', async () => {
      if (!routeHandler?.POST) {
        throw new Error('Route handler not implemented yet')
      }

      // Create and archive a goal
      const goal = await createGoal({
        userId: testUserId,
        title: 'Already Archived Goal',
      })
      await archiveGoal(goal.id)

      const response = await testPOST(routeHandler.POST, '/api/goals/archive', {
        body: {
          goalIds: [goal.id],
        },
        session: mockSession,
      })

      expect(response.status).toBe(409)

      const data = response.data as { error: string; alreadyArchived: string[] }
      expect(data.error.toLowerCase()).toContain('already archived')
      expect(data.alreadyArchived).toContain(goal.id)
    })

    it('should reject non-existent goals (404)', async () => {
      if (!routeHandler?.POST) {
        throw new Error('Route handler not implemented yet')
      }

      const fakeGoalId = '00000000-0000-0000-0000-000000000000'

      const response = await testPOST(routeHandler.POST, '/api/goals/archive', {
        body: {
          goalIds: [fakeGoalId],
        },
        session: mockSession,
      })

      expect(response.status).toBe(404)

      const data = response.data as { error: string; notFound: string[] }
      expect(data.error.toLowerCase()).toContain('not found')
    })

    it('should validate goalIds array - empty (400)', async () => {
      if (!routeHandler?.POST) {
        throw new Error('Route handler not implemented yet')
      }

      const response = await testPOST(routeHandler.POST, '/api/goals/archive', {
        body: {
          goalIds: [],
        },
        session: mockSession,
      })

      expect(response.status).toBe(400)

      const data = response.data as { error: string }
      expect(data.error.toLowerCase()).toContain('validation')
    })

    it('should validate goalIds array - too many (400)', async () => {
      if (!routeHandler?.POST) {
        throw new Error('Route handler not implemented yet')
      }

      // Create 7 goals (max is 6)
      const goals = []
      for (let i = 0; i < 7; i++) {
        const goal = await createGoal({
          userId: testUserId,
          title: `Goal ${i + 1}`,
        })
        goals.push(goal.id)
      }

      const response = await testPOST(routeHandler.POST, '/api/goals/archive', {
        body: {
          goalIds: goals,
        },
        session: mockSession,
      })

      expect(response.status).toBe(400)

      const data = response.data as { error: string }
      expect(data.error.toLowerCase()).toContain('validation')
    })

    it('should validate goalIds format - invalid UUID (400)', async () => {
      if (!routeHandler?.POST) {
        throw new Error('Route handler not implemented yet')
      }

      const response = await testPOST(routeHandler.POST, '/api/goals/archive', {
        body: {
          goalIds: ['not-a-valid-uuid'],
        },
        session: mockSession,
      })

      expect(response.status).toBe(400)

      const data = response.data as { error: string }
      expect(data.error.toLowerCase()).toContain('validation')
    })

    it('should return 401 for unauthenticated request', async () => {
      if (!routeHandler?.POST) {
        throw new Error('Route handler not implemented yet')
      }

      // Mock no session
      ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const goal = await createGoal({
        userId: testUserId,
        title: 'Goal for Unauth Test',
      })

      const response = await testPOST(routeHandler.POST, '/api/goals/archive', {
        body: {
          goalIds: [goal.id],
        },
        session: null,
      })

      expect(response.status).toBe(401)

      const data = response.data as { error: string }
      expect(data.error.toLowerCase()).toContain('unauthorized')
    })

    it('should return updated goal counts after archiving', async () => {
      if (!routeHandler?.POST) {
        throw new Error('Route handler not implemented yet')
      }

      // Create a fresh user for this test
      const timestamp = Date.now()
      const passwordHash = await hashPassword('TestPass123!')
      const countUser = await createUser({
        email: `test-count-archive-${timestamp}@example.com`,
        passwordHash,
        name: 'Count Archive User',
      })

      const countSession: MockSession = {
        user: {
          id: countUser.id,
          email: countUser.email,
          name: countUser.name ?? undefined,
        },
      }

      // Create 3 active goals
      const goal1 = await createGoal({
        userId: countUser.id,
        title: 'Active 1',
      })
      await createGoal({
        userId: countUser.id,
        title: 'Active 2',
      })
      await createGoal({
        userId: countUser.id,
        title: 'Active 3',
      })

      // Verify initial counts
      const countsBefore = await getGoalCounts(countUser.id)
      expect(countsBefore.active).toBe(3)
      expect(countsBefore.archived).toBe(0)
      expect(countsBefore.total).toBe(3)

      // Archive one goal
      ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(countSession)

      const response = await testPOST(routeHandler.POST, '/api/goals/archive', {
        body: {
          goalIds: [goal1.id],
        },
        session: countSession,
      })

      expect(response.status).toBe(200)

      const data = response.data as {
        archived: number
        limits: { active: number; archived: number; total: number }
      }

      // Verify counts in response
      expect(data.limits.active).toBe(2) // Decremented by 1
      expect(data.limits.archived).toBe(1) // Incremented by 1
      expect(data.limits.total).toBe(3) // Unchanged

      // Verify counts in database
      const countsAfter = await getGoalCounts(countUser.id)
      expect(countsAfter.active).toBe(2)
      expect(countsAfter.archived).toBe(1)
      expect(countsAfter.total).toBe(3)
    })

    it('should archive maximum 6 goals at once', async () => {
      if (!routeHandler?.POST) {
        throw new Error('Route handler not implemented yet')
      }

      // Create a fresh user
      const timestamp = Date.now()
      const passwordHash = await hashPassword('TestPass123!')
      const maxUser = await createUser({
        email: `test-max-archive-${timestamp}@example.com`,
        passwordHash,
        name: 'Max Archive User',
      })

      const maxSession: MockSession = {
        user: {
          id: maxUser.id,
          email: maxUser.email,
          name: maxUser.name ?? undefined,
        },
      }

      // Create 6 goals
      const goals = []
      for (let i = 0; i < 6; i++) {
        const goal = await createGoal({
          userId: maxUser.id,
          title: `Goal ${i + 1}`,
        })
        goals.push(goal.id)
      }

      ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(maxSession)

      const response = await testPOST(routeHandler.POST, '/api/goals/archive', {
        body: {
          goalIds: goals,
        },
        session: maxSession,
      })

      expect(response.status).toBe(200)

      const data = response.data as {
        archived: number
        limits: { active: number; archived: number; total: number }
      }

      expect(data.archived).toBe(6)
      expect(data.limits.archived).toBe(6)
      expect(data.limits.active).toBe(0)
    })
  })
})
