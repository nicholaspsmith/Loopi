// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createUser } from '@/lib/db/operations/users'
import { createGoal } from '@/lib/db/operations/goals'
import { createSkillTree } from '@/lib/db/operations/skill-trees'
import { generateCards } from '@/lib/ai/card-generator'
import { initializeSchema, isSchemaInitialized } from '@/lib/db/schema'
import { closeDbConnection } from '@/lib/db/client'

/**
 * Integration Tests for Card Generation Flow
 *
 * Tests the complete card generation process with database and AI.
 * Maps to User Story 2: Generate Cards for Skill Tree Node
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'

// Check if Ollama is available
async function isOllamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`)
    return response.ok
  } catch {
    return false
  }
}

describe('Card Generation Flow', () => {
  const timestamp = Date.now()
  let testUserId: string
  let testGoalId: string
  let ollamaAvailable = false

  beforeAll(async () => {
    // Check Ollama availability
    ollamaAvailable = await isOllamaAvailable()
    if (!ollamaAvailable) {
      console.log('⚠️  Ollama not available - AI-dependent tests will be skipped')
      return
    }

    // Initialize database schema if needed
    const initialized = await isSchemaInitialized()
    if (!initialized) {
      await initializeSchema()
    }

    // Create test user
    const testUser = await createUser({
      email: `card-gen-test-${timestamp}@example.com`,
      passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.',
      name: 'Card Gen Test User',
    })
    testUserId = testUser.id

    // Create test goal
    const goal = await createGoal({
      userId: testUserId,
      title: 'Learn Testing',
      description: 'Master test-driven development',
    })
    testGoalId = goal.id

    // Create skill tree
    await createSkillTree({
      goalId: testGoalId,
    })
  })

  afterAll(async () => {
    await closeDbConnection()
  })

  describe('Flashcard Generation', () => {
    it('should generate flashcards for a skill node', async () => {
      if (!ollamaAvailable) {
        console.log('Skipping: Ollama not available')
        return
      }

      const result = await generateCards({
        goalTitle: 'Learn Testing',
        nodeTitle: 'Unit Testing',
        nodeDescription: 'Learn unit testing fundamentals',
        cardType: 'flashcard',
        count: 3,
      })

      expect(result.cards).toBeDefined()
      expect(Array.isArray(result.cards)).toBe(true)
      expect(result.cards.length).toBeGreaterThan(0)
      expect(result.cards.length).toBeLessThanOrEqual(3)
    })

    it('should generate cards with valid structure', async () => {
      if (!ollamaAvailable) {
        console.log('Skipping: Ollama not available')
        return
      }

      const result = await generateCards({
        goalTitle: 'Learn Testing',
        nodeTitle: 'Unit Testing',
        nodeDescription: 'Learn unit testing fundamentals',
        cardType: 'flashcard',
        count: 2,
      })

      for (const card of result.cards) {
        expect(card.question).toBeDefined()
        expect(card.question.length).toBeGreaterThan(0)
        expect(card.answer).toBeDefined()
        expect(card.answer.length).toBeGreaterThan(0)
        expect(card.cardType).toBe('flashcard')
      }
    })

    it('should handle different counts', async () => {
      if (!ollamaAvailable) {
        console.log('Skipping: Ollama not available')
        return
      }

      const result = await generateCards({
        goalTitle: 'Learn Testing',
        nodeTitle: 'Unit Testing',
        nodeDescription: 'Learn unit testing fundamentals',
        cardType: 'flashcard',
        count: 5,
      })

      expect(result.cards.length).toBeGreaterThan(0)
      expect(result.cards.length).toBeLessThanOrEqual(5)
    })

    it('should scope cards to node context', async () => {
      if (!ollamaAvailable) {
        console.log('Skipping: Ollama not available')
        return
      }

      const result = await generateCards({
        goalTitle: 'Learn Kubernetes',
        nodeTitle: 'Pods',
        nodeDescription: 'Basic workload unit in Kubernetes',
        cardType: 'flashcard',
        count: 2,
      })

      // Check that questions are relevant to Pods
      const hasRelevantContent = result.cards.some(
        (card) =>
          card.question.toLowerCase().includes('pod') || card.answer.toLowerCase().includes('pod')
      )

      expect(hasRelevantContent).toBe(true)
    })
  })

  describe('Multiple Choice Generation', () => {
    it('should generate multiple choice cards', async () => {
      if (!ollamaAvailable) {
        console.log('Skipping: Ollama not available')
        return
      }

      const result = await generateCards({
        goalTitle: 'Learn Testing',
        nodeTitle: 'Unit Testing',
        nodeDescription: 'Learn unit testing fundamentals',
        cardType: 'multiple_choice',
        count: 2,
      })

      expect(result.cards).toBeDefined()
      expect(Array.isArray(result.cards)).toBe(true)
      expect(result.cards.length).toBeGreaterThan(0)
    })

    it('should generate cards with distractors', async () => {
      if (!ollamaAvailable) {
        console.log('Skipping: Ollama not available')
        return
      }

      const result = await generateCards({
        goalTitle: 'Learn Testing',
        nodeTitle: 'Unit Testing',
        nodeDescription: 'Learn unit testing fundamentals',
        cardType: 'multiple_choice',
        count: 2,
      })

      for (const card of result.cards) {
        expect(card.question).toBeDefined()
        expect(card.answer).toBeDefined()
        if (card.cardType === 'multiple_choice') {
          expect(card.distractors).toBeDefined()
          expect(Array.isArray(card.distractors)).toBe(true)
          expect(card.distractors.length).toBe(3)
        }
      }
    })

    it('should have unique distractors', async () => {
      if (!ollamaAvailable) {
        console.log('Skipping: Ollama not available')
        return
      }

      const result = await generateCards({
        goalTitle: 'Learn Testing',
        nodeTitle: 'Unit Testing',
        nodeDescription: 'Learn unit testing fundamentals',
        cardType: 'multiple_choice',
        count: 2,
      })

      for (const card of result.cards) {
        if (card.cardType === 'multiple_choice') {
          const uniqueDistractors = new Set(card.distractors)
          expect(uniqueDistractors.size).toBe(3)
        }
      }
    })

    it('should not include answer in distractors', async () => {
      if (!ollamaAvailable) {
        console.log('Skipping: Ollama not available')
        return
      }

      const result = await generateCards({
        goalTitle: 'Learn Testing',
        nodeTitle: 'Unit Testing',
        nodeDescription: 'Learn unit testing fundamentals',
        cardType: 'multiple_choice',
        count: 2,
      })

      for (const card of result.cards) {
        if (card.cardType === 'multiple_choice') {
          expect(card.distractors).not.toContain(card.answer)
        }
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle empty node title', async () => {
      if (!ollamaAvailable) {
        console.log('Skipping: Ollama not available')
        return
      }

      await expect(
        generateCards({
          goalTitle: 'Learn Testing',
          nodeTitle: '',
          nodeDescription: 'Description',
          cardType: 'flashcard',
          count: 2,
        })
      ).rejects.toThrow()
    })

    it('should handle invalid count', async () => {
      if (!ollamaAvailable) {
        console.log('Skipping: Ollama not available')
        return
      }

      await expect(
        generateCards({
          goalTitle: 'Learn Testing',
          nodeTitle: 'Unit Testing',
          nodeDescription: 'Description',
          cardType: 'flashcard',
          count: 0,
        })
      ).rejects.toThrow()
    })

    it('should handle negative count', async () => {
      if (!ollamaAvailable) {
        console.log('Skipping: Ollama not available')
        return
      }

      await expect(
        generateCards({
          goalTitle: 'Learn Testing',
          nodeTitle: 'Unit Testing',
          nodeDescription: 'Description',
          cardType: 'flashcard',
          count: -5,
        })
      ).rejects.toThrow()
    })
  })
})
