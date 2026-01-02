import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { hashPassword } from '@/lib/auth/helpers'
import { createUser } from '@/lib/db/operations/users'
import { createGoal, getGoalCounts, archiveGoal, getGoalById } from '@/lib/db/operations/goals'
import { closeDbConnection } from '@/lib/db/client'
import { testDELETE, type MockSession } from '@/tests/helpers/route-test-helper'
import { auth } from '@/auth'

/**
 * Contract Tests for Bulk Delete Goals API
 *
 * Tests the bulk delete endpoint per specs/021-custom-cards-archive/contracts/bulk-delete.md
 *
 * Verifies:
 * - DELETE /api/goals/delete accepts array of 1-12 goal IDs
 * - Deletes multiple goals in one request
 * - Can delete both active and archived goals
 * - Rejects goals not owned by user (403)
 * - Rejects non-existent goals (404)
 * - Validates goalIds array (400)
 * - Returns 401 for unauthenticated request
 * - Cascades deletion to related data
 * - Returns updated goal counts after deletion
 *
 * Maps to User Story 2 (T019)
 */

// Mock auth module
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

// Import route handler AFTER mocking auth
const importRouteHandler = async () => {
  try {
    return await import('@/app/api/goals/delete/route')
  } catch (error) {
    // Route doesn't exist yet (TDD) - tests will fail gracefully
    return null
  }
}

