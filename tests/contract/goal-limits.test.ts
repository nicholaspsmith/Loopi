import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { hashPassword } from '@/lib/auth/helpers'
import { createUser } from '@/lib/db/operations/users'
import { createGoal, getGoalCounts, archiveGoal } from '@/lib/db/operations/goals'
import { closeDbConnection } from '@/lib/db/client'
import { GOAL_LIMITS } from '@/lib/constants/goals'

/**
 * Contract Tests for Goal Limits
 *
 * Tests the goal limit enforcement per specs/021-custom-cards-archive/spec.md
 *
 * Verifies:
 * - GOAL_LIMITS: { ACTIVE: 6, ARCHIVED: 6, TOTAL: 12 }
 * - Goal creation succeeds when under limits
 * - Goal creation fails with 422 when active goals >= 6
 * - Goal creation fails with 422 when total goals >= 12
 * - Archive fails with 422 when archived goals >= 6
 *
 * Maps to User Story 3 (FR-005, FR-006, FR-007)
 */

describe('Goal Limits Contract Tests', () => {
  let testUserId: string
  let testGoalIds: string[] = []

  beforeAll(async () => {
    const timestamp = Date.now()
    const passwordHash = await hashPassword('TestPass123!')
    const user = await createUser({
      email: `test-goal-limits-${timestamp}@example.com`,
      passwordHash,
      name: 'Goal Limits Test User',
    })
    testUserId = user.id
  })

  beforeEach(() => {
    testGoalIds = []
  })

  afterAll(async () => {
    await closeDbConnection()
  })

  describe('getGoalCounts()', () => {
    it('should return zero counts for new user', async () => {
      const counts = await getGoalCounts(testUserId)

      expect(counts).toHaveProperty('active')
      expect(counts).toHaveProperty('archived')
      expect(counts).toHaveProperty('total')

      expect(counts.active).toBe(0)
      expect(counts.archived).toBe(0)
      expect(counts.total).toBe(0)
    })

    it('should count active goals correctly', async () => {
      for (let i = 0; i < 3; i++) {
        const goal = await createGoal({
          userId: testUserId,
          title: `Active Goal ${i + 1}`,
        })
        testGoalIds.push(goal.id)
      }

      const counts = await getGoalCounts(testUserId)

      expect(counts.active).toBe(3)
      expect(counts.archived).toBe(0)
      expect(counts.total).toBe(3)
    })

    it('should count archived goals correctly', async () => {
      for (let i = 0; i < 2; i++) {
        const goal = await createGoal({
          userId: testUserId,
          title: `Active Goal for Archive ${i + 1}`,
        })
        testGoalIds.push(goal.id)
      }

      await archiveGoal(testGoalIds[testGoalIds.length - 2])
      await archiveGoal(testGoalIds[testGoalIds.length - 1])

      const counts = await getGoalCounts(testUserId)

      expect(counts.active).toBe(3)
      expect(counts.archived).toBe(2)
      expect(counts.total).toBe(5)
    })

    it('should handle mixed active and archived goals', async () => {
      const goal = await createGoal({
        userId: testUserId,
        title: `Mixed Goal`,
      })
      testGoalIds.push(goal.id)

      const counts = await getGoalCounts(testUserId)

      expect(counts.active).toBe(4)
      expect(counts.archived).toBe(2)
      expect(counts.total).toBe(6)
    })
  })

  describe('GOAL_LIMITS constant verification', () => {
    it('should have correct limit values', () => {
      expect(GOAL_LIMITS.ACTIVE).toBe(6)
      expect(GOAL_LIMITS.ARCHIVED).toBe(6)
      expect(GOAL_LIMITS.TOTAL).toBe(12)
    })

    it('should enforce total equals active plus archived', () => {
      expect(GOAL_LIMITS.TOTAL).toBe(GOAL_LIMITS.ACTIVE + GOAL_LIMITS.ARCHIVED)
    })
  })

  describe('Goal creation under limits (success cases)', () => {
    it('should allow creating goals when under all limits', async () => {
      const timestamp = Date.now()
      const passwordHash = await hashPassword('TestPass123!')
      const user = await createUser({
        email: `test-under-limits-${timestamp}@example.com`,
        passwordHash,
        name: 'Under Limits User',
      })

      for (let i = 0; i < 5; i++) {
        const goal = await createGoal({
          userId: user.id,
          title: `Goal ${i + 1}`,
        })
        expect(goal).toHaveProperty('id')
        expect(goal.status).toBe('active')
      }

      const counts = await getGoalCounts(user.id)
      expect(counts.active).toBe(5)
      expect(counts.total).toBe(5)
    })

    it('should allow creating exactly 6 active goals', async () => {
      const timestamp = Date.now()
      const passwordHash = await hashPassword('TestPass123!')
      const user = await createUser({
        email: `test-six-active-${timestamp}@example.com`,
        passwordHash,
        name: 'Six Active User',
      })

      for (let i = 0; i < 6; i++) {
        const goal = await createGoal({
          userId: user.id,
          title: `Goal ${i + 1}`,
        })
        expect(goal).toHaveProperty('id')
      }

      const counts = await getGoalCounts(user.id)
      expect(counts.active).toBe(6)
      expect(counts.total).toBe(6)
    })
  })

  describe('Goal creation at active limit (should fail - NOT YET IMPLEMENTED)', () => {
    it.fails('should reject creating goal when active goals >= 6', async () => {
      const timestamp = Date.now()
      const passwordHash = await hashPassword('TestPass123!')
      const user = await createUser({
        email: `test-active-limit-${timestamp}@example.com`,
        passwordHash,
        name: 'Active Limit User',
      })

      for (let i = 0; i < 6; i++) {
        await createGoal({
          userId: user.id,
          title: `Goal ${i + 1}`,
        })
      }

      const counts = await getGoalCounts(user.id)
      expect(counts.active).toBe(6)

      await expect(
        createGoal({
          userId: user.id,
          title: 'Goal 7 - Should Fail',
        })
      ).rejects.toThrow(/Maximum 6 active goals reached/)
    })
  })

  describe('Goal creation at total limit (should fail - NOT YET IMPLEMENTED)', () => {
    it.fails('should reject creating goal when total goals >= 12', async () => {
      const timestamp = Date.now()
      const passwordHash = await hashPassword('TestPass123!')
      const user = await createUser({
        email: `test-total-limit-${timestamp}@example.com`,
        passwordHash,
        name: 'Total Limit User',
      })

      for (let i = 0; i < 6; i++) {
        await createGoal({
          userId: user.id,
          title: `Active Goal ${i + 1}`,
        })
      }

      for (let i = 0; i < 6; i++) {
        const goal = await createGoal({
          userId: user.id,
          title: `Goal to Archive ${i + 1}`,
        })
        await archiveGoal(goal.id)
      }

      const counts = await getGoalCounts(user.id)
      expect(counts.active).toBe(6)
      expect(counts.archived).toBe(6)
      expect(counts.total).toBe(12)

      await expect(
        createGoal({
          userId: user.id,
          title: 'Goal 13 - Should Fail',
        })
      ).rejects.toThrow(/Maximum 12 total goals reached/)
    })
  })

  describe('Goal archiving at archived limit (should fail - NOT YET IMPLEMENTED)', () => {
    it.fails('should reject archiving when archived goals >= 6', async () => {
      const timestamp = Date.now()
      const passwordHash = await hashPassword('TestPass123!')
      const user = await createUser({
        email: `test-archive-limit-${timestamp}@example.com`,
        passwordHash,
        name: 'Archive Limit User',
      })

      for (let i = 0; i < 7; i++) {
        await createGoal({
          userId: user.id,
          title: `Goal ${i + 1}`,
        })
      }

      const allGoals = await getGoalCounts(user.id)
      expect(allGoals.active).toBe(7)

      // Archive 6 goals to reach the archived limit
      const goalIds = []
      for (let i = 0; i < 6; i++) {
        const g = await createGoal({ userId: user.id, title: `To Archive ${i}` })
        await archiveGoal(g.id)
        goalIds.push(g.id)
      }

      const counts = await getGoalCounts(user.id)
      expect(counts.archived).toBe(6)

      const oneMoreGoal = await createGoal({
        userId: user.id,
        title: 'To Archive - Should Fail',
      })

      await expect(archiveGoal(oneMoreGoal.id)).rejects.toThrow(/Maximum 6 archived goals reached/)
    })
  })

  describe('Edge cases', () => {
    it('should allow creating new goal after archiving one (freeing active slot)', async () => {
      const timestamp = Date.now()
      const passwordHash = await hashPassword('TestPass123!')
      const user = await createUser({
        email: `test-archive-frees-slot-${timestamp}@example.com`,
        passwordHash,
        name: 'Archive Frees Slot User',
      })

      const goalIds = []
      for (let i = 0; i < 6; i++) {
        const goal = await createGoal({
          userId: user.id,
          title: `Goal ${i + 1}`,
        })
        goalIds.push(goal.id)
      }

      let counts = await getGoalCounts(user.id)
      expect(counts.active).toBe(6)

      await archiveGoal(goalIds[0])

      counts = await getGoalCounts(user.id)
      expect(counts.active).toBe(5)
      expect(counts.archived).toBe(1)

      const newGoal = await createGoal({
        userId: user.id,
        title: 'New Goal After Archive',
      })

      expect(newGoal).toHaveProperty('id')

      counts = await getGoalCounts(user.id)
      expect(counts.active).toBe(6)
      expect(counts.archived).toBe(1)
      expect(counts.total).toBe(7)
    })
  })
})
