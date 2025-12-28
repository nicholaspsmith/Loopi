import { v4 as uuidv4 } from 'uuid'
import { getDb } from '@/lib/db/pg-client'
import { topicAnalytics } from '@/lib/db/drizzle-schema'
import { eq, desc } from 'drizzle-orm'
import type { TopicAnalytic } from '@/lib/db/drizzle-schema'

/**
 * Topic Analytics Database Operations
 *
 * Tracks topic popularity across all users for demand analysis.
 * Includes topic normalization from research.md.
 */

/**
 * Normalize topic name for analytics
 * From research.md: Lowercase, trim, remove common prefixes
 */
export function normalizeTopic(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/^(learn|study|master|intro to|introduction to)\s+/i, '')
    .replace(/\s+/g, ' ')
}

/**
 * Record a topic being used (create or increment)
 */
export async function recordTopicUsage(
  originalTitle: string,
  _userId: string // Reserved for future per-user tracking
): Promise<TopicAnalytic> {
  const db = getDb()
  const normalizedTopic = normalizeTopic(originalTitle)

  // Check if topic already exists
  const [existing] = await db
    .select()
    .from(topicAnalytics)
    .where(eq(topicAnalytics.normalizedTopic, normalizedTopic))
    .limit(1)

  if (existing) {
    // Update existing topic
    const examples = existing.originalExamples as string[]
    const updatedExamples = examples.includes(originalTitle)
      ? examples
      : examples.length < 10
        ? [...examples, originalTitle]
        : examples

    const [updated] = await db
      .update(topicAnalytics)
      .set({
        goalCount: existing.goalCount + 1,
        originalExamples: updatedExamples,
        lastSeenAt: new Date(),
      })
      .where(eq(topicAnalytics.id, existing.id))
      .returning()

    console.log(`[TopicAnalytics] Updated topic "${normalizedTopic}" (count: ${updated.goalCount})`)

    return updated
  }

  // Create new topic
  const [row] = await db
    .insert(topicAnalytics)
    .values({
      id: uuidv4(),
      normalizedTopic,
      originalExamples: [originalTitle],
      userCount: 1,
      goalCount: 1,
    })
    .returning()

  console.log(`[TopicAnalytics] Created new topic "${normalizedTopic}"`)

  return row
}

/**
 * Get topic by normalized name
 */
export async function getTopicByNormalizedName(
  normalizedTopic: string
): Promise<TopicAnalytic | null> {
  const db = getDb()

  const [row] = await db
    .select()
    .from(topicAnalytics)
    .where(eq(topicAnalytics.normalizedTopic, normalizedTopic))
    .limit(1)

  return row ?? null
}

/**
 * Get most popular topics
 */
export async function getPopularTopics(limit: number = 20): Promise<TopicAnalytic[]> {
  const db = getDb()

  const rows = await db
    .select()
    .from(topicAnalytics)
    .orderBy(desc(topicAnalytics.goalCount))
    .limit(limit)

  return rows
}

/**
 * Get topics without curated trees (candidates for curation)
 */
export async function getTopicsNeedingCuration(limit: number = 20): Promise<TopicAnalytic[]> {
  const db = getDb()

  const rows = await db
    .select()
    .from(topicAnalytics)
    .where(eq(topicAnalytics.hasCuratedTree, false))
    .orderBy(desc(topicAnalytics.goalCount))
    .limit(limit)

  return rows
}

/**
 * Mark topic as having a curated tree
 */
export async function markTopicAsCurated(normalizedTopic: string): Promise<TopicAnalytic | null> {
  const db = getDb()

  const [row] = await db
    .update(topicAnalytics)
    .set({ hasCuratedTree: true })
    .where(eq(topicAnalytics.normalizedTopic, normalizedTopic))
    .returning()

  if (row) {
    console.log(`[TopicAnalytics] Marked "${normalizedTopic}" as curated`)
  }

  return row ?? null
}

/**
 * Increment unique user count for a topic
 */
export async function incrementTopicUserCount(
  normalizedTopic: string
): Promise<TopicAnalytic | null> {
  const db = getDb()

  const topic = await getTopicByNormalizedName(normalizedTopic)
  if (!topic) return null

  const [updated] = await db
    .update(topicAnalytics)
    .set({
      userCount: topic.userCount + 1,
      lastSeenAt: new Date(),
    })
    .where(eq(topicAnalytics.id, topic.id))
    .returning()

  return updated ?? null
}

/**
 * Get topic statistics
 */
export async function getTopicStats(): Promise<{
  totalTopics: number
  totalGoals: number
  curatedTopics: number
  uncuratedTopics: number
}> {
  const db = getDb()

  const all = await db.select().from(topicAnalytics)

  const totalTopics = all.length
  const totalGoals = all.reduce((sum, t) => sum + t.goalCount, 0)
  const curatedTopics = all.filter((t) => t.hasCuratedTree).length
  const uncuratedTopics = totalTopics - curatedTopics

  return {
    totalTopics,
    totalGoals,
    curatedTopics,
    uncuratedTopics,
  }
}

/**
 * Search topics by normalized name prefix
 */
export async function searchTopics(query: string): Promise<TopicAnalytic[]> {
  const db = getDb()
  const normalized = normalizeTopic(query)

  // Get all and filter (simpler than SQL LIKE for small datasets)
  const all = await db.select().from(topicAnalytics).orderBy(desc(topicAnalytics.goalCount))

  return all.filter((t) => t.normalizedTopic.includes(normalized))
}
