import { getDbConnection } from '../client'
import { ReviewLog, ReviewLogSchema } from '@/types/db'
import { v4 as uuidv4 } from 'uuid'
import { Rating, State } from 'ts-fsrs'

/**
 * Review Log Database Operations
 *
 * Handles CRUD operations for review logs (quiz session history)
 * Maps to FR-020 (quiz progress tracking) and FR-021 (review history)
 */

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
  const db = await getDbConnection()
  const table = await db.openTable('review_logs')

  const reviewLog = {
    id: uuidv4(),
    flashcardId: data.flashcardId,
    userId: data.userId,
    rating: data.rating,
    state: data.state,
    due: data.due.getTime(), // Store as timestamp
    stability: data.stability,
    difficulty: data.difficulty,
    elapsed_days: data.elapsed_days,
    last_elapsed_days: data.last_elapsed_days,
    scheduled_days: data.scheduled_days,
    review: data.review.getTime(), // Store as timestamp
  }

  await table.add([reviewLog])

  // Transform timestamps back to Date objects for return
  return ReviewLogSchema.parse({
    ...reviewLog,
    due: new Date(reviewLog.due),
    review: new Date(reviewLog.review),
  })
}

/**
 * Get review history for a specific flashcard
 *
 * Returns all reviews in chronological order (oldest to newest)
 */
export async function getReviewLogsByFlashcardId(
  flashcardId: string
): Promise<ReviewLog[]> {
  const db = await getDbConnection()
  const table = await db.openTable('review_logs')

  const results = await table
    .query()
    .where(`\`flashcardId\` = '${flashcardId}'`)
    .toArray()

  // Transform and sort by review date
  const logs = results.map((log: any) =>
    ReviewLogSchema.parse({
      ...log,
      due: new Date(log.due),
      review: new Date(log.review),
    })
  )

  return logs.sort(
    (a, b) => a.review.getTime() - b.review.getTime()
  )
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
  const db = await getDbConnection()
  const table = await db.openTable('review_logs')

  const results = await table
    .query()
    .where(`\`userId\` = '${userId}'`)
    .limit(limit * 2) // Fetch more to sort, then limit
    .toArray()

  // Transform timestamps
  const logs = results.map((log: any) =>
    ReviewLogSchema.parse({
      ...log,
      due: new Date(log.due),
      review: new Date(log.review),
    })
  )

  // Sort by review date (newest first) and limit
  return logs
    .sort((a, b) => b.review.getTime() - a.review.getTime())
    .slice(0, limit)
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
  const db = await getDbConnection()
  const reviewLogsTable = await db.openTable('review_logs')
  const flashcardsTable = await db.openTable('flashcards')

  // Get recent review logs
  const reviews = await getReviewLogsByUserId(userId, limit)

  // Fetch corresponding flashcards
  const enrichedReviews = await Promise.all(
    reviews.map(async (review) => {
      const flashcardResults = await flashcardsTable
        .query()
        .where(`\`id\` = '${review.flashcardId}'`)
        .limit(1)
        .toArray()

      const flashcard = flashcardResults[0]

      return {
        ...review,
        flashcardQuestion: flashcard?.question || 'Deleted flashcard',
        flashcardAnswer: flashcard?.answer || '',
      }
    })
  )

  return enrichedReviews
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
  const db = await getDbConnection()
  const table = await db.openTable('review_logs')

  const allReviews = await table
    .query()
    .where(`\`userId\` = '${userId}'`)
    .toArray()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000)

  const reviews = allReviews.map((log: any) =>
    ReviewLogSchema.parse({
      ...log,
      due: new Date(log.due),
      review: new Date(log.review),
    })
  )

  const reviewsToday = reviews.filter(
    (log) => log.review >= todayStart
  ).length

  const reviewsThisWeek = reviews.filter(
    (log) => log.review >= weekStart
  ).length

  const totalReviews = reviews.length

  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum, log) => sum + log.rating, 0) / totalReviews
      : 0

  // Retention rate: percentage of Good (3) or Easy (4) ratings
  const successfulReviews = reviews.filter(
    (log) => log.rating === 3 || log.rating === 4
  ).length
  const retentionRate =
    totalReviews > 0 ? (successfulReviews / totalReviews) * 100 : 0

  return {
    totalReviews,
    reviewsToday,
    reviewsThisWeek,
    averageRating: Math.round(averageRating * 100) / 100,
    retentionRate: Math.round(retentionRate * 100) / 100,
  }
}
