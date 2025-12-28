import { v4 as uuidv4 } from 'uuid'
import { getDb } from '@/lib/db/pg-client'
import { flashcards } from '@/lib/db/drizzle-schema'
import { eq } from 'drizzle-orm'
import { createEmptyCard, State, type Card } from 'ts-fsrs'
import { syncFlashcardToLanceDB, deleteFlashcardFromLanceDB } from './flashcards-lancedb'

/**
 * Flashcard Database Operations
 *
 * CRUD operations for flashcards in PostgreSQL with FSRS state.
 * Embeddings are synced to LanceDB asynchronously for vector search.
 */

export interface CreateFlashcardInput {
  userId: string
  conversationId: string | null
  messageId: string | null
  question: string
  answer: string
}

export interface Flashcard {
  id: string
  userId: string
  conversationId: string | null
  messageId: string | null
  question: string
  answer: string
  fsrsState: Card
  createdAt: number
}

/**
 * Convert database row to Flashcard type
 */
function rowToFlashcard(row: typeof flashcards.$inferSelect): Flashcard {
  const fsrsState = row.fsrsState as any

  return {
    id: row.id,
    userId: row.userId,
    conversationId: row.conversationId,
    messageId: row.messageId,
    question: row.question,
    answer: row.answer,
    createdAt: row.createdAt.getTime(),
    fsrsState: {
      ...fsrsState,
      due: new Date(fsrsState.due),
      last_review: fsrsState.last_review ? new Date(fsrsState.last_review) : undefined,
      // Ensure numeric defaults for FSRS fields
      learning_steps: fsrsState.learning_steps ?? 0,
      elapsed_days: fsrsState.elapsed_days ?? 0,
      scheduled_days: fsrsState.scheduled_days ?? 0,
      reps: fsrsState.reps ?? 0,
      lapses: fsrsState.lapses ?? 0,
      stability: fsrsState.stability ?? 0,
      difficulty: fsrsState.difficulty ?? 0,
      state: fsrsState.state ?? 0,
    },
  }
}

/**
 * Convert FSRS Card to JSON for PostgreSQL storage
 */
function cardToJson(card: Card): Record<string, unknown> {
  return {
    ...card,
    due: card.due.getTime(),
    last_review: card.last_review?.getTime() || null,
  }
}

/**
 * Create a new flashcard with initial FSRS state
 */
export async function createFlashcard(data: CreateFlashcardInput): Promise<Flashcard> {
  const db = getDb()
  const fsrsCard = createEmptyCard()

  const [row] = await db
    .insert(flashcards)
    .values({
      id: uuidv4(),
      userId: data.userId,
      conversationId: data.conversationId,
      messageId: data.messageId,
      question: data.question,
      answer: data.answer,
      fsrsState: cardToJson(fsrsCard),
    })
    .returning()

  // Sync embedding to LanceDB asynchronously
  if (process.env.NODE_ENV !== 'test') {
    syncFlashcardToLanceDB({
      id: row.id,
      userId: row.userId,
      question: row.question,
    }).catch((error) => {
      console.error(`[Flashcards] Failed to sync flashcard ${row.id} to LanceDB:`, error)
    })
  }

  console.log(`[Flashcards] Created flashcard ${row.id}`)

  return rowToFlashcard(row)
}

/**
 * Get flashcard by ID
 */
export async function getFlashcardById(flashcardId: string): Promise<Flashcard | null> {
  const db = getDb()

  const [row] = await db.select().from(flashcards).where(eq(flashcards.id, flashcardId)).limit(1)

  return row ? rowToFlashcard(row) : null
}

/**
 * Get all flashcards for a user
 */
export async function getFlashcardsByUserId(userId: string): Promise<Flashcard[]> {
  const db = getDb()

  const rows = await db
    .select()
    .from(flashcards)
    .where(eq(flashcards.userId, userId))
    .orderBy(flashcards.createdAt)

  return rows.map(rowToFlashcard)
}

