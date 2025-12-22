import { v4 as uuidv4 } from 'uuid'
import { getDb } from '@/lib/db/pg-client'
import { reviewLogs, flashcards } from '@/lib/db/drizzle-schema'
import { eq, desc, inArray } from 'drizzle-orm'
import { Rating, State } from 'ts-fsrs'
import type { ReviewLog } from '@/types/db'

/**
 * Review Log Database Operations
 *
 * CRUD operations for review logs in PostgreSQL.
 * Review logs track quiz history and FSRS learning data.
 * No embeddings needed - stored only in PostgreSQL.
 */

/**
 * Convert database row to ReviewLog type
 */
function rowToReviewLog(row: typeof reviewLogs.$inferSelect): ReviewLog {
  return {
    id: row.id,
    flashcardId: row.flashcardId,
    userId: row.userId,
    rating: row.rating as Rating,
    state: row.state as State,
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsedDays,
    last_elapsed_days: row.lastElapsedDays,
    scheduled_days: row.scheduledDays,
    review: row.review,
  }
}

/**
 * Create a new review log entry
 *
 * Called after each flashcard rating to record the review session
 */
export async function createReviewLog(data: {
  flashcardId: string
  userId: string
  rating: Rating
  state: State
  due: Date
  stability: number
  difficulty: number
  elapsed_days: number
  last_elapsed_days: number
  scheduled_days: number
  review: Date
}): Promise<ReviewLog> {
  const db = getDb()

  const [row] = await db
    .insert(reviewLogs)
    .values({
      id: uuidv4(),
      flashcardId: data.flashcardId,
      userId: data.userId,
      rating: data.rating,
      state: data.state,
      due: data.due,
      stability: data.stability,
      difficulty: data.difficulty,
      elapsedDays: data.elapsed_days,
      lastElapsedDays: data.last_elapsed_days,
      scheduledDays: data.scheduled_days,
      review: data.review,
    })
    .returning()

  console.log(`[ReviewLogs] Created review log ${row.id} for flashcard ${data.flashcardId}`)

  return rowToReviewLog(row)
}

/**
 * Get review history for a specific flashcard
 *
 * Returns all reviews in chronological order (oldest to newest)
 */
export async function getReviewLogsByFlashcardId(flashcardId: string): Promise<ReviewLog[]> {
  const db = getDb()

  const rows = await db
    .select()
    .from(reviewLogs)
    .where(eq(reviewLogs.flashcardId, flashcardId))
    .orderBy(reviewLogs.review)

  return rows.map(rowToReviewLog)
}

/**
 * Get all review logs for a user
 *
 * Returns recent reviews in reverse chronological order (newest first)
 * Used for quiz history view (FR-021)
 */
export async function getReviewLogsByUserId(
  userId: string,
  limit: number = 50
): Promise<ReviewLog[]> {
  const db = getDb()

  const rows = await db
    .select()
    .from(reviewLogs)
    .where(eq(reviewLogs.userId, userId))
    .orderBy(desc(reviewLogs.review))
    .limit(limit)

  return rows.map(rowToReviewLog)
}

/**
 * Get recent review logs for a user with flashcard details
 *
 * Returns review logs joined with flashcard data for display
 * Used by GET /api/quiz/history endpoint
 */
export async function getReviewHistoryWithFlashcards(
  userId: string,
  limit: number = 20
): Promise<Array<ReviewLog & { flashcardQuestion: string; flashcardAnswer: string }>> {
  const db = getDb()

  // Get recent review logs
  const reviews = await getReviewLogsByUserId(userId, limit)

  if (reviews.length === 0) {
    return []
  }

  // Get unique flashcard IDs
  const flashcardIds = [...new Set(reviews.map((r) => r.flashcardId))]

  // Fetch flashcards from PostgreSQL
  const flashcardRows = await db
    .select()
    .from(flashcards)
    .where(inArray(flashcards.id, flashcardIds))

  // Create lookup map
  const flashcardMap = new Map(flashcardRows.map((f) => [f.id, f]))

  // Enrich reviews with flashcard data
  return reviews.map((review) => {
    const flashcard = flashcardMap.get(review.flashcardId)
    return {
      ...review,
      flashcardQuestion: flashcard?.question || 'Deleted flashcard',
      flashcardAnswer: flashcard?.answer || '',
    }
  })
}

/**
 * Get review statistics for a user
 *
 * Calculates aggregate stats for quiz progress tracking (FR-020)
 */
export async function getReviewStats(userId: string): Promise<{
  totalReviews: number
  reviewsToday: number
  reviewsThisWeek: number
  averageRating: number
  retentionRate: number
}> {
  const db = getDb()

  // Get all reviews for user
  const allReviews = await db.select().from(reviewLogs).where(eq(reviewLogs.userId, userId))

  const reviews = allReviews.map(rowToReviewLog)

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000)

  const reviewsToday = reviews.filter((log) => log.review >= todayStart).length
  const reviewsThisWeek = reviews.filter((log) => log.review >= weekStart).length
  const totalReviews = reviews.length

  const averageRating =
    totalReviews > 0 ? reviews.reduce((sum, log) => sum + log.rating, 0) / totalReviews : 0

  // Retention rate: percentage of Good (3) or Easy (4) ratings
  const successfulReviews = reviews.filter((log) => log.rating === 3 || log.rating === 4).length
  const retentionRate = totalReviews > 0 ? (successfulReviews / totalReviews) * 100 : 0

  return {
    totalReviews,
    reviewsToday,
    reviewsThisWeek,
    averageRating: Math.round(averageRating * 100) / 100,
    retentionRate: Math.round(retentionRate * 100) / 100,
  }
}

/**
 * Delete review logs for a flashcard
 *
 * Called when a flashcard is deleted
 */
export async function deleteReviewLogsByFlashcardId(flashcardId: string): Promise<void> {
  const db = getDb()
  await db.delete(reviewLogs).where(eq(reviewLogs.flashcardId, flashcardId))
  console.log(`[ReviewLogs] Deleted review logs for flashcard ${flashcardId}`)
}
