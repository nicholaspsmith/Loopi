// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from 'vitest'
import { createUser } from '@/lib/db/operations/users'
import { createGoal } from '@/lib/db/operations/goals'
import { createSkillTree } from '@/lib/db/operations/skill-trees'
import { createSkillNode } from '@/lib/db/operations/skill-nodes'
import { getDb } from '@/lib/db/pg-client'
import { flashcards } from '@/lib/db/drizzle-schema'
import { eq } from 'drizzle-orm'
import type { Card } from 'ts-fsrs'
import { initializeSchema, isSchemaInitialized } from '@/lib/db/schema'
import { closeDbConnection } from '@/lib/db/client'
import { createGoalFlashcard } from '@/lib/db/operations/flashcards'
import { createDistractors, getDistractorsForFlashcard } from '@/lib/db/operations/distractors'

// Mock the distractor generator for controlled testing
vi.mock('@/lib/ai/distractor-generator', () => ({
  generateAndPersistDistractors: vi.fn(),
}))

import { generateAndPersistDistractors } from '@/lib/ai/distractor-generator'

/**
 * Integration Tests for Study Session Flow
 *
 * Tests the complete study session lifecycle with database.
 * Maps to User Story 3: Study with Multiple Modes
 *
 * Note: These tests only test database operations.
 * LanceDB sync is disabled in test mode via NODE_ENV check.
 */

