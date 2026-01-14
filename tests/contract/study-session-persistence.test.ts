// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { POST as sessionCreate } from '@/app/api/study/session/route'
import { GET as sessionActive } from '@/app/api/study/session/active/route'
import { POST as sessionResume } from '@/app/api/study/session/resume/route'
import { POST as sessionProgress } from '@/app/api/study/session/progress/route'
import { DELETE as sessionAbandon } from '@/app/api/study/session/abandon/route'
import { POST as sessionComplete } from '@/app/api/study/session/complete/route'
import { createUser } from '@/lib/db/operations/users'
import { createGoal } from '@/lib/db/operations/goals'
import { createSkillTree } from '@/lib/db/operations/skill-trees'
import { createSkillNode } from '@/lib/db/operations/skill-nodes'
import { createGoalFlashcard } from '@/lib/db/operations/flashcards'
import { getSessionById } from '@/lib/db/operations/study-sessions'
import { initializeSchema, isSchemaInitialized } from '@/lib/db/schema'
import { closeDbConnection } from '@/lib/db/client'
import { NextRequest } from 'next/server'

/**
 * Contract Tests for Study Session Persistence API
 *
 * Tests API endpoints for quiz progress persistence:
 * - POST /api/study/session - Create session (now persists)
 * - GET /api/study/session/active - Check for active session
 * - POST /api/study/session/resume - Resume session
 * - POST /api/study/session/progress - Save progress
 * - DELETE /api/study/session/abandon - Abandon session
 * - POST /api/study/session/complete - Complete session (now persists)
 */

// Mock NextAuth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

import { auth } from '@/auth'

