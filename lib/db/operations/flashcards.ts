import { v4 as uuidv4 } from 'uuid'
import { getDbConnection } from '../client'
import { Flashcard, FlashcardSchema } from '@/types/db'
import { createEmptyCard, State } from 'ts-fsrs'

/**
 * Flashcard Database Operations
 *
 * CRUD operations for flashcards with FSRS state
 */

export interface CreateFlashcardInput {
  userId: string
  conversationId: string
  messageId: string
  question: string
  answer: string
  questionEmbedding?: number[] | null
}

/**
 * Transform flashcard data from LanceDB format to app format
 * Converts timestamp numbers to Date objects for FSRS state
 */
function transformFlashcardFromDB(raw: any): any {
  return {
    ...raw,
    fsrsState: {
      ...raw.fsrsState,
      due: new Date(raw.fsrsState.due),
      last_review: raw.fsrsState.last_review
        ? new Date(raw.fsrsState.last_review)
        : undefined,
    },
  }
}

/**
 * Create a new flashcard with initial FSRS state
 */
export async function createFlashcard(
  data: CreateFlashcardInput
): Promise<Flashcard> {
  const db = await getDbConnection()

  // Initialize FSRS card (new card state)
  const fsrsCard = createEmptyCard()

  const flashcard: Flashcard = {
    id: uuidv4(),
    userId: data.userId,
    conversationId: data.conversationId,
    messageId: data.messageId,
    question: data.question,
    answer: data.answer,
    questionEmbedding: data.questionEmbedding || null,
    createdAt: Date.now(),
    fsrsState: fsrsCard,
  }

  // Validate with Zod
  const validated = FlashcardSchema.parse(flashcard)

  const table = await db.openTable('flashcards')
  await table.add([validated])

  console.log(`[Flashcards] Created flashcard ${flashcard.id}`)

  return validated
}

/**
 * Get flashcard by ID
 */
export async function getFlashcardById(
  flashcardId: string
): Promise<Flashcard | null> {
  const db = await getDbConnection()

  const table = await db.openTable('flashcards')
  const results = await table
    .query()
    .where(`id = '${flashcardId}'`)
    .limit(1)
    .toArray()

  if (results.length === 0) {
    return null
  }

  const transformed = transformFlashcardFromDB(results[0])
  return FlashcardSchema.parse(transformed)
}

/**
 * Get all flashcards for a user in chronological order (FR-024)
 */
export async function getFlashcardsByUserId(
  userId: string
): Promise<Flashcard[]> {
  const db = await getDbConnection()

  const table = await db.openTable('flashcards')
  const results = await table
    .query()
    .where(`\`userId\` = '${userId}'`)
    .toArray()

  // Sort by createdAt ascending (oldest first)
  const sorted = results.sort(
    (a: any, b: any) => a.createdAt - b.createdAt
  )

  return sorted.map((fc: any) => {
    const transformed = transformFlashcardFromDB(fc)
    return FlashcardSchema.parse(transformed)
  })
}

/**
 * Get flashcards by message ID (check if flashcards exist for a message)
 */
export async function getFlashcardsByMessageId(
  messageId: string
): Promise<Flashcard[]> {
  const db = await getDbConnection()

  const table = await db.openTable('flashcards')
  const results = await table
    .query()
    .where(`\`messageId\` = '${messageId}'`)
    .toArray()

  return results.map((fc: any) => {
    const transformed = transformFlashcardFromDB(fc)
    return FlashcardSchema.parse(transformed)
  })
}

/**
 * Get flashcards by conversation ID
 */
export async function getFlashcardsByConversationId(
  conversationId: string
): Promise<Flashcard[]> {
  const db = await getDbConnection()

  const table = await db.openTable('flashcards')
  const results = await table
    .query()
    .where(`\`conversationId\` = '${conversationId}'`)
    .toArray()

  // Sort by createdAt ascending
  const sorted = results.sort(
    (a: any, b: any) => a.createdAt - b.createdAt
  )

  return sorted.map((fc: any) => {
    const transformed = transformFlashcardFromDB(fc)
    return FlashcardSchema.parse(transformed)
  })
}

/**
 * Get due flashcards for quiz (FSRS due date <= now)
 */
