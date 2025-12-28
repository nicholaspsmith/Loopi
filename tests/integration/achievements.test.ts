// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createUser } from '@/lib/db/operations/users'
import {
  checkAchievements,
  unlockAchievement,
  getUserAchievements,
  hasAchievement,
  countMasteredCards,
  ACHIEVEMENT_DEFINITIONS,
} from '@/lib/db/operations/achievements'
import { createGoal } from '@/lib/db/operations/goals'
import { initializeSchema, isSchemaInitialized } from '@/lib/db/schema'
import { closeDbConnection } from '@/lib/db/client'

/**
 * Integration Tests for Achievement Unlock Flow
 *
 * Tests the complete achievement system with database.
 * Maps to User Story 5: Earn Achievements and Titles
 */

describe('Achievement Unlock Flow', () => {
  const timestamp = Date.now()
  let testUserId: string

  beforeAll(async () => {
    // Initialize database schema if needed
    const initialized = await isSchemaInitialized()
    if (!initialized) {
      await initializeSchema()
    }

    // Create test user
    const testUser = await createUser({
      email: `achievement-test-${timestamp}@example.com`,
      passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.',
      name: 'Achievement Test User',
    })
    testUserId = testUser.id
  })

  afterAll(async () => {
    await closeDbConnection()
  })

  describe('Achievement Definitions', () => {
    it('should have all required achievement definitions', () => {
      expect(ACHIEVEMENT_DEFINITIONS.length).toBeGreaterThan(0)

      ACHIEVEMENT_DEFINITIONS.forEach((def) => {
        expect(def.key).toBeDefined()
        expect(def.title).toBeDefined()
        expect(def.description).toBeDefined()
        expect(def.icon).toBeDefined()
        expect(def.category).toBeDefined()
        expect(def.requirement).toBeDefined()
      })
    })

    it('should have mastery category achievements', () => {
      const masteryAchievements = ACHIEVEMENT_DEFINITIONS.filter((d) => d.category === 'mastery')

      expect(masteryAchievements.length).toBeGreaterThan(0)
      expect(masteryAchievements.some((a) => a.key === 'first_10_cards')).toBe(true)
    })

    it('should have progress category achievements', () => {
      const progressAchievements = ACHIEVEMENT_DEFINITIONS.filter((d) => d.category === 'progress')

      expect(progressAchievements.length).toBeGreaterThan(0)
      expect(progressAchievements.some((a) => a.key === 'goal_25_percent')).toBe(true)
    })

    it('should have performance category achievements', () => {
      const performanceAchievements = ACHIEVEMENT_DEFINITIONS.filter(
        (d) => d.category === 'performance'
      )

      expect(performanceAchievements.length).toBeGreaterThan(0)
      expect(performanceAchievements.some((a) => a.key === 'perfect_session')).toBe(true)
    })

    it('should have consistency category achievements', () => {
      const consistencyAchievements = ACHIEVEMENT_DEFINITIONS.filter(
        (d) => d.category === 'consistency'
      )

      expect(consistencyAchievements.length).toBeGreaterThan(0)
      expect(consistencyAchievements.some((a) => a.key === 'week_warrior')).toBe(true)
    })
  })

  describe('Manual Achievement Unlock', () => {
    it('should unlock an achievement', async () => {
      const achievement = await unlockAchievement(testUserId, 'first_10_cards', {
        masteredCount: 10,
      })

      expect(achievement).not.toBeNull()
      expect(achievement?.key).toBe('first_10_cards')
      expect(achievement?.title).toBeDefined()
      expect(achievement?.unlockedAt).toBeDefined()
    })

    it('should not unlock duplicate achievements', async () => {
      // First unlock
      await unlockAchievement(testUserId, 'first_50_cards')

      // Second unlock (should return null)
      const duplicate = await unlockAchievement(testUserId, 'first_50_cards')

      expect(duplicate).toBeNull()
    })

    it('should check if user has achievement', async () => {
      await unlockAchievement(testUserId, 'first_100_cards')

      const has = await hasAchievement(testUserId, 'first_100_cards')

      expect(has).toBe(true)
    })

    it('should return false for unowned achievement', async () => {
      const has = await hasAchievement(testUserId, 'first_500_cards')

      expect(has).toBe(false)
    })

    it('should store achievement metadata', async () => {
      const achievement = await unlockAchievement(testUserId, 'perfect_session', {
        cardCount: 15,
        ratings: [3, 4, 3, 4, 3],
      })

      expect(achievement).not.toBeNull()
      expect(achievement?.metadata?.cardCount).toBe(15)
    })
  })

  describe('Get User Achievements', () => {
    it('should retrieve all user achievements', async () => {
      const achievements = await getUserAchievements(testUserId)

      expect(Array.isArray(achievements)).toBe(true)
      expect(achievements.length).toBeGreaterThan(0)
    })

    it('should include achievement details', async () => {
      const achievements = await getUserAchievements(testUserId)

      achievements.forEach((achievement) => {
        expect(achievement.key).toBeDefined()
        expect(achievement.title).toBeDefined()
        expect(achievement.description).toBeDefined()
        expect(achievement.icon).toBeDefined()
        expect(achievement.unlockedAt).toBeDefined()
      })
    })

    it('should order achievements by unlock time', async () => {
      const achievements = await getUserAchievements(testUserId)

      if (achievements.length > 1) {
        for (let i = 1; i < achievements.length; i++) {
          const prevTime = new Date(achievements[i - 1].unlockedAt).getTime()
          const currTime = new Date(achievements[i].unlockedAt).getTime()

          expect(currTime).toBeGreaterThanOrEqual(prevTime)
        }
      }
    })
  })

  describe('Check Achievements Trigger', () => {
    it('should check achievements on session complete', async () => {
      const result = await checkAchievements(testUserId, 'session_complete', {
        ratings: [3, 4, 3, 4, 3, 4, 3, 4, 3, 4],
      })

      expect(result).toBeDefined()
      expect(Array.isArray(result.newlyUnlocked)).toBe(true)
    })

    it('should check achievements on goal progress', async () => {
      // Create a goal first
      const goal = await createGoal({
        userId: testUserId,
        title: 'Test Goal',
        description: 'For testing achievements',
      })

      const result = await checkAchievements(testUserId, 'goal_progress', {
        goalId: goal.id,
      })

      expect(result).toBeDefined()
      expect(Array.isArray(result.newlyUnlocked)).toBe(true)
    })

    it('should not return duplicate unlocks', async () => {
      // Unlock achievement
      await unlockAchievement(testUserId, 'speed_demon', { timedScore: 95 })

      // Try to unlock again via check
      const result = await checkAchievements(testUserId, 'session_complete', {
        timedScore: 95,
      })

      const speedDemonUnlock = result.newlyUnlocked.find((a) => a.key === 'speed_demon')

      expect(speedDemonUnlock).toBeUndefined()
    })
  })

  describe('Count Mastered Cards', () => {
    it('should count mastered cards for user', async () => {
      const count = await countMasteredCards(testUserId)

      expect(typeof count).toBe('number')
      expect(count).toBeGreaterThanOrEqual(0)
    })

    it('should return 0 for user with no cards', async () => {
      // Create new user with no cards
      const newUser = await createUser({
        email: `no-cards-${timestamp}@example.com`,
        passwordHash: '$2b$10$n0.ChK4kNntDZE1yNFNs3ufwt2FyPZ7Pf9h8Do24W8M/wkdKznMa.',
        name: 'No Cards User',
      })

      const count = await countMasteredCards(newUser.id)

      expect(count).toBe(0)
    })
  })

  describe('Achievement Idempotency', () => {
    it('should be idempotent when unlocking same achievement', async () => {
      const firstUnlock = await unlockAchievement(testUserId, 'goal_complete')
      const secondUnlock = await unlockAchievement(testUserId, 'goal_complete')

      expect(firstUnlock).not.toBeNull()
      expect(secondUnlock).toBeNull()
    })

    it('should maintain consistent achievement count', async () => {
      const beforeCount = (await getUserAchievements(testUserId)).length

      // Try to unlock existing achievement
      await unlockAchievement(testUserId, 'first_10_cards')

      const afterCount = (await getUserAchievements(testUserId)).length

      expect(afterCount).toBe(beforeCount)
    })
  })

  describe('Invalid Achievement Handling', () => {
    it('should return null for unknown achievement key', async () => {
      const achievement = await unlockAchievement(testUserId, 'invalid_achievement_key')

      expect(achievement).toBeNull()
    })

    it('should handle missing user gracefully', async () => {
      const achievements = await getUserAchievements('00000000-0000-0000-0000-000000000000')

      expect(achievements).toEqual([])
    })
  })
})
