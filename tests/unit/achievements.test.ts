import { describe, it, expect } from 'vitest'

/**
 * Unit Tests for Achievement Trigger Logic
 *
 * Tests achievement unlock conditions and validation.
 * Does not test actual database operations (those are integration tests).
 */

describe('Achievement Trigger Logic', () => {
  describe('Card Mastery Achievements', () => {
    interface AchievementThreshold {
      key: string
      threshold: number
    }

    const masteryThresholds: AchievementThreshold[] = [
      { key: 'first_10_cards', threshold: 10 },
      { key: 'first_50_cards', threshold: 50 },
      { key: 'first_100_cards', threshold: 100 },
      { key: 'first_500_cards', threshold: 500 },
    ]

    function checkMasteryAchievements(masteredCount: number): string[] {
      return masteryThresholds.filter((t) => masteredCount >= t.threshold).map((t) => t.key)
    }

    it('should unlock first_10_cards at 10 cards', () => {
      const unlocked = checkMasteryAchievements(10)

      expect(unlocked).toContain('first_10_cards')
    })

    it('should unlock multiple achievements at once', () => {
      const unlocked = checkMasteryAchievements(100)

      expect(unlocked).toContain('first_10_cards')
      expect(unlocked).toContain('first_50_cards')
      expect(unlocked).toContain('first_100_cards')
      expect(unlocked.length).toBe(3)
    })

    it('should not unlock achievements below threshold', () => {
      const unlocked = checkMasteryAchievements(45)

      expect(unlocked).toContain('first_10_cards')
      expect(unlocked).not.toContain('first_50_cards')
    })

    it('should not unlock any achievements at 0 cards', () => {
      const unlocked = checkMasteryAchievements(0)

      expect(unlocked.length).toBe(0)
    })

    it('should unlock milestone at exact threshold', () => {
      const unlocked = checkMasteryAchievements(500)

      expect(unlocked).toContain('first_500_cards')
    })

    it('should unlock all achievements at 500+ cards', () => {
      const unlocked = checkMasteryAchievements(500)

      expect(unlocked.length).toBe(4)
      expect(unlocked).toEqual([
        'first_10_cards',
        'first_50_cards',
        'first_100_cards',
        'first_500_cards',
      ])
    })
  })

  describe('Session Streak Achievements', () => {
    function calculateStreak(consecutiveDays: number): boolean {
      return consecutiveDays >= 7
    }

    it('should unlock on 7-day streak', () => {
      const unlocked = calculateStreak(7)

      expect(unlocked).toBe(true)
    })

    it('should not unlock below 7 days', () => {
      const unlocked = calculateStreak(6)

      expect(unlocked).toBe(false)
    })

    it('should unlock on 30-day streak', () => {
      const unlocked = calculateStreak(30)

      expect(unlocked).toBe(true)
    })
  })

  describe('Goal Completion Achievements', () => {
    interface Goal {
      id: string
      masteryPercentage: number
      status: 'active' | 'completed'
    }

    function isGoalCompleted(goal: Goal): boolean {
      return goal.status === 'completed' && goal.masteryPercentage >= 80
    }

    it('should recognize completed goal with 80% mastery', () => {
      const goal: Goal = {
        id: 'test-goal',
        masteryPercentage: 80,
        status: 'completed',
      }

      expect(isGoalCompleted(goal)).toBe(true)
    })

    it('should reject incomplete goal', () => {
      const goal: Goal = {
        id: 'test-goal',
        masteryPercentage: 80,
        status: 'active',
      }

      expect(isGoalCompleted(goal)).toBe(false)
    })

    it('should reject low mastery completion', () => {
      const goal: Goal = {
        id: 'test-goal',
        masteryPercentage: 70,
        status: 'completed',
      }

      expect(isGoalCompleted(goal)).toBe(false)
    })
  })

  describe('Perfect Session Achievement', () => {
    interface SessionResult {
      totalCards: number
      correctCount: number
      easyCount: number
    }

    function isPerfectSession(result: SessionResult): boolean {
      return result.correctCount === result.totalCards && result.easyCount >= result.totalCards / 2
    }

    it('should unlock on perfect session with 50%+ easy', () => {
      const result: SessionResult = {
        totalCards: 10,
        correctCount: 10,
        easyCount: 5,
      }

      expect(isPerfectSession(result)).toBe(true)
    })

    it('should not unlock without all correct', () => {
      const result: SessionResult = {
        totalCards: 10,
        correctCount: 9,
        easyCount: 5,
      }

      expect(isPerfectSession(result)).toBe(false)
    })

    it('should not unlock without enough easy answers', () => {
      const result: SessionResult = {
        totalCards: 10,
        correctCount: 10,
        easyCount: 4,
      }

      expect(isPerfectSession(result)).toBe(false)
    })
  })

  describe('Skill Node Mastery Achievements', () => {
    interface Node {
      id: string
      masteryPercentage: number
      cardCount: number
    }

    function isNodeMastered(node: Node): boolean {
      return node.masteryPercentage >= 90 && node.cardCount >= 5
    }

    it('should unlock node mastery with 90%+ and 5+ cards', () => {
      const node: Node = {
        id: 'node-1',
        masteryPercentage: 95,
        cardCount: 10,
      }

      expect(isNodeMastered(node)).toBe(true)
    })

    it('should not unlock with high mastery but few cards', () => {
      const node: Node = {
        id: 'node-1',
        masteryPercentage: 95,
        cardCount: 3,
      }

      expect(isNodeMastered(node)).toBe(false)
    })

    it('should not unlock with many cards but low mastery', () => {
      const node: Node = {
        id: 'node-1',
        masteryPercentage: 85,
        cardCount: 10,
      }

      expect(isNodeMastered(node)).toBe(false)
    })
  })

  describe('Achievement Metadata Storage', () => {
    interface Achievement {
      key: string
      unlockedAt: Date
      metadata?: Record<string, unknown>
    }

    it('should store achievement context', () => {
      const achievement: Achievement = {
        key: 'first_10_cards',
        unlockedAt: new Date(),
        metadata: {
          goalId: 'goal-123',
          cardCount: 10,
        },
      }

      expect(achievement.metadata?.goalId).toBe('goal-123')
      expect(achievement.metadata?.cardCount).toBe(10)
    })

    it('should handle empty metadata', () => {
      const achievement: Achievement = {
        key: 'first_10_cards',
        unlockedAt: new Date(),
      }

      expect(achievement.metadata).toBeUndefined()
    })
  })
})
