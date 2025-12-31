import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { SkillTreeGenerationPayload, SkillTreeGenerationResult } from '@/lib/jobs/types'
import { JobType } from '@/lib/db/drizzle-schema'

/**
 * Unit Tests for Skill Tree Job Queuing Flashcard Jobs
 *
 * Tests that after successful skill tree creation, flashcard_generation
 * jobs are queued for each created node.
 *
 * Maps to T002 in feature spec 019-auto-gen-guided-study.
 */

// Mock dependencies
vi.mock('@/lib/ai/skill-tree-generator', () => ({
  generateSkillTree: vi.fn(),
  flattenGeneratedNodes: vi.fn(),
}))

vi.mock('@/lib/db/operations/skill-trees', () => ({
  createSkillTree: vi.fn(),
  updateSkillTreeStats: vi.fn(),
  getSkillTreeByGoalId: vi.fn(),
}))

vi.mock('@/lib/db/operations/skill-nodes', () => ({
  createSkillNodes: vi.fn(),
  getNodesByTreeId: vi.fn(),
}))

vi.mock('@/lib/db/operations/goals', () => ({
  getGoalByIdForUser: vi.fn(),
}))

vi.mock('@/lib/db/operations/background-jobs', () => ({
  createJob: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  info: vi.fn(),
  error: vi.fn(),
}))

import { handleSkillTreeGeneration } from '@/lib/jobs/handlers/skill-tree-job'
import { generateSkillTree, flattenGeneratedNodes } from '@/lib/ai/skill-tree-generator'
import {
  createSkillTree,
  updateSkillTreeStats,
  getSkillTreeByGoalId,
} from '@/lib/db/operations/skill-trees'
import { createSkillNodes, getNodesByTreeId } from '@/lib/db/operations/skill-nodes'
import { getGoalByIdForUser } from '@/lib/db/operations/goals'
import { createJob } from '@/lib/db/operations/background-jobs'

