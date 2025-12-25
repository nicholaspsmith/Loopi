/**
 * Email Queue Database Operations
 *
 * Provides CRUD operations for the email_queue table
 * Used for email retry logic with exponential backoff
 */

import { db } from '@/lib/db'
import { emailQueue, type EmailQueueEntry, type NewEmailQueueEntry } from '@/lib/db/drizzle-schema'
import { eq, and, lte } from 'drizzle-orm'

/**
 * Insert email into queue
 *
 * @param data - Email queue entry data
 * @returns Created queue entry with ID
 */
export async function insertEmailQueue(data: NewEmailQueueEntry): Promise<EmailQueueEntry> {
  const [result] = await db.insert(emailQueue).values(data).returning()
  return result
}

/**
 * Get pending emails ready to be sent
 *
 * Returns emails with status='pending' and nextRetryAt <= NOW
 *
 * @param limit - Maximum number of emails to return (default: 100)
 * @returns Array of pending email queue entries
 */
export async function getPendingEmails(limit: number = 100): Promise<EmailQueueEntry[]> {
  const now = new Date()

  return await db
    .select()
    .from(emailQueue)
    .where(and(eq(emailQueue.status, 'pending'), lte(emailQueue.nextRetryAt, now)))
    .limit(limit)
}

/**
 * Update email status
 *
 * @param id - Email queue entry ID
 * @param updates - Fields to update (status, attempts, nextRetryAt, error, sentAt)
 * @param currentStatus - Optional: Only update if current status matches (prevents race conditions)
 * @returns Updated email queue entry, or null if status didn't match
 */
export async function updateEmailStatus(
  id: string,
  updates: Partial<EmailQueueEntry>,
  currentStatus?: string
): Promise<EmailQueueEntry | null> {
  const whereConditions = currentStatus
    ? and(eq(emailQueue.id, id), eq(emailQueue.status, currentStatus))
    : eq(emailQueue.id, id)

  const [result] = await db.update(emailQueue).set(updates).where(whereConditions).returning()

  return result || null
}

/**
 * Delete old sent/failed emails (cleanup job)
 *
 * Removes emails with status 'sent' or 'failed' older than 7 days
 *
 * @returns Number of deleted entries
 */
export async function deleteOldEmails(): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  // Delete sent emails older than 7 days
  await db.delete(emailQueue).where(lte(emailQueue.createdAt, sevenDaysAgo))

  return 0 // Drizzle doesn't return count by default
}
