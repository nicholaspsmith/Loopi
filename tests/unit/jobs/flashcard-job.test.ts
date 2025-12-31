import { describe, it, expect, beforeEach, vi } from 'vitest'
import { State } from 'ts-fsrs'
import type { FlashcardGenerationPayload, FlashcardGenerationResult } from '@/lib/jobs/types'

/**
 * Unit Tests for Node-Based Flashcard Generation
 *
 * Tests the extended handleFlashcardGeneration function to support
 * node-based flashcard generation in addition to message-based.
 *
 * Maps to T001 in feature spec 019-auto-gen-guided-study.
 */

// Mock dependencies
vi.mock('@/lib/claude/flashcard-generator', () => ({
  generateFlashcardsFromContent: vi.fn(),
}))

vi.mock('@/lib/db/operations/flashcards', () => ({
  createFlashcard: vi.fn(),
}))

vi.mock('@/lib/db/operations/messages', () => ({
  getMessageById: vi.fn(),
}))

vi.mock('@/lib/db/operations/skill-nodes', () => ({
  getSkillNodeById: vi.fn(),
  incrementNodeCardCount: vi.fn(),
}))

vi.mock('@/lib/db/operations/background-jobs', () => ({
  createJob: vi.fn().mockResolvedValue({}),
}))

vi.mock('@/lib/logger', () => ({
  info: vi.fn(),
  error: vi.fn(),
}))

import { handleFlashcardGeneration } from '@/lib/jobs/handlers/flashcard-job'
import { generateFlashcardsFromContent } from '@/lib/claude/flashcard-generator'
import { createFlashcard } from '@/lib/db/operations/flashcards'
import { getSkillNodeById, incrementNodeCardCount } from '@/lib/db/operations/skill-nodes'