/**
 * Get flashcards by message ID
 */
export async function getFlashcardsByMessageId(messageId: string): Promise<Flashcard[]> {
  const db = getDb()

  const rows = await db
    .select()
    .from(flashcards)
    .where(eq(flashcards.messageId, messageId))
    .orderBy(flashcards.createdAt)

  return rows.map(rowToFlashcard)
}

/**
 * Get flashcards by conversation ID
 */
export async function getFlashcardsByConversationId(conversationId: string): Promise<Flashcard[]> {
  const db = getDb()

  const rows = await db
    .select()
    .from(flashcards)
    .where(eq(flashcards.conversationId, conversationId))
    .orderBy(flashcards.createdAt)

  return rows.map(rowToFlashcard)
}

/**
 * Get due flashcards for quiz (FSRS due date <= now)
 */
export async function getDueFlashcards(userId: string): Promise<Flashcard[]> {
  const db = getDb()

  // Get all user's flashcards and filter by due date in memory
  // (JSONB date comparison in SQL is complex)
  const rows = await db.select().from(flashcards).where(eq(flashcards.userId, userId))

  const now = new Date()
  return rows
    .filter((row) => {
      const fsrsState = row.fsrsState as any
      const dueDate = new Date(fsrsState.due)
      return dueDate <= now
    })
    .sort((a, b) => {
      const aDue = new Date((a.fsrsState as any).due).getTime()
      const bDue = new Date((b.fsrsState as any).due).getTime()
      return aDue - bDue
    })
    .map(rowToFlashcard)
}

/**
 * Get flashcards by FSRS state
 */
export async function getFlashcardsByState(userId: string, state: State): Promise<Flashcard[]> {
  const db = getDb()

  const rows = await db.select().from(flashcards).where(eq(flashcards.userId, userId))

  return rows.filter((row) => (row.fsrsState as any).state === state).map(rowToFlashcard)
}

/**
 * Update flashcard FSRS state
 */
export async function updateFlashcardFSRSState(
  flashcardId: string,
  fsrsState: Card
): Promise<Flashcard> {
  const db = getDb()

  const [row] = await db
    .update(flashcards)
    .set({ fsrsState: cardToJson(fsrsState) })
    .where(eq(flashcards.id, flashcardId))
    .returning()

  if (!row) {
    throw new Error(`Flashcard ${flashcardId} not found`)
  }

  console.log(`[Flashcards] Updated FSRS state for flashcard ${flashcardId}`)

  return rowToFlashcard(row)
}

/**
 * Delete flashcard
 */
export async function deleteFlashcard(flashcardId: string): Promise<void> {
  const db = getDb()

  await db.delete(flashcards).where(eq(flashcards.id, flashcardId))

  // Delete from LanceDB asynchronously
  if (process.env.NODE_ENV !== 'test') {
    deleteFlashcardFromLanceDB(flashcardId).catch((error) => {
      console.error(`[Flashcards] Failed to delete flashcard ${flashcardId} from LanceDB:`, error)
    })
  }

  console.log(`[Flashcards] Deleted flashcard ${flashcardId}`)
}

/**
 * Check if flashcard belongs to user
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
export async function countFlashcardsByState(userId: string, state: State): Promise<number> {
  const flashcards = await getFlashcardsByState(userId, state)
  return flashcards.length
}

/**
 * Goal-based flashcard input (for skill tree card generation)
 */
export interface CreateGoalFlashcardInput {
  userId: string
  skillNodeId: string
  question: string
  answer: string
  cardType: 'flashcard' | 'multiple_choice' | 'scenario'
  distractors?: string[] // For multiple_choice
  context?: string // For scenario (stored in metadata)
}

/**
 * Extended flashcard type with goal-based fields
 */
export interface GoalFlashcard extends Flashcard {
  skillNodeId: string | null
  cardType: string
  cardMetadata: { distractors?: string[]; context?: string } | null
}

/**
 * Convert database row to GoalFlashcard type
 */
