/**
 * Flashcard Generation Job Handler
 *
 * Generates flashcards for a skill tree node:
 * - Takes node title/description as content
 * - Generates Q&A pairs using AI
 * - Creates flashcards in database
 * - Updates node card count
 *
 * Maps to spec: 019-auto-gen-guided-study
 */

import { generateFlashcardsFromContent } from '@/lib/claude/flashcard-generator'
import { createFlashcard } from '@/lib/db/operations/flashcards'
import { incrementNodeCardCount } from '@/lib/db/operations/skill-nodes'
import { registerHandler } from '@/lib/jobs/processor'
import { JobType } from '@/lib/db/drizzle-schema'
import type {
  FlashcardGenerationPayload,
  FlashcardGenerationResult,
  BackgroundJob,
  JobHandler,
} from '@/lib/jobs/types'
import * as logger from '@/lib/logger'

/**
 * Handle flashcard generation for a skill tree node
 *
 * @param payload - Job payload with nodeId, nodeTitle, nodeDescription, maxCards
 * @param job - The background job record (contains userId)
 * @returns Result with generated flashcard IDs
 * @throws Error if generation fails
 */
export async function handleFlashcardGeneration(
  payload: FlashcardGenerationPayload,
  job: BackgroundJob
): Promise<FlashcardGenerationResult> {
  const { nodeId, nodeTitle, nodeDescription, maxCards = 5 } = payload
  const userId = job.userId

  // Validate required fields for node-based generation
  if (!nodeId || !nodeTitle) {
    throw new Error('Missing required fields: nodeId and nodeTitle are required')
  }

  if (!userId) {
    throw new Error('Missing userId in job record')
  }

  logger.info('[FlashcardJob] Starting flashcard generation', {
    nodeId,
    nodeTitle,
    maxCards,
    userId,
  })

  // Build content from node title and description
  const content = nodeDescription ? `${nodeTitle}\n\n${nodeDescription}` : nodeTitle

  // Generate flashcards using AI
  const flashcardPairs = await generateFlashcardsFromContent(content, {
    maxFlashcards: maxCards,
    minContentLength: 10, // Lower threshold for node titles
    skipEducationalCheck: true, // Skill tree nodes are inherently educational
  })

  if (flashcardPairs.length === 0) {
    logger.warn('[FlashcardJob] No flashcards generated', {
      nodeId,
      nodeTitle,
      contentLength: content.length,
    })
    return {
      flashcardIds: [],
      count: 0,
    }
  }

  // Create flashcards in database
  const flashcardIds: string[] = []

  for (const pair of flashcardPairs) {
    try {
      const flashcard = await createFlashcard({
        userId,
        question: pair.question,
        answer: pair.answer,
        skillNodeId: nodeId,
      })
      flashcardIds.push(flashcard.id)

      logger.debug('[FlashcardJob] Created flashcard', {
        flashcardId: flashcard.id,
        nodeId,
        question: pair.question.substring(0, 50),
      })
    } catch (error) {
      logger.error('[FlashcardJob] Failed to create flashcard', error as Error, {
        nodeId,
        question: pair.question.substring(0, 50),
      })
      // Continue with other flashcards
    }
  }

  // Update node card count
  if (flashcardIds.length > 0) {
    try {
      await incrementNodeCardCount(nodeId, flashcardIds.length)
      logger.info('[FlashcardJob] Updated node card count', {
        nodeId,
        addedCards: flashcardIds.length,
      })
    } catch (error) {
      logger.error('[FlashcardJob] Failed to update node card count', error as Error, {
        nodeId,
        addedCards: flashcardIds.length,
      })
    }
  }

  logger.info('[FlashcardJob] Flashcard generation completed', {
    nodeId,
    nodeTitle,
    generatedCount: flashcardIds.length,
    requestedMax: maxCards,
  })

  return {
    flashcardIds,
    count: flashcardIds.length,
  }
}

// Register handler with job processor
const wrappedHandler: JobHandler<FlashcardGenerationPayload, FlashcardGenerationResult> = async (
  payload,
  job
) => {
  return handleFlashcardGeneration(payload, job)
}

registerHandler(JobType.FLASHCARD_GENERATION, wrappedHandler)
