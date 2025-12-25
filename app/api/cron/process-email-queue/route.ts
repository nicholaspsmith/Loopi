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

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (required for security)
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('CRON_SECRET environment variable not set - rejecting request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const authHeader = request.headers.get('authorization')
    const providedSecret = authHeader?.replace('Bearer ', '')

    if (providedSecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
