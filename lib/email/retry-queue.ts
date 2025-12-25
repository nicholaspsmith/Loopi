/**
 * Email Retry Queue
 *
 * Implements exponential backoff retry logic for failed emails
 * Retry schedule: Immediate -> +1min -> +5min -> +15min -> Failed
 */

import {
  insertEmailQueue,
  getPendingEmails,
  updateEmailStatus,
} from '@/lib/db/operations/email-queue'
import { initializeEmailClient } from './client'

/**
 * Calculate next retry time based on attempt count
 *
 * Retry schedule:
 * - Attempt 0: Immediate (NOW)
 * - Attempt 1: +1 minute
 * - Attempt 2: +5 minutes
 * - Attempt 3: +15 minutes
 *
 * @param attempts - Number of previous attempts
 * @returns Date for next retry
 *
 * @example
 * const nextRetry = calculateNextRetry(1) // +1 minute from now
 */
export function calculateNextRetry(attempts: number): Date {
  const delays = [
    0, // Attempt 0: immediate
    1 * 60 * 1000, // Attempt 1: +1 minute
    5 * 60 * 1000, // Attempt 2: +5 minutes
    15 * 60 * 1000, // Attempt 3: +15 minutes
  ]

  const delayMs = delays[attempts] || 0
  return new Date(Date.now() + delayMs)
}

/**
 * Queue an email for sending with retry logic
 *
 * @param params - Email parameters
 * @param params.to - Recipient email
 * @param params.subject - Email subject
 * @param params.textBody - Plain text body
 * @param params.htmlBody - Optional HTML body
 * @returns Queued email entry with ID
 *
 * @example
 * await queueEmail({
 *   to: 'user@example.com',
 *   subject: 'Password Reset',
 *   textBody: 'Click here to reset...',
 *   htmlBody: '<p>Click here...</p>'
 * })
 */
export async function queueEmail(params: {
  to: string
  subject: string
  textBody: string
  htmlBody?: string
}) {
  const { to, subject, textBody, htmlBody } = params

  const queueEntry = await insertEmailQueue({
    to,
    subject,
    textBody,
    htmlBody: htmlBody || null,
    attempts: 0,
    nextRetryAt: calculateNextRetry(0), // Immediate
    status: 'pending',
    error: null,
    sentAt: null,
  })

  console.log(`📬 Email queued (ID: ${queueEntry.id}) for ${to}`)

  return queueEntry
}

/**
 * Process email queue
 *
 * Fetches pending emails and attempts to send them
 * Updates status based on success/failure
 * Implements exponential backoff on failure
 *
 * Should be called by background worker (cron job)
 *
 * @returns Number of emails processed
 *
 * @example
 * // In background worker (every 1 minute):
 * await processQueue()
 */
export async function processQueue(): Promise<number> {
  const pendingEmails = await getPendingEmails(100) // Process up to 100 emails

  if (pendingEmails.length === 0) {
    return 0
  }

  console.log(`📧 Processing ${pendingEmails.length} pending emails...`)

  const emailClient = initializeEmailClient()
  const from = process.env.SMTP_FROM || 'noreply@memoryloop.com'

  let processed = 0

  for (const email of pendingEmails) {
    try {
      // Mark as sending with race condition protection
      // Only update if status is still 'pending' - prevents concurrent workers from processing same email
      const updated = await updateEmailStatus(
        email.id,
        {
          status: 'sending',
        },
        'pending' // Only update if current status is 'pending'
      )

      // If update failed, another worker already grabbed this email - skip it
      if (!updated) {
        console.log(`⏭️  Email already being processed by another worker (ID: ${email.id})`)
        continue
      }

      // Attempt to send with 30-second timeout to prevent infinite hangs
      // IMPORTANT: Call sendMail() directly (NOT sendEmail()) to avoid circular dependency
      // sendEmail() would re-queue on failure, creating infinite retry loops
      const sendPromise = emailClient.sendMail({
        from,
        to: email.to,
        subject: email.subject,
        text: email.textBody,
        html: email.htmlBody || undefined,
      })

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Email send timeout after 30 seconds')), 30000)
      })

      const info = await Promise.race([sendPromise, timeoutPromise])

      // Success - mark as sent
      await updateEmailStatus(email.id, {
        status: 'sent',
        sentAt: new Date(),
      })

      console.log(`✅ Email sent successfully (ID: ${email.id}):`, info.messageId)
      processed++
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const newAttempts = (email.attempts || 0) + 1

      console.error(`❌ Failed to send email (ID: ${email.id}):`, errorMessage)

      if (newAttempts >= 4) {
        // Max retries reached - mark as failed
        await updateEmailStatus(email.id, {
          status: 'failed',
          attempts: newAttempts,
          error: errorMessage,
          nextRetryAt: null,
        })

        console.error(`🚫 Email failed permanently after ${newAttempts} attempts (ID: ${email.id})`)
      } else {
        // Schedule retry with exponential backoff
        const nextRetryAt = calculateNextRetry(newAttempts)

        await updateEmailStatus(email.id, {
          status: 'pending',
          attempts: newAttempts,
          error: errorMessage,
          nextRetryAt,
        })

        console.log(
          `🔄 Email retry scheduled (ID: ${email.id}) - Attempt ${newAttempts + 1} at ${nextRetryAt.toISOString()}`
        )
      }
    }
  }

  console.log(`✅ Processed ${processed}/${pendingEmails.length} emails successfully`)

  return processed
}