describe('Skill Tree Job - Flashcard Job Queuing', () => {
  const testUserId = 'user-test-123'
  const testGoalId = 'goal-test-456'
  const testTreeId = 'tree-test-789'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Flashcard job queuing after tree creation', () => {
    it('should queue flashcard_generation job for each node after successful tree creation', async () => {
      const payload: SkillTreeGenerationPayload = {
        goalId: testGoalId,
        topic: 'React Fundamentals',
      }

      const mockGoal = {
        id: testGoalId,
        userId: testUserId,
        title: 'Learn React',
        description: 'Master React fundamentals',
        status: 'active' as const,
        masteryPercentage: 0,
        totalTimeSeconds: 0,
        completedAt: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockGenerated = {
        nodes: [
          {
            title: 'Components',
            description: 'React component basics',
            depth: 0,
            path: '1',
            sortOrder: 0,
            parentId: null,
            children: [],
          },
          {
            title: 'State Management',
            description: 'Managing state in React',
            depth: 0,
            path: '2',
            sortOrder: 1,
            parentId: null,
            children: [],
          },
          {
            title: 'Hooks',
            description: 'Using React Hooks',
            depth: 0,
            path: '3',
            sortOrder: 2,
            parentId: null,
            children: [],
          },
        ],
        metadata: {
          nodeCount: 3,
          maxDepth: 0,
          generationTimeMs: 1500,
          model: 'claude-3-sonnet',
          retryCount: 0,
        },
      }

      const mockTree = {
        id: testTreeId,
        goalId: testGoalId,
        generatedBy: 'ai' as const,
        nodeCount: 3,
        maxDepth: 0,
        curatedSourceId: null,
        regeneratedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockCreatedNodes = [
        {
          id: 'node-1',
          treeId: testTreeId,
          parentId: null,
          title: 'Components',
          description: 'React component basics',
          depth: 0,
          path: '1',
          sortOrder: 0,
          isEnabled: true,
          masteryPercentage: 0,
          cardCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'node-2',
          treeId: testTreeId,
          parentId: null,
          title: 'State Management',
          description: 'Managing state in React',
          depth: 0,
          path: '2',
          sortOrder: 1,
          isEnabled: true,
          masteryPercentage: 0,
          cardCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'node-3',
          treeId: testTreeId,
          parentId: null,
          title: 'Hooks',
          description: 'Using React Hooks',
          depth: 0,
          path: '3',
          sortOrder: 2,
          isEnabled: true,
          masteryPercentage: 0,
          cardCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(getGoalByIdForUser).mockResolvedValue(mockGoal)
      vi.mocked(getSkillTreeByGoalId).mockResolvedValue(null)
      vi.mocked(generateSkillTree).mockResolvedValue(mockGenerated)
      vi.mocked(createSkillTree).mockResolvedValue(mockTree)
      vi.mocked(flattenGeneratedNodes).mockReturnValue(mockGenerated.nodes)
      vi.mocked(createSkillNodes).mockImplementation(async (nodes) =>
        nodes.map((_, i) => mockCreatedNodes[i])
      )
      vi.mocked(getNodesByTreeId).mockResolvedValue(mockCreatedNodes)
      vi.mocked(updateSkillTreeStats).mockResolvedValue(mockTree)
      vi.mocked(createJob).mockResolvedValue({
        id: 'job-123',
        userId: testUserId,
        type: JobType.FLASHCARD_GENERATION,
        status: 'pending' as const,
        payload: {},
        result: null,
        error: null,
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        nextRetryAt: null,
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
      })

      const result: SkillTreeGenerationResult = await handleSkillTreeGeneration(payload, testUserId)

      // Verify tree was created
      expect(result.treeId).toBe(testTreeId)
      expect(result.nodeCount).toBe(3)

      // Verify flashcard jobs were queued for each node
      expect(createJob).toHaveBeenCalledTimes(3)
    })

    it('should include correct payload in each flashcard job', async () => {
      const payload: SkillTreeGenerationPayload = {
        goalId: testGoalId,
        topic: 'TypeScript',
      }

      const mockGoal = {
        id: testGoalId,
        userId: testUserId,
        title: 'Learn TypeScript',
        description: 'Master TypeScript',
        status: 'active' as const,
        masteryPercentage: 0,
        totalTimeSeconds: 0,
        completedAt: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockGenerated = {
        nodes: [
          {
            title: 'Type System',
            description: 'Understanding TypeScript types',
            depth: 0,
            path: '1',
            sortOrder: 0,
            parentId: null,
            children: [],
          },
        ],
        metadata: {
          nodeCount: 1,
          maxDepth: 0,
          generationTimeMs: 1000,
          model: 'claude-3-sonnet',
          retryCount: 0,
        },
      }

      const mockTree = {
        id: testTreeId,
        goalId: testGoalId,
        generatedBy: 'ai' as const,
        nodeCount: 1,
        maxDepth: 0,
        curatedSourceId: null,
        regeneratedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockCreatedNode = {
        id: 'node-1',
        treeId: testTreeId,
        parentId: null,
        title: 'Type System',
        description: 'Understanding TypeScript types',
        depth: 0,
        path: '1',
        sortOrder: 0,
        isEnabled: true,
        masteryPercentage: 0,
        cardCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(getGoalByIdForUser).mockResolvedValue(mockGoal)
      vi.mocked(getSkillTreeByGoalId).mockResolvedValue(null)
      vi.mocked(generateSkillTree).mockResolvedValue(mockGenerated)
      vi.mocked(createSkillTree).mockResolvedValue(mockTree)
      vi.mocked(flattenGeneratedNodes).mockReturnValue(mockGenerated.nodes)
      vi.mocked(createSkillNodes).mockResolvedValue([mockCreatedNode])
      vi.mocked(getNodesByTreeId).mockResolvedValue([mockCreatedNode])
      vi.mocked(updateSkillTreeStats).mockResolvedValue(mockTree)
      vi.mocked(createJob).mockResolvedValue({
        id: 'job-123',
        userId: testUserId,
        type: JobType.FLASHCARD_GENERATION,
        status: 'pending' as const,
        payload: {},
        result: null,
        error: null,
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        nextRetryAt: null,
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
      })

      await handleSkillTreeGeneration(payload, testUserId)

      // Verify job payload contains nodeId, nodeTitle, nodeDescription, maxCards
      expect(createJob).toHaveBeenCalledWith({
        type: JobType.FLASHCARD_GENERATION,
        userId: testUserId,
        payload: {
          nodeId: 'node-1',
          nodeTitle: 'Type System',
          nodeDescription: 'Understanding TypeScript types',
          maxCards: 5,
        },
        priority: 0,
      })
    })

    it('should queue jobs with priority 0', async () => {
      const payload: SkillTreeGenerationPayload = {
        goalId: testGoalId,
        topic: 'JavaScript',
      }

      const mockGoal = {
        id: testGoalId,
        userId: testUserId,
        title: 'Learn JavaScript',
        description: 'Master JavaScript',
        status: 'active' as const,
        masteryPercentage: 0,
        totalTimeSeconds: 0,
        completedAt: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockGenerated = {
        nodes: [
          {
            title: 'Basics',
            description: 'JavaScript basics',
            depth: 0,
            path: '1',
            sortOrder: 0,
            parentId: null,
            children: [],
          },
        ],
        metadata: {
          nodeCount: 1,
          maxDepth: 0,
          generationTimeMs: 1000,
          model: 'claude-3-sonnet',
          retryCount: 0,
        },
      }

      const mockTree = {
        id: testTreeId,
        goalId: testGoalId,
        generatedBy: 'ai' as const,
        nodeCount: 1,
        maxDepth: 0,
        curatedSourceId: null,
        regeneratedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockCreatedNode = {
        id: 'node-1',
        treeId: testTreeId,
        parentId: null,
        title: 'Basics',
        description: 'JavaScript basics',
        depth: 0,
        path: '1',
        sortOrder: 0,
        isEnabled: true,
        masteryPercentage: 0,
        cardCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(getGoalByIdForUser).mockResolvedValue(mockGoal)
      vi.mocked(getSkillTreeByGoalId).mockResolvedValue(null)
      vi.mocked(generateSkillTree).mockResolvedValue(mockGenerated)
      vi.mocked(createSkillTree).mockResolvedValue(mockTree)
      vi.mocked(flattenGeneratedNodes).mockReturnValue(mockGenerated.nodes)
      vi.mocked(createSkillNodes).mockResolvedValue([mockCreatedNode])
      vi.mocked(getNodesByTreeId).mockResolvedValue([mockCreatedNode])
      vi.mocked(updateSkillTreeStats).mockResolvedValue(mockTree)
      vi.mocked(createJob).mockResolvedValue({
        id: 'job-123',
        userId: testUserId,
        type: JobType.FLASHCARD_GENERATION,
        status: 'pending' as const,
        payload: {},
        result: null,
        error: null,
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        nextRetryAt: null,
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
      })

      await handleSkillTreeGeneration(payload, testUserId)

      // Verify priority is 0
      expect(createJob).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 0,
        })
      )
    })

    it('should not queue flashcard jobs if tree creation fails', async () => {
      const payload: SkillTreeGenerationPayload = {
        goalId: testGoalId,
        topic: 'Python',
      }

      const mockGoal = {
        id: testGoalId,
        userId: testUserId,
        title: 'Learn Python',
        description: 'Master Python',
        status: 'active' as const,
        masteryPercentage: 0,
        totalTimeSeconds: 0,
        completedAt: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(getGoalByIdForUser).mockResolvedValue(mockGoal)
      vi.mocked(getSkillTreeByGoalId).mockResolvedValue(null)
      vi.mocked(generateSkillTree).mockRejectedValue(new Error('AI generation failed'))

      await expect(handleSkillTreeGeneration(payload, testUserId)).rejects.toThrow(
        'AI generation failed'
      )

      // No flashcard jobs should be queued
      expect(createJob).not.toHaveBeenCalled()
    })

    it('should handle nodes with null descriptions', async () => {
      const payload: SkillTreeGenerationPayload = {
        goalId: testGoalId,
        topic: 'CSS',
      }

      const mockGoal = {
        id: testGoalId,
        userId: testUserId,
        title: 'Learn CSS',
        description: 'Master CSS',
        status: 'active' as const,
        masteryPercentage: 0,
        totalTimeSeconds: 0,
        completedAt: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockGenerated = {
        nodes: [
          {
            title: 'Flexbox',
            description: undefined, // No description
            depth: 0,
            path: '1',
            sortOrder: 0,
            parentId: null,
            children: [],
          },
        ],
        metadata: {
          nodeCount: 1,
          maxDepth: 0,
          generationTimeMs: 1000,
          model: 'claude-3-sonnet',
          retryCount: 0,
        },
      }

      const mockTree = {
        id: testTreeId,
        goalId: testGoalId,
        generatedBy: 'ai' as const,
        nodeCount: 1,
        maxDepth: 0,
        curatedSourceId: null,
        regeneratedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockCreatedNode = {
        id: 'node-1',
        treeId: testTreeId,
        parentId: null,
        title: 'Flexbox',
        description: null,
        depth: 0,
        path: '1',
        sortOrder: 0,
        isEnabled: true,
        masteryPercentage: 0,
        cardCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(getGoalByIdForUser).mockResolvedValue(mockGoal)
      vi.mocked(getSkillTreeByGoalId).mockResolvedValue(null)
      vi.mocked(generateSkillTree).mockResolvedValue(mockGenerated)
      vi.mocked(createSkillTree).mockResolvedValue(mockTree)
      vi.mocked(flattenGeneratedNodes).mockReturnValue([
        {
          title: 'Flexbox',
          description: null,
          depth: 0,
          path: '1',
          parentId: null,
          sortOrder: 0,
          children: undefined,
        },
      ])
      vi.mocked(createSkillNodes).mockResolvedValue([mockCreatedNode])
      vi.mocked(getNodesByTreeId).mockResolvedValue([mockCreatedNode])
      vi.mocked(updateSkillTreeStats).mockResolvedValue(mockTree)
      vi.mocked(createJob).mockResolvedValue({
        id: 'job-123',
        userId: testUserId,
        type: JobType.FLASHCARD_GENERATION,
        status: 'pending' as const,
        payload: {},
        result: null,
        error: null,
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        nextRetryAt: null,
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
      })

      await handleSkillTreeGeneration(payload, testUserId)

      // Should still queue job with undefined description
      expect(createJob).toHaveBeenCalledWith({
        type: JobType.FLASHCARD_GENERATION,
        userId: testUserId,
        payload: {
          nodeId: 'node-1',
          nodeTitle: 'Flexbox',
          nodeDescription: undefined,
          maxCards: 5,
        },
        priority: 0,
      })
    })

    it('should queue jobs for all nodes in hierarchical tree', async () => {
      const payload: SkillTreeGenerationPayload = {
        goalId: testGoalId,
        topic: 'Node.js',
      }

      const mockGoal = {
        id: testGoalId,
        userId: testUserId,
        title: 'Learn Node.js',
        description: 'Master Node.js',
        status: 'active' as const,
        masteryPercentage: 0,
        totalTimeSeconds: 0,
        completedAt: null,
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockGenerated = {
        nodes: [
          {
            title: 'Core Modules',
            description: 'Node.js core modules',
            depth: 0,
            path: '1',
            sortOrder: 0,
            parentId: null,
            children: [
              {
                title: 'File System',
                description: 'fs module',
                depth: 1,
                path: '1.1',
                sortOrder: 0,
                parentId: 'node-1',
                children: [],
              },
            ],
          },
        ],
        metadata: {
          nodeCount: 2,
          maxDepth: 1,
          generationTimeMs: 1500,
          model: 'claude-3-sonnet',
          retryCount: 0,
        },
      }

      const mockTree = {
        id: testTreeId,
        goalId: testGoalId,
        generatedBy: 'ai' as const,
        nodeCount: 2,
        maxDepth: 1,
        curatedSourceId: null,
        regeneratedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockRootNode = {
        id: 'node-1',
        treeId: testTreeId,
        parentId: null,
        title: 'Core Modules',
        description: 'Node.js core modules',
        depth: 0,
        path: '1',
        sortOrder: 0,
        isEnabled: true,
        masteryPercentage: 0,
        cardCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockChildNode = {
        id: 'node-2',
        treeId: testTreeId,
        parentId: 'node-1',
        title: 'File System',
        description: 'fs module',
        depth: 1,
        path: '1.1',
        sortOrder: 0,
        isEnabled: true,
        masteryPercentage: 0,
        cardCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(getGoalByIdForUser).mockResolvedValue(mockGoal)
      vi.mocked(getSkillTreeByGoalId).mockResolvedValue(null)
      vi.mocked(generateSkillTree).mockResolvedValue(mockGenerated)
      vi.mocked(createSkillTree).mockResolvedValue(mockTree)

      // First call returns root, second call returns child
      vi.mocked(flattenGeneratedNodes)
        .mockReturnValueOnce(mockGenerated.nodes)
        .mockReturnValueOnce(mockGenerated.nodes[0].children!)

      vi.mocked(createSkillNodes)
        .mockResolvedValueOnce([mockRootNode])
        .mockResolvedValueOnce([mockChildNode])

      vi.mocked(getNodesByTreeId).mockResolvedValue([mockRootNode, mockChildNode])
      vi.mocked(updateSkillTreeStats).mockResolvedValue(mockTree)
      vi.mocked(createJob).mockResolvedValue({
        id: 'job-123',
        userId: testUserId,
        type: JobType.FLASHCARD_GENERATION,
        status: 'pending' as const,
        payload: {},
        result: null,
        error: null,
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        nextRetryAt: null,
        createdAt: new Date(),
        startedAt: null,
        completedAt: null,
      })

      await handleSkillTreeGeneration(payload, testUserId)

      // Should queue jobs for both root and child nodes
      expect(createJob).toHaveBeenCalledTimes(2)
    })
  })
})
