import { v4 as uuidv4 } from 'uuid'
import { getDb } from '@/lib/db/pg-client'
import { skillNodes, flashcards, skillTrees, learningGoals } from '@/lib/db/drizzle-schema'
import { eq, and, like, isNull, sql } from 'drizzle-orm'
import type { SkillNode, NewSkillNode } from '@/lib/db/drizzle-schema'
import { State, type Card } from 'ts-fsrs'

/**
 * Skill Nodes Database Operations
 *
 * CRUD operations for skill tree nodes in PostgreSQL.
 * Includes mastery calculation algorithm from research.md.
 */

export interface CreateSkillNodeInput {
  treeId: string
  parentId?: string | null
  title: string
  description?: string | null
  depth: number
  path: string
  sortOrder?: number
}

export interface UpdateSkillNodeInput {
  title?: string
  description?: string | null
  isEnabled?: boolean
  masteryPercentage?: number
  cardCount?: number
  sortOrder?: number
}

export interface SkillNodeWithChildren extends SkillNode {
  children?: SkillNodeWithChildren[]
}

/**
 * Create a new skill node
 */
export async function createSkillNode(data: CreateSkillNodeInput): Promise<SkillNode> {
  const db = getDb()

  const [row] = await db
    .insert(skillNodes)
    .values({
      id: uuidv4(),
      treeId: data.treeId,
      parentId: data.parentId ?? null,
      title: data.title,
      description: data.description ?? null,
      depth: data.depth,
      path: data.path,
      sortOrder: data.sortOrder ?? 0,
    })
    .returning()

  console.log(`[SkillNodes] Created node ${row.id} at path ${data.path}`)

  return row
}

/**
 * Create multiple skill nodes in batch
 */
export async function createSkillNodes(nodes: CreateSkillNodeInput[]): Promise<SkillNode[]> {
  if (nodes.length === 0) return []

  const db = getDb()

  const values = nodes.map((data) => ({
    id: uuidv4(),
    treeId: data.treeId,
    parentId: data.parentId ?? null,
    title: data.title,
    description: data.description ?? null,
    depth: data.depth,
    path: data.path,
    sortOrder: data.sortOrder ?? 0,
  }))

  const rows = await db.insert(skillNodes).values(values).returning()

  console.log(`[SkillNodes] Created ${rows.length} nodes`)

  return rows
}

/**
 * Get skill node by ID
 */
export async function getSkillNodeById(nodeId: string): Promise<SkillNode | null> {
  const db = getDb()

  const [row] = await db.select().from(skillNodes).where(eq(skillNodes.id, nodeId)).limit(1)

  return row ?? null
}

/**
 * Get all nodes for a tree
 */
export async function getNodesByTreeId(treeId: string): Promise<SkillNode[]> {
  const db = getDb()

  const rows = await db
    .select()
    .from(skillNodes)
    .where(eq(skillNodes.treeId, treeId))
    .orderBy(skillNodes.path)

  return rows
}

/**
 * Get child nodes of a parent
 */
export async function getChildNodes(parentId: string): Promise<SkillNode[]> {
  const db = getDb()

  const rows = await db
    .select()
    .from(skillNodes)
    .where(eq(skillNodes.parentId, parentId))
    .orderBy(skillNodes.sortOrder)

  return rows
}

/**
 * Get root nodes of a tree (depth 0, no parent)
 */
export async function getRootNodes(treeId: string): Promise<SkillNode[]> {
  const db = getDb()

  const rows = await db
    .select()
    .from(skillNodes)
    .where(and(eq(skillNodes.treeId, treeId), isNull(skillNodes.parentId)))
    .orderBy(skillNodes.sortOrder)

  return rows
}

/**
 * Get subtree (all descendants) using path prefix
 */
export async function getSubtree(treeId: string, pathPrefix: string): Promise<SkillNode[]> {
  const db = getDb()

  const rows = await db
    .select()
    .from(skillNodes)
    .where(and(eq(skillNodes.treeId, treeId), like(skillNodes.path, `${pathPrefix}.%`)))
    .orderBy(skillNodes.path)

  return rows
}

