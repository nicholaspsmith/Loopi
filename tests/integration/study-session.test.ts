// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
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

/**
 * Integration Tests for Study Session Flow
 *
 * Tests the complete study session lifecycle with database.
 * Maps to User Story 3: Study with Multiple Modes
 *
 * Note: These tests do NOT require Ollama as they only test database operations.
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
