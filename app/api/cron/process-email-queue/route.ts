/**
 * GET /api/cron/process-email-queue
 *
 * Background job to process queued emails
 *
 * Should be called periodically by:
 * - Vercel Cron (for production deployments)
 * - GitHub Actions workflow (scheduled)
 * - Manual curl/fetch during development
 *
 * Security: Use CRON_SECRET env var to authenticate requests
 */

import { NextRequest, NextResponse } from 'next/server'
import { processEmailQueue } from '@/lib/email/background-worker'
import { timingSafeEqual } from 'crypto'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get('authorization')
    const providedSecret = authHeader?.replace('Bearer ', '')

    // If CRON_SECRET is configured (production), require authentication
    if (cronSecret) {
      // Use constant-time comparison to prevent timing attacks
      const isValid =
        providedSecret &&
        cronSecret.length === providedSecret.length &&
        timingSafeEqual(Buffer.from(cronSecret), Buffer.from(providedSecret))

      if (!isValid) {
        console.error('Invalid CRON_SECRET provided')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    } else {
      // Development/testing mode - CRON_SECRET not set
      // Allow request but log warning
      console.warn(
        '⚠️  CRON_SECRET not configured - email queue processing running in development mode (insecure)'
      )
    }

    // Process queued emails
    const processedCount = await processEmailQueue()

    return NextResponse.json({
      success: true,
      processedCount,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Error in process-email-queue cron:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process email queue',
      },
      { status: 500 }
    )
  }
}
