import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { hashPassword } from '@/lib/auth/helpers'
import { createUser } from '@/lib/db/operations/users'
import { createGoal, archiveGoal, getGoalCounts } from '@/lib/db/operations/goals'
import { closeDbConnection } from '@/lib/db/client'
import { GOAL_LIMITS } from '@/lib/constants/goals'
import { testPOST, type MockSession } from '@/tests/helpers/route-test-helper'
import { auth } from '@/auth'
import type { LearningGoal } from '@/lib/db/drizzle-schema'

/**
 * Contract Tests for Goal Restore API
 *
 * Tests the restore endpoint per specs/021-custom-cards-archive/contracts/restore.md
 *
 * Verifies:
 * - POST /api/goals/restore restores an archived goal to active status
 * - Rejects when at active goal limit (422)
 * - Rejects goals not owned by user (403)
 * - Rejects non-archived goals (409)
 * - Rejects non-existent goals (404)
 * - Validates goalId format (400)
 * - Returns 401 for unauthenticated request
 * - Returns updated goal counts after restore
 *
 * Maps to User Story 2 (T020)
 */

// Mock auth module
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

// Import route handler AFTER mocking auth
const importRouteHandler = async () => {
  try {
    return await import('@/app/api/goals/restore/route')
  } catch (error) {
    // Route doesn't exist yet (TDD) - tests will fail gracefully
    return null
  }
}

