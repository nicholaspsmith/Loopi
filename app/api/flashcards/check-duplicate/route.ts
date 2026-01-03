import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { checkFlashcardDuplicate } from '@/lib/dedup/similarity-check'
import * as logger from '@/lib/logger'

/**
 * Flashcard Duplicate Check Schema
 * Based on specs/023-dedupe/contracts/dedupe-api.md
 */
const checkDuplicateSchema = z.object({
  question: z.string().trim().min(1, 'Question is required'),
})

/**
 * POST /api/flashcards/check-duplicate
 *
 * Check if a flashcard question is similar to existing flashcards.
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
      // Return user-friendly error message for question validation failures
      const hasQuestionError = validation.error.flatten().fieldErrors.question?.length
      const errorMessage = hasQuestionError ? 'Question is required' : 'Invalid request'
      return NextResponse.json(
        {
          error: errorMessage,
        },
        { status: 400 }
      )
    }

    const { question } = validation.data

    // Check for duplicates
    const result = await checkFlashcardDuplicate({
      question,
      userId,
    })

    logger.debug('Flashcard duplicate check', {
      userId,
      questionLength: question.length,
      isDuplicate: result.isDuplicate,
      topScore: result.topScore,
      similarCount: result.similarItems.length,
      checkSkipped: result.checkSkipped,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    logger.error('Failed to check flashcard duplicate', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
