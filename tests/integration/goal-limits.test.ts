// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { hashPassword } from '@/lib/auth/helpers'
import { createUser } from '@/lib/db/operations/users'
import { createGoal, getGoalCounts } from '@/lib/db/operations/goals'
import { closeDbConnection } from '@/lib/db/client'
import { initializeSchema, isSchemaInitialized } from '@/lib/db/schema'
import { GOAL_LIMITS } from '@/lib/constants/goals'
import * as goalRoutes from '@/app/api/goals/route'
import * as goalIdRoutes from '@/app/api/goals/[goalId]/route'
import { testPOST, testPATCH, type MockSession } from '@/tests/helpers/route-test-helper'
import { auth } from '@/auth'

/**
 * Integration Tests for Goal Limits Enforcement
 *
 * Tests HTTP-level API enforcement of goal limits per specs/021-custom-cards-archive
 * - GOAL_LIMITS: { ACTIVE: 6, ARCHIVED: 6, TOTAL: 12 }
 *
 * Tests User Story 3: Goal Limits Enforcement (Priority: P1)
 *
 * NOTE: These tests are marked as .fails() because limit enforcement is not yet implemented.
 * This is TDD - tests are written first to define the expected behavior.
 */

// Mock auth module
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

describe('Goal Limits Enforcement', () => {
  const timestamp = Date.now()
  let testUserId: string
  let mockSession: MockSession

  beforeAll(async () => {
    // Initialize database schema if needed
    const initialized = await isSchemaInitialized()
    if (!initialized) {
      await initializeSchema()
    }

    // Create test user
    const passwordHash = await hashPassword('TestPass123!')
    const testUser = await createUser({
      email: `goal-limits-test-${timestamp}@example.com`,
      passwordHash,
      name: 'Goal Limits Test User',
    })
    testUserId = testUser.id

    // Create mock session
    mockSession = {
      user: {
        id: testUserId,
        email: testUser.email,
        name: testUser.name ?? undefined,
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

  describe('Active Goal Limit (6 max)', () => {
    it.fails('should reject goal creation when user has 6 active goals (422)', async () => {
      // Create a fresh test user to avoid interference
      const passwordHash = await hashPassword('TestPass123!')
      const limitUser = await createUser({
        email: `active-limit-${Date.now()}@example.com`,
        passwordHash,
        name: 'Active Limit Test User',
      })

      const userSession: MockSession = {
        user: {
          id: limitUser.id,
          email: limitUser.email,
          name: limitUser.name ?? undefined,
        },
      }
      ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(userSession)

      // Create 6 active goals (at the limit)
      for (let i = 0; i < GOAL_LIMITS.ACTIVE; i++) {
        await createGoal({
          userId: limitUser.id,
          title: `Active Goal ${i + 1}`,
          description: 'Test goal',
        })
      }

      // Verify we have exactly 6 active goals
      const counts = await getGoalCounts(limitUser.id)
      expect(counts.active).toBe(6)

      // Attempt to create 7th active goal should fail with 422
      const response = await testPOST(goalRoutes.POST, '/api/goals', {
        body: {
          title: 'Goal #7 - Should Fail',
          description: 'This should be rejected',
          generateTree: false,
        },
        session: userSession,
      })

      expect(response.status).toBe(422)

      const data = response.data as { error: string; code: string }
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('code', 'GOAL_LIMIT_EXCEEDED')
      expect(data.error).toContain('Maximum 6 active goals reached')
      expect(data.error).toContain('Archive or delete a goal')
    })

    it('should allow goal creation when user has 5 active goals', async () => {
      // Create a fresh test user
      const passwordHash = await hashPassword('TestPass123!')
      const belowLimitUser = await createUser({
        email: `below-active-limit-${Date.now()}@example.com`,
        passwordHash,
        name: 'Below Active Limit User',
      })

      const userSession: MockSession = {
        user: {
          id: belowLimitUser.id,
          email: belowLimitUser.email,
          name: belowLimitUser.name ?? undefined,
        },
      }
      ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(userSession)

      // Create 5 active goals (below the limit)
      for (let i = 0; i < 5; i++) {
        await createGoal({
          userId: belowLimitUser.id,
          title: `Active Goal ${i + 1}`,
          description: 'Test goal',
        })
      }

      // Verify we have exactly 5 active goals
      const counts = await getGoalCounts(belowLimitUser.id)
      expect(counts.active).toBe(5)

      // Creating 6th goal should succeed
      const response = await testPOST(goalRoutes.POST, '/api/goals', {
        body: {
          title: 'Goal #6 - Should Succeed',
          description: 'This should be accepted',
          generateTree: false,
        },
        session: userSession,
      })

      expect(response.status).toBe(201)

      const data = response.data as { goal: { id: string; title: string } }
      expect(data).toHaveProperty('goal')
      expect(data.goal).toHaveProperty('id')
      expect(data.goal.title).toBe('Goal #6 - Should Succeed')
    })
  })

  describe('Archived Goal Limit (6 max)', () => {
    it.fails('should reject archiving when user has 6 archived goals (422)', async () => {
      // Create a fresh test user
      const passwordHash = await hashPassword('TestPass123!')
      const archiveUser = await createUser({
        email: `archive-limit-${Date.now()}@example.com`,
        passwordHash,
        name: 'Archive Limit Test User',
      })

      const userSession: MockSession = {
        user: {
          id: archiveUser.id,
          email: archiveUser.email,
          name: archiveUser.name ?? undefined,
        },
      }
      ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(userSession)

      // Create and archive 6 goals (at archived limit)
      for (let i = 0; i < GOAL_LIMITS.ARCHIVED; i++) {
        const goal = await createGoal({
          userId: archiveUser.id,
          title: `Archived Goal ${i + 1}`,
          description: 'To be archived',
        })

        // Archive via PATCH endpoint
        await testPATCH(
          goalIdRoutes.PATCH as unknown as (
            request: import('next/server').NextRequest,
            context?: { params: Promise<Record<string, string>> }
          ) => Promise<import('next/server').NextResponse>,
          `/api/goals/${goal.id}`,
          {
            params: { goalId: goal.id },
            body: { status: 'archived' },
            session: userSession,
          }
        )
      }

      // Create one more active goal to try archiving
      const activeGoal = await createGoal({
        userId: archiveUser.id,
        title: 'Active Goal - Will Try to Archive',
        description: 'This should fail to archive',
      })

      // Verify counts
      const counts = await getGoalCounts(archiveUser.id)
      expect(counts.archived).toBe(6)
      expect(counts.active).toBe(1)

      // Attempt to archive when at archived limit should fail with 422
      const response = await testPATCH(
        goalIdRoutes.PATCH as unknown as (
          request: import('next/server').NextRequest,
          context?: { params: Promise<Record<string, string>> }
        ) => Promise<import('next/server').NextResponse>,
        `/api/goals/${activeGoal.id}`,
        {
          params: { goalId: activeGoal.id },
          body: { status: 'archived' },
          session: userSession,
        }
      )

      expect(response.status).toBe(422)

      const data = response.data as { error: string; code: string }
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('code', 'GOAL_LIMIT_EXCEEDED')
      expect(data.error).toContain('Maximum 6 archived goals reached')
      expect(data.error).toContain('Delete an archived goal')
    })
  })

  describe('Total Goal Limit (12 max)', () => {
    it.fails('should reject goal creation when user has 12 total goals (422)', async () => {
      // Create a fresh test user
      const passwordHash = await hashPassword('TestPass123!')
      const totalUser = await createUser({
        email: `total-limit-${Date.now()}@example.com`,
        passwordHash,
        name: 'Total Limit Test User',
      })

      const userSession: MockSession = {
        user: {
          id: totalUser.id,
          email: totalUser.email,
          name: totalUser.name ?? undefined,
        },
      }
      ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(userSession)

      // Create 6 active goals
      for (let i = 0; i < 6; i++) {
        await createGoal({
          userId: totalUser.id,
          title: `Active Goal ${i + 1}`,
          description: 'Active',
        })
      }

      // Create and archive 6 goals (total = 12)
      for (let i = 0; i < 6; i++) {
        const goal = await createGoal({
          userId: totalUser.id,
          title: `Archived Goal ${i + 1}`,
          description: 'To be archived',
        })

        await testPATCH(
          goalIdRoutes.PATCH as unknown as (
            request: import('next/server').NextRequest,
            context?: { params: Promise<Record<string, string>> }
          ) => Promise<import('next/server').NextResponse>,
          `/api/goals/${goal.id}`,
          {
            params: { goalId: goal.id },
            body: { status: 'archived' },
            session: userSession,
          }
        )
      }

      // Verify we have 12 total goals
      const counts = await getGoalCounts(totalUser.id)
      expect(counts.total).toBe(12)
      expect(counts.active).toBe(6)
      expect(counts.archived).toBe(6)

      // Attempt to create 13th goal should fail with 422
      const response = await testPOST(goalRoutes.POST, '/api/goals', {
        body: {
          title: 'Goal #13 - Should Fail',
          description: 'This should be rejected',
          generateTree: false,
        },
        session: userSession,
      })

      expect(response.status).toBe(422)

      const data = response.data as { error: string; code: string }
      expect(data).toHaveProperty('error')
      expect(data).toHaveProperty('code', 'GOAL_LIMIT_EXCEEDED')
      expect(data.error).toContain('Maximum 12 total goals reached')
      expect(data.error).toContain('Delete a goal')
    })
  })

  describe('Successful Operations Within Limits', () => {
    it('should successfully create a goal when under all limits', async () => {
      // Use the main test user (should be empty or have minimal goals)
      const response = await testPOST(goalRoutes.POST, '/api/goals', {
        body: {
          title: 'Well Within Limits',
          description: 'This should succeed',
          generateTree: false,
        },
        session: mockSession,
      })

      expect(response.status).toBe(201)

      const data = response.data as {
        goal: {
          id: string
          title: string
          status: string
          masteryPercentage: number
          createdAt: string
        }
      }

      expect(data).toHaveProperty('goal')
      expect(data.goal).toHaveProperty('id')
      expect(data.goal).toHaveProperty('title', 'Well Within Limits')
      expect(data.goal).toHaveProperty('status', 'active')
      expect(data.goal).toHaveProperty('masteryPercentage', 0)
      expect(data.goal).toHaveProperty('createdAt')

      // Verify it's a valid ISO date string
      const createdAt = new Date(data.goal.createdAt)
      expect(createdAt.toString()).not.toBe('Invalid Date')
    })

    it('should successfully archive a goal when under archived limit', async () => {
      // Create a goal to archive
      const createResponse = await testPOST(goalRoutes.POST, '/api/goals', {
        body: {
          title: 'To Archive',
          description: 'Will be archived',
          generateTree: false,
        },
        session: mockSession,
      })

      expect(createResponse.status).toBe(201)

      const createData = createResponse.data as { goal: { id: string } }
      const goalId = createData.goal.id

      // Archive it
      const archiveResponse = await testPATCH(
        goalIdRoutes.PATCH as unknown as (
          request: import('next/server').NextRequest,
          context?: { params: Promise<Record<string, string>> }
        ) => Promise<import('next/server').NextResponse>,
        `/api/goals/${goalId}`,
        {
          params: { goalId },
          body: { status: 'archived' },
          session: mockSession,
        }
      )

      expect(archiveResponse.status).toBe(200)

      const archiveData = archiveResponse.data as {
        id: string
        status: string
        updatedAt: string
      }

      expect(archiveData).toHaveProperty('id', goalId)
      expect(archiveData).toHaveProperty('status', 'archived')
      expect(archiveData).toHaveProperty('updatedAt')
    })
  })

  describe('Error Response Format', () => {
    it.fails('should return consistent error format for limit violations', async () => {
      // Create a user at active limit
      const passwordHash = await hashPassword('TestPass123!')
      const errorUser = await createUser({
        email: `error-format-${Date.now()}@example.com`,
        passwordHash,
        name: 'Error Format Test User',
      })

      const userSession: MockSession = {
        user: {
          id: errorUser.id,
          email: errorUser.email,
          name: errorUser.name ?? undefined,
        },
      }
      ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue(userSession)

      // Create 6 active goals
      for (let i = 0; i < GOAL_LIMITS.ACTIVE; i++) {
        await createGoal({
          userId: errorUser.id,
          title: `Goal ${i + 1}`,
        })
      }

      // Try to create 7th goal
      const response = await testPOST(goalRoutes.POST, '/api/goals', {
        body: {
          title: 'Should Fail',
          generateTree: false,
        },
        session: userSession,
      })

      expect(response.status).toBe(422)

      const data = response.data as { error: string; code: string }

      // Verify error response structure matches API contract
      expect(data).toHaveProperty('error')
      expect(typeof data.error).toBe('string')
      expect(data.error.length).toBeGreaterThan(0)

      expect(data).toHaveProperty('code')
      expect(data.code).toBe('GOAL_LIMIT_EXCEEDED')
    })
  })
})
