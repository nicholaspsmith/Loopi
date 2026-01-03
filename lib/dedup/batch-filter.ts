/**
 * Batch Duplicate Filter Module
 *
 * Filters duplicates from AI-generated batches of items (flashcards, etc.)
 * by checking against existing items and within the batch itself.
 */

import { DEDUP_CONFIG } from './config'
import { BatchFilterResult, FilteredItem, BatchFilterStats } from './types'
import { findSimilarFlashcardsWithThreshold } from '@/lib/db/operations/flashcards-lancedb'
import { generateEmbedding } from '@/lib/embeddings'
import * as logger from '@/lib/logger'

/**
 * Calculate cosine similarity between two embeddings
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) return 0

  return dotProduct / denominator
}

/**
 * Filter duplicates from a batch of items
 *
 * Checks each item against:
 * 1. Existing flashcards for the user (using LanceDB similarity search)
 * 2. Previous items in the same batch (in-batch duplicate detection)
 *
 * @param items - Array of items to filter
 * @param userId - User ID for scoping existing item search
 * @param getTextForEmbedding - Function to extract text from item for embedding
 * @returns BatchFilterResult with unique items, filtered items, and stats
 */
export async function filterDuplicatesFromBatch<T>(
  items: T[],
  userId: string,
  getTextForEmbedding: (item: T) => string
): Promise<BatchFilterResult<T>> {
  // Handle empty batch
  if (items.length === 0) {
    return {
      uniqueItems: [],
      filteredItems: [],
      stats: { total: 0, unique: 0, duplicatesRemoved: 0 },
    }
  }

  const uniqueItems: T[] = []
  const filteredItems: FilteredItem<T>[] = []

  // Track embeddings for in-batch duplicate detection
  const processedEmbeddings: Array<{ item: T; embedding: number[]; text: string }> = []

  for (const item of items) {
    const text = getTextForEmbedding(item)

    // Skip items with very short content
    if (text.length < DEDUP_CONFIG.MIN_CONTENT_LENGTH) {
      uniqueItems.push(item)
      continue
    }

    // Check against existing flashcards
    try {
      const existingSimilar = await findSimilarFlashcardsWithThreshold(
        text,
        userId,
        DEDUP_CONFIG.SIMILARITY_THRESHOLD,
        1 // Only need top match
      )

      if (existingSimilar.length > 0) {
        filteredItems.push({
          item,
          reason: 'duplicate_existing',
          similarTo: existingSimilar[0].id,
          score: existingSimilar[0].similarity,
        })
        continue
      }
    } catch (error) {
      // If LanceDB check fails, allow item through
      logger.warn('Batch filter: LanceDB check failed, allowing item', { error })
    }

    // Generate embedding for in-batch comparison
    const embedding = await generateEmbedding(text)

    if (!embedding) {
      // If embedding fails, allow item through
      uniqueItems.push(item)
      continue
    }

    // Check against previously processed items in this batch
    let foundInBatchDuplicate = false
    for (const processed of processedEmbeddings) {
      const similarity = cosineSimilarity(embedding, processed.embedding)

      if (similarity >= DEDUP_CONFIG.SIMILARITY_THRESHOLD) {
        filteredItems.push({
          item,
          reason: 'duplicate_in_batch',
          similarTo: processed.text, // Use text as identifier for in-batch items
          score: similarity,
        })
        foundInBatchDuplicate = true
        break
      }
    }

    if (!foundInBatchDuplicate) {
      uniqueItems.push(item)
      processedEmbeddings.push({ item, embedding, text })
    }
  }

  const stats: BatchFilterStats = {
    total: items.length,
    unique: uniqueItems.length,
    duplicatesRemoved: filteredItems.length,
  }

  logger.info('Batch duplicate filter completed', {
    userId,
    ...stats,
    duplicateExisting: filteredItems.filter((f) => f.reason === 'duplicate_existing').length,
    duplicateInBatch: filteredItems.filter((f) => f.reason === 'duplicate_in_batch').length,
  })

  return { uniqueItems, filteredItems, stats }
}

/**
 * Filter flashcard batch specifically
 *
 * Convenience function for flashcard objects with question field
 */
export async function filterFlashcardBatch<T extends { question: string; answer: string }>(
  items: T[],
  userId: string
): Promise<BatchFilterResult<T>> {
  return filterDuplicatesFromBatch(items, userId, (item) => item.question)
}
