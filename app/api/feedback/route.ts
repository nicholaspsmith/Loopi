import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import crypto from 'crypto'

/**
 * Feedback API endpoint
 * Creates GitHub issues from user feedback
 *
 * Requires GITHUB_TOKEN env var with repo scope
 */

const feedbackSchema = z.object({
  title: z.string().trim().max(200).optional(),
  body: z.string().trim().min(10, 'Feedback must be at least 10 characters').max(5000),
  category: z.enum(['bug', 'feature', 'improvement', 'other']).optional().default('other'),
})

// Validate GitHub repo format (owner/repo pattern)
const GITHUB_REPO_PATTERN = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/
const GITHUB_REPO = process.env.GITHUB_REPO || 'nicholaspsmith/loopi'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

// Simple in-memory rate limiting: 5 submissions per hour per user
const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour
const rateLimitMap = new Map<string, number[]>()

// For testing: reset rate limit state
export function _resetRateLimitForTesting() {
  rateLimitMap.clear()
}

function checkRateLimit(userId: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW_MS

  // Get or initialize timestamps for this user
  const timestamps = rateLimitMap.get(userId) || []

  // Filter to only recent timestamps
  const recentTimestamps = timestamps.filter((ts) => ts > windowStart)

  if (recentTimestamps.length >= RATE_LIMIT_MAX) {
    const oldestTimestamp = recentTimestamps[0]
    const retryAfterMs = oldestTimestamp + RATE_LIMIT_WINDOW_MS - now
    return { allowed: false, retryAfterMs }
  }

  // Don't record here - only record after successful submission
  return { allowed: true }
}

function recordSuccessfulSubmission(userId: string): void {
  const now = Date.now()
  const windowStart = now - RATE_LIMIT_WINDOW_MS
  const timestamps = rateLimitMap.get(userId) || []
  const recentTimestamps = timestamps.filter((ts) => ts > windowStart)
  recentTimestamps.push(now)
  rateLimitMap.set(userId, recentTimestamps)
}

export async function POST(request: Request) {
  try {
    // Validate GITHUB_REPO format to prevent SSRF
    if (!GITHUB_REPO_PATTERN.test(GITHUB_REPO)) {
      console.error('[Feedback] Invalid GITHUB_REPO format:', GITHUB_REPO)
      return NextResponse.json(
        { error: 'Feedback system is misconfigured', code: 'CONFIG_ERROR' },
        { status: 503 }
      )
    }

    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'You must be logged in to submit feedback', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Check rate limit
    const rateLimitResult = checkRateLimit(session.user.id)
    if (!rateLimitResult.allowed) {
      const retryAfterSec = Math.ceil((rateLimitResult.retryAfterMs || 0) / 1000)
      return NextResponse.json(
        {
          error: 'Too many feedback submissions. Please try again later.',
          code: 'RATE_LIMITED',
          retryAfter: retryAfterSec,
        },
        { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
      )
    }

    // Check GitHub token is configured
    if (!GITHUB_TOKEN) {
      console.error('[Feedback] GITHUB_TOKEN not configured')
      return NextResponse.json(
        { error: 'Feedback system is not configured', code: 'NOT_CONFIGURED' },
        { status: 503 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = feedbackSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const { title, body: feedbackBody, category } = validation.data

    // Build issue title
    const issueTitle =
      title ||
      `[User Feedback] ${feedbackBody.slice(0, 50)}${feedbackBody.length > 50 ? '...' : ''}`

    // Build issue body with metadata
    // Use hashed user ID for privacy (one-way hash, not reversible)
    const userIdHash = crypto.createHash('sha256').update(session.user.id).digest('hex').slice(0, 8)

    const categoryEmoji = {
      bug: '🐛',
      feature: '✨',
      improvement: '💡',
      other: '💬',
    }[category]

    const issueBody = `## ${categoryEmoji} User Feedback

**Category:** ${category}
**Submitted by:** User \`${userIdHash}\`
**Date:** ${new Date().toISOString()}

---

> **Note:** The content below is user-submitted and may contain external links.

${feedbackBody}

---
*This issue was automatically created from user feedback.*`

    // Create GitHub issue
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'loopi-feedback',
      },
      body: JSON.stringify({
        title: issueTitle,
        body: issueBody,
        labels: ['User Feedback', 'Needs Triage'],
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('[Feedback] GitHub API error:', response.status, errorData)
      return NextResponse.json(
        { error: 'Failed to submit feedback. Please try again.', code: 'GITHUB_ERROR' },
        { status: 502 }
      )
    }

    const issue = await response.json()

    // Record successful submission for rate limiting
    recordSuccessfulSubmission(session.user.id)

    console.log('[Feedback] Issue created:', issue.number)

    return NextResponse.json(
      {
        success: true,
        message: 'Thank you for your feedback!',
        issueNumber: issue.number,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Feedback] Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
