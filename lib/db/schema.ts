import { getDbConnection } from './client'
import { createEmptyCard } from 'ts-fsrs'

/**
 * Initialize all database tables for MemoryLoop
 * Creates tables with initial schema rows (LanceDB requires at least one row)
 */
export async function initializeSchema() {
  const db = await getDbConnection()

  console.log('🔨 Creating database schema...')

  // 1. Users table
  await db.createTable(
    'users',
    [
      {
        id: '00000000-0000-0000-0000-000000000000',
        email: 'init@example.com',
        name: 'Init User',
        passwordHash: '$2b$10$INIT_PLACEHOLDER_HASH_FOR_SCHEMA_CREATION_ONLY',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    { mode: 'create' }
  )
  console.log('✅ Created users table')

  // 2. Conversations table
  await db.createTable(
    'conversations',
    [
      {
        id: '00000000-0000-0000-0000-000000000000',
        userId: '00000000-0000-0000-0000-000000000000',
        title: 'Init Conversation',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 0,
      },
    ],
    { mode: 'create' }
  )
  console.log('✅ Created conversations table')

  // 3. Messages table (with vector column)
  await db.createTable(
    'messages',
    [
      {
        id: '00000000-0000-0000-0000-000000000000',
        conversationId: '00000000-0000-0000-0000-000000000000',
        userId: '00000000-0000-0000-0000-000000000000',
        role: 'user',
        content: 'Init message for schema creation',
        embedding: null, // Ollama nomic-embed-text - nullable, filled async
        createdAt: Date.now(),
        hasFlashcards: false,
      },
    ],
    { mode: 'create' }
  )
  console.log('✅ Created messages table')

  // 4. Flashcards table (with vector column and FSRS state)
  const emptyFSRSCard = createEmptyCard()

  // Convert FSRS Card dates to timestamps for LanceDB
  // Use 0 for null values so LanceDB can infer the type as number
  const fsrsStateForSchema = {
    ...emptyFSRSCard,
    due: emptyFSRSCard.due.getTime(),
    last_review: emptyFSRSCard.last_review?.getTime() || 0,
  }

  await db.createTable(
    'flashcards',
    [
      {
        id: '00000000-0000-0000-0000-000000000000',
        userId: '00000000-0000-0000-0000-000000000000',
        conversationId: '00000000-0000-0000-0000-000000000000',
        messageId: '00000000-0000-0000-0000-000000000000',
        question: 'Init question',
        answer: 'Init answer',
        questionEmbedding: new Array(768).fill(0),
        createdAt: Date.now(),
        fsrsState: fsrsStateForSchema, // FSRS Card object with timestamps
      },
    ],
    { mode: 'create' }
  )
  console.log('✅ Created flashcards table')

  // 5. ReviewLogs table
  await db.createTable(
    'review_logs',
    [
      {
        id: '00000000-0000-0000-0000-000000000000',
        flashcardId: '00000000-0000-0000-0000-000000000000',
        userId: '00000000-0000-0000-0000-000000000000',
        rating: 3, // Rating.Good
        state: 0, // State.New
        due: Date.now(), // Use timestamp instead of Date object
        stability: 0,
        difficulty: 0,
        elapsed_days: 0,
        last_elapsed_days: 0,
        scheduled_days: 0,
        review: Date.now(), // Use timestamp instead of Date object
      },
    ],
    { mode: 'create' }
  )
  console.log('✅ Created review_logs table')

  console.log('🧹 Cleaning up init rows...')

  // Cleanup init rows
  const users = await db.openTable('users')
  await users.delete("id = '00000000-0000-0000-0000-000000000000'")

  const conversations = await db.openTable('conversations')
  await conversations.delete("id = '00000000-0000-0000-0000-000000000000'")

  const messages = await db.openTable('messages')
  await messages.delete("id = '00000000-0000-0000-0000-000000000000'")

  const flashcards = await db.openTable('flashcards')
  await flashcards.delete("id = '00000000-0000-0000-0000-000000000000'")

  const reviewLogs = await db.openTable('review_logs')
  await reviewLogs.delete("id = '00000000-0000-0000-0000-000000000000'")

  console.log('✅ Database schema initialized successfully')
}

/**
 * Check if database schema is already initialized
 */
export async function isSchemaInitialized(): Promise<boolean> {
  try {
    const db = await getDbConnection()
    const tableNames = await db.tableNames()
    const requiredTables = ['users', 'conversations', 'messages', 'flashcards', 'review_logs']

    return requiredTables.every((table) => tableNames.includes(table))
  } catch (error) {
    return false
  }
}
