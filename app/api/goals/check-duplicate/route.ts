import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { checkGoalDuplicate } from '@/lib/dedup/similarity-check'
import * as logger from '@/lib/logger'

/**
 * Goal Duplicate Check Schema
 * Based on specs/023-dedupe/contracts/dedupe-api.md
 */
const checkDuplicateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().optional(),
})

/**
 * POST /api/goals/check-duplicate
 *
 * Check if a goal title/description is similar to existing goals.
 * Returns similarity results for duplicate detection.
 *
 * Maps to contracts/dedupe-api.md
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()

    // Validate request body
    const validation = checkDuplicateSchema.safeParse(body)
    if (!validation.success) {
      // Return user-friendly error message for title validation failures
      const hasTitleError = validation.error.flatten().fieldErrors.title?.length
      const errorMessage = hasTitleError ? 'Title is required' : 'Invalid request'
      return NextResponse.json(
        {
          error: errorMessage,
        },
        { status: 400 }
      )
    }

    const { title, description } = validation.data

    // Check for duplicates
    const result = await checkGoalDuplicate({
      title,
      description,
      userId,
    })

    logger.debug('Goal duplicate check', {
      userId,
      titleLength: title.length,
      hasDescription: !!description,
      isDuplicate: result.isDuplicate,
      topScore: result.topScore,
      similarCount: result.similarItems.length,
      checkSkipped: result.checkSkipped,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    logger.error('Failed to check goal duplicate', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