/**
 * Get nodes at a specific depth
 */
export async function getNodesAtDepth(treeId: string, depth: number): Promise<SkillNode[]> {
  const db = getDb()

  const rows = await db
    .select()
    .from(skillNodes)
    .where(and(eq(skillNodes.treeId, treeId), eq(skillNodes.depth, depth)))
    .orderBy(skillNodes.path)

  return rows
}

/**
 * Get enabled nodes (for study)
 */
export async function getEnabledNodes(treeId: string): Promise<SkillNode[]> {
  const db = getDb()

  const rows = await db
    .select()
    .from(skillNodes)
    .where(and(eq(skillNodes.treeId, treeId), eq(skillNodes.isEnabled, true)))
    .orderBy(skillNodes.path)

  return rows
}

/**
 * Update a skill node
 */
export async function updateSkillNode(
  nodeId: string,
  data: UpdateSkillNodeInput
): Promise<SkillNode | null> {
  const db = getDb()

  const updateData: Partial<NewSkillNode> = {
    updatedAt: new Date(),
  }

  if (data.title !== undefined) updateData.title = data.title
  if (data.description !== undefined) updateData.description = data.description
  if (data.isEnabled !== undefined) updateData.isEnabled = data.isEnabled
  if (data.masteryPercentage !== undefined) updateData.masteryPercentage = data.masteryPercentage
  if (data.cardCount !== undefined) updateData.cardCount = data.cardCount
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

  const [row] = await db
    .update(skillNodes)
    .set(updateData)
    .where(eq(skillNodes.id, nodeId))
    .returning()

  if (row) {
    console.log(`[SkillNodes] Updated node ${nodeId}`)
  }

  return row ?? null
}

/**
 * Atomically increment card count for a node
 */
export async function incrementNodeCardCount(nodeId: string, count: number): Promise<void> {
  const db = getDb()

  await db
    .update(skillNodes)
    .set({
      cardCount: sql`${skillNodes.cardCount} + ${count}`,
      updatedAt: new Date(),
    })
    .where(eq(skillNodes.id, nodeId))
}

/**
 * Toggle node enabled state
 */
export async function toggleNodeEnabled(nodeId: string): Promise<SkillNode | null> {
  const node = await getSkillNodeById(nodeId)
  if (!node) return null

  return updateSkillNode(nodeId, { isEnabled: !node.isEnabled })
}

/**
 * Delete a skill node (children cascade if using FK)
 */
export async function deleteSkillNode(nodeId: string): Promise<void> {
  const db = getDb()

  await db.delete(skillNodes).where(eq(skillNodes.id, nodeId))

  console.log(`[SkillNodes] Deleted node ${nodeId}`)
}

/**
 * Build hierarchical tree structure from flat nodes
 */
export function buildNodeTree(nodes: SkillNode[]): SkillNodeWithChildren[] {
  const nodeMap = new Map<string, SkillNodeWithChildren>()
  const rootNodes: SkillNodeWithChildren[] = []

  // First pass: create node map
  nodes.forEach((node) => {
    nodeMap.set(node.id, { ...node, children: [] })
  })

  // Second pass: build hierarchy
  nodes.forEach((node) => {
    const nodeWithChildren = nodeMap.get(node.id)!
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children!.push(nodeWithChildren)
    } else {
      rootNodes.push(nodeWithChildren)
    }
  })

  // Sort children by sortOrder
  const sortChildren = (nodes: SkillNodeWithChildren[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder)
    nodes.forEach((node) => {
      if (node.children && node.children.length > 0) {
        sortChildren(node.children)
      }
    })
  }

  sortChildren(rootNodes)

  return rootNodes
}

/**
 * Calculate mastery percentage for a node based on linked cards
 * From research.md: Weighted average based on FSRS card states
 */
