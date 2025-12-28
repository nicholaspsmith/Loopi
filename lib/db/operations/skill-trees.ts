import { v4 as uuidv4 } from 'uuid'
import { getDb } from '@/lib/db/pg-client'
import { skillTrees, skillNodes } from '@/lib/db/drizzle-schema'
import { eq } from 'drizzle-orm'
import type { SkillTree, NewSkillTree } from '@/lib/db/drizzle-schema'

/**
 * Skill Trees Database Operations
 *
 * CRUD operations for skill trees in PostgreSQL.
 * Each learning goal has exactly one skill tree.
 */

export type GeneratedBy = 'ai' | 'curated'

export interface CreateSkillTreeInput {
  goalId: string
  generatedBy?: GeneratedBy
  curatedSourceId?: string
}

export interface UpdateSkillTreeInput {
  nodeCount?: number
  maxDepth?: number
  regeneratedAt?: Date
}

/**
 * Create a new skill tree for a goal
 */
export async function createSkillTree(data: CreateSkillTreeInput): Promise<SkillTree> {
  const db = getDb()

  const [row] = await db
    .insert(skillTrees)
    .values({
      id: uuidv4(),
      goalId: data.goalId,
      generatedBy: data.generatedBy ?? 'ai',
      curatedSourceId: data.curatedSourceId ?? null,
    })
    .returning()

  console.log(`[SkillTrees] Created skill tree ${row.id} for goal ${data.goalId}`)

  return row
}

/**
 * Get skill tree by ID
 */
export async function getSkillTreeById(treeId: string): Promise<SkillTree | null> {
  const db = getDb()

  const [row] = await db.select().from(skillTrees).where(eq(skillTrees.id, treeId)).limit(1)

  return row ?? null
}

/**
 * Get skill tree by goal ID
 */
export async function getSkillTreeByGoalId(goalId: string): Promise<SkillTree | null> {
  const db = getDb()

  const [row] = await db.select().from(skillTrees).where(eq(skillTrees.goalId, goalId)).limit(1)

  return row ?? null
}

/**
 * Update a skill tree
 */
export async function updateSkillTree(
  treeId: string,
  data: UpdateSkillTreeInput
): Promise<SkillTree | null> {
  const db = getDb()

  const updateData: Partial<NewSkillTree> = {
    updatedAt: new Date(),
  }

  if (data.nodeCount !== undefined) updateData.nodeCount = data.nodeCount
  if (data.maxDepth !== undefined) updateData.maxDepth = data.maxDepth
  if (data.regeneratedAt !== undefined) updateData.regeneratedAt = data.regeneratedAt

  const [row] = await db
    .update(skillTrees)
    .set(updateData)
    .where(eq(skillTrees.id, treeId))
    .returning()

  if (row) {
    console.log(`[SkillTrees] Updated skill tree ${treeId}`)
  }

  return row ?? null
}

/**
 * Update skill tree stats (node count, max depth)
 * Called after adding/removing nodes
 */
export async function updateSkillTreeStats(treeId: string): Promise<SkillTree | null> {
  const db = getDb()

  // Get all nodes for this tree
  const nodes = await db.select().from(skillNodes).where(eq(skillNodes.treeId, treeId))

  const nodeCount = nodes.length
  const maxDepth = nodes.reduce((max, node) => Math.max(max, node.depth), 0)

  return updateSkillTree(treeId, { nodeCount, maxDepth })
}

/**
 * Mark skill tree as regenerated
 */
export async function markTreeRegenerated(treeId: string): Promise<SkillTree | null> {
  return updateSkillTree(treeId, { regeneratedAt: new Date() })
}

/**
 * Delete a skill tree (nodes cascade automatically)
 */
export async function deleteSkillTree(treeId: string): Promise<void> {
  const db = getDb()

  await db.delete(skillTrees).where(eq(skillTrees.id, treeId))

  console.log(`[SkillTrees] Deleted skill tree ${treeId}`)
}

/**
 * Get skill tree with all nodes
 */
export async function getSkillTreeWithNodes(
  treeId: string
): Promise<{ tree: SkillTree; nodes: (typeof skillNodes.$inferSelect)[] } | null> {
  const db = getDb()

  const tree = await getSkillTreeById(treeId)
  if (!tree) return null

  const nodes = await db
    .select()
    .from(skillNodes)
    .where(eq(skillNodes.treeId, treeId))
    .orderBy(skillNodes.path)

  return { tree, nodes }
}

/**
 * Get skill tree by goal ID with all nodes
 */
export async function getSkillTreeByGoalIdWithNodes(
  goalId: string
): Promise<{ tree: SkillTree; nodes: (typeof skillNodes.$inferSelect)[] } | null> {
  const tree = await getSkillTreeByGoalId(goalId)
  if (!tree) return null

  return getSkillTreeWithNodes(tree.id)
}
