// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, vi, beforeEach, afterEach } from 'vitest'
import { createUser } from '@/lib/db/operations/users'
import { createGoal } from '@/lib/db/operations/goals'
import { createSkillTree } from '@/lib/db/operations/skill-trees'
import { generateCards } from '@/lib/ai/card-generator'

/**
 * Integration Tests for Card Generation Flow
 *
 * Tests the complete card generation process with database and mocked AI.
 * Maps to User Story 2: Generate Cards for Skill Tree Node
 *
 * NOTE: Uses mocked Claude API to avoid real API calls and costs.
 */

// Mock the Claude client to prevent real API calls
vi.mock('@/lib/claude/client', () => ({
  getChatCompletion: vi.fn(),
  CLAUDE_MODEL: 'claude-3-5-sonnet-20241022',
}))

import { getChatCompletion } from '@/lib/claude/client'
import type { Mock } from 'vitest'

// Cast to access mock methods
const mockGetChatCompletion = getChatCompletion as Mock

describe('Card Generation Flow', () => {
  const timestamp = Date.now()
  let testUserId: string
  let testGoalId: string

  beforeAll(async () => {
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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(async () => {})

  describe('Flashcard Generation', () => {
    it('should generate flashcards for a skill node', async () => {
      // Mock successful Claude response with flashcards
      mockGetChatCompletion.mockResolvedValue(
        JSON.stringify({
          cards: [
            {
              question: 'What is unit testing?',
              answer: 'Testing individual components or functions in isolation',
            },
            {
              question: 'What are the benefits of unit testing?',
              answer: 'Early bug detection, better code design, and confidence in refactoring',
            },
            {
              question: 'What is a test assertion?',
              answer: 'A statement that verifies expected behavior matches actual behavior',
            },
          ],
        })
      )

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
      mockGetChatCompletion.mockResolvedValue(
        JSON.stringify({
          cards: [
            {
              question: 'What is a mock object?',
              answer: 'A simulated object that mimics the behavior of real objects in testing',
            },
            {
              question: 'What is test coverage?',
              answer: 'A metric that measures the percentage of code executed during tests',
            },
          ],
        })
      )

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
      mockGetChatCompletion.mockResolvedValue(
        JSON.stringify({
          cards: [
            { question: 'Q1', answer: 'A1' },
            { question: 'Q2', answer: 'A2' },
            { question: 'Q3', answer: 'A3' },
            { question: 'Q4', answer: 'A4' },
            { question: 'Q5', answer: 'A5' },
          ],
        })
      )

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
      mockGetChatCompletion.mockResolvedValue(
        JSON.stringify({
          cards: [
            {
              question: 'What is a Pod in Kubernetes?',
              answer: 'The smallest deployable unit that can contain one or more containers',
            },
            {
              question: 'Can a Pod contain multiple containers?',
              answer: 'Yes, a Pod can contain multiple containers that share resources',
            },
          ],
        })
      )

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
      mockGetChatCompletion.mockResolvedValue(
        JSON.stringify({
          cards: [
            {
              question: 'What is the main purpose of unit testing?',
              answer: 'To test individual components in isolation',
              distractors: [
                'To test the entire system end-to-end',
                'To test database performance',
                'To test user interface design',
              ],
            },
            {
              question: 'Which framework is commonly used for JavaScript unit testing?',
              answer: 'Jest',
              distractors: ['Django', 'Rails', 'Laravel'],
            },
          ],
        })
      )

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
      mockGetChatCompletion.mockResolvedValue(
        JSON.stringify({
          cards: [
            {
              question: 'What does TDD stand for?',
              answer: 'Test-Driven Development',
              distractors: [
                'Technology-Driven Design',
                'Testing and Debugging Discipline',
                'Total Development Documentation',
              ],
            },
            {
              question: 'What is a test fixture?',
              answer: 'A fixed state of a set of objects used as a baseline for running tests',
              distractors: [
                'A tool for fixing broken tests',
                'A type of hardware used in testing',
                'A bug that appears during testing',
              ],
            },
          ],
        })
      )

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
      mockGetChatCompletion.mockResolvedValue(
        JSON.stringify({
          cards: [
            {
              question: 'What is mocking in testing?',
              answer: 'Creating fake objects that simulate real dependencies',
              distractors: [
                'Making fun of poorly written tests',
                'Copying production data to test environment',
                'Running tests in parallel',
              ],
            },
            {
              question: 'What is code coverage?',
              answer: 'A metric showing percentage of code executed by tests',
              distractors: [
                'The amount of comments in code',
                'Number of test files',
                'Time taken to run all tests',
              ],
            },
          ],
        })
      )

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
      mockGetChatCompletion.mockResolvedValue(
        JSON.stringify({
          cards: [
            {
              question: 'What is regression testing?',
              answer: 'Testing to ensure new changes do not break existing functionality',
              distractors: [
                'Testing backward compatibility',
                'Testing performance under load',
                'Testing security vulnerabilities',
              ],
            },
            {
              question: 'What is integration testing?',
              answer: 'Testing the interaction between multiple components',
              distractors: [
                'Testing individual functions',
                'Testing user interfaces',
                'Testing deployment processes',
              ],
            },
          ],
        })
      )

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
    it('should handle API errors gracefully', async () => {
      mockGetChatCompletion.mockRejectedValue(new Error('Claude API timeout'))

      await expect(
        generateCards({
          goalTitle: 'Learn Testing',
          nodeTitle: 'Unit Testing',
          nodeDescription: 'Description',
          cardType: 'flashcard',
          count: 2,
        })
      ).rejects.toThrow('Claude API timeout')
    })

    it('should handle invalid JSON response', async () => {
      mockGetChatCompletion.mockResolvedValue('Not valid JSON at all')

      await expect(
        generateCards({
          goalTitle: 'Learn Testing',
          nodeTitle: 'Unit Testing',
          nodeDescription: 'Description',
          cardType: 'flashcard',
          count: 2,
        })
      ).rejects.toThrow()
    })

    it('should handle malformed card data', async () => {
      mockGetChatCompletion.mockResolvedValue(
        JSON.stringify({
          cards: [
            { question: 'Valid Q', answer: 'Valid A' },
            { question: '', answer: 'Missing question' }, // Invalid
            { noQuestion: 'wrong field' }, // Invalid
          ],
        })
      )

      await expect(
        generateCards({
          goalTitle: 'Learn Testing',
          nodeTitle: 'Unit Testing',
          nodeDescription: 'Description',
          cardType: 'flashcard',
          count: 3,
        })
      ).rejects.toThrow()
    })
  })
})
