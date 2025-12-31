/**
 * Distractor Generation Job Handler
 *
 * Wraps the existing generateAndPersistDistractors function and:
 * - Generates 3 plausible distractors for a flashcard
 * - Persists distractors to database
 * - Returns generated distractors for immediate use
 *
 * Maps to spec: 018-background-flashcard-generation (User Story 2)
 */

import { generateAndPersistDistractors } from '@/lib/ai/distractor-generator'
import { registerHandler } from '@/lib/jobs/processor'
import { JobType } from '@/lib/db/drizzle-schema'
import type {
  DistractorGenerationPayload,
  DistractorGenerationResult,
  JobHandler,
} from '@/lib/jobs/types'
import * as logger from '@/lib/logger'

/**
 * Handle distractor generation for a flashcard
 *
 * @param payload - Job payload with flashcardId, question, and answer
 * @returns Result with generated distractors
 * @throws Error if generation fails after retries
 */
export async function handleDistractorGeneration(
  payload: DistractorGenerationPayload
): Promise<DistractorGenerationResult> {
  logger.info('[DistractorJob] Starting distractor generation', {
    flashcardId: payload.flashcardId,
    questionLength: payload.question.length,
    answerLength: payload.answer.length,
  })

  // Generate and persist distractors using existing function
  const result = await generateAndPersistDistractors(
    payload.flashcardId,
    payload.question,
    payload.answer
  )

  if (!result.success || !result.distractors) {
    logger.error(
      '[DistractorJob] Distractor generation failed',
      new Error(result.error || 'Unknown error'),
      {
        flashcardId: payload.flashcardId,
        generationTimeMs: result.generationTimeMs,
      }
    )
    throw new Error(result.error || 'Failed to generate distractors')
  }

  logger.info('[DistractorJob] Distractor generation completed', {
    flashcardId: payload.flashcardId,
    distractorCount: result.distractors.length,
    generationTimeMs: result.generationTimeMs,
  })

  return {
    flashcardId: payload.flashcardId,
    distractors: result.distractors,
  }
}

// Register handler with job processor
const wrappedHandler: JobHandler<DistractorGenerationPayload, DistractorGenerationResult> = async (
  payload
) => {
  return handleDistractorGeneration(payload)
}

registerHandler(JobType.DISTRACTOR_GENERATION, wrappedHandler)
