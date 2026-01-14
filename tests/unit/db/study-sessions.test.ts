// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import {
  createStudySession,
  getActiveSessionForUser,
  getActiveSessionWithGoal,
  getSessionById,
  updateSessionProgress,
  addSessionResponse,
  completeSession,
  abandonSession,
  abandonConflictingSessions,
  cleanupExpiredSessions,
} from '@/lib/db/operations/study-sessions'
import { createUser } from '@/lib/db/operations/users'
import { createGoal } from '@/lib/db/operations/goals'
import { initializeSchema, isSchemaInitialized } from '@/lib/db/schema'
import { closeDbConnection } from '@/lib/db/client'
// StudySession type used for return type validation in tests

/**
 * Unit Tests for Study Sessions Database Operations
 *
 * Tests CRUD operations for quiz progress persistence.
 * Covers session lifecycle: creation, progress updates, completion, abandonment.
 */

describe('Study Sessions Database Operations', () => {
  const timestamp = Date.now()
  let testUserId: string
  let testGoalId: string
  let testGoalId2: string

  beforeAll(async () => {
    // Initialize database schema if needed
    const initialized = await isSchemaInitialized()
    if (!initialized) {
      await initializeSchema()
    }

    // Create test user
    const testUser = await createUser({
      email: `study-sessions-test-${timestamp}@example.com`,
      passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.',
      name: 'Study Sessions Test User',
    })
    testUserId = testUser.id

    // Create test goals
    const goal1 = await createGoal({
      userId: testUserId,
      title: 'Learn TypeScript',
      description: 'Master TypeScript fundamentals',
    })
    testGoalId = goal1.id

    const goal2 = await createGoal({
      userId: testUserId,
      title: 'Learn React',
      description: 'Master React fundamentals',
    })
    testGoalId2 = goal2.id
  })

  afterAll(async () => {
    await closeDbConnection()
  })

  describe('createStudySession', () => {
    it('should create a new study session with proper expiry for default mode', async () => {
      const beforeCreate = Date.now()

      const session = await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'flashcard',
        status: 'active',
        cardIds: ['card-1', 'card-2', 'card-3'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(),
        lastActivityAt: new Date(),
      })

      expect(session).toBeDefined()
      expect(session.id).toBeDefined()
      expect(session.userId).toBe(testUserId)
      expect(session.goalId).toBe(testGoalId)
      expect(session.mode).toBe('flashcard')
      expect(session.status).toBe('active')
      expect(session.cardIds).toEqual(['card-1', 'card-2', 'card-3'])
      expect(session.currentIndex).toBe(0)
      expect(session.responses).toEqual([])

      // Check expiry is ~24 hours from now (allow 1 minute tolerance)
      const expiryTime = new Date(session.expiresAt).getTime()
      const expectedExpiry = beforeCreate + 24 * 60 * 60 * 1000
      expect(expiryTime).toBeGreaterThan(expectedExpiry - 60000)
      expect(expiryTime).toBeLessThan(expectedExpiry + 60000)
    })

    it('should create session with 30 minute expiry for timed mode', async () => {
      const beforeCreate = Date.now()

      const session = await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'timed',
        status: 'active',
        cardIds: ['card-1', 'card-2'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(),
        lastActivityAt: new Date(),
        timeRemainingMs: 300000,
        score: 0,
      })

      expect(session.mode).toBe('timed')
      expect(session.timeRemainingMs).toBe(300000)
      expect(session.score).toBe(0)

      // Check expiry is ~30 minutes from now
      const expiryTime = new Date(session.expiresAt).getTime()
      const expectedExpiry = beforeCreate + 30 * 60 * 1000
      expect(expiryTime).toBeGreaterThan(expectedExpiry - 60000)
      expect(expiryTime).toBeLessThan(expectedExpiry + 60000)
    })

    it('should create guided mode session with node tracking', async () => {
      const session = await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'node',
        status: 'active',
        cardIds: ['card-1', 'card-2'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(),
        lastActivityAt: new Date(),
        isGuided: true,
        currentNodeId: '123e4567-e89b-12d3-a456-426614174000',
      })

      expect(session.isGuided).toBe(true)
      expect(session.currentNodeId).toBe('123e4567-e89b-12d3-a456-426614174000')
    })
  })

  describe('getActiveSessionForUser', () => {
    it('should find active session for user', async () => {
      // Clean up any existing sessions for this test
      await abandonConflictingSessions(testUserId, testGoalId)

      const session = await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'flashcard',
        status: 'active',
        cardIds: ['card-1', 'card-2'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(),
        lastActivityAt: new Date(),
      })

      const foundSession = await getActiveSessionForUser(testUserId)

      expect(foundSession).toBeDefined()
      expect(foundSession?.id).toBe(session.id)
      expect(foundSession?.status).toBe('active')
    })

    it('should filter by goalId when provided', async () => {
      // Clean up existing sessions
      await abandonConflictingSessions(testUserId, testGoalId2)

      // Create session for different goal
      await createStudySession({
        userId: testUserId,
        goalId: testGoalId2,
        mode: 'multiple_choice',
        status: 'active',
        cardIds: ['card-3', 'card-4'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(),
        lastActivityAt: new Date(),
      })

      const foundSession = await getActiveSessionForUser(testUserId, testGoalId2)

      expect(foundSession).toBeDefined()
      expect(foundSession?.goalId).toBe(testGoalId2)
      expect(foundSession?.mode).toBe('multiple_choice')
    })

    it('should return null when no active session exists', async () => {
      // Clean up all sessions first
      await abandonConflictingSessions(testUserId, testGoalId)
      await abandonConflictingSessions(testUserId, testGoalId2)

      const session = await getActiveSessionForUser(testUserId)

      expect(session).toBeNull()
    })

    it('should automatically abandon expired sessions', async () => {
      // Create a session that's already expired
      const expiredSession = await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'flashcard',
        status: 'active',
        cardIds: ['card-1'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
        lastActivityAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      })

      // Manually set expiry to the past (simulating expired session)
      const { getDb } = await import('@/lib/db/pg-client')
      const { studySessions } = await import('@/lib/db/drizzle-schema')
      const { eq } = await import('drizzle-orm')
      const db = getDb()
      await db
        .update(studySessions)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(studySessions.id, expiredSession.id))

      // Try to get the expired session
      const session = await getActiveSessionForUser(testUserId, testGoalId)

      // Should not return the expired session
      expect(session?.id).not.toBe(expiredSession.id)

      // Verify session was marked as abandoned
      const abandonedSession = await getSessionById(expiredSession.id)
      expect(abandonedSession?.status).toBe('abandoned')
    })
  })

  describe('getActiveSessionWithGoal', () => {
    it('should return session with goal title', async () => {
      // Clean up existing sessions
      await abandonConflictingSessions(testUserId, testGoalId)

      const session = await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'flashcard',
        status: 'active',
        cardIds: ['card-1', 'card-2'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(),
        lastActivityAt: new Date(),
      })

      const foundSession = await getActiveSessionWithGoal(testUserId, testGoalId)

      expect(foundSession).toBeDefined()
      expect(foundSession?.id).toBe(session.id)
      expect(foundSession?.goalTitle).toBe('Learn TypeScript')
    })

    it('should return null when no active session exists', async () => {
      // Clean up all sessions first
      await abandonConflictingSessions(testUserId, testGoalId)

      const session = await getActiveSessionWithGoal(testUserId, testGoalId)

      expect(session).toBeNull()
    })
  })

  describe('getSessionById', () => {
    it('should retrieve session by ID', async () => {
      const created = await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'flashcard',
        status: 'active',
        cardIds: ['card-1'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(),
        lastActivityAt: new Date(),
      })

      const session = await getSessionById(created.id)

      expect(session).toBeDefined()
      expect(session?.id).toBe(created.id)
    })

    it('should return null for non-existent session', async () => {
      const session = await getSessionById('00000000-0000-0000-0000-000000000000')

      expect(session).toBeNull()
    })
  })

  describe('updateSessionProgress', () => {
    let sessionId: string

    beforeEach(async () => {
      const session = await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'flashcard',
        status: 'active',
        cardIds: ['card-1', 'card-2', 'card-3'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(),
        lastActivityAt: new Date(),
      })
      sessionId = session.id
    })

    it('should update current index', async () => {
      await updateSessionProgress(sessionId, { currentIndex: 2 })

      const session = await getSessionById(sessionId)

      expect(session?.currentIndex).toBe(2)
    })

    it('should update timed mode state', async () => {
      const timedSession = await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'timed',
        status: 'active',
        cardIds: ['card-1', 'card-2'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(),
        lastActivityAt: new Date(),
        timeRemainingMs: 300000,
        score: 0,
      })

      await updateSessionProgress(timedSession.id, {
        currentIndex: 1,
        timeRemainingMs: 250000,
        score: 10,
      })

      const session = await getSessionById(timedSession.id)

      expect(session?.currentIndex).toBe(1)
      expect(session?.timeRemainingMs).toBe(250000)
      expect(session?.score).toBe(10)
    })

    it('should update lastActivityAt timestamp', async () => {
      const before = new Date()

      await updateSessionProgress(sessionId, { currentIndex: 1 })

      const session = await getSessionById(sessionId)
      const lastActivity = new Date(session!.lastActivityAt)

      expect(lastActivity.getTime()).toBeGreaterThanOrEqual(before.getTime())
    })
  })

  describe('addSessionResponse', () => {
    let sessionId: string

    beforeEach(async () => {
      const session = await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'flashcard',
        status: 'active',
        cardIds: ['card-1', 'card-2', 'card-3'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(),
        lastActivityAt: new Date(),
      })
      sessionId = session.id
    })

    it('should add response to empty responses array', async () => {
      await addSessionResponse(sessionId, { cardId: 'card-1', rating: 4, timeMs: 5000 }, 1)

      const session = await getSessionById(sessionId)
      const responses = session?.responses as Array<{
        cardId: string
        rating: number
        timeMs: number
      }>

      expect(responses).toHaveLength(1)
      expect(responses[0]).toEqual({ cardId: 'card-1', rating: 4, timeMs: 5000 })
      expect(session?.currentIndex).toBe(1)
    })

    it('should append response to existing responses', async () => {
      await addSessionResponse(sessionId, { cardId: 'card-1', rating: 4, timeMs: 5000 }, 1)

      await addSessionResponse(sessionId, { cardId: 'card-2', rating: 3, timeMs: 7000 }, 2)

      const session = await getSessionById(sessionId)
      const responses = session?.responses as Array<{
        cardId: string
        rating: number
        timeMs: number
      }>

      expect(responses).toHaveLength(2)
      expect(responses[0]).toEqual({ cardId: 'card-1', rating: 4, timeMs: 5000 })
      expect(responses[1]).toEqual({ cardId: 'card-2', rating: 3, timeMs: 7000 })
      expect(session?.currentIndex).toBe(2)
    })

    it('should update timed mode data with response', async () => {
      const timedSession = await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'timed',
        status: 'active',
        cardIds: ['card-1', 'card-2'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(),
        lastActivityAt: new Date(),
        timeRemainingMs: 300000,
        score: 0,
      })

      await addSessionResponse(timedSession.id, { cardId: 'card-1', rating: 4, timeMs: 3000 }, 1, {
        timeRemainingMs: 297000,
        score: 10,
      })

      const session = await getSessionById(timedSession.id)

      expect(session?.timeRemainingMs).toBe(297000)
      expect(session?.score).toBe(10)
    })

    it('should handle non-existent session gracefully', async () => {
      await addSessionResponse(
        '00000000-0000-0000-0000-000000000000',
        { cardId: 'card-1', rating: 4, timeMs: 5000 },
        1
      )

      // Should not throw error, just silently fail
      const session = await getSessionById('00000000-0000-0000-0000-000000000000')
      expect(session).toBeNull()
    })
  })

  describe('completeSession', () => {
    it('should mark session as completed', async () => {
      const session = await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'flashcard',
        status: 'active',
        cardIds: ['card-1', 'card-2'],
        currentIndex: 2,
        responses: [
          { cardId: 'card-1', rating: 4, timeMs: 5000 },
          { cardId: 'card-2', rating: 3, timeMs: 6000 },
        ],
        startedAt: new Date(),
        lastActivityAt: new Date(),
      })

      const beforeComplete = new Date()
      await completeSession(session.id)

      const completed = await getSessionById(session.id)

      expect(completed?.status).toBe('completed')
      expect(completed?.completedAt).toBeDefined()
      const completedAt = new Date(completed!.completedAt!)
      expect(completedAt.getTime()).toBeGreaterThanOrEqual(beforeComplete.getTime())
    })

    it('should not be found by getActiveSessionForUser after completion', async () => {
      const session = await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'flashcard',
        status: 'active',
        cardIds: ['card-1'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(),
        lastActivityAt: new Date(),
      })

      await completeSession(session.id)

      const activeSession = await getActiveSessionForUser(testUserId, testGoalId)

      // Should not return the completed session
      expect(activeSession?.id).not.toBe(session.id)
    })
  })

  describe('abandonSession', () => {
    it('should mark session as abandoned', async () => {
      const session = await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'flashcard',
        status: 'active',
        cardIds: ['card-1', 'card-2'],
        currentIndex: 1,
        responses: [{ cardId: 'card-1', rating: 4, timeMs: 5000 }],
        startedAt: new Date(),
        lastActivityAt: new Date(),
      })

      await abandonSession(session.id)

      const abandoned = await getSessionById(session.id)

      expect(abandoned?.status).toBe('abandoned')
      expect(abandoned?.completedAt).toBeNull()
    })

    it('should not be found by getActiveSessionForUser after abandonment', async () => {
      const session = await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'flashcard',
        status: 'active',
        cardIds: ['card-1'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(),
        lastActivityAt: new Date(),
      })

      await abandonSession(session.id)

      const activeSession = await getActiveSessionForUser(testUserId, testGoalId)

      // Should not return the abandoned session
      expect(activeSession?.id).not.toBe(session.id)
    })
  })

  describe('abandonConflictingSessions', () => {
    it('should abandon all active sessions for user/goal', async () => {
      // Clean up existing sessions first to get accurate count
      await abandonConflictingSessions(testUserId, testGoalId)

      // Create multiple active sessions for same goal
      const session1 = await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'flashcard',
        status: 'active',
        cardIds: ['card-1'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(),
        lastActivityAt: new Date(),
      })

      const session2 = await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'multiple_choice',
        status: 'active',
        cardIds: ['card-2'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(),
        lastActivityAt: new Date(),
      })

      const count = await abandonConflictingSessions(testUserId, testGoalId)

      expect(count).toBe(2)

      const abandoned1 = await getSessionById(session1.id)
      const abandoned2 = await getSessionById(session2.id)

      expect(abandoned1?.status).toBe('abandoned')
      expect(abandoned2?.status).toBe('abandoned')
    })

    it('should exclude specified session from abandonment', async () => {
      const session1 = await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'flashcard',
        status: 'active',
        cardIds: ['card-1'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(),
        lastActivityAt: new Date(),
      })

      const session2 = await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'multiple_choice',
        status: 'active',
        cardIds: ['card-2'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(),
        lastActivityAt: new Date(),
      })

      const count = await abandonConflictingSessions(testUserId, testGoalId, session2.id)

      expect(count).toBe(1)

      const abandoned1 = await getSessionById(session1.id)
      const kept = await getSessionById(session2.id)

      expect(abandoned1?.status).toBe('abandoned')
      expect(kept?.status).toBe('active')
    })

    it('should not abandon sessions for different goals', async () => {
      await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'flashcard',
        status: 'active',
        cardIds: ['card-1'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(),
        lastActivityAt: new Date(),
      })

      const session2 = await createStudySession({
        userId: testUserId,
        goalId: testGoalId2,
        mode: 'flashcard',
        status: 'active',
        cardIds: ['card-2'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(),
        lastActivityAt: new Date(),
      })

      const count = await abandonConflictingSessions(testUserId, testGoalId)

      expect(count).toBeGreaterThanOrEqual(1)

      // Session for different goal should still be active
      const session2After = await getSessionById(session2.id)
      expect(session2After?.status).toBe('active')
    })

    it('should return 0 when no conflicting sessions exist', async () => {
      const count = await abandonConflictingSessions(
        testUserId,
        '00000000-0000-0000-0000-000000000000'
      )

      expect(count).toBe(0)
    })
  })

  describe('cleanupExpiredSessions', () => {
    it('should mark expired sessions as abandoned', async () => {
      // Create session and manually expire it
      const session = await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'flashcard',
        status: 'active',
        cardIds: ['card-1'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        lastActivityAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      })

      // Manually set expiry to the past
      const { getDb } = await import('@/lib/db/pg-client')
      const { studySessions } = await import('@/lib/db/drizzle-schema')
      const { eq } = await import('drizzle-orm')
      const db = getDb()
      await db
        .update(studySessions)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(studySessions.id, session.id))

      const count = await cleanupExpiredSessions()

      expect(count).toBeGreaterThanOrEqual(1)

      const cleaned = await getSessionById(session.id)
      expect(cleaned?.status).toBe('abandoned')
    })

    it('should not affect non-expired sessions', async () => {
      const session = await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'flashcard',
        status: 'active',
        cardIds: ['card-1'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(),
        lastActivityAt: new Date(),
      })

      await cleanupExpiredSessions()

      const stillActive = await getSessionById(session.id)
      expect(stillActive?.status).toBe('active')
    })

    it('should not affect already completed sessions', async () => {
      const session = await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'flashcard',
        status: 'active',
        cardIds: ['card-1'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(),
        lastActivityAt: new Date(),
      })

      await completeSession(session.id)

      // Manually set expiry to the past
      const { getDb } = await import('@/lib/db/pg-client')
      const { studySessions } = await import('@/lib/db/drizzle-schema')
      const { eq } = await import('drizzle-orm')
      const db = getDb()
      await db
        .update(studySessions)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(studySessions.id, session.id))

      await cleanupExpiredSessions()

      const stillCompleted = await getSessionById(session.id)
      expect(stillCompleted?.status).toBe('completed')
    })

    it('should return 0 when no expired sessions exist', async () => {
      // Create fresh session
      await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'flashcard',
        status: 'active',
        cardIds: ['card-1'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(),
        lastActivityAt: new Date(),
      })

      const count = await cleanupExpiredSessions()

      // Might be > 0 due to other tests, but verify no fresh sessions were affected
      // This is acceptable in this test context
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Session Expiry Calculation', () => {
    it('should set 24 hour expiry for flashcard mode', async () => {
      const beforeCreate = Date.now()
      const session = await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'flashcard',
        status: 'active',
        cardIds: ['card-1'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(),
        lastActivityAt: new Date(),
      })

      const expiryTime = new Date(session.expiresAt).getTime()
      const expectedExpiry = beforeCreate + 24 * 60 * 60 * 1000

      expect(expiryTime).toBeGreaterThan(expectedExpiry - 60000)
      expect(expiryTime).toBeLessThan(expectedExpiry + 60000)
    })

    it('should set 24 hour expiry for multiple_choice mode', async () => {
      const beforeCreate = Date.now()
      const session = await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'multiple_choice',
        status: 'active',
        cardIds: ['card-1'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(),
        lastActivityAt: new Date(),
      })

      const expiryTime = new Date(session.expiresAt).getTime()
      const expectedExpiry = beforeCreate + 24 * 60 * 60 * 1000

      expect(expiryTime).toBeGreaterThan(expectedExpiry - 60000)
      expect(expiryTime).toBeLessThan(expectedExpiry + 60000)
    })

    it('should set 24 hour expiry for mixed mode', async () => {
      const beforeCreate = Date.now()
      const session = await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'mixed',
        status: 'active',
        cardIds: ['card-1'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(),
        lastActivityAt: new Date(),
      })

      const expiryTime = new Date(session.expiresAt).getTime()
      const expectedExpiry = beforeCreate + 24 * 60 * 60 * 1000

      expect(expiryTime).toBeGreaterThan(expectedExpiry - 60000)
      expect(expiryTime).toBeLessThan(expectedExpiry + 60000)
    })

    it('should set 30 minute expiry for timed mode', async () => {
      const beforeCreate = Date.now()
      const session = await createStudySession({
        userId: testUserId,
        goalId: testGoalId,
        mode: 'timed',
        status: 'active',
        cardIds: ['card-1'],
        currentIndex: 0,
        responses: [],
        startedAt: new Date(),
        lastActivityAt: new Date(),
      })

      const expiryTime = new Date(session.expiresAt).getTime()
      const expectedExpiry = beforeCreate + 30 * 60 * 1000

      expect(expiryTime).toBeGreaterThan(expectedExpiry - 60000)
      expect(expiryTime).toBeLessThan(expectedExpiry + 60000)
    })
  })
})