describe('Bulk Delete Goals API Contract Tests', () => {
  let testUserId: string
  let otherUserId: string
  let mockSession: MockSession
  let routeHandler: Awaited<ReturnType<typeof importRouteHandler>>

  beforeAll(async () => {
    // Create test users
    const timestamp = Date.now()
    const passwordHash = await hashPassword('TestPass123!')

    const user = await createUser({
      email: `test-bulk-delete-${timestamp}@example.com`,
      passwordHash,
      name: 'Bulk Delete Test User',
    })
    testUserId = user.id

    const otherUser = await createUser({
      email: `test-bulk-delete-other-${timestamp}@example.com`,
      passwordHash,
      name: 'Other User',
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

  describe('DELETE /api/goals/delete', () => {
    it('should delete multiple goals in one request (200)', async () => {
      if (!routeHandler?.DELETE) {
        throw new Error('Route handler not implemented yet')
      }

      // Create 3 test goals
      const goal1 = await createGoal({
        userId: testUserId,
        title: 'Goal to Delete 1',
      })
      const goal2 = await createGoal({
        userId: testUserId,
        title: 'Goal to Delete 2',
      })
      const goal3 = await createGoal({
        userId: testUserId,
        title: 'Goal to Delete 3',
      })

      const goalIds = [goal1.id, goal2.id, goal3.id]

      // Get counts before deletion
      const beforeCounts = await getGoalCounts(testUserId)

      // Delete all 3 goals
      const response = await testDELETE(routeHandler.DELETE, '/api/goals/delete', {
        body: { goalIds },
        session: mockSession,
      })

      expect(response.status).toBe(200)
      expect(response.data).toMatchObject({
        deleted: 3,
        goalIds: expect.arrayContaining(goalIds),
      })

      // Verify limits object is returned
      const data = response.data as {
        deleted: number
        goalIds: string[]
        limits: { active: number; archived: number; total: number }
      }
      expect(data).toHaveProperty('limits')
      expect(data.limits).toHaveProperty('active')
      expect(data.limits).toHaveProperty('archived')
      expect(data.limits).toHaveProperty('total')

      // Verify counts decreased
      const afterCounts = await getGoalCounts(testUserId)
      expect(afterCounts.total).toBe(beforeCounts.total - 3)

      // Verify goals are actually deleted
      for (const goalId of goalIds) {
        const goal = await getGoalById(goalId)
        expect(goal).toBeNull()
      }
    })

    it('should delete both active and archived goals', async () => {
      if (!routeHandler?.DELETE) {
        throw new Error('Route handler not implemented yet')
      }

      // Create 1 active goal
      const activeGoal = await createGoal({
        userId: testUserId,
        title: 'Active Goal to Delete',
      })

      // Create 1 goal and archive it
      const goalToArchive = await createGoal({
        userId: testUserId,
        title: 'Goal to Archive then Delete',
      })
      await archiveGoal(goalToArchive.id)

      const goalIds = [activeGoal.id, goalToArchive.id]

      // Delete both
      const response = await testDELETE(routeHandler.DELETE, '/api/goals/delete', {
        body: { goalIds },
        session: mockSession,
      })

      expect(response.status).toBe(200)
      expect(response.data).toMatchObject({
        deleted: 2,
        goalIds: expect.arrayContaining(goalIds),
      })

      // Verify both are deleted
      expect(await getGoalById(activeGoal.id)).toBeNull()
      expect(await getGoalById(goalToArchive.id)).toBeNull()
    })

    it('should reject goals not owned by user (403)', async () => {
      if (!routeHandler?.DELETE) {
        throw new Error('Route handler not implemented yet')
      }

      // Create a goal owned by current user
      const ownGoal = await createGoal({
        userId: testUserId,
        title: 'Own Goal',
      })

      // Create a goal owned by another user
      const otherGoal = await createGoal({
        userId: otherUserId,
        title: 'Other User Goal',
      })

      // Try to delete both (including other user's goal)
      const response = await testDELETE(routeHandler.DELETE, '/api/goals/delete', {
        body: { goalIds: [ownGoal.id, otherGoal.id] },
        session: mockSession,
      })

      expect(response.status).toBe(403)
      expect(response.data).toMatchObject({
        error: expect.stringMatching(/permission/i),
      })

      // Verify own goal was NOT deleted
      expect(await getGoalById(ownGoal.id)).not.toBeNull()

      // Verify other user's goal was NOT deleted
      expect(await getGoalById(otherGoal.id)).not.toBeNull()
    })

    it('should reject non-existent goals (404)', async () => {
      if (!routeHandler?.DELETE) {
        throw new Error('Route handler not implemented yet')
      }

      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await testDELETE(routeHandler.DELETE, '/api/goals/delete', {
        body: { goalIds: [nonExistentId] },
        session: mockSession,
      })

      expect(response.status).toBe(404)
      expect(response.data).toMatchObject({
        error: expect.stringMatching(/not found/i),
        notFound: expect.arrayContaining([nonExistentId]),
      })
    })

    it('should handle mix of existing and non-existent goals (404)', async () => {
      if (!routeHandler?.DELETE) {
        throw new Error('Route handler not implemented yet')
      }

      // Create a real goal
      const realGoal = await createGoal({
        userId: testUserId,
        title: 'Real Goal',
      })

      const nonExistentId = '00000000-0000-0000-0000-000000000000'

      const response = await testDELETE(routeHandler.DELETE, '/api/goals/delete', {
        body: { goalIds: [realGoal.id, nonExistentId] },
        session: mockSession,
      })

      expect(response.status).toBe(404)
      expect(response.data).toMatchObject({
        error: expect.stringMatching(/not found/i),
        notFound: expect.arrayContaining([nonExistentId]),
      })

      // Verify real goal was NOT deleted
      expect(await getGoalById(realGoal.id)).not.toBeNull()
    })

    it('should validate empty goalIds array (400)', async () => {
      if (!routeHandler?.DELETE) {
        throw new Error('Route handler not implemented yet')
      }

      const response = await testDELETE(routeHandler.DELETE, '/api/goals/delete', {
        body: { goalIds: [] },
        session: mockSession,
      })

      expect(response.status).toBe(400)
      expect(response.data).toHaveProperty('error')
    })

    it('should validate invalid UUID format (400)', async () => {
      if (!routeHandler?.DELETE) {
        throw new Error('Route handler not implemented yet')
      }

      const response = await testDELETE(routeHandler.DELETE, '/api/goals/delete', {
        body: { goalIds: ['not-a-uuid', 'also-invalid'] },
        session: mockSession,
      })

      expect(response.status).toBe(400)
      expect(response.data).toHaveProperty('error')
    })

    it('should validate too many goals (>12) (400)', async () => {
      if (!routeHandler?.DELETE) {
        throw new Error('Route handler not implemented yet')
      }

      // Generate 13 valid UUIDs
      const tooManyIds = Array.from(
        { length: 13 },
        (_, i) => `${i.toString().padStart(8, '0')}-0000-0000-0000-000000000000`
      )

      const response = await testDELETE(routeHandler.DELETE, '/api/goals/delete', {
        body: { goalIds: tooManyIds },
        session: mockSession,
      })

      expect(response.status).toBe(400)
      expect(response.data).toHaveProperty('error')
    })

    it('should validate missing goalIds field (400)', async () => {
      if (!routeHandler?.DELETE) {
        throw new Error('Route handler not implemented yet')
      }

      const response = await testDELETE(routeHandler.DELETE, '/api/goals/delete', {
        body: {},
        session: mockSession,
      })

      expect(response.status).toBe(400)
      expect(response.data).toHaveProperty('error')
    })

    it('should return 401 for unauthenticated request', async () => {
      if (!routeHandler?.DELETE) {
        throw new Error('Route handler not implemented yet')
      }

      // Mock unauthenticated session
      ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const response = await testDELETE(routeHandler.DELETE, '/api/goals/delete', {
        body: { goalIds: ['00000000-0000-0000-0000-000000000000'] },
      })

      expect(response.status).toBe(401)
      expect(response.data).toMatchObject({
        error: expect.stringMatching(/unauthorized/i),
      })

      // Restore auth mock
      ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession)
    })

    it('should delete single goal', async () => {
      if (!routeHandler?.DELETE) {
        throw new Error('Route handler not implemented yet')
      }

      const goal = await createGoal({
        userId: testUserId,
        title: 'Single Goal to Delete',
      })

      const response = await testDELETE(routeHandler.DELETE, '/api/goals/delete', {
        body: { goalIds: [goal.id] },
        session: mockSession,
      })

      expect(response.status).toBe(200)
      expect(response.data).toMatchObject({
        deleted: 1,
        goalIds: [goal.id],
      })

      expect(await getGoalById(goal.id)).toBeNull()
    })

    it('should return updated goal counts after deletion', async () => {
      if (!routeHandler?.DELETE) {
        throw new Error('Route handler not implemented yet')
      }

      // Create 2 goals
      const goal1 = await createGoal({
        userId: testUserId,
        title: 'Goal for Count Test 1',
      })
      const goal2 = await createGoal({
        userId: testUserId,
        title: 'Goal for Count Test 2',
      })

      const beforeCounts = await getGoalCounts(testUserId)

      const response = await testDELETE(routeHandler.DELETE, '/api/goals/delete', {
        body: { goalIds: [goal1.id, goal2.id] },
        session: mockSession,
      })

      expect(response.status).toBe(200)

      // Verify returned limits match actual counts
      const data = response.data as {
        deleted: number
        goalIds: string[]
        limits: { active: number; archived: number; total: number }
      }
      const actualCounts = await getGoalCounts(testUserId)
      expect(data.limits).toEqual(actualCounts)
      expect(data.limits.total).toBe(beforeCounts.total - 2)
    })
  })

  describe('Cascade deletion behavior', () => {
    it('should cascade deletion to related data (skill tree, nodes, flashcards)', async () => {
      if (!routeHandler?.DELETE) {
        throw new Error('Route handler not implemented yet')
      }

      // Create a goal
      const goal = await createGoal({
        userId: testUserId,
        title: 'Goal with Related Data',
      })

      // TODO: Once skill tree and flashcard operations are available:
      // - Create skill tree for goal
      // - Create skill nodes
      // - Create flashcards linked to nodes
      // - Verify all are deleted when goal is deleted

      // For now, just verify the goal deletion works
      const response = await testDELETE(routeHandler.DELETE, '/api/goals/delete', {
        body: { goalIds: [goal.id] },
        session: mockSession,
      })

      expect(response.status).toBe(200)
      expect(await getGoalById(goal.id)).toBeNull()

      // NOTE: Cascade behavior is tested at the database schema level
      // Database foreign keys with ON DELETE CASCADE ensure:
      // goal -> skill_tree -> skill_nodes -> flashcards -> review_logs
    })
  })

  describe('Edge cases', () => {
    it('should handle duplicate goal IDs in array', async () => {
      if (!routeHandler?.DELETE) {
        throw new Error('Route handler not implemented yet')
      }

      const goal = await createGoal({
        userId: testUserId,
        title: 'Duplicate Test Goal',
      })

      // Pass same ID twice
      const response = await testDELETE(routeHandler.DELETE, '/api/goals/delete', {
        body: { goalIds: [goal.id, goal.id] },
        session: mockSession,
      })

      // Should succeed and delete once
      expect(response.status).toBe(200)
      expect(await getGoalById(goal.id)).toBeNull()
    })

    it('should preserve other user goals during deletion', async () => {
      if (!routeHandler?.DELETE) {
        throw new Error('Route handler not implemented yet')
      }

      // Create goal for current user
      const myGoal = await createGoal({
        userId: testUserId,
        title: 'My Goal to Delete',
      })

      // Create goal for other user
      const otherGoal = await createGoal({
        userId: otherUserId,
        title: 'Other User Goal Should Remain',
      })

      // Delete only own goal
      const response = await testDELETE(routeHandler.DELETE, '/api/goals/delete', {
        body: { goalIds: [myGoal.id] },
        session: mockSession,
      })

      expect(response.status).toBe(200)
      expect(await getGoalById(myGoal.id)).toBeNull()

      // Verify other user's goal still exists
      expect(await getGoalById(otherGoal.id)).not.toBeNull()
    })
  })
})