function rowToGoalFlashcard(row: typeof flashcards.$inferSelect): GoalFlashcard {
  const base = rowToFlashcard(row)
  return {
    ...base,
    skillNodeId: row.skillNodeId,
    cardType: row.cardType,
    cardMetadata: row.cardMetadata as { distractors?: string[]; context?: string } | null,
  }
}

/**
 * Create a goal-based flashcard linked to a skill node
 */
export async function createGoalFlashcard(data: CreateGoalFlashcardInput): Promise<GoalFlashcard> {
  const db = getDb()
  const fsrsCard = createEmptyCard()

  // Build metadata based on card type
  let cardMetadata: Record<string, unknown> | null = null
  if (data.cardType === 'multiple_choice' && data.distractors) {
    cardMetadata = { distractors: data.distractors }
  } else if (data.cardType === 'scenario' && data.context) {
    cardMetadata = { context: data.context }
  }

  const [row] = await db
    .insert(flashcards)
    .values({
      id: uuidv4(),
      userId: data.userId,
      conversationId: null,
      messageId: null,
      question: data.question,
      answer: data.answer,
      fsrsState: cardToJson(fsrsCard),
      skillNodeId: data.skillNodeId,
      cardType: data.cardType,
      cardMetadata,
    })
    .returning()

  // Sync embedding to LanceDB asynchronously
  if (process.env.NODE_ENV !== 'test') {
    syncFlashcardToLanceDB({
      id: row.id,
      userId: row.userId,
      question: row.question,
    }).catch((error) => {
      console.error(`[Flashcards] Failed to sync flashcard ${row.id} to LanceDB:`, error)
    })
  }

  console.log(`[Flashcards] Created goal flashcard ${row.id} for node ${data.skillNodeId}`)

  return rowToGoalFlashcard(row)
}

/**
 * Create multiple goal-based flashcards in batch
 */
export async function createGoalFlashcards(
  cards: CreateGoalFlashcardInput[]
): Promise<GoalFlashcard[]> {
  if (cards.length === 0) return []

  const db = getDb()

  const values = cards.map((data) => {
    const fsrsCard = createEmptyCard()
    let cardMetadata: Record<string, unknown> | null = null
    if (data.cardType === 'multiple_choice' && data.distractors) {
      cardMetadata = { distractors: data.distractors }
    } else if (data.cardType === 'scenario' && data.context) {
      cardMetadata = { context: data.context }
    }

    return {
      id: uuidv4(),
      userId: data.userId,
      conversationId: null,
      messageId: null,
      question: data.question,
      answer: data.answer,
      fsrsState: cardToJson(fsrsCard),
      skillNodeId: data.skillNodeId,
      cardType: data.cardType,
      cardMetadata,
    }
  })

  const rows = await db.insert(flashcards).values(values).returning()

  // Sync embeddings to LanceDB asynchronously
  if (process.env.NODE_ENV !== 'test') {
    for (const row of rows) {
      syncFlashcardToLanceDB({
        id: row.id,
        userId: row.userId,
        question: row.question,
      }).catch((error) => {
        console.error(`[Flashcards] Failed to sync flashcard ${row.id} to LanceDB:`, error)
      })
    }
  }

  console.log(`[Flashcards] Created ${rows.length} goal flashcards`)

  return rows.map(rowToGoalFlashcard)
}

/**
 * Get flashcards by skill node ID
 */
export async function getFlashcardsBySkillNodeId(nodeId: string): Promise<GoalFlashcard[]> {
  const db = getDb()

  const rows = await db
    .select()
    .from(flashcards)
    .where(eq(flashcards.skillNodeId, nodeId))
    .orderBy(flashcards.createdAt)

  return rows.map(rowToGoalFlashcard)
}

/**
 * Count flashcards for a skill node
 */
export async function countFlashcardsByNodeId(nodeId: string): Promise<number> {
  const cards = await getFlashcardsBySkillNodeId(nodeId)
  return cards.length
}
