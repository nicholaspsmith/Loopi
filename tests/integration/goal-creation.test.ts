// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createUser } from '@/lib/db/operations/users'
import {
  createGoal,
  getGoalById,
  getGoalsByUserId,
  updateGoal,
  deleteGoal,
  goalBelongsToUser,
  getActiveGoals,
  archiveGoal,
  completeGoal,
} from '@/lib/db/operations/goals'
import { initializeSchema, isSchemaInitialized } from '@/lib/db/schema'
import { closeDbConnection } from '@/lib/db/client'

/**
 * Integration Tests for Goal Creation Flow
 *
 * Tests the complete goal CRUD operations with the database.
 * Maps to User Story 1: Create Learning Goal with Skill Tree
 */

describe('Goal Creation Flow', () => {
  const timestamp = Date.now()
  let testUserId: string
  let testGoalId: string

  beforeAll(async () => {
    // Initialize database schema if needed
    const initialized = await isSchemaInitialized()
    if (!initialized) {
      await initializeSchema()
    }

    // Create test user
    const testUser = await createUser({
      email: `goal-test-${timestamp}@example.com`,
      passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.',
      name: 'Goal Test User',
    })
    testUserId = testUser.id
  })

  afterAll(async () => {
    await closeDbConnection()
  })

  describe('Goal Creation', () => {
    it('should create a new learning goal', async () => {
      const goal = await createGoal({
        userId: testUserId,
        title: 'Learn Kubernetes',
        description: 'Master container orchestration',
      })

      testGoalId = goal.id

      expect(goal).toBeDefined()
      expect(goal.id).toBeDefined()
      expect(goal.userId).toBe(testUserId)
      expect(goal.title).toBe('Learn Kubernetes')
      expect(goal.description).toBe('Master container orchestration')
      expect(goal.status).toBe('active')
      expect(goal.masteryPercentage).toBe(0)
      expect(goal.totalTimeSeconds).toBe(0)
    })

    it('should create goal without description', async () => {
      const goal = await createGoal({
        userId: testUserId,
        title: 'Learn Python',
      })

      expect(goal.title).toBe('Learn Python')
      expect(goal.description).toBeNull()
    })

    it('should set createdAt and updatedAt timestamps', async () => {
      const goal = await createGoal({
        userId: testUserId,
        title: 'Learn Docker',
      })

      expect(goal.createdAt).toBeDefined()
      expect(goal.updatedAt).toBeDefined()
      expect(goal.createdAt).toEqual(goal.updatedAt)
    })
  })

  describe('Goal Retrieval', () => {
    it('should get goal by ID', async () => {
      const goal = await getGoalById(testGoalId)

      expect(goal).toBeDefined()
      expect(goal?.id).toBe(testGoalId)
      expect(goal?.title).toBe('Learn Kubernetes')
    })

    it('should return null for non-existent goal', async () => {
      const goal = await getGoalById('00000000-0000-0000-0000-000000000000')

      expect(goal).toBeNull()
    })

    it('should get all goals for user', async () => {
      const goals = await getGoalsByUserId(testUserId)

      expect(goals.length).toBeGreaterThanOrEqual(1)
      expect(goals.some((g) => g.id === testGoalId)).toBe(true)
    })

    it('should get only active goals', async () => {
      const activeGoals = await getActiveGoals(testUserId)

      expect(activeGoals.every((g) => g.status === 'active')).toBe(true)
    })

    it('should order goals by creation date descending', async () => {
      const goals = await getGoalsByUserId(testUserId)

      if (goals.length > 1) {
        for (let i = 1; i < goals.length; i++) {
          expect(goals[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
            goals[i].createdAt.getTime()
          )
        }
      }
    })
  })

  describe('Goal Updates', () => {
    it('should update goal title', async () => {
      const updated = await updateGoal(testGoalId, {
        title: 'Learn Kubernetes Administration',
      })

      expect(updated?.title).toBe('Learn Kubernetes Administration')
    })

    it('should update goal description', async () => {
      const updated = await updateGoal(testGoalId, {
        description: 'Updated description',
      })

      expect(updated?.description).toBe('Updated description')
    })

    it('should update mastery percentage', async () => {
      const updated = await updateGoal(testGoalId, {
        masteryPercentage: 50,
      })

      expect(updated?.masteryPercentage).toBe(50)
    })

    it('should update total time', async () => {
      const updated = await updateGoal(testGoalId, {
        totalTimeSeconds: 3600,
      })

      expect(updated?.totalTimeSeconds).toBe(3600)
    })

    it('should update updatedAt timestamp on changes', async () => {
      const before = await getGoalById(testGoalId)

      // Small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10))

      const after = await updateGoal(testGoalId, { title: 'New Title' })

      expect(after?.updatedAt.getTime()).toBeGreaterThan(before!.updatedAt.getTime())
    })
  })

  describe('Goal Status Changes', () => {
    let statusTestGoalId: string

    beforeAll(async () => {
      const goal = await createGoal({
        userId: testUserId,
        title: 'Status Test Goal',
      })
      statusTestGoalId = goal.id
    })

    it('should pause a goal', async () => {
      const updated = await updateGoal(statusTestGoalId, { status: 'paused' })

      expect(updated?.status).toBe('paused')
    })

    it('should complete a goal', async () => {
      const completed = await completeGoal(statusTestGoalId)

      expect(completed?.status).toBe('completed')
      expect(completed?.masteryPercentage).toBe(100)
      expect(completed?.completedAt).toBeDefined()
    })

    it('should archive a goal', async () => {
      const archived = await archiveGoal(statusTestGoalId)

      expect(archived?.status).toBe('archived')
      expect(archived?.archivedAt).toBeDefined()
    })

    it('should exclude archived goals by default', async () => {
      const goals = await getGoalsByUserId(testUserId)

      expect(goals.every((g) => g.status !== 'archived')).toBe(true)
    })

    it('should include archived goals when requested', async () => {
      const goals = await getGoalsByUserId(testUserId, { includeArchived: true })

      expect(goals.some((g) => g.status === 'archived')).toBe(true)
    })
  })

  describe('Goal Ownership', () => {
    it('should verify goal belongs to user', async () => {
      const belongs = await goalBelongsToUser(testGoalId, testUserId)

      expect(belongs).toBe(true)
    })

    it('should return false for wrong user', async () => {
      const belongs = await goalBelongsToUser(testGoalId, '00000000-0000-0000-0000-000000000000')

      expect(belongs).toBe(false)
    })

    it('should return false for non-existent goal', async () => {
      const belongs = await goalBelongsToUser('00000000-0000-0000-0000-000000000000', testUserId)

      expect(belongs).toBe(false)
    })
  })

  describe('Goal Deletion', () => {
    it('should delete a goal', async () => {
      const goal = await createGoal({
        userId: testUserId,
        title: 'Goal to Delete',
      })

      await deleteGoal(goal.id)

      const deleted = await getGoalById(goal.id)
      expect(deleted).toBeNull()
    })
  })
})
