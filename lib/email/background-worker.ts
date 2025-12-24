/**
 * Email Queue Background Worker
 *
 * Processes pending emails from the queue with exponential backoff retry
 * Should be run as a background job (cron, worker process, etc.)
 */

import { processQueue } from './retry-queue'

/**
 * Process email queue once
 *
 * @returns Number of emails processed
 */
export async function processEmailQueue(): Promise<number> {
  try {
    console.log('📧 Starting email queue processing...')
    const processedCount = await processQueue()
    console.log(`✅ Email queue processing complete. Processed ${processedCount} emails.`)
    return processedCount
  } catch (error) {
    console.error('❌ Error processing email queue:', error)
    throw error
  }
}

/**
 * Start continuous email queue processing
 *
 * Processes queue at specified interval
 *
 * @param intervalMs - Interval in milliseconds (default: 60000 = 1 minute)
 * @returns Cleanup function to stop processing
 */
export function startEmailQueueWorker(intervalMs: number = 60000): () => void {
  console.log(`📧 Starting email queue worker (interval: ${intervalMs}ms)`)

  // Process immediately on start
  processEmailQueue().catch((error) => {
    console.error('❌ Initial email queue processing failed:', error)
  })

  // Set up interval
  const intervalId = setInterval(() => {
    processEmailQueue().catch((error) => {
      console.error('❌ Email queue processing failed:', error)
    })
  }, intervalMs)

  // Return cleanup function
  return () => {
    console.log('🛑 Stopping email queue worker')
    clearInterval(intervalId)
  }
}
