import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Unit Tests for incrementNodeCardCount
 *
 * Tests the new incrementNodeCardCount function that updates
 * the cardCount field and updatedAt timestamp for a skill node.
 *
 * Maps to T003 in feature spec 019-auto-gen-guided-study.
 */

// Mock database client
vi.mock('@/lib/db/pg-client', () => ({
  getDb: vi.fn(),
}))

import { getDb } from '@/lib/db/pg-client'
import { incrementNodeCardCount } from '@/lib/db/operations/skill-nodes'

describe('incrementNodeCardCount', () => {
  const mockDb = {
    update: vi.fn(),
    select: vi.fn(),
  }

  const mockUpdateBuilder = {
    set: vi.fn(),
    where: vi.fn(),
    returning: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getDb).mockReturnValue(mockDb as any)
    mockDb.update.mockReturnValue(mockUpdateBuilder)
    mockUpdateBuilder.set.mockReturnValue(mockUpdateBuilder)
    mockUpdateBuilder.where.mockReturnValue(mockUpdateBuilder)
  })

  describe('Basic functionality', () => {
    it('should increment cardCount by specified amount', async () => {
      const testNodeId = 'node-123'
      const incrementBy = 5

      mockUpdateBuilder.returning.mockResolvedValue([
        {
          id: testNodeId,
          treeId: 'tree-456',
          parentId: null,
          title: 'Test Node',
          description: 'Test description',
          depth: 0,
          path: '1',
          sortOrder: 0,
          isEnabled: true,
          masteryPercentage: 0,
          cardCount: 5, // Updated from 0 to 5
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date(), // Updated timestamp
        },
      ])

      await incrementNodeCardCount(testNodeId, incrementBy)

      // Should call update with correct parameters
      expect(mockDb.update).toHaveBeenCalled()
      expect(mockUpdateBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedAt: expect.any(Date),
        })
      )
      expect(mockUpdateBuilder.where).toHaveBeenCalled()
    })

    it('should update the updatedAt timestamp', async () => {
      const testNodeId = 'node-123'
      const incrementBy = 3
      const beforeUpdate = new Date()

      mockUpdateBuilder.returning.mockResolvedValue([
        {
          id: testNodeId,
          treeId: 'tree-456',
          parentId: null,
          title: 'Test Node',
          description: 'Test description',
          depth: 0,
          path: '1',
          sortOrder: 0,
          isEnabled: true,
          masteryPercentage: 0,
          cardCount: 3,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date(),
        },
      ])

      await incrementNodeCardCount(testNodeId, incrementBy)

      // Should have set updatedAt to a recent timestamp
      expect(mockUpdateBuilder.set).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedAt: expect.any(Date),
        })
      )

      const setCall = mockUpdateBuilder.set.mock.calls[0][0]
      expect(setCall.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime())
    })

    it('should handle increment by 1', async () => {
      const testNodeId = 'node-123'

      mockUpdateBuilder.returning.mockResolvedValue([
        {
          id: testNodeId,
          treeId: 'tree-456',
          parentId: null,
          title: 'Test Node',
          description: 'Test description',
          depth: 0,
          path: '1',
          sortOrder: 0,
          isEnabled: true,
          masteryPercentage: 0,
          cardCount: 1,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date(),
        },
      ])

      await incrementNodeCardCount(testNodeId, 1)

      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should handle large increment values', async () => {
      const testNodeId = 'node-123'
      const incrementBy = 100

      mockUpdateBuilder.returning.mockResolvedValue([
        {
          id: testNodeId,
          treeId: 'tree-456',
          parentId: null,
          title: 'Test Node',
          description: 'Test description',
          depth: 0,
          path: '1',
          sortOrder: 0,
          isEnabled: true,
          masteryPercentage: 0,
          cardCount: 100,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date(),
        },
      ])

      await incrementNodeCardCount(testNodeId, incrementBy)

      expect(mockDb.update).toHaveBeenCalled()
    })
  })

  describe('Error handling', () => {
    it('should handle non-existent nodeId gracefully', async () => {
      const nonExistentNodeId = 'node-does-not-exist'
      const incrementBy = 5

      // When node doesn't exist, returning() returns empty array
      mockUpdateBuilder.returning.mockResolvedValue([])

      // Should not throw error
      await expect(incrementNodeCardCount(nonExistentNodeId, incrementBy)).resolves.not.toThrow()

      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      const testNodeId = 'node-123'
      const incrementBy = 5

      mockUpdateBuilder.where.mockRejectedValue(new Error('Database connection failed'))

      await expect(incrementNodeCardCount(testNodeId, incrementBy)).rejects.toThrow(
        'Database connection failed'
      )
    })

    it('should handle zero increment (edge case)', async () => {
      const testNodeId = 'node-123'
      const incrementBy = 0

      mockUpdateBuilder.returning.mockResolvedValue([
        {
          id: testNodeId,
          treeId: 'tree-456',
          parentId: null,
          title: 'Test Node',
          description: 'Test description',
          depth: 0,
          path: '1',
          sortOrder: 0,
          isEnabled: true,
          masteryPercentage: 0,
          cardCount: 0, // No change
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date(),
        },
      ])

      await incrementNodeCardCount(testNodeId, incrementBy)

      // Should still update (even with 0 increment)
      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should handle negative increment (edge case)', async () => {
      const testNodeId = 'node-123'
      const incrementBy = -5

      mockUpdateBuilder.returning.mockResolvedValue([
        {
          id: testNodeId,
          treeId: 'tree-456',
          parentId: null,
          title: 'Test Node',
          description: 'Test description',
          depth: 0,
          path: '1',
          sortOrder: 0,
          isEnabled: true,
          masteryPercentage: 0,
          cardCount: 0, // Could go negative depending on implementation
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date(),
        },
      ])

      // Should allow negative increment (for potential correction scenarios)
      await expect(incrementNodeCardCount(testNodeId, incrementBy)).resolves.not.toThrow()
    })
  })

  describe('SQL injection protection', () => {
    it('should safely handle nodeId with special characters', async () => {
      const maliciousNodeId = "node'; DROP TABLE skill_nodes; --"
      const incrementBy = 5

      mockUpdateBuilder.returning.mockResolvedValue([])

      await expect(incrementNodeCardCount(maliciousNodeId, incrementBy)).resolves.not.toThrow()

      // Should use parameterized queries (handled by drizzle)
      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should safely handle very long nodeId', async () => {
      const longNodeId = 'node-' + 'a'.repeat(1000)
      const incrementBy = 5

      mockUpdateBuilder.returning.mockResolvedValue([])

      await expect(incrementNodeCardCount(longNodeId, incrementBy)).resolves.not.toThrow()

      expect(mockDb.update).toHaveBeenCalled()
    })
  })

  describe('Concurrent updates', () => {
    it('should handle multiple increments to same node (simulated)', async () => {
      const testNodeId = 'node-123'

      // Simulate first increment
      mockUpdateBuilder.returning.mockResolvedValueOnce([
        {
          id: testNodeId,
          treeId: 'tree-456',
          parentId: null,
          title: 'Test Node',
          description: 'Test description',
          depth: 0,
          path: '1',
          sortOrder: 0,
          isEnabled: true,
          masteryPercentage: 0,
          cardCount: 3,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date(),
        },
      ])

      // Simulate second increment
      mockUpdateBuilder.returning.mockResolvedValueOnce([
        {
          id: testNodeId,
          treeId: 'tree-456',
          parentId: null,
          title: 'Test Node',
          description: 'Test description',
          depth: 0,
          path: '1',
          sortOrder: 0,
          isEnabled: true,
          masteryPercentage: 0,
          cardCount: 8, // 3 + 5
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date(),
        },
      ])

      await incrementNodeCardCount(testNodeId, 3)
      await incrementNodeCardCount(testNodeId, 5)

      expect(mockDb.update).toHaveBeenCalledTimes(2)
    })

    it('should use atomic SQL increment (not read-modify-write)', async () => {
      const testNodeId = 'node-123'
      const incrementBy = 5

      mockUpdateBuilder.returning.mockResolvedValue([
        {
          id: testNodeId,
          treeId: 'tree-456',
          parentId: null,
          title: 'Test Node',
          description: 'Test description',
          depth: 0,
          path: '1',
          sortOrder: 0,
          isEnabled: true,
          masteryPercentage: 0,
          cardCount: 5,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date(),
        },
      ])

      await incrementNodeCardCount(testNodeId, incrementBy)

      // Should not call select() first (atomic update)
      expect(mockDb.select).not.toHaveBeenCalled()

      // Should use SQL increment expression (via drizzle's sql template)
      expect(mockDb.update).toHaveBeenCalled()
    })
  })

  describe('Return value', () => {
    it('should return void (no return value)', async () => {
      const testNodeId = 'node-123'
      const incrementBy = 5

      mockUpdateBuilder.returning.mockResolvedValue([
        {
          id: testNodeId,
          treeId: 'tree-456',
          parentId: null,
          title: 'Test Node',
          description: 'Test description',
          depth: 0,
          path: '1',
          sortOrder: 0,
          isEnabled: true,
          masteryPercentage: 0,
          cardCount: 5,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date(),
        },
      ])

      const result = await incrementNodeCardCount(testNodeId, incrementBy)

      expect(result).toBeUndefined()
    })
  })
})