describe('Study Session Persistence API', () => {
  const timestamp = Date.now()
  let testUserId: string
  let testGoalId: string
  let testTreeId: string
  let testNodeId: string
  let testCardIds: string[] = []

  beforeAll(async () => {
    // Initialize database schema if needed
    const initialized = await isSchemaInitialized()
    if (!initialized) {
      await initializeSchema()
    }

    // Create test user
    const testUser = await createUser({
      email: `session-api-test-${timestamp}@example.com`,
      passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.',
      name: 'Session API Test User',
    })
    testUserId = testUser.id

    // Create test goal
    const goal = await createGoal({
      userId: testUserId,
      title: 'Learn GraphQL',
      description: 'Master GraphQL fundamentals',
    })
    testGoalId = goal.id

    // Create skill tree
    const tree = await createSkillTree({
      goalId: testGoalId,
    })
    testTreeId = tree.id

    // Create skill node
    const node = await createSkillNode({
      treeId: testTreeId,
      title: 'Queries',
      description: 'GraphQL queries',
      depth: 1,
      path: '0',
      sortOrder: 0,
    })
    testNodeId = node.id

    // Create test flashcards
    for (let i = 0; i < 10; i++) {
      const card = await createGoalFlashcard({
        userId: testUserId,
        skillNodeId: testNodeId,
        question: `What is GraphQL feature ${i}?`,
        answer: `GraphQL feature ${i} description`,
        cardType: 'flashcard',
      })
      testCardIds.push(card.id)
    }

    // Mock auth to return test user
    ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: testUserId, email: `session-api-test-${timestamp}@example.com` },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
  })

  afterAll(async () => {
    await closeDbConnection()
  })

  describe('POST /api/study/session', () => {
    it('should create and persist a new study session', async () => {
      const request = new NextRequest('http://localhost:3000/api/study/session', {
        method: 'POST',
        body: JSON.stringify({
          goalId: testGoalId,
          mode: 'flashcard',
          cardLimit: 5,
        }),
      })

      const response = await sessionCreate(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('sessionId')
      expect(data.sessionId).toBeDefined()
      expect(data.mode).toBe('flashcard')
      expect(data.cards).toBeDefined()
      expect(Array.isArray(data.cards)).toBe(true)

      // Verify session was persisted
      const session = await getSessionById(data.sessionId)
      expect(session).toBeDefined()
      expect(session?.status).toBe('active')
      expect(session?.goalId).toBe(testGoalId)
    })

    it('should create timed mode session with proper settings', async () => {
      const request = new NextRequest('http://localhost:3000/api/study/session', {
        method: 'POST',
        body: JSON.stringify({
          goalId: testGoalId,
          mode: 'timed',
          cardLimit: 10,
        }),
      })

      const response = await sessionCreate(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.mode).toBe('timed')
      expect(data.timedSettings).toBeDefined()
      expect(data.timedSettings.durationSeconds).toBe(300)

      // Verify session has timed data
      const session = await getSessionById(data.sessionId)
      expect(session?.timeRemainingMs).toBe(300000)
      expect(session?.score).toBe(0)
    })

    it('should abandon conflicting sessions when creating new one', async () => {
      // Create first session
      const request1 = new NextRequest('http://localhost:3000/api/study/session', {
        method: 'POST',
        body: JSON.stringify({
          goalId: testGoalId,
          mode: 'flashcard',
          cardLimit: 5,
        }),
      })

      const response1 = await sessionCreate(request1)
      const data1 = await response1.json()
      const firstSessionId = data1.sessionId

      // Create second session for same goal
      const request2 = new NextRequest('http://localhost:3000/api/study/session', {
        method: 'POST',
        body: JSON.stringify({
          goalId: testGoalId,
          mode: 'multiple_choice',
          cardLimit: 5,
        }),
      })

      const response2 = await sessionCreate(request2)
      const data2 = await response2.json()

      expect(response2.status).toBe(200)
      expect(data2.sessionId).not.toBe(firstSessionId)

      // First session should be abandoned
      const firstSession = await getSessionById(firstSessionId)
      expect(firstSession?.status).toBe('abandoned')
    })

    it('should return 401 when not authenticated', async () => {
      ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost:3000/api/study/session', {
        method: 'POST',
        body: JSON.stringify({
          goalId: testGoalId,
          mode: 'flashcard',
        }),
      })

      const response = await sessionCreate(request)

      expect(response.status).toBe(401)
    })

    it('should return 400 for invalid mode', async () => {
      const request = new NextRequest('http://localhost:3000/api/study/session', {
        method: 'POST',
        body: JSON.stringify({
          goalId: testGoalId,
          mode: 'invalid_mode',
        }),
      })

      const response = await sessionCreate(request)

      expect(response.status).toBe(400)
    })

    it('should return 404 for non-existent goal', async () => {
      const request = new NextRequest('http://localhost:3000/api/study/session', {
        method: 'POST',
        body: JSON.stringify({
          goalId: '00000000-0000-0000-0000-000000000000',
          mode: 'flashcard',
        }),
      })

      const response = await sessionCreate(request)

      expect(response.status).toBe(404)
    })
  })

  describe('GET /api/study/session/active', () => {
    let activeSessionId: string

    beforeAll(async () => {
      // Create an active session
      const request = new NextRequest('http://localhost:3000/api/study/session', {
        method: 'POST',
        body: JSON.stringify({
          goalId: testGoalId,
          mode: 'flashcard',
          cardLimit: 5,
        }),
      })

      const response = await sessionCreate(request)
      const data = await response.json()
      activeSessionId = data.sessionId
    })

    it('should return active session for goal', async () => {
      const url = new URL('http://localhost:3000/api/study/session/active')
      url.searchParams.set('goalId', testGoalId)
      const request = new NextRequest(url)

      const response = await sessionActive(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.hasActiveSession).toBe(true)
      expect(data.session).toBeDefined()
      expect(data.session.sessionId).toBe(activeSessionId)
      expect(data.session.goalId).toBe(testGoalId)
      expect(data.session.goalTitle).toBe('Learn GraphQL')
      expect(data.session.progress).toBeDefined()
      expect(data.session.progress.currentIndex).toBeDefined()
      expect(data.session.progress.totalCards).toBeDefined()
      expect(data.session.progress.percentComplete).toBeDefined()
    })

    it('should return no session when none exists', async () => {
      // Complete the active session first
      const completeRequest = new NextRequest('http://localhost:3000/api/study/session/complete', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: activeSessionId,
          goalId: testGoalId,
          mode: 'flashcard',
          durationSeconds: 60,
          ratings: [],
        }),
      })
      await sessionComplete(completeRequest)

      const url = new URL('http://localhost:3000/api/study/session/active')
      url.searchParams.set('goalId', testGoalId)
      const request = new NextRequest(url)

      const response = await sessionActive(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.hasActiveSession).toBe(false)
      expect(data.session).toBeNull()
    })

    it('should return 401 when not authenticated', async () => {
      ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

      const url = new URL('http://localhost:3000/api/study/session/active')
      const request = new NextRequest(url)

      const response = await sessionActive(request)

      expect(response.status).toBe(401)
    })

    it('should include timed mode data when applicable', async () => {
      // Create timed session
      const createRequest = new NextRequest('http://localhost:3000/api/study/session', {
        method: 'POST',
        body: JSON.stringify({
          goalId: testGoalId,
          mode: 'timed',
          cardLimit: 5,
        }),
      })

      const createResponse = await sessionCreate(createRequest)
      await createResponse.json() // consume response

      // Check active session
      const url = new URL('http://localhost:3000/api/study/session/active')
      url.searchParams.set('goalId', testGoalId)
      const request = new NextRequest(url)

      const response = await sessionActive(request)
      const data = await response.json()

      expect(data.session.mode).toBe('timed')
      expect(data.session.timeRemainingMs).toBeDefined()
      expect(data.session.score).toBeDefined()
    })
  })

  describe('POST /api/study/session/resume', () => {
    let resumableSessionId: string

    beforeAll(async () => {
      // Create a session to resume
      const request = new NextRequest('http://localhost:3000/api/study/session', {
        method: 'POST',
        body: JSON.stringify({
          goalId: testGoalId,
          mode: 'flashcard',
          cardLimit: 5,
        }),
      })

      const response = await sessionCreate(request)
      const data = await response.json()
      resumableSessionId = data.sessionId
    })

    it('should resume session with fresh card data', async () => {
      const request = new NextRequest('http://localhost:3000/api/study/session/resume', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: resumableSessionId,
        }),
      })

      const response = await sessionResume(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sessionId).toBe(resumableSessionId)
      expect(data.mode).toBe('flashcard')
      expect(data.cards).toBeDefined()
      expect(Array.isArray(data.cards)).toBe(true)
      expect(data.currentIndex).toBeDefined()
      expect(data.responses).toBeDefined()
    })

    it('should return 401 when not authenticated', async () => {
      ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost:3000/api/study/session/resume', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: resumableSessionId,
        }),
      })

      const response = await sessionResume(request)

      expect(response.status).toBe(401)
    })

    it('should return 400 for invalid sessionId format', async () => {
      const request = new NextRequest('http://localhost:3000/api/study/session/resume', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'not-a-uuid',
        }),
      })

      const response = await sessionResume(request)

      expect(response.status).toBe(400)
    })

    it('should return 404 for non-existent session', async () => {
      const request = new NextRequest('http://localhost:3000/api/study/session/resume', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: '00000000-0000-0000-0000-000000000000',
        }),
      })

      const response = await sessionResume(request)

      expect(response.status).toBe(404)
    })

    it("should return 403 when trying to resume another user's session", async () => {
      // Create another user's session
      const otherUser = await createUser({
        email: `other-user-${timestamp}@example.com`,
        passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.',
        name: 'Other User',
      })

      const otherGoal = await createGoal({
        userId: otherUser.id,
        title: 'Other Goal',
        description: 'Test goal',
      })

      // Create skill tree and node for other user's goal
      const otherTree = await createSkillTree({
        goalId: otherGoal.id,
      })

      const otherNode = await createSkillNode({
        treeId: otherTree.id,
        title: 'Other Node',
        description: 'Test node',
        depth: 1,
        path: '0',
        sortOrder: 0,
      })

      // Create flashcard for other user
      await createGoalFlashcard({
        userId: otherUser.id,
        skillNodeId: otherNode.id,
        question: 'Other question?',
        answer: 'Other answer',
        cardType: 'flashcard',
      })

      // Mock auth as other user temporarily
      ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        user: { id: otherUser.id, email: `other-user-${timestamp}@example.com` },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      // Create session as other user
      const createRequest = new NextRequest('http://localhost:3000/api/study/session', {
        method: 'POST',
        body: JSON.stringify({
          goalId: otherGoal.id,
          mode: 'flashcard',
          cardLimit: 5,
        }),
      })

      const createResponse = await sessionCreate(createRequest)
      const createData = await createResponse.json()
      const otherSessionId = createData.sessionId

      // Verify session was created successfully
      expect(createResponse.status).toBe(200)
      expect(otherSessionId).toBeDefined()

      // Restore original user auth
      ;(auth as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: testUserId, email: `session-api-test-${timestamp}@example.com` },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })

      // Try to resume other user's session
      const request = new NextRequest('http://localhost:3000/api/study/session/resume', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: otherSessionId,
        }),
      })

      const response = await sessionResume(request)

      expect(response.status).toBe(403)
    })

    it('should return 400 for completed session', async () => {
      // Create and complete a session
      const createRequest = new NextRequest('http://localhost:3000/api/study/session', {
        method: 'POST',
        body: JSON.stringify({
          goalId: testGoalId,
          mode: 'flashcard',
          cardLimit: 3,
        }),
      })

      const createResponse = await sessionCreate(createRequest)
      const createData = await createResponse.json()
      const completedSessionId = createData.sessionId

      const completeRequest = new NextRequest('http://localhost:3000/api/study/session/complete', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: completedSessionId,
          goalId: testGoalId,
          mode: 'flashcard',
          durationSeconds: 60,
          ratings: [],
        }),
      })
      await sessionComplete(completeRequest)

      // Try to resume
      const request = new NextRequest('http://localhost:3000/api/study/session/resume', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: completedSessionId,
        }),
      })

      const response = await sessionResume(request)

      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/study/session/progress', () => {
    let progressSessionId: string

    beforeAll(async () => {
      // Create a session for progress testing
      const request = new NextRequest('http://localhost:3000/api/study/session', {
        method: 'POST',
        body: JSON.stringify({
          goalId: testGoalId,
          mode: 'flashcard',
          cardLimit: 5,
        }),
      })

      const response = await sessionCreate(request)
      const data = await response.json()
      progressSessionId = data.sessionId
    })

    it('should save progress with response', async () => {
      const request = new NextRequest('http://localhost:3000/api/study/session/progress', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: progressSessionId,
          currentIndex: 1,
          response: {
            cardId: testCardIds[0],
            rating: 4,
            timeMs: 5000,
          },
        }),
      })

      const response = await sessionProgress(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify progress was saved
      const session = await getSessionById(progressSessionId)
      expect(session?.currentIndex).toBe(1)
      expect(session?.responses).toHaveLength(1)
    })

    it('should save progress without response', async () => {
      const request = new NextRequest('http://localhost:3000/api/study/session/progress', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: progressSessionId,
          currentIndex: 2,
        }),
      })

      const response = await sessionProgress(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify index was updated
      const session = await getSessionById(progressSessionId)
      expect(session?.currentIndex).toBe(2)
    })

    it('should handle sendBeacon text/plain content type', async () => {
      const payload = JSON.stringify({
        sessionId: progressSessionId,
        currentIndex: 3,
      })

      const request = new NextRequest('http://localhost:3000/api/study/session/progress', {
        method: 'POST',
        headers: {
          'content-type': 'text/plain',
        },
        body: payload,
      })

      const response = await sessionProgress(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should save timed mode updates', async () => {
      // Create timed session
      const createRequest = new NextRequest('http://localhost:3000/api/study/session', {
        method: 'POST',
        body: JSON.stringify({
          goalId: testGoalId,
          mode: 'timed',
          cardLimit: 5,
        }),
      })

      const createResponse = await sessionCreate(createRequest)
      const createData = await createResponse.json()
      const timedSessionId = createData.sessionId

      const request = new NextRequest('http://localhost:3000/api/study/session/progress', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: timedSessionId,
          currentIndex: 1,
          response: {
            cardId: testCardIds[0],
            rating: 4,
            timeMs: 3000,
          },
          timeRemainingMs: 297000,
          score: 10,
        }),
      })

      const response = await sessionProgress(request)

      expect(response.status).toBe(200)

      // Verify timed data was saved
      const session = await getSessionById(timedSessionId)
      expect(session?.timeRemainingMs).toBe(297000)
      expect(session?.score).toBe(10)
    })

    it('should return 401 when not authenticated', async () => {
      ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost:3000/api/study/session/progress', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: progressSessionId,
          currentIndex: 1,
        }),
      })

      const response = await sessionProgress(request)

      expect(response.status).toBe(401)
    })

    it('should return 400 for invalid request data', async () => {
      const request = new NextRequest('http://localhost:3000/api/study/session/progress', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: progressSessionId,
          currentIndex: -1, // Invalid
        }),
      })

      const response = await sessionProgress(request)

      expect(response.status).toBe(400)
    })

    it('should return 404 for non-existent session', async () => {
      const request = new NextRequest('http://localhost:3000/api/study/session/progress', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: '00000000-0000-0000-0000-000000000000',
          currentIndex: 1,
        }),
      })

      const response = await sessionProgress(request)

      expect(response.status).toBe(404)
    })
  })

  describe('DELETE /api/study/session/abandon', () => {
    let abandonSessionId: string

    beforeAll(async () => {
      // Create a session to abandon
      const request = new NextRequest('http://localhost:3000/api/study/session', {
        method: 'POST',
        body: JSON.stringify({
          goalId: testGoalId,
          mode: 'flashcard',
          cardLimit: 5,
        }),
      })

      const response = await sessionCreate(request)
      const data = await response.json()
      abandonSessionId = data.sessionId
    })

    it('should abandon active session', async () => {
      const request = new NextRequest('http://localhost:3000/api/study/session/abandon', {
        method: 'DELETE',
        body: JSON.stringify({
          sessionId: abandonSessionId,
        }),
      })

      const response = await sessionAbandon(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // Verify session was abandoned
      const session = await getSessionById(abandonSessionId)
      expect(session?.status).toBe('abandoned')
    })

    it('should return success when abandoning already abandoned session', async () => {
      const request = new NextRequest('http://localhost:3000/api/study/session/abandon', {
        method: 'DELETE',
        body: JSON.stringify({
          sessionId: abandonSessionId,
        }),
      })

      const response = await sessionAbandon(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return 401 when not authenticated', async () => {
      ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost:3000/api/study/session/abandon', {
        method: 'DELETE',
        body: JSON.stringify({
          sessionId: abandonSessionId,
        }),
      })

      const response = await sessionAbandon(request)

      expect(response.status).toBe(401)
    })

    it('should return 400 for invalid sessionId format', async () => {
      const request = new NextRequest('http://localhost:3000/api/study/session/abandon', {
        method: 'DELETE',
        body: JSON.stringify({
          sessionId: 'not-a-uuid',
        }),
      })

      const response = await sessionAbandon(request)

      expect(response.status).toBe(400)
    })

    it('should return 404 for non-existent session', async () => {
      const request = new NextRequest('http://localhost:3000/api/study/session/abandon', {
        method: 'DELETE',
        body: JSON.stringify({
          sessionId: '00000000-0000-0000-0000-000000000000',
        }),
      })

      const response = await sessionAbandon(request)

      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/study/session/complete', () => {
    let completeSessionId: string

    beforeAll(async () => {
      // Create a session to complete
      const request = new NextRequest('http://localhost:3000/api/study/session', {
        method: 'POST',
        body: JSON.stringify({
          goalId: testGoalId,
          mode: 'flashcard',
          cardLimit: 3,
        }),
      })

      const response = await sessionCreate(request)
      const data = await response.json()
      completeSessionId = data.sessionId
    })

    it('should complete session and mark as completed', async () => {
      const request = new NextRequest('http://localhost:3000/api/study/session/complete', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: completeSessionId,
          goalId: testGoalId,
          mode: 'flashcard',
          durationSeconds: 120,
          ratings: [
            { cardId: testCardIds[0], rating: 4 },
            { cardId: testCardIds[1], rating: 3 },
            { cardId: testCardIds[2], rating: 4 },
          ],
        }),
      })

      const response = await sessionComplete(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.summary).toBeDefined()
      expect(data.summary.cardsStudied).toBe(3)
      expect(data.summary.timeSpent).toBe(120)

      // Verify session was marked as completed
      const session = await getSessionById(completeSessionId)
      expect(session?.status).toBe('completed')
      expect(session?.completedAt).toBeDefined()
    })

    it('should return 401 when not authenticated', async () => {
      ;(auth as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

      const request = new NextRequest('http://localhost:3000/api/study/session/complete', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: completeSessionId,
          goalId: testGoalId,
          mode: 'flashcard',
          durationSeconds: 60,
          ratings: [],
        }),
      })

      const response = await sessionComplete(request)

      expect(response.status).toBe(401)
    })
  })

  describe('End-to-End Session Flow', () => {
    it('should handle complete session lifecycle', async () => {
      // 1. Create session
      const createRequest = new NextRequest('http://localhost:3000/api/study/session', {
        method: 'POST',
        body: JSON.stringify({
          goalId: testGoalId,
          mode: 'flashcard',
          cardLimit: 3,
        }),
      })

      const createResponse = await sessionCreate(createRequest)
      const createData = await createResponse.json()
      const sessionId = createData.sessionId
      const cards = createData.cards

      expect(createResponse.status).toBe(200)
      expect(sessionId).toBeDefined()

      // 2. Check for active session
      const activeUrl = new URL('http://localhost:3000/api/study/session/active')
      activeUrl.searchParams.set('goalId', testGoalId)
      const activeRequest = new NextRequest(activeUrl)

      const activeResponse = await sessionActive(activeRequest)
      const activeData = await activeResponse.json()

      expect(activeData.hasActiveSession).toBe(true)
      expect(activeData.session.sessionId).toBe(sessionId)

      // 3. Save progress after rating first card
      const progress1Request = new NextRequest('http://localhost:3000/api/study/session/progress', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          currentIndex: 1,
          response: {
            cardId: cards[0].id,
            rating: 4,
            timeMs: 5000,
          },
        }),
      })

      const progress1Response = await sessionProgress(progress1Request)
      expect(progress1Response.status).toBe(200)

      // 4. Simulate browser refresh - resume session
      const resumeRequest = new NextRequest('http://localhost:3000/api/study/session/resume', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
        }),
      })

      const resumeResponse = await sessionResume(resumeRequest)
      const resumeData = await resumeResponse.json()

      expect(resumeResponse.status).toBe(200)
      expect(resumeData.currentIndex).toBe(1)
      expect(resumeData.responses).toHaveLength(1)

      // 5. Continue and complete remaining cards
      for (let i = 1; i < cards.length; i++) {
        const progressRequest = new NextRequest(
          'http://localhost:3000/api/study/session/progress',
          {
            method: 'POST',
            body: JSON.stringify({
              sessionId,
              currentIndex: i + 1,
              response: {
                cardId: cards[i].id,
                rating: 3,
                timeMs: 6000,
              },
            }),
          }
        )

        await sessionProgress(progressRequest)
      }

      // 6. Complete session
      const completeRequest = new NextRequest('http://localhost:3000/api/study/session/complete', {
        method: 'POST',
        body: JSON.stringify({
          sessionId,
          goalId: testGoalId,
          mode: 'flashcard',
          durationSeconds: 60,
          ratings: cards.map((card: { id: string }) => ({ cardId: card.id, rating: 3 })),
        }),
      })

      const completeResponse = await sessionComplete(completeRequest)
      expect(completeResponse.status).toBe(200)

      // 7. Verify no active session exists
      const finalActiveRequest = new NextRequest(activeUrl)
      const finalActiveResponse = await sessionActive(finalActiveRequest)
      const finalActiveData = await finalActiveResponse.json()

      expect(finalActiveData.hasActiveSession).toBe(false)
    })
  })
})