describe('Node-Based Flashcard Generation', () => {
  const testUserId = 'user-test-123'
  const testNodeId = 'node-test-456'
  const testConversationId = 'conv-test-789'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Node-based payload handling', () => {
    it('should generate cards from nodeTitle and nodeDescription when nodeId is provided', async () => {
      const payload: FlashcardGenerationPayload = {
        messageId: undefined,
        content: undefined,
        nodeId: testNodeId,
        // Note: Extended payload type should have nodeTitle/nodeDescription
        // but they're not in the current type definition yet
      } as any

      const mockNode = {
        id: testNodeId,
        title: 'React Hooks',
        description: 'Learn about React Hooks including useState, useEffect, and custom hooks',
        treeId: 'tree-123',
        parentId: null,
        depth: 1,
        path: '1',
        sortOrder: 0,
        isEnabled: true,
        masteryPercentage: 0,
        cardCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(getSkillNodeById).mockResolvedValue(mockNode)

      const mockFlashcards = [
        { question: 'What is useState?', answer: 'A hook for state management' },
        { question: 'What is useEffect?', answer: 'A hook for side effects' },
      ]

      vi.mocked(generateFlashcardsFromContent).mockResolvedValue(mockFlashcards)

      vi.mocked(createFlashcard).mockResolvedValueOnce({
        id: 'card-1',
        userId: testUserId,
        conversationId: testConversationId,
        messageId: null,
        skillNodeId: testNodeId,
        question: mockFlashcards[0].question,
        answer: mockFlashcards[0].answer,
        distractors: null,
        fsrsState: {
          due: new Date(),
          stability: 0,
          difficulty: 0,
          elapsed_days: 0,
          scheduled_days: 0,
          learning_steps: 0,
          reps: 0,
          lapses: 0,
          state: State.New,
          last_review: undefined,
        },
        createdAt: new Date(),
      } as any)

      vi.mocked(createFlashcard).mockResolvedValueOnce({
        id: 'card-2',
        userId: testUserId,
        conversationId: testConversationId,
        messageId: null,
        skillNodeId: testNodeId,
        question: mockFlashcards[1].question,
        answer: mockFlashcards[1].answer,
        distractors: null,
        fsrsState: {
          due: new Date(),
          stability: 0,
          difficulty: 0,
          elapsed_days: 0,
          scheduled_days: 0,
          learning_steps: 0,
          reps: 0,
          lapses: 0,
          state: State.New,
          last_review: undefined,
        },
        createdAt: new Date(),
      } as any)

      vi.mocked(incrementNodeCardCount).mockResolvedValue()

      const result: FlashcardGenerationResult = await handleFlashcardGeneration(payload, testUserId)

      // Should use node content instead of message content
      expect(generateFlashcardsFromContent).toHaveBeenCalledWith(
        expect.stringContaining('React Hooks'),
        expect.anything()
      )

      expect(result.flashcardIds).toHaveLength(2)
      expect(result.count).toBe(2)
    })

    it('should default maxCards to 5 when not specified', async () => {
      const payload: FlashcardGenerationPayload = {
        messageId: undefined,
        content: undefined,
        nodeId: testNodeId,
      } as any

      const mockNode = {
        id: testNodeId,
        title: 'Test Topic',
        description: 'Test description',
        treeId: 'tree-123',
        parentId: null,
        depth: 1,
        path: '1',
        sortOrder: 0,
        isEnabled: true,
        masteryPercentage: 0,
        cardCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(getSkillNodeById).mockResolvedValue(mockNode)

      // Mock 8 flashcards generated but only 5 should be used
      const mockFlashcards = Array.from({ length: 8 }, (_, i) => ({
        question: `Question ${i + 1}`,
        answer: `Answer ${i + 1}`,
      }))

      vi.mocked(generateFlashcardsFromContent).mockResolvedValue(mockFlashcards)

      vi.mocked(createFlashcard).mockImplementation(
        async (data) =>
          ({
            id: `card-${data.question}`,
            userId: testUserId,
            conversationId: testConversationId,
            messageId: null,
            skillNodeId: testNodeId,
            question: data.question,
            answer: data.answer,
            distractors: null,
            fsrsState: {
              due: new Date(),
              stability: 0,
              difficulty: 0,
              elapsed_days: 0,
              scheduled_days: 0,
              learning_steps: 0,
              reps: 0,
              lapses: 0,
              state: State.New,
              last_review: undefined,
            },
            createdAt: new Date(),
          }) as any
      )

      vi.mocked(incrementNodeCardCount).mockResolvedValue()

      const result = await handleFlashcardGeneration(payload, testUserId)

      // Should only create 5 cards (free tier limit)
      expect(result.count).toBe(5)
      expect(result.flashcardIds).toHaveLength(5)
      expect(createFlashcard).toHaveBeenCalledTimes(5)
    })

    it('should respect maxCards limit when specified', async () => {
      const payload: FlashcardGenerationPayload = {
        messageId: undefined,
        content: undefined,
        nodeId: testNodeId,
        // Extended payload should support maxCards
      } as any

      // Manually set maxCards for testing
      ;(payload as any).maxCards = 3

      const mockNode = {
        id: testNodeId,
        title: 'Test Topic',
        description: 'Test description',
        treeId: 'tree-123',
        parentId: null,
        depth: 1,
        path: '1',
        sortOrder: 0,
        isEnabled: true,
        masteryPercentage: 0,
        cardCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(getSkillNodeById).mockResolvedValue(mockNode)

      const mockFlashcards = Array.from({ length: 10 }, (_, i) => ({
        question: `Question ${i + 1}`,
        answer: `Answer ${i + 1}`,
      }))

      vi.mocked(generateFlashcardsFromContent).mockResolvedValue(mockFlashcards)

      vi.mocked(createFlashcard).mockImplementation(
        async (data) =>
          ({
            id: `card-${data.question}`,
            userId: testUserId,
            conversationId: testConversationId,
            messageId: null,
            skillNodeId: testNodeId,
            question: data.question,
            answer: data.answer,
            distractors: null,
            fsrsState: {
              due: new Date(),
              stability: 0,
              difficulty: 0,
              elapsed_days: 0,
              scheduled_days: 0,
              learning_steps: 0,
              reps: 0,
              lapses: 0,
              state: State.New,
              last_review: undefined,
            },
            createdAt: new Date(),
          }) as any
      )

      vi.mocked(incrementNodeCardCount).mockResolvedValue()

      const result = await handleFlashcardGeneration(payload, testUserId)

      // Should only create 3 cards as specified
      expect(result.count).toBe(3)
      expect(result.flashcardIds).toHaveLength(3)
      expect(createFlashcard).toHaveBeenCalledTimes(3)
    })

    it('should link cards to skillNodeId when node-based', async () => {
      const payload: FlashcardGenerationPayload = {
        messageId: undefined,
        content: undefined,
        nodeId: testNodeId,
      } as any

      const mockNode = {
        id: testNodeId,
        title: 'Test Topic',
        description: 'Test description',
        treeId: 'tree-123',
        parentId: null,
        depth: 1,
        path: '1',
        sortOrder: 0,
        isEnabled: true,
        masteryPercentage: 0,
        cardCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(getSkillNodeById).mockResolvedValue(mockNode)

      const mockFlashcards = [{ question: 'Q1', answer: 'A1' }]

      vi.mocked(generateFlashcardsFromContent).mockResolvedValue(mockFlashcards)

      vi.mocked(createFlashcard).mockResolvedValue({
        id: 'card-1',
        userId: testUserId,
        conversationId: testConversationId,
        messageId: null,
        skillNodeId: testNodeId,
        question: 'Q1',
        answer: 'A1',
        distractors: null,
        fsrsState: {
          due: new Date(),
          stability: 0,
          difficulty: 0,
          elapsed_days: 0,
          scheduled_days: 0,
          learning_steps: 0,
          reps: 0,
          lapses: 0,
          state: State.New,
          last_review: undefined,
        },
        createdAt: new Date(),
      } as any)

      vi.mocked(incrementNodeCardCount).mockResolvedValue()

      await handleFlashcardGeneration(payload, testUserId)

      // Should create flashcard with skillNodeId set
      expect(createFlashcard).toHaveBeenCalledWith(
        expect.objectContaining({
          skillNodeId: testNodeId,
          messageId: null,
        })
      )
    })

    it('should increment node cardCount after generation', async () => {
      const payload: FlashcardGenerationPayload = {
        messageId: undefined,
        content: undefined,
        nodeId: testNodeId,
      } as any

      const mockNode = {
        id: testNodeId,
        title: 'Test Topic',
        description: 'Test description',
        treeId: 'tree-123',
        parentId: null,
        depth: 1,
        path: '1',
        sortOrder: 0,
        isEnabled: true,
        masteryPercentage: 0,
        cardCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(getSkillNodeById).mockResolvedValue(mockNode)

      const mockFlashcards = [
        { question: 'Q1', answer: 'A1' },
        { question: 'Q2', answer: 'A2' },
        { question: 'Q3', answer: 'A3' },
      ]

      vi.mocked(generateFlashcardsFromContent).mockResolvedValue(mockFlashcards)

      vi.mocked(createFlashcard).mockImplementation(
        async (data) =>
          ({
            id: `card-${data.question}`,
            userId: testUserId,
            conversationId: testConversationId,
            messageId: null,
            skillNodeId: testNodeId,
            question: data.question,
            answer: data.answer,
            distractors: null,
            fsrsState: {
              due: new Date(),
              stability: 0,
              difficulty: 0,
              elapsed_days: 0,
              scheduled_days: 0,
              learning_steps: 0,
              reps: 0,
              lapses: 0,
              state: State.New,
              last_review: undefined,
            },
            createdAt: new Date(),
          }) as any
      )

      vi.mocked(incrementNodeCardCount).mockResolvedValue()

      await handleFlashcardGeneration(payload, testUserId)

      // Should increment node card count by 3
      expect(incrementNodeCardCount).toHaveBeenCalledWith(testNodeId, 3)
    })

    it('should throw error when node not found', async () => {
      const payload: FlashcardGenerationPayload = {
        messageId: undefined,
        content: undefined,
        nodeId: 'non-existent-node',
      } as any

      vi.mocked(getSkillNodeById).mockResolvedValue(null)

      await expect(handleFlashcardGeneration(payload, testUserId)).rejects.toThrow('Node not found')
    })

    it('should handle empty nodeDescription gracefully', async () => {
      const payload: FlashcardGenerationPayload = {
        messageId: undefined,
        content: undefined,
        nodeId: testNodeId,
      } as any

      const mockNode = {
        id: testNodeId,
        title: 'React Hooks',
        description: null, // No description
        treeId: 'tree-123',
        parentId: null,
        depth: 1,
        path: '1',
        sortOrder: 0,
        isEnabled: true,
        masteryPercentage: 0,
        cardCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(getSkillNodeById).mockResolvedValue(mockNode)

      const mockFlashcards = [{ question: 'Q1', answer: 'A1' }]

      vi.mocked(generateFlashcardsFromContent).mockResolvedValue(mockFlashcards)

      vi.mocked(createFlashcard).mockResolvedValue({
        id: 'card-1',
        userId: testUserId,
        conversationId: testConversationId,
        messageId: null,
        skillNodeId: testNodeId,
        question: 'Q1',
        answer: 'A1',
        distractors: null,
        fsrsState: {
          due: new Date(),
          stability: 0,
          difficulty: 0,
          elapsed_days: 0,
          scheduled_days: 0,
          learning_steps: 0,
          reps: 0,
          lapses: 0,
          state: State.New,
          last_review: undefined,
        },
        createdAt: new Date(),
      } as any)

      vi.mocked(incrementNodeCardCount).mockResolvedValue()

      await handleFlashcardGeneration(payload, testUserId)

      // Should use title and fallback text for content
      expect(generateFlashcardsFromContent).toHaveBeenCalledWith(
        expect.stringContaining('React Hooks'),
        expect.anything()
      )
    })
  })
})