export function calculateMasteryFromCards(cards: { fsrsState: Card }[]): number {
  if (cards.length === 0) return 0

  const weights: Record<State, number> = {
    [State.New]: 0,
    [State.Learning]: 0.25,
    [State.Relearning]: 0.25,
    [State.Review]: 1.0,
  }

  const totalWeight = cards.reduce((sum, card) => {
    const state = card.fsrsState.state
    const baseWeight = weights[state] ?? 0
    // Stability bonus for review cards (up to 0.5 extra based on stability/30)
    const stabilityBonus = state === State.Review ? Math.min(card.fsrsState.stability / 30, 0.5) : 0
    return sum + baseWeight + stabilityBonus
  }, 0)

  const maxPossible = cards.length * 1.5 // Max weight per card
  return Math.round((totalWeight / maxPossible) * 100)
}

/**
 * Calculate mastery for a node and update it
 */
export async function recalculateNodeMastery(nodeId: string): Promise<SkillNode | null> {
  const db = getDb()

  // Get cards linked to this node
  const cards = await db
    .select({ fsrsState: flashcards.fsrsState })
    .from(flashcards)
    .where(eq(flashcards.skillNodeId, nodeId))

  const cardData = cards.map((c) => ({ fsrsState: c.fsrsState as unknown as Card }))
  const masteryPercentage = calculateMasteryFromCards(cardData)

  return updateSkillNode(nodeId, {
    masteryPercentage,
    cardCount: cards.length,
  })
}

/**
 * Recalculate mastery for all nodes in a tree (bottom-up)
 * Leaf nodes use cards; parent nodes average children
 */
export async function recalculateTreeMastery(treeId: string): Promise<void> {
  const nodes = await getNodesByTreeId(treeId)
  const nodeMap = new Map<string, SkillNode>()
  nodes.forEach((n) => nodeMap.set(n.id, n))

  // Sort by depth descending (leaves first)
  const sortedNodes = [...nodes].sort((a, b) => b.depth - a.depth)

  for (const node of sortedNodes) {
    const children = nodes.filter((n) => n.parentId === node.id)

    if (children.length === 0) {
      // Leaf node: calculate from cards
      await recalculateNodeMastery(node.id)
    } else {
      // Parent node: average of enabled children
      const enabledChildren = children.filter((c) => c.isEnabled)
      if (enabledChildren.length > 0) {
        const updatedChildren = await Promise.all(
          enabledChildren.map((c) => getSkillNodeById(c.id))
        )
        const totalMastery = updatedChildren.reduce(
          (sum, c) => sum + (c?.masteryPercentage ?? 0),
          0
        )
        const avgMastery = Math.round(totalMastery / updatedChildren.length)
        await updateSkillNode(node.id, { masteryPercentage: avgMastery })
      }
    }
  }

  console.log(`[SkillNodes] Recalculated mastery for tree ${treeId}`)
}

/**
 * Generate the next path segment for a child node
 */
export function generateChildPath(parentPath: string | null, siblingIndex: number): string {
  if (!parentPath) {
    return String(siblingIndex + 1)
  }
  return `${parentPath}.${siblingIndex + 1}`
}

/**
 * Count nodes by depth in a tree
 */
export async function countNodesByDepth(treeId: string): Promise<Record<number, number>> {
  const nodes = await getNodesByTreeId(treeId)
  const counts: Record<number, number> = {}

  nodes.forEach((node) => {
    counts[node.depth] = (counts[node.depth] ?? 0) + 1
  })

  return counts
}

/**
 * Get a node with its associated goal (for ownership verification)
 */
export async function getNodeWithGoal(
  nodeId: string
): Promise<{ node: SkillNode; goal: { id: string; userId: string; title: string } } | null> {
  const db = getDb()

  const result = await db
    .select({
      node: skillNodes,
      goal: {
        id: learningGoals.id,
        userId: learningGoals.userId,
        title: learningGoals.title,
      },
    })
    .from(skillNodes)
    .innerJoin(skillTrees, eq(skillNodes.treeId, skillTrees.id))
    .innerJoin(learningGoals, eq(skillTrees.goalId, learningGoals.id))
    .where(eq(skillNodes.id, nodeId))
    .limit(1)

  if (result.length === 0) return null

  return result[0]
}
