/**
 * Study Sessions Database Operations
 *
 * CRUD operations for study_sessions table.
 * Implements quiz progress persistence for session resume functionality.
 */

import { getDb } from '@/lib/db/pg-client'
import {
  studySessions,
  learningGoals,
  type StudySession,
  type NewStudySession,
} from '@/lib/db/drizzle-schema'
import { eq, and, lt, desc } from 'drizzle-orm'

// Session expiry times in milliseconds
const SESSION_EXPIRY_MS = {
  default: 24 * 60 * 60 * 1000, // 24 hours for normal modes
  timed: 30 * 60 * 1000, // 30 minutes for timed mode
}

// ============================================================================
// Session CRUD Operations
// ============================================================================

/**
 * Create a new study session
 *
 * @param data - Session data (without id, expiresAt, createdAt)
 * @returns Created session record
 */
export async function createStudySession(
  data: Omit<NewStudySession, 'id' | 'expiresAt' | 'createdAt'>
): Promise<StudySession> {
  const db = getDb()

  // Calculate expiry based on mode
  const expiryMs = data.mode === 'timed' ? SESSION_EXPIRY_MS.timed : SESSION_EXPIRY_MS.default
  const expiresAt = new Date(Date.now() + expiryMs)

  const [created] = await db
    .insert(studySessions)
    .values({
      ...data,
      expiresAt,
    })
    .returning()

  return created
}

/**
 * Get active session for a user, optionally filtered by goal
 *
 * @param userId - User ID
 * @param goalId - Optional goal ID to filter by
 * @returns Active session or null
 */
export async function getActiveSessionForUser(
  userId: string,
  goalId?: string
): Promise<StudySession | null> {
  const db = getDb()
  const now = new Date()

  const conditions = [eq(studySessions.userId, userId), eq(studySessions.status, 'active')]

  if (goalId) {
    conditions.push(eq(studySessions.goalId, goalId))
  }

  const [session] = await db
    .select()
    .from(studySessions)
    .where(and(...conditions))
    .orderBy(desc(studySessions.lastActivityAt))
    .limit(1)

  // Check if session has expired
  if (session && new Date(session.expiresAt) < now) {
    // Mark as abandoned and return null
    await abandonSession(session.id)
    return null
  }

  return session || null
}

/**
 * Get active session with goal title for display
 *
 * @param userId - User ID
 * @param goalId - Optional goal ID to filter by
 * @returns Active session with goal title or null
 */
export async function getActiveSessionWithGoal(
  userId: string,
  goalId?: string
): Promise<(StudySession & { goalTitle: string }) | null> {
  const db = getDb()
  const now = new Date()

  const conditions = [eq(studySessions.userId, userId), eq(studySessions.status, 'active')]

  if (goalId) {
    conditions.push(eq(studySessions.goalId, goalId))
  }

  const [result] = await db
    .select({
      session: studySessions,
      goalTitle: learningGoals.title,
    })
    .from(studySessions)
    .innerJoin(learningGoals, eq(studySessions.goalId, learningGoals.id))
    .where(and(...conditions))
    .orderBy(desc(studySessions.lastActivityAt))
    .limit(1)

  if (!result) return null

  // Check if session has expired
  if (new Date(result.session.expiresAt) < now) {
    await abandonSession(result.session.id)
    return null
  }

  return {
    ...result.session,
    goalTitle: result.goalTitle,
  }
}

/**
 * Get a session by ID
 *
 * @param sessionId - Session ID
 * @returns Session record or null
 */
export async function getSessionById(sessionId: string): Promise<StudySession | null> {
  const db = getDb()
  const [session] = await db
    .select()
    .from(studySessions)
    .where(eq(studySessions.id, sessionId))
    .limit(1)

  return session || null
}

/**
 * Update session progress
 *
 * @param sessionId - Session ID
 * @param updates - Fields to update
 */
export async function updateSessionProgress(
  sessionId: string,
  updates: {
    currentIndex?: number
    responses?: Array<{ cardId: string; rating: number; timeMs: number }>
    timeRemainingMs?: number
    score?: number
  }
): Promise<void> {
  const db = getDb()

  await db
    .update(studySessions)
    .set({
      ...updates,
      lastActivityAt: new Date(),
    })
    .where(eq(studySessions.id, sessionId))
}

/**
 * Add a response to a session
 *
 * @param sessionId - Session ID
 * @param response - Response to add
 * @param newIndex - New current index
 * @param timedUpdates - Optional timed mode updates
 */
export async function addSessionResponse(
  sessionId: string,
  response: { cardId: string; rating: number; timeMs: number },
  newIndex: number,
  timedUpdates?: { timeRemainingMs?: number; score?: number }
): Promise<void> {
  const db = getDb()

  // Get current responses
  const [session] = await db
    .select({ responses: studySessions.responses })
    .from(studySessions)
    .where(eq(studySessions.id, sessionId))
    .limit(1)

  if (!session) return

  const currentResponses =
    (session.responses as Array<{ cardId: string; rating: number; timeMs: number }>) || []

  await db
    .update(studySessions)
    .set({
      responses: [...currentResponses, response],
      currentIndex: newIndex,
      lastActivityAt: new Date(),
      ...(timedUpdates || {}),
    })
    .where(eq(studySessions.id, sessionId))
}

/**
 * Mark a session as completed
 *
 * @param sessionId - Session ID
 */
export async function completeSession(sessionId: string): Promise<void> {
  const db = getDb()

  await db
    .update(studySessions)
    .set({
      status: 'completed',
      completedAt: new Date(),
      lastActivityAt: new Date(),
    })
    .where(eq(studySessions.id, sessionId))
}

/**
 * Mark a session as abandoned
 *
 * @param sessionId - Session ID
 */
export async function abandonSession(sessionId: string): Promise<void> {
  const db = getDb()

  await db
    .update(studySessions)
    .set({
      status: 'abandoned',
      lastActivityAt: new Date(),
    })
    .where(eq(studySessions.id, sessionId))
}

/**
 * Abandon all active sessions for a user/goal (when starting a new one)
 *
 * @param userId - User ID
 * @param goalId - Goal ID
 * @param excludeSessionId - Optional session ID to exclude from abandonment
 * @returns Number of sessions abandoned
 */
export async function abandonConflictingSessions(
  userId: string,
  goalId: string,
  excludeSessionId?: string
): Promise<number> {
  const db = getDb()

  const conditions = [
    eq(studySessions.userId, userId),
    eq(studySessions.goalId, goalId),
    eq(studySessions.status, 'active'),
  ]

  // Get sessions to abandon (excluding the current one if specified)
  const sessionsToAbandon = await db
    .select({ id: studySessions.id })
    .from(studySessions)
    .where(and(...conditions))

  const idsToAbandon = sessionsToAbandon.map((s) => s.id).filter((id) => id !== excludeSessionId)

  if (idsToAbandon.length === 0) return 0

  // Abandon each session
  for (const id of idsToAbandon) {
    await abandonSession(id)
  }

  return idsToAbandon.length
}

/**
 * Cleanup expired sessions (mark as abandoned)
 *
 * Should be called periodically by a cron job
 *
 * @returns Number of sessions cleaned up
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const db = getDb()
  const now = new Date()

  const result = await db
    .update(studySessions)
    .set({
      status: 'abandoned',
    })
    .where(and(eq(studySessions.status, 'active'), lt(studySessions.expiresAt, now)))
    .returning({ id: studySessions.id })

  return result.length
}
