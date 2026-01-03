/**
 * Duplicate Detection - Similarity Check Module
 *
 * Core functions for checking duplicate flashcards and goals
 * using semantic similarity via LanceDB embeddings.
 */

import { DEDUP_CONFIG } from './config'
import {
  DuplicateCheckResult,
  SimilarItem,
  FlashcardDuplicateCheckInput,
  GoalDuplicateCheckInput,
} from './types'
import { findSimilarFlashcardsWithThreshold } from '@/lib/db/operations/flashcards-lancedb'
import { findSimilarGoals } from '@/lib/db/operations/goals-lancedb'
import { getFlashcardsByIds } from '@/lib/db/operations/flashcards'
import { getGoalsByIds } from '@/lib/db/operations/goals'
import * as logger from '@/lib/logger'

/**
 * Check if a flashcard question is similar to existing flashcards
 *
 * @param input - The question text and user ID
 * @returns DuplicateCheckResult with similarity information
 */
export async function checkFlashcardDuplicate(
  input: FlashcardDuplicateCheckInput
): Promise<DuplicateCheckResult> {
  const { question, userId } = input

  // Check minimum content length
  if (question.length < DEDUP_CONFIG.MIN_CONTENT_LENGTH) {
    return {
      isDuplicate: false,
      similarItems: [],
      topScore: null,
      checkSkipped: true,
      skipReason: 'content_too_short',
    }
  }

  try {
    // Search for similar flashcards in LanceDB
    const similarResults = await findSimilarFlashcardsWithThreshold(
      question,
      userId,
      DEDUP_CONFIG.SIMILARITY_THRESHOLD,
      DEDUP_CONFIG.MAX_SIMILAR_RESULTS
    )

    if (similarResults.length === 0) {
      return {
        isDuplicate: false,
        similarItems: [],
        topScore: null,
        checkSkipped: false,
      }
    }

    // Fetch flashcard details from PostgreSQL for display text
    const flashcardIds = similarResults.map((r) => r.id)
    const flashcards = await getFlashcardsByIds(flashcardIds)

    // Build similar items with display text
    const similarItems: SimilarItem[] = similarResults
      .map((result) => {
        const flashcard = flashcards.find((f) => f.id === result.id)
        if (!flashcard) return null

        return {
          id: result.id,
          score: result.similarity,
          displayText: flashcard.question,
          type: 'flashcard' as const,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, DEDUP_CONFIG.MAX_SIMILAR_RESULTS)

    const topScore = similarItems.length > 0 ? similarItems[0].score : null
    const isDuplicate = topScore !== null && topScore >= DEDUP_CONFIG.SIMILARITY_THRESHOLD

    logger.info('Flashcard duplicate check completed', {
      isDuplicate,
      topScore,
      matchCount: similarItems.length,
      threshold: DEDUP_CONFIG.SIMILARITY_THRESHOLD,
    })

    return {
      isDuplicate,
      similarItems,
      topScore,
      checkSkipped: false,
    }
  } catch (error) {
    logger.error('Flashcard duplicate check failed', error as Error)

    // Return graceful fallback - don't block creation on dedup failure
    return {
      isDuplicate: false,
      similarItems: [],
      topScore: null,
      checkSkipped: true,
      skipReason: 'service_unavailable',
    }
  }
}

/**
 * Check if a goal title/description is similar to existing goals
 *
 * @param input - The goal title, optional description, and user ID
 * @returns DuplicateCheckResult with similarity information
 */
export async function checkGoalDuplicate(
  input: GoalDuplicateCheckInput
): Promise<DuplicateCheckResult> {
  const { title, description, userId } = input

  // Combine title and description for checking
  const textToCheck = description ? `${title}: ${description}` : title

  // Check minimum content length
  if (textToCheck.length < DEDUP_CONFIG.MIN_CONTENT_LENGTH) {
    return {
      isDuplicate: false,
      similarItems: [],
      topScore: null,
      checkSkipped: true,
      skipReason: 'content_too_short',
    }
  }

  try {
    // Search for similar goals in LanceDB
    const similarResults = await findSimilarGoals(
      textToCheck,
      userId,
      DEDUP_CONFIG.SIMILARITY_THRESHOLD,
      DEDUP_CONFIG.MAX_SIMILAR_RESULTS
    )

    if (similarResults.length === 0) {
      return {
        isDuplicate: false,
        similarItems: [],
        topScore: null,
        checkSkipped: false,
      }
    }

    // Fetch goal details from PostgreSQL for display text
    const goalIds = similarResults.map((r) => r.id)
    const goals = await getGoalsByIds(goalIds)

    // Build similar items with display text
    const similarItems: SimilarItem[] = similarResults
      .map((result) => {
        const goal = goals.find((g) => g.id === result.id)
        if (!goal) return null

        return {
          id: result.id,
          score: result.similarity,
          displayText: goal.title,
          type: 'goal' as const,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, DEDUP_CONFIG.MAX_SIMILAR_RESULTS)

    const topScore = similarItems.length > 0 ? similarItems[0].score : null
    const isDuplicate = topScore !== null && topScore >= DEDUP_CONFIG.SIMILARITY_THRESHOLD

    logger.info('Goal duplicate check completed', {
      isDuplicate,
      topScore,
      matchCount: similarItems.length,
      threshold: DEDUP_CONFIG.SIMILARITY_THRESHOLD,
    })

    return {
      isDuplicate,
      similarItems,
      topScore,
      checkSkipped: false,
    }
  } catch (error) {
    logger.error('Goal duplicate check failed', error as Error)

    // Return graceful fallback - don't block creation on dedup failure
    return {
      isDuplicate: false,
      similarItems: [],
      topScore: null,
      checkSkipped: true,
      skipReason: 'service_unavailable',
    }
  }
}