describe('Goal Restore API Contract Tests', () => {
  let testUserId: string
  let otherUserId: string
  let archivedGoalId: string
  let activeGoalId: string
  let otherGoalId: string
  let mockSession: MockSession
  let routeHandler: Awaited<ReturnType<typeof importRouteHandler>>

  beforeAll(async () => {
    // Create test users
    const timestamp = Date.now()
    const passwordHash = await hashPassword('TestPass123!')

    const user = await createUser({
      email: `test-restore-${timestamp}@example.com`,
      passwordHash,
      name: 'Restore Test User',
    })
    testUserId = user.id

    const otherUser = await createUser({
      email: `test-restore-other-${timestamp}@example.com`,
      passwordHash,
      name: 'Other Restore User',
    })
    otherUserId = otherUser.id

    // Create mock session
    mockSession = {
      user: {
        id: testUserId,
        email: user.email,
        name: user.name ?? undefined,
      },
    }

    // Create one archived goal for test user
    const archivedGoal = await createGoal({
      userId: testUserId,
      title: 'Goal to Restore',
      description: 'This goal will be archived and then restored',
    })
    archivedGoalId = archivedGoal.id
    await archiveGoal(archivedGoalId)

    // Create one active goal for test user
    const activeGoal = await createGoal({
      userId: testUserId,
      title: 'Active Goal',
      description: 'This goal is active',
    })
    activeGoalId = activeGoal.id

    // Create one archived goal for other user
    const otherGoal = await createGoal({
      userId: otherUserId,
      title: 'Other User Archived Goal',
      description: 'Archived goal owned by other user',
    })
    otherGoalId = otherGoal.id
    await archiveGoal(otherGoalId)

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

  describe('POST /api/goals/restore', () => {
    it('should restore an archived goal to active status (200)', async () => {
      if (!routeHandler?.POST) {
        throw new Error('Route handler not implemented yet')
      }

      // Create a fresh archived goal for this test
      const timestamp = Date.now()
      const passwordHash = await hashPassword('TestPass123!')
      const restoreUser = await createUser({
        email: `test-restore-success-${timestamp}@example.com`,
        passwordHash,
        name: 'Restore Success User',
      })

      const restoreSession: MockSession = {
        user: {
          id: restoreUser.id,
          email: restoreUser.email,
          name: restoreUser.name ?? undefined,
        },
      }

      const goalToRestore = await createGoal({
        userId: restoreUser.id,
        title: 'Goal to Restore',
      })
      await archiveGoal(goalToRestore.id)

      // Verify goal is archived before restore
      const countsBefore = await getGoalCounts(restoreUser.id)
      expect(countsBefore.archived).toBe(1)
      expect(countsBefore.active).toBe(0)
      ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(restoreSession)

      const response = await testPOST(routeHandler.POST, '/api/goals/restore', {
        body: {
          goalId: goalToRestore.id,
        },
        session: restoreSession,
      })

      expect(response.status).toBe(200)

      const data = response.data as {
        restored: boolean
        goal: Partial<LearningGoal>
        limits: { active: number; archived: number; total: number }
      }

      expect(data.restored).toBe(true)
      expect(data.goal).toHaveProperty('id', goalToRestore.id)
      expect(data.goal).toHaveProperty('status', 'active')
      expect(data.goal.archivedAt).toBeNull()
      expect(data.limits).toHaveProperty('active')
      expect(data.limits).toHaveProperty('archived')
      expect(data.limits).toHaveProperty('total')
    })

    it('should reject restore when at active goal limit (422)', async () => {
      if (!routeHandler?.POST) {
        throw new Error('Route handler not implemented yet')
      }

      // Create a user with 6 active goals and 1 archived goal
      const timestamp = Date.now()
      const passwordHash = await hashPassword('TestPass123!')
      const limitUser = await createUser({
        email: `test-limit-restore-${timestamp}@example.com`,
        passwordHash,
        name: 'Limit Restore User',
      })

      const limitSession: MockSession = {
        user: {
          id: limitUser.id,
          email: limitUser.email,
          name: limitUser.name ?? undefined,
        },
      }

      // Create 6 active goals
      for (let i = 0; i < GOAL_LIMITS.ACTIVE; i++) {
        await createGoal({
          userId: limitUser.id,
          title: `Active Goal ${i + 1}`,
        })
      }

      // Create 1 archived goal
      const goalToRestore = await createGoal({
        userId: limitUser.id,
        title: 'Goal to Restore',
      })
      await archiveGoal(goalToRestore.id)

      // Verify user has 6 active goals
      const counts = await getGoalCounts(limitUser.id)
      expect(counts.active).toBe(GOAL_LIMITS.ACTIVE)
      expect(counts.archived).toBe(1)

      // Try to restore
      ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(limitSession)

      const response = await testPOST(routeHandler.POST, '/api/goals/restore', {
        body: {
          goalId: goalToRestore.id,
        },
        session: limitSession,
      })

      expect(response.status).toBe(422)

      const data = response.data as {
        error: string
        code: string
        limits: { active: number; archived: number; total: number }
      }

      expect(data.error.toLowerCase()).toContain('maximum')
      expect(data.error.toLowerCase()).toContain('active')
      expect(data.code).toBe('ACTIVE_LIMIT_EXCEEDED')
      expect(data.limits.active).toBe(GOAL_LIMITS.ACTIVE)
    })

    it('should reject goals not owned by user (403)', async () => {
      if (!routeHandler?.POST) {
        throw new Error('Route handler not implemented yet')
      }

      // Try to restore another user's archived goal
      const response = await testPOST(routeHandler.POST, '/api/goals/restore', {
        body: {
          goalId: otherGoalId,
        },
        session: mockSession,
      })

      expect(response.status).toBe(403)

      const data = response.data as { error: string }
      expect(data.error.toLowerCase()).toContain('permission')
    })

    it('should reject non-archived goals (409)', async () => {
      if (!routeHandler?.POST) {
        throw new Error('Route handler not implemented yet')
      }

      const response = await testPOST(routeHandler.POST, '/api/goals/restore', {
        body: {
          goalId: activeGoalId,
        },
        session: mockSession,
      })

      expect(response.status).toBe(409)

      const data = response.data as { error: string }
      expect(data.error.toLowerCase()).toContain('not archived')
    })

    it('should reject non-existent goals (404)', async () => {
      if (!routeHandler?.POST) {
        throw new Error('Route handler not implemented yet')
      }

      const response = await testPOST(routeHandler.POST, '/api/goals/restore', {
        body: {
          goalId: '00000000-0000-0000-0000-000000000000',
        },
        session: mockSession,
      })

      expect(response.status).toBe(404)

      const data = response.data as { error: string }
      expect(data.error.toLowerCase()).toContain('not found')
    })

    it('should validate goalId format (400)', async () => {
      if (!routeHandler?.POST) {
        throw new Error('Route handler not implemented yet')
      }

      const response = await testPOST(routeHandler.POST, '/api/goals/restore', {
        body: {
          goalId: 'not-a-valid-uuid',
        },
        session: mockSession,
      })

      expect(response.status).toBe(400)

      const data = response.data as { error: string }
      expect(data.error.toLowerCase()).toContain('validation')
    })

    it('should reject missing goalId (400)', async () => {
      if (!routeHandler?.POST) {
        throw new Error('Route handler not implemented yet')
      }

      const response = await testPOST(routeHandler.POST, '/api/goals/restore', {
        body: {},
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

      const response = await testPOST(routeHandler.POST, '/api/goals/restore', {
        body: {
          goalId: archivedGoalId,
        },
        session: null,
      })

      expect(response.status).toBe(401)

      const data = response.data as { error: string }
      expect(data.error.toLowerCase()).toContain('unauthorized')
    })

    it('should return updated goal counts after restore', async () => {
      if (!routeHandler?.POST) {
        throw new Error('Route handler not implemented yet')
      }

      // Create a fresh user with 2 active and 1 archived goal
      const timestamp = Date.now()
      const passwordHash = await hashPassword('TestPass123!')
      const countUser = await createUser({
        email: `test-count-restore-${timestamp}@example.com`,
        passwordHash,
        name: 'Count Restore User',
      })

      const countSession: MockSession = {
        user: {
          id: countUser.id,
          email: countUser.email,
          name: countUser.name ?? undefined,
        },
      }

      // Create 2 active goals
      await createGoal({ userId: countUser.id, title: 'Active 1' })
      await createGoal({ userId: countUser.id, title: 'Active 2' })

      // Create 1 archived goal
      const goalToRestore = await createGoal({
        userId: countUser.id,
        title: 'Archived Goal',
      })
      await archiveGoal(goalToRestore.id)

      const countsBefore = await getGoalCounts(countUser.id)
      expect(countsBefore.active).toBe(2)
      expect(countsBefore.archived).toBe(1)
      expect(countsBefore.total).toBe(3)

      // Restore the goal
      ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(countSession)

      const response = await testPOST(routeHandler.POST, '/api/goals/restore', {
        body: {
          goalId: goalToRestore.id,
        },
        session: countSession,
      })

      expect(response.status).toBe(200)

      const data = response.data as {
        restored: boolean
        goal: Partial<LearningGoal>
        limits: { active: number; archived: number; total: number }
      }

      // Verify counts in response
      expect(data.limits.active).toBe(3) // Incremented by 1
      expect(data.limits.archived).toBe(0) // Decremented by 1
      expect(data.limits.total).toBe(3) // Unchanged

      // Verify counts in database
      const countsAfter = await getGoalCounts(countUser.id)
      expect(countsAfter.active).toBe(3)
      expect(countsAfter.archived).toBe(0)
      expect(countsAfter.total).toBe(3)
    })

    it('should allow restoring multiple archived goals sequentially (within limit)', async () => {
      if (!routeHandler?.POST) {
        throw new Error('Route handler not implemented yet')
      }

      // Create a user with 3 active and 2 archived goals
      const timestamp = Date.now()
      const passwordHash = await hashPassword('TestPass123!')
      const multiUser = await createUser({
        email: `test-multi-restore-${timestamp}@example.com`,
        passwordHash,
        name: 'Multi Restore User',
      })

      const multiSession: MockSession = {
        user: {
          id: multiUser.id,
          email: multiUser.email,
          name: multiUser.name ?? undefined,
        },
      }

      // Create 3 active goals
      for (let i = 0; i < 3; i++) {
        await createGoal({ userId: multiUser.id, title: `Active ${i + 1}` })
      }

      // Create 2 archived goals
      const archived1 = await createGoal({
        userId: multiUser.id,
        title: 'Archived 1',
      })
      await archiveGoal(archived1.id)

      const archived2 = await createGoal({
        userId: multiUser.id,
        title: 'Archived 2',
      })
      await archiveGoal(archived2.id)

      const countsBefore = await getGoalCounts(multiUser.id)
      expect(countsBefore.active).toBe(3)
      expect(countsBefore.archived).toBe(2)

      // Restore first goal
      ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(multiSession)

      const response1 = await testPOST(routeHandler.POST, '/api/goals/restore', {
        body: { goalId: archived1.id },
        session: multiSession,
      })

      expect(response1.status).toBe(200)

      // Restore second goal
      const response2 = await testPOST(routeHandler.POST, '/api/goals/restore', {
        body: { goalId: archived2.id },
        session: multiSession,
      })

      expect(response2.status).toBe(200)

      // Verify final counts
      const countsAfter = await getGoalCounts(multiUser.id)
      expect(countsAfter.active).toBe(5)
      expect(countsAfter.archived).toBe(0)
      expect(countsAfter.total).toBe(5)
    })
  })
})