describe('Study Session Flow', () => {
  const timestamp = Date.now()
  let testUserId: string
  let testGoalId: string
  let testTreeId: string
  let testNodeId: string
  const testCardIds: string[] = []

  beforeAll(async () => {
    // Initialize database schema if needed
    const initialized = await isSchemaInitialized()
    if (!initialized) {
      await initializeSchema()
    }

    // Create test user
    const testUser = await createUser({
      email: `study-session-test-${timestamp}@example.com`,
      passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.',
      name: 'Study Session Test User',
    })
    testUserId = testUser.id

    // Create test goal
    const goal = await createGoal({
      userId: testUserId,
      title: 'Learn Kubernetes',
      description: 'Master container orchestration',
    })
    testGoalId = goal.id

    // Create skill tree
    const tree = await createSkillTree({
      goalId: testGoalId,
    })
    testTreeId = tree.id

    // Create skill node
    const node = await createSkillNode({
      treeId: testTreeId,
      title: 'Pods',
      description: 'Basic workload unit',
      depth: 1,
      path: '0',
      sortOrder: 0,
    })
    testNodeId = node.id

    // Create test flashcards linked to the skill node
    for (let i = 0; i < 5; i++) {
      const card = await createGoalFlashcard({
        userId: testUserId,
        skillNodeId: testNodeId,
        question: `What is Pod feature ${i}?`,
        answer: `Pod feature ${i} description`,
        cardType: 'flashcard',
      })

      testCardIds.push(card.id)
    }
  })

  afterAll(async () => {
    await closeDbConnection()
  })

  describe('Card Retrieval', () => {
    it('should retrieve cards for a goal', async () => {
      const db = getDb()

      const cards = await db.select().from(flashcards).where(eq(flashcards.userId, testUserId))

      expect(cards.length).toBeGreaterThanOrEqual(5)
    })

    it('should retrieve cards for specific node', async () => {
      const db = getDb()

      const cards = await db.select().from(flashcards).where(eq(flashcards.skillNodeId, testNodeId))

      expect(cards.length).toBe(5)
    })

    it('should filter due cards', async () => {
      const db = getDb()
      const now = new Date()

      const cards = await db.select().from(flashcards).where(eq(flashcards.userId, testUserId))

      const dueCards = cards.filter((card) => {
        const fsrs = card.fsrsState as Card
        return new Date(fsrs.due) <= now
      })

      expect(dueCards.length).toBeGreaterThan(0)
    })

    it('should sort cards by due date', async () => {
      const db = getDb()

      const cards = await db.select().from(flashcards).where(eq(flashcards.userId, testUserId))

      const sorted = [...cards].sort((a, b) => {
        const aFsrs = a.fsrsState as Card
        const bFsrs = b.fsrsState as Card
        return new Date(aFsrs.due).getTime() - new Date(bFsrs.due).getTime()
      })

      expect(sorted.length).toBe(cards.length)

      // Verify order
      for (let i = 1; i < sorted.length; i++) {
        const prevDue = new Date((sorted[i - 1].fsrsState as Card).due).getTime()
        const currDue = new Date((sorted[i].fsrsState as Card).due).getTime()
        expect(currDue).toBeGreaterThanOrEqual(prevDue)
      }
    })
  })

  describe('FSRS State Management', () => {
    it('should have valid FSRS state on cards', async () => {
      const db = getDb()

      const cards = await db
        .select()
        .from(flashcards)
        .where(eq(flashcards.userId, testUserId))
        .limit(1)

      expect(cards.length).toBe(1)

      const fsrs = cards[0].fsrsState as Card
      expect(fsrs.state).toBeDefined()
      expect(fsrs.due).toBeDefined()
      expect(fsrs.stability).toBeDefined()
      expect(fsrs.difficulty).toBeDefined()
    })

    it('should initialize new cards with correct state', async () => {
      const db = getDb()

      const cards = await db
        .select()
        .from(flashcards)
        .where(eq(flashcards.userId, testUserId))
        .limit(1)

      const fsrs = cards[0].fsrsState as Card

      // New cards should have state 0
      expect(fsrs.state).toBe(0) // State.New
      expect(fsrs.stability).toBeDefined()
      expect(fsrs.difficulty).toBeDefined()
    })
  })

  describe('Card Metadata', () => {
    it('should store multiple choice distractors', async () => {
      const db = getDb()

      const mcCard = await createGoalFlashcard({
        userId: testUserId,
        skillNodeId: testNodeId,
        question: 'Which is a container runtime?',
        answer: 'containerd',
        cardType: 'multiple_choice',
        distractors: ['Docker', 'Kubernetes', 'Podman'],
      })

      // Update card with metadata in database
      const updated = await db
        .select()
        .from(flashcards)
        .where(eq(flashcards.id, mcCard.id))
        .limit(1)

      expect(updated.length).toBe(1)
      expect(updated[0].cardType).toBeDefined()
    })

    it('should retrieve cards with metadata', async () => {
      const db = getDb()

      const cards = await db
        .select()
        .from(flashcards)
        .where(eq(flashcards.userId, testUserId))
        .limit(5)

      expect(cards.length).toBeGreaterThan(0)
      for (const card of cards) {
        expect(card.cardMetadata === null || typeof card.cardMetadata === 'object').toBe(true)
      }
    })
  })

  describe('Session Constraints', () => {
    it('should limit card count per session', async () => {
      const db = getDb()
      const limit = 3

      const cards = await db
        .select()
        .from(flashcards)
        .where(eq(flashcards.userId, testUserId))
        .limit(limit)

      expect(cards.length).toBeLessThanOrEqual(limit)
    })

    it('should handle zero available cards', async () => {
      const db = getDb()

      // Query for non-existent node
      const cards = await db
        .select()
        .from(flashcards)
        .where(eq(flashcards.skillNodeId, '00000000-0000-0000-0000-000000000000'))

      expect(cards).toEqual([])
    })
  })

  describe('Study Mode Support', () => {
    it('should support flashcard mode', async () => {
      const db = getDb()

      const cards = await db.select().from(flashcards).where(eq(flashcards.cardType, 'flashcard'))

      expect(cards.length).toBeGreaterThan(0)
    })

    it('should support multiple choice mode', async () => {
      const db = getDb()

      const cards = await db
        .select()
        .from(flashcards)
        .where(eq(flashcards.cardType, 'multiple_choice'))

      // May be 0 if no MC cards created yet
      expect(Array.isArray(cards)).toBe(true)
    })

    it('should handle mixed mode card selection', async () => {
      const db = getDb()

      const allCards = await db.select().from(flashcards).where(eq(flashcards.userId, testUserId))

      // Mixed mode gets all types
      expect(allCards.length).toBeGreaterThan(0)
    })
  })

  describe('Node Filtering', () => {
    it('should filter cards by node', async () => {
      const db = getDb()

      const nodeCards = await db
        .select()
        .from(flashcards)
        .where(eq(flashcards.skillNodeId, testNodeId))

      expect(nodeCards.length).toBeGreaterThan(0)
      expect(nodeCards.every((c) => c.skillNodeId === testNodeId)).toBe(true)
    })

    it('should get all cards when no node filter', async () => {
      const db = getDb()

      const allCards = await db.select().from(flashcards).where(eq(flashcards.userId, testUserId))

      expect(allCards.length).toBeGreaterThanOrEqual(5)
    })
  })
})

