import { v4 as uuidv4 } from 'uuid'
import { getDb } from '@/lib/db/pg-client'
import { learningGoals, skillTrees } from '@/lib/db/drizzle-schema'
import { eq, and, desc, inArray } from 'drizzle-orm'
import type { LearningGoal, NewLearningGoal } from '@/lib/db/drizzle-schema'
import { syncGoalToLanceDB, deleteGoalFromLanceDB } from './goals-lancedb'

/**
 * Learning Goals Database Operations
 *
 * CRUD operations for learning goals in PostgreSQL.
 * Embeddings are synced to LanceDB asynchronously for duplicate detection.
 * Goals are the top-level entity for goal-based learning.
 */

export type GoalStatus = 'active' | 'paused' | 'completed' | 'archived'

export interface CreateGoalInput {
  userId: string
  title: string
  description?: string
}

export interface UpdateGoalInput {
  title?: string
  description?: string | null
  status?: GoalStatus
  masteryPercentage?: number
  totalTimeSeconds?: number
}

export interface GoalCounts {
  active: number
  archived: number
  total: number
}

/**
 * Create a new learning goal
 */
export async function createGoal(data: CreateGoalInput): Promise<LearningGoal> {
  const db = getDb()

  const [row] = await db
    .insert(learningGoals)
    .values({
      id: uuidv4(),
      userId: data.userId,
      title: data.title,
      description: data.description ?? null,
    })
    .returning()

  console.log(`[Goals] Created goal ${row.id} for user ${data.userId}`)

  // Sync to LanceDB for duplicate detection (async, don't wait)
  syncGoalToLanceDB({
    id: row.id,
    userId: row.userId,
    title: row.title,
    description: row.description,
  }).catch((error) => {
    console.error(`[Goals] Failed to sync goal ${row.id} to LanceDB:`, error)
  })

  return row
}

/**
 * Get goal by ID
 */
export async function getGoalById(goalId: string): Promise<LearningGoal | null> {
  const db = getDb()

  const [row] = await db.select().from(learningGoals).where(eq(learningGoals.id, goalId)).limit(1)

  return row ?? null
}

/**
 * Get goal by ID with ownership check
 */
export async function getGoalByIdForUser(
  goalId: string,
  userId: string
): Promise<LearningGoal | null> {
  const db = getDb()

  const [row] = await db
    .select()
    .from(learningGoals)
    .where(and(eq(learningGoals.id, goalId), eq(learningGoals.userId, userId)))
    .limit(1)

  return row ?? null
}

/**
 * Get all goals for a user
 */
export async function getGoalsByUserId(
  userId: string,
  options?: { status?: GoalStatus; includeArchived?: boolean }
): Promise<LearningGoal[]> {
  const db = getDb()

  let query = db
    .select()
    .from(learningGoals)
    .where(eq(learningGoals.userId, userId))
    .orderBy(desc(learningGoals.createdAt))

  const rows = await query

  // Filter by status if provided
  let filtered = rows
  if (options?.status) {
    filtered = filtered.filter((r) => r.status === options.status)
  }

  // Exclude archived unless explicitly included
  if (!options?.includeArchived) {
    filtered = filtered.filter((r) => r.status !== 'archived')
  }

  return filtered
}

/**
 * Get active goals for a user (shortcut)
 */
export async function getActiveGoals(userId: string): Promise<LearningGoal[]> {
  return getGoalsByUserId(userId, { status: 'active' })
}

/**
 * Update a goal
 */
export async function updateGoal(
  goalId: string,
  data: UpdateGoalInput
): Promise<LearningGoal | null> {
  const db = getDb()

  const updateData: Partial<NewLearningGoal> = {
    updatedAt: new Date(),
  }

  if (data.title !== undefined) updateData.title = data.title
  if (data.description !== undefined) updateData.description = data.description
  if (data.status !== undefined) {
    updateData.status = data.status
    // Set timestamps for status changes
    if (data.status === 'completed') {
      updateData.completedAt = new Date()
    }
    if (data.status === 'archived') {
      updateData.archivedAt = new Date()
    }
  }
  if (data.masteryPercentage !== undefined) updateData.masteryPercentage = data.masteryPercentage
  if (data.totalTimeSeconds !== undefined) updateData.totalTimeSeconds = data.totalTimeSeconds

  const [row] = await db
    .update(learningGoals)
    .set(updateData)
    .where(eq(learningGoals.id, goalId))
    .returning()

  if (row) {
    console.log(`[Goals] Updated goal ${goalId}`)
  }

  return row ?? null
}

/**
 * Update goal mastery percentage
 */
export async function updateGoalMastery(
  goalId: string,
  masteryPercentage: number
): Promise<LearningGoal | null> {
  return updateGoal(goalId, { masteryPercentage })
}

