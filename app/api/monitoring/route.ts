import { NextRequest, NextResponse } from 'next/server'

/**
 * Sentry Tunnel Route
 *
 * Acts as a proxy between the client and Sentry to bypass ad-blockers.
 * Ad-blockers typically block requests to *.sentry.io domains, but they
 * won't block same-origin requests to our own /api/monitoring endpoint.
 *
 * Security measures:
 * - Validates DSN host matches our Sentry instance
 * - Validates project ID matches our project
 * - Limits request size to prevent DoS
 * - No CORS headers (same-origin only)
 *
 * @see https://docs.sentry.io/platforms/javascript/troubleshooting/#using-the-tunnel-option
 */

// Sentry ingest host extracted from our DSN
const SENTRY_HOST = 'o4510672318955520.ingest.us.sentry.io'

// Our project ID from the DSN
const SENTRY_PROJECT_ID = '4510672320200704'

// Maximum envelope size (1MB) to prevent DoS via memory exhaustion
const MAX_ENVELOPE_SIZE = 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    // Check content length before reading to prevent DoS
    const contentLength = request.headers.get('content-length')
    if (contentLength && parseInt(contentLength, 10) > MAX_ENVELOPE_SIZE) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }

    const envelope = await request.text()

    // Additional check after reading (in case content-length was missing/wrong)
    if (envelope.length > MAX_ENVELOPE_SIZE) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }

    // Parse the envelope header (first line contains DSN info)
    const headerEndIndex = envelope.indexOf('\n')
    if (headerEndIndex === -1) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const header = envelope.substring(0, headerEndIndex)
    let headerData: { dsn?: string }

    try {
      headerData = JSON.parse(header)
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Extract and validate DSN
    const dsn = headerData.dsn
    if (!dsn) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    let dsnUrl: URL
    try {
      dsnUrl = new URL(dsn)
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    // Validate the DSN host matches our Sentry instance
    // This prevents forwarding to attacker-controlled endpoints
    if (dsnUrl.host !== SENTRY_HOST) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validate the project ID matches our project
    const projectId = dsnUrl.pathname.replace(/\//g, '')
    if (projectId !== SENTRY_PROJECT_ID) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Forward to Sentry
    const sentryUrl = `https://${SENTRY_HOST}/api/${projectId}/envelope/`

    const response = await fetch(sentryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
      },
      body: envelope,
    })

    // Log Sentry errors for debugging (but not the payload content)
    if (!response.ok) {
      console.warn('Sentry tunnel forwarding failed', {
        status: response.status,
        projectId,
      })
    }

    // Return Sentry's response status
    return new NextResponse(null, { status: response.status })
  } catch (error) {
    console.error('Sentry tunnel error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// Handle preflight requests - same-origin requests don't need CORS
// but some browsers may still send OPTIONS for non-simple requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
      // No Access-Control-Allow-Origin - intentionally same-origin only
    },
  })
}