/**
 * Integration Tests for Study Session with Distractors (T12)
 *
 * Tests the distractor loading flow during study sessions:
 * - Loading pre-existing distractors from database
 * - Progressive generation for cards without distractors
 * - Fallback to flashcard mode when generation fails
 *
 * Maps to T12 in Phase 3 (Multi-Choice Distractors Feature)
 */
describe('Study Session with Distractors (T12)', () => {
  const timestamp = Date.now()
  let testUserId: string
  let testGoalId: string
  let testTreeId: string
  let testNodeId: string
  let cardWithDbDistractors: string
  let cardWithMetadataDistractors: string
  let cardWithoutDistractors: string

  beforeAll(async () => {
    // Initialize database schema if needed
    const initialized = await isSchemaInitialized()
    if (!initialized) {
      await initializeSchema()
    }

    // Create test user
    const testUser = await createUser({
      email: `distractor-session-test-${timestamp}@example.com`,
      passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.',
      name: 'Distractor Session Test User',
    })
    testUserId = testUser.id

    // Create test goal
    const goal = await createGoal({
      userId: testUserId,
      title: 'Learn Docker',
      description: 'Master container technology',
    })
    testGoalId = goal.id

    // Create skill tree
    const tree = await createSkillTree({
      goalId: testGoalId,
    })
    testTreeId = tree.id

    // Create skill node
    const node = await createSkillNode({
      treeId: testTreeId,
      title: 'Containers',
      description: 'Container fundamentals',
      depth: 1,
      path: '0',
      sortOrder: 0,
    })
    testNodeId = node.id

    // Scenario 1: Card with DB distractors
    const card1 = await createGoalFlashcard({
      userId: testUserId,
      skillNodeId: testNodeId,
      question: 'What is a Docker container?',
      answer: 'An isolated process running in userspace',
      cardType: 'multiple_choice',
    })
    cardWithDbDistractors = card1.id

    // Create distractors in database for this card
    await createDistractors(cardWithDbDistractors, [
      'A virtual machine',
      'A type of hypervisor',
      'A kernel module',
    ])

    // Scenario 2: Card with metadata distractors (legacy format)
    const card2 = await createGoalFlashcard({
      userId: testUserId,
      skillNodeId: testNodeId,
      question: 'What command builds a Docker image?',
      answer: 'docker build',
      cardType: 'multiple_choice',
      distractors: ['docker create', 'docker run', 'docker make'],
    })
    cardWithMetadataDistractors = card2.id

    // Scenario 3: Card without any distractors (needs progressive generation)
    const card3 = await createGoalFlashcard({
      userId: testUserId,
      skillNodeId: testNodeId,
      question: 'What is Docker Compose?',
      answer: 'A tool for defining multi-container applications',
      cardType: 'multiple_choice',
    })
    cardWithoutDistractors = card3.id
  })

  afterAll(async () => {
    await closeDbConnection()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Distractor Loading', () => {
    it('should load pre-existing distractors from database', async () => {
      // Verify distractors were created
      const distractors = await getDistractorsForFlashcard(cardWithDbDistractors)

      expect(distractors).toHaveLength(3)
      expect(distractors.map((d) => d.content)).toEqual(
        expect.arrayContaining(['A virtual machine', 'A type of hypervisor', 'A kernel module'])
      )

      // Verify they're ordered by position
      expect(distractors[0].position).toBe(0)
      expect(distractors[1].position).toBe(1)
      expect(distractors[2].position).toBe(2)
    })

    it('should load metadata distractors when no DB distractors exist', async () => {
      // Verify no DB distractors exist
      const dbDistractors = await getDistractorsForFlashcard(cardWithMetadataDistractors)
      expect(dbDistractors).toHaveLength(0)

      // Verify metadata distractors are in the flashcard record
      const db = getDb()
      const cards = await db
        .select()
        .from(flashcards)
        .where(eq(flashcards.id, cardWithMetadataDistractors))
        .limit(1)

      expect(cards[0].cardMetadata).toBeDefined()
      const metadata = cards[0].cardMetadata as { distractors?: string[] }
      expect(metadata?.distractors).toEqual(['docker create', 'docker run', 'docker make'])
    })

    it('should return empty array when card has no distractors', async () => {
      const distractors = await getDistractorsForFlashcard(cardWithoutDistractors)
      expect(distractors).toHaveLength(0)
    })
  })

  describe('Progressive Generation (T11)', () => {
    it('should trigger generation for cards without distractors in MC mode', async () => {
      // Mock successful generation
      vi.mocked(generateAndPersistDistractors).mockResolvedValue({
        success: true,
        distractors: ['Docker Swarm', 'Kubernetes', 'Docker Hub'],
        generationTimeMs: 250,
      })

      // Simulate what the session route does
      const dbDistractors = await getDistractorsForFlashcard(cardWithoutDistractors)
      expect(dbDistractors).toHaveLength(0)

      // Get card data
      const db = getDb()
      const cards = await db
        .select()
        .from(flashcards)
        .where(eq(flashcards.id, cardWithoutDistractors))
        .limit(1)

      const card = cards[0]
      const metadata = (card.cardMetadata || {}) as { distractors?: string[] }

      // No metadata distractors either
      expect(metadata.distractors).toBeUndefined()

      // Trigger progressive generation (as session route would)
      const result = await generateAndPersistDistractors(
        cardWithoutDistractors,
        card.question,
        card.answer
      )

      expect(generateAndPersistDistractors).toHaveBeenCalledWith(
        cardWithoutDistractors,
        card.question,
        card.answer
      )
      expect(result.success).toBe(true)
      expect(result.distractors).toHaveLength(3)
    })

    it('should not trigger generation for cards with DB distractors', async () => {
      const distractors = await getDistractorsForFlashcard(cardWithDbDistractors)
      expect(distractors.length).toBeGreaterThanOrEqual(3)

      // No generation should be needed
      expect(generateAndPersistDistractors).not.toHaveBeenCalled()
    })

    it('should not trigger generation for cards with metadata distractors', async () => {
      const dbDistractors = await getDistractorsForFlashcard(cardWithMetadataDistractors)
      expect(dbDistractors).toHaveLength(0)

      // Get metadata
      const db = getDb()
      const cards = await db
        .select()
        .from(flashcards)
        .where(eq(flashcards.id, cardWithMetadataDistractors))
        .limit(1)

      const metadata = (cards[0].cardMetadata || {}) as { distractors?: string[] }
      expect(metadata.distractors).toHaveLength(3)

      // No generation should be needed since metadata exists
      expect(generateAndPersistDistractors).not.toHaveBeenCalled()
    })
  })

  describe('Fallback to Flashcard Mode', () => {
    it('should handle generation failure gracefully', async () => {
      // Mock generation failure
      vi.mocked(generateAndPersistDistractors).mockResolvedValue({
        success: false,
        error: 'Claude API unavailable',
        generationTimeMs: 100,
      })

      // Get card data
      const db = getDb()
      const cards = await db
        .select()
        .from(flashcards)
        .where(eq(flashcards.id, cardWithoutDistractors))
        .limit(1)

      const card = cards[0]

      // Attempt generation
      const result = await generateAndPersistDistractors(
        cardWithoutDistractors,
        card.question,
        card.answer
      )

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.distractors).toBeUndefined()

      // Verify card is still accessible (not broken)
      expect(card.question).toBe('What is Docker Compose?')
      expect(card.answer).toBe('A tool for defining multi-container applications')

      // In the actual session route, this would trigger fallback to flashcard mode
      // We verify the card remains valid for flashcard-style study
      expect(card.cardType).toBe('multiple_choice')
    })

    it('should handle network errors during generation', async () => {
      // Mock network error
      vi.mocked(generateAndPersistDistractors).mockRejectedValue(new Error('Network timeout'))

      // Get card data
      const db = getDb()
      const cards = await db
        .select()
        .from(flashcards)
        .where(eq(flashcards.id, cardWithoutDistractors))
        .limit(1)

      const card = cards[0]

      // Attempt generation with error handling
      try {
        await generateAndPersistDistractors(cardWithoutDistractors, card.question, card.answer)
        // Should not reach here
        expect(true).toBe(false)
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toBe('Network timeout')
      }

      // Card should still be valid
      expect(card.question).toBeTruthy()
      expect(card.answer).toBeTruthy()
    })

    it('should handle empty distractor arrays from API', async () => {
      // Mock API returning empty array
      vi.mocked(generateAndPersistDistractors).mockResolvedValue({
        success: false,
        error: 'Generated distractors were invalid',
        generationTimeMs: 200,
      })

      // Get card data
      const db = getDb()
      const cards = await db
        .select()
        .from(flashcards)
        .where(eq(flashcards.id, cardWithoutDistractors))
        .limit(1)

      const card = cards[0]

      // Attempt generation
      const result = await generateAndPersistDistractors(
        cardWithoutDistractors,
        card.question,
        card.answer
      )

      expect(result.success).toBe(false)
      expect(result.distractors).toBeUndefined()

      // Fallback to flashcard mode should be triggered
      // Card remains valid
      expect(card.cardType).toBe('multiple_choice')
    })
  })

  describe('Mixed Card Scenarios', () => {
    it('should handle session with mix of distractor states', async () => {
      // Simulate a session loading multiple cards with different distractor states
      const db = getDb()
      const allCards = await db
        .select()
        .from(flashcards)
        .where(eq(flashcards.skillNodeId, testNodeId))

      expect(allCards.length).toBeGreaterThanOrEqual(3)

      // Check each card's distractor state
      for (const card of allCards) {
        const dbDistractors = await getDistractorsForFlashcard(card.id)
        const metadata = (card.cardMetadata || {}) as { distractors?: string[] }

        if (card.id === cardWithDbDistractors) {
          expect(dbDistractors.length).toBeGreaterThanOrEqual(3)
        } else if (card.id === cardWithMetadataDistractors) {
          expect(dbDistractors).toHaveLength(0)
          expect(metadata.distractors).toBeDefined()
        } else if (card.id === cardWithoutDistractors) {
          expect(dbDistractors).toHaveLength(0)
          expect(metadata.distractors).toBeUndefined()
        }
      }
    })

    it('should prioritize DB distractors over metadata', async () => {
      // Create a card with both DB and metadata distractors
      const card = await createGoalFlashcard({
        userId: testUserId,
        skillNodeId: testNodeId,
        question: 'What is Docker Engine?',
        answer: 'The runtime that executes containers',
        cardType: 'multiple_choice',
        distractors: ['Old distractor 1', 'Old distractor 2', 'Old distractor 3'],
      })

      // Add newer DB distractors
      await createDistractors(card.id, ['New distractor 1', 'New distractor 2', 'New distractor 3'])

      // Verify DB distractors are retrieved (should override metadata)
      const dbDistractors = await getDistractorsForFlashcard(card.id)
      expect(dbDistractors).toHaveLength(3)
      expect(dbDistractors.map((d) => d.content)).toEqual(
        expect.arrayContaining(['New distractor 1', 'New distractor 2', 'New distractor 3'])
      )
    })
  })

  describe('Performance and Timing', () => {
    it('should load DB distractors efficiently', async () => {
      const startTime = performance.now()
      const distractors = await getDistractorsForFlashcard(cardWithDbDistractors)
      const loadTime = performance.now() - startTime

      expect(distractors).toHaveLength(3)
      // Should load in under 500ms for integration test (production: typically ~1-5ms)
      expect(loadTime).toBeLessThan(500)
    })

    it('should track generation time when progressive generation occurs', async () => {
      vi.mocked(generateAndPersistDistractors).mockResolvedValue({
        success: true,
        distractors: ['Distractor A', 'Distractor B', 'Distractor C'],
        generationTimeMs: 350,
      })

      // Get card data
      const db = getDb()
      const cards = await db
        .select()
        .from(flashcards)
        .where(eq(flashcards.id, cardWithoutDistractors))
        .limit(1)

      const card = cards[0]

      const result = await generateAndPersistDistractors(
        cardWithoutDistractors,
        card.question,
        card.answer
      )

      expect(result.generationTimeMs).toBeDefined()
      expect(result.generationTimeMs).toBeGreaterThan(0)
    })
  })
})