/**
 * Increment goal study time
 */
export async function incrementGoalTime(
  goalId: string,
  additionalSeconds: number
): Promise<LearningGoal | null> {
  const goal = await getGoalById(goalId)
  if (!goal) return null

  const newTotal = goal.totalTimeSeconds + additionalSeconds

  return updateGoal(goalId, { totalTimeSeconds: newTotal })
}

/**
 * Complete a goal (set status to completed)
 */
export async function completeGoal(goalId: string): Promise<LearningGoal | null> {
  return updateGoal(goalId, { status: 'completed', masteryPercentage: 100 })
}

/**
 * Archive a goal
 */
export async function archiveGoal(goalId: string): Promise<LearningGoal | null> {
  return updateGoal(goalId, { status: 'archived' })
}

/**
 * Delete a goal and its associated skill tree (cascade)
 */
export async function deleteGoal(goalId: string): Promise<void> {
  const db = getDb()

  await db.delete(learningGoals).where(eq(learningGoals.id, goalId))

  console.log(`[Goals] Deleted goal ${goalId}`)

  // Remove from LanceDB (async, don't wait)
  deleteGoalFromLanceDB(goalId).catch((error) => {
    console.error(`[Goals] Failed to delete goal ${goalId} from LanceDB:`, error)
  })
}

/**
 * Check if goal belongs to user
 */
export async function goalBelongsToUser(goalId: string, userId: string): Promise<boolean> {
  const goal = await getGoalByIdForUser(goalId, userId)
  return goal !== null
}

/**
 * Count user's goals by status
 */
export async function countGoalsByStatus(userId: string, status?: GoalStatus): Promise<number> {
  const goals = await getGoalsByUserId(userId, {
    status,
    includeArchived: status === 'archived',
  })
  return goals.length
}

/**
 * Get goal with its skill tree
 */
export async function getGoalWithSkillTree(goalId: string): Promise<{
  goal: LearningGoal
  skillTree: typeof skillTrees.$inferSelect | null
} | null> {
  const db = getDb()
  const goal = await getGoalById(goalId)
  if (!goal) return null

  const [tree] = await db.select().from(skillTrees).where(eq(skillTrees.goalId, goalId)).limit(1)

  return {
    goal,
    skillTree: tree ?? null,
  }
}

/**
 * Get goal counts by status for a user
 */
export async function getGoalCounts(userId: string): Promise<GoalCounts> {
  const db = getDb()
  const goals = await db
    .select({ status: learningGoals.status })
    .from(learningGoals)
    .where(eq(learningGoals.userId, userId))

  const active = goals.filter((g) => g.status === 'active').length
  const archived = goals.filter((g) => g.status === 'archived').length

  return { active, archived, total: goals.length }
}

/**
 * Get multiple goals by their IDs
 */
export async function getGoalsByIds(goalIds: string[]): Promise<LearningGoal[]> {
  if (goalIds.length === 0) return []

  const db = getDb()
  return db.select().from(learningGoals).where(inArray(learningGoals.id, goalIds))
}

/**
 * Bulk archive multiple goals
 */
export async function bulkArchiveGoals(goalIds: string[], userId: string): Promise<LearningGoal[]> {
  if (goalIds.length === 0) return []

  const db = getDb()
  const now = new Date()

  const result = await db
    .update(learningGoals)
    .set({
      status: 'archived',
      archivedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        inArray(learningGoals.id, goalIds),
        eq(learningGoals.userId, userId),
        eq(learningGoals.status, 'active')
      )
    )
    .returning()

  console.log(`[Goals] Archived ${result.length} goals for user ${userId}`)
  return result
}

/**
 * Bulk delete multiple goals
 */
export async function bulkDeleteGoals(goalIds: string[], userId: string): Promise<void> {
  if (goalIds.length === 0) return

  const db = getDb()

  // Foreign keys with ON DELETE CASCADE handle:
  // - skill_trees -> skill_nodes -> flashcards
  // - review_logs (via flashcard cascade)
  await db
    .delete(learningGoals)
    .where(and(inArray(learningGoals.id, goalIds), eq(learningGoals.userId, userId)))

  console.log(`[Goals] Deleted ${goalIds.length} goals for user ${userId}`)
}

/**
 * Restore an archived goal to active status
 */
export async function restoreGoal(goalId: string, userId: string): Promise<LearningGoal> {
  const db = getDb()
  const now = new Date()

  const [result] = await db
    .update(learningGoals)
    .set({
      status: 'active',
      archivedAt: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(learningGoals.id, goalId),
        eq(learningGoals.userId, userId),
        eq(learningGoals.status, 'archived')
      )
    )
    .returning()

  console.log(`[Goals] Restored goal ${goalId} for user ${userId}`)
  return result
}
