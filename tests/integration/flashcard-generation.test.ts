import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { closeDbConnection } from '@/lib/db/client'
import { createUser } from '@/lib/db/operations/users'
import { createConversation } from '@/lib/db/operations/conversations'
import { createMessage, getMessageById } from '@/lib/db/operations/messages'
import { hashPassword } from '@/lib/auth/helpers'
import {
  getFlashcardsByMessageId,
  getFlashcardsByUserId,
  deleteFlashcard,
} from '@/lib/db/operations/flashcards'
import { generateFlashcardsFromContent } from '@/lib/claude/flashcard-generator'

/**
 * Integration Tests for Flashcard Generation Flow
 *
 * Tests the complete flashcard generation workflow from content analysis
 * to database persistence and retrieval.
 *
 * Maps to FR-008, FR-009, FR-010, FR-017, FR-018, FR-019
 */

describe('Flashcard Generation Flow Integration', () => {
  let testUserId: string
  let testConversationId: string
  let educationalMessageId: string
  let conversationalMessageId: string

  beforeAll(async () => {
    // Create test user
    const passwordHash = await hashPassword('TestPass123!')
    const user = await createUser({
      email: `test-flashcard-flow-${Date.now()}@example.com`,
      passwordHash,
      name: 'Flashcard Flow Test User',
    })
    testUserId = user.id

    // Create test conversation
    const conversation = await createConversation({
      userId: testUserId,
      title: 'Flashcard Generation Test',
    })
    testConversationId = conversation.id

    // Create educational message (suitable for flashcards)
    const educationalMessage = await createMessage({
      conversationId: testConversationId,
      userId: testUserId,
      role: 'assistant',
      content: `Photosynthesis is the process by which plants convert light energy into chemical energy. It occurs in chloroplasts and requires three main inputs:

1. Sunlight - provides the energy
2. Carbon dioxide - absorbed from the air
3. Water - absorbed through roots

The process produces glucose (sugar) and oxygen as outputs. The chemical equation is:
6CO2 + 6H2O + light energy → C6H12O6 + 6O2

Photosynthesis is essential for life on Earth because it produces oxygen and forms the base of most food chains.`,
    })
    educationalMessageId = educationalMessage.id

    // Create conversational message (not suitable for flashcards)
    const conversationalMessage = await createMessage({
      conversationId: testConversationId,
      userId: testUserId,
      role: 'assistant',
      content: 'Hello! How can I help you today?',
    })
    conversationalMessageId = conversationalMessage.id
  })

  afterAll(async () => {
    await closeDbConnection()
  })

  it('should generate flashcards from educational content', async () => {
    const message = await getMessageById(educationalMessageId)
    expect(message).toBeDefined()

    // Generate flashcards using the library
    const flashcardPairs = await generateFlashcardsFromContent(message!.content, {
      maxFlashcards: 10,
    })

    // Should generate at least one flashcard from educational content
    expect(flashcardPairs.length).toBeGreaterThan(0)

    // Each flashcard should have question and answer
    flashcardPairs.forEach((pair) => {
      expect(pair).toHaveProperty('question')
      expect(pair).toHaveProperty('answer')
      expect(typeof pair.question).toBe('string')
      expect(typeof pair.answer).toBe('string')
      expect(pair.question.length).toBeGreaterThan(0)
      expect(pair.answer.length).toBeGreaterThan(0)
    })
  }, 30000) // 30 second timeout for Ollama

  it('should not generate flashcards from conversational content (FR-019)', async () => {
    const message = await getMessageById(conversationalMessageId)
    expect(message).toBeDefined()

    // Generate flashcards - should return empty array for conversational content
    const flashcardPairs = await generateFlashcardsFromContent(message!.content, {
      maxFlashcards: 10,
    })

    expect(flashcardPairs).toEqual([])
  })

  it('should persist generated flashcards to database (FR-010)', async () => {
    const { createFlashcard } = await import('@/lib/db/operations/flashcards')

    // Generate flashcards
    const message = await getMessageById(educationalMessageId)
    const flashcardPairs = await generateFlashcardsFromContent(message!.content, {
      maxFlashcards: 5,
    })

    expect(flashcardPairs.length).toBeGreaterThan(0)

    // Create flashcard records in database
    const flashcards = await Promise.all(
      flashcardPairs.map((pair) =>
        createFlashcard({
          userId: testUserId,
          conversationId: testConversationId,
          messageId: educationalMessageId,
          question: pair.question,
          answer: pair.answer,
        })
      )
    )

    expect(flashcards.length).toBe(flashcardPairs.length)

    // Verify each flashcard was saved correctly
    flashcards.forEach((flashcard, index) => {
      expect(flashcard.id).toBeDefined()
      expect(flashcard.userId).toBe(testUserId)
      expect(flashcard.conversationId).toBe(testConversationId)
      expect(flashcard.messageId).toBe(educationalMessageId)
      expect(flashcard.question).toBe(flashcardPairs[index].question)
      expect(flashcard.answer).toBe(flashcardPairs[index].answer)

      // FSRS state should be initialized
      expect(flashcard.fsrsState).toBeDefined()
      expect(flashcard.fsrsState.state).toBe(0) // New card
      expect(flashcard.fsrsState.reps).toBe(0)
      expect(flashcard.fsrsState.lapses).toBe(0)
    })

    // Clean up created flashcards
    await Promise.all(flashcards.map((fc) => deleteFlashcard(fc.id)))
  }, 30000)

  it('should retrieve flashcards by message ID (FR-017)', async () => {
    const { createFlashcard } = await import('@/lib/db/operations/flashcards')

    // Create a few flashcards
    const flashcard1 = await createFlashcard({
      userId: testUserId,
      conversationId: testConversationId,
      messageId: educationalMessageId,
      question: 'What is photosynthesis?',
      answer: 'Process of converting light energy to chemical energy',
    })

    const flashcard2 = await createFlashcard({
      userId: testUserId,
      conversationId: testConversationId,
      messageId: educationalMessageId,
      question: 'What are the inputs of photosynthesis?',
      answer: 'Sunlight, carbon dioxide, and water',
    })

    // Wait for LanceDB to commit and index new records
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Retrieve by message ID
    const flashcards = await getFlashcardsByMessageId(educationalMessageId)

    expect(flashcards.length).toBeGreaterThanOrEqual(2)

    const ids = flashcards.map((fc) => fc.id)
    expect(ids).toContain(flashcard1.id)
    expect(ids).toContain(flashcard2.id)

    // Clean up
    await deleteFlashcard(flashcard1.id)
    await deleteFlashcard(flashcard2.id)
  })

  it('should retrieve flashcards by user ID in chronological order (FR-024)', async () => {
    const { createFlashcard } = await import('@/lib/db/operations/flashcards')

    // Create flashcards with small delays to ensure different timestamps
    const flashcard1 = await createFlashcard({
      userId: testUserId,
      conversationId: testConversationId,
      messageId: educationalMessageId,
      question: 'Question 1',
      answer: 'Answer 1',
    })

    await new Promise((resolve) => setTimeout(resolve, 10))

    const flashcard2 = await createFlashcard({
      userId: testUserId,
      conversationId: testConversationId,
      messageId: educationalMessageId,
      question: 'Question 2',
      answer: 'Answer 2',
    })

    await new Promise((resolve) => setTimeout(resolve, 10))

    const flashcard3 = await createFlashcard({
      userId: testUserId,
      conversationId: testConversationId,
      messageId: educationalMessageId,
      question: 'Question 3',
      answer: 'Answer 3',
    })

    // Wait for LanceDB to commit and index new records
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Retrieve all user flashcards
    const flashcards = await getFlashcardsByUserId(testUserId)

    expect(flashcards.length).toBeGreaterThanOrEqual(3)

    // Find our test flashcards
    const fc1 = flashcards.find((fc) => fc.id === flashcard1.id)
    const fc2 = flashcards.find((fc) => fc.id === flashcard2.id)
    const fc3 = flashcards.find((fc) => fc.id === flashcard3.id)

    expect(fc1).toBeDefined()
    expect(fc2).toBeDefined()
    expect(fc3).toBeDefined()

    // Verify chronological order (oldest first)
    const idx1 = flashcards.findIndex((fc) => fc.id === flashcard1.id)
    const idx2 = flashcards.findIndex((fc) => fc.id === flashcard2.id)
    const idx3 = flashcards.findIndex((fc) => fc.id === flashcard3.id)

    expect(idx1).toBeLessThan(idx2)
    expect(idx2).toBeLessThan(idx3)

    // Clean up
    await deleteFlashcard(flashcard1.id)
    await deleteFlashcard(flashcard2.id)
    await deleteFlashcard(flashcard3.id)
  })

  it('should initialize FSRS state correctly for new flashcards', async () => {
    const { createFlashcard } = await import('@/lib/db/operations/flashcards')

    const flashcard = await createFlashcard({
      userId: testUserId,
      conversationId: testConversationId,
      messageId: educationalMessageId,
      question: 'FSRS test question',
      answer: 'FSRS test answer',
    })

    // Verify FSRS state
    expect(flashcard.fsrsState).toBeDefined()
    expect(flashcard.fsrsState.state).toBe(0) // New
    expect(flashcard.fsrsState.reps).toBe(0)
    expect(flashcard.fsrsState.lapses).toBe(0)
    expect(flashcard.fsrsState.difficulty).toBeDefined()
    expect(flashcard.fsrsState.stability).toBeDefined()
    expect(flashcard.fsrsState.due).toBeInstanceOf(Date)

    // Clean up
    await deleteFlashcard(flashcard.id)
  })

  it('should handle questions with various formats', async () => {
    const testContent = `Machine Learning concepts:
- Supervised learning uses labeled data
- Unsupervised learning finds patterns in unlabeled data
- Reinforcement learning learns through trial and error

Common algorithms include:
1. Decision trees
2. Neural networks
3. Support vector machines`

    const flashcards = await generateFlashcardsFromContent(testContent, {
      maxFlashcards: 10,
    })

    expect(flashcards.length).toBeGreaterThan(0)

    // Questions should be well-formed
    flashcards.forEach((fc) => {
      expect(fc.question.length).toBeGreaterThan(5)
      expect(fc.question.length).toBeLessThanOrEqual(1000)
      expect(fc.answer.length).toBeGreaterThan(5)
      expect(fc.answer.length).toBeLessThanOrEqual(5000)
    })
  }, 30000)

  it('should respect maxFlashcards limit', async () => {
    const longContent = `Photosynthesis is a complex process. `.repeat(50)

    const flashcards = await generateFlashcardsFromContent(longContent, {
      maxFlashcards: 3,
    })

    expect(flashcards.length).toBeLessThanOrEqual(3)
  }, 30000)

  it('should handle content with code examples', async () => {
    const codeContent = `JavaScript arrow functions are a concise syntax for writing functions.

Example:
const add = (a, b) => a + b;

Key features:
- Lexical this binding
- Cannot be used as constructors
- Implicit return for single expressions`

    const flashcards = await generateFlashcardsFromContent(codeContent, {
      maxFlashcards: 5,
    })

    expect(flashcards.length).toBeGreaterThan(0)
  }, 30000)
})