export async function getDueFlashcards(userId: string): Promise<Flashcard[]> {
  const db = await getDbConnection()

  const table = await db.openTable('flashcards')
  const results = await table
    .query()
    .where(`\`userId\` = '${userId}'`)
    .toArray()

  // Filter by due date in memory (LanceDB doesn't support date comparison in WHERE)
  const now = new Date()
  const dueFlashcards = results.filter((fc: any) => {
    const dueDate = new Date(fc.fsrsState.due)
    return dueDate <= now
  })

  // Sort by due date (earliest first)
  const sorted = dueFlashcards.sort((a: any, b: any) => {
    const aDue = new Date(a.fsrsState.due).getTime()
    const bDue = new Date(b.fsrsState.due).getTime()
    return aDue - bDue
  })

  return sorted.map((fc: any) => {
    const transformed = transformFlashcardFromDB(fc)
    return FlashcardSchema.parse(transformed)
  })
}

/**
 * Get flashcards by FSRS state
 */
export async function getFlashcardsByState(
  userId: string,
  state: State
): Promise<Flashcard[]> {
  const db = await getDbConnection()

  const table = await db.openTable('flashcards')
  const results = await table
    .query()
    .where(`\`userId\` = '${userId}'`)
    .toArray()

  // Filter by state in memory
  const filtered = results.filter(
    (fc: any) => fc.fsrsState.state === state
  )

  return filtered.map((fc: any) => {
    const transformed = transformFlashcardFromDB(fc)
    return FlashcardSchema.parse(transformed)
  })
}

/**
 * Update flashcard FSRS state
 *
 * Uses delete + insert pattern for LanceDB (no in-place updates)
 */
export async function updateFlashcardFSRSState(
  flashcardId: string,
  fsrsState: any
): Promise<Flashcard> {
  const db = await getDbConnection()

  // Get existing flashcard
  const existing = await getFlashcardById(flashcardId)
  if (!existing) {
    throw new Error(`Flashcard ${flashcardId} not found`)
  }

  // Delete existing
  await deleteFlashcard(flashcardId)

  // Create updated flashcard
  const updated: Flashcard = {
    ...existing,
    fsrsState,
  }

  // Validate
  const validated = FlashcardSchema.parse(updated)

  // Insert updated
  const table = await db.openTable('flashcards')
  await table.add([validated])

  console.log(`[Flashcards] Updated FSRS state for flashcard ${flashcardId}`)

  return validated
}

/**
 * Update flashcard question embedding
 */
export async function updateFlashcardEmbedding(
  flashcardId: string,
  embedding: number[]
): Promise<void> {
  const db = await getDbConnection()

  // Get existing flashcard
  const existing = await getFlashcardById(flashcardId)
  if (!existing) {
    throw new Error(`Flashcard ${flashcardId} not found`)
  }

  // Delete existing
  await deleteFlashcard(flashcardId)

  // Create updated flashcard
  const updated: Flashcard = {
    ...existing,
    questionEmbedding: embedding,
  }

  // Validate
  const validated = FlashcardSchema.parse(updated)

  // Insert updated
  const table = await db.openTable('flashcards')
  await table.add([validated])

  console.log(`[Flashcards] Updated embedding for flashcard ${flashcardId}`)
}

/**
 * Delete flashcard
 */
export async function deleteFlashcard(flashcardId: string): Promise<void> {
  const db = await getDbConnection()

  const table = await db.openTable('flashcards')
  await table.delete(`id = '${flashcardId}'`)

  console.log(`[Flashcards] Deleted flashcard ${flashcardId}`)
}

/**
 * Check if flashcard belongs to user (authorization)
 */
export async function flashcardBelongsToUser(
  flashcardId: string,
  userId: string
): Promise<boolean> {
  const flashcard = await getFlashcardById(flashcardId)
  return flashcard ? flashcard.userId === userId : false
}

/**
 * Count user's flashcards
 */
export async function countUserFlashcards(userId: string): Promise<number> {
  const flashcards = await getFlashcardsByUserId(userId)
  return flashcards.length
}

/**
 * Count user's flashcards by state
 */
export async function countFlashcardsByState(
  userId: string,
  state: State
): Promise<number> {
  const flashcards = await getFlashcardsByState(userId, state)
  return flashcards.length
}
