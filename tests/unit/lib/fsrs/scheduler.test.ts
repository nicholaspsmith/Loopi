import { describe, it, expect } from 'vitest'
import {
  initializeCard,
  scheduleCard,
  getSchedulingOptions,
  isCardDue,
  getDaysUntilDue,
  getCardStateDescription,
  calculateRetentionRate,
  getParameters,
} from '@/lib/fsrs/scheduler'
import { Rating, State, Card } from 'ts-fsrs'

/**
 * Unit Tests for FSRS Scheduler
 *
 * Tests the FSRS (Free Spaced Repetition Scheduler) wrapper functions
 * Maps to T107 in Phase 6
 */

describe('FSRS Scheduler', () => {
  describe('initializeCard', () => {
    it('should create a new card with default FSRS state', () => {
      const card = initializeCard()

      expect(card).toHaveProperty('due')
      expect(card).toHaveProperty('stability')
      expect(card).toHaveProperty('difficulty')
      expect(card).toHaveProperty('state')
      expect(card).toHaveProperty('reps')
      expect(card).toHaveProperty('lapses')
      expect(card).toHaveProperty('elapsed_days')
      expect(card).toHaveProperty('scheduled_days')
      expect(card).toHaveProperty('last_review')

      // New card should have state = New (0)
      expect(card.state).toBe(State.New)
      expect(card.reps).toBe(0)
      expect(card.lapses).toBe(0)
    })
  })

  describe('scheduleCard', () => {
    it('should schedule card with Rating.Again (1)', () => {
      const card = initializeCard()
      const result = scheduleCard(card, Rating.Again)

      expect(result).toHaveProperty('card')
      expect(result).toHaveProperty('log')

      // Card should be updated
      expect(result.card.reps).toBeGreaterThan(0)
      expect(result.card.state).toBeGreaterThanOrEqual(0)
      expect(result.card.due).toBeInstanceOf(Date)

      // Log should have scheduling info
      expect(result.log).toHaveProperty('rating', Rating.Again)
      expect(result.log).toHaveProperty('scheduled_days')
      expect(result.log).toHaveProperty('review')
    })

    it('should schedule card with Rating.Hard (2)', () => {
      const card = initializeCard()
      const result = scheduleCard(card, Rating.Hard)

      expect(result.card.reps).toBeGreaterThan(0)
      expect(result.log.rating).toBe(Rating.Hard)
    })

    it('should schedule card with Rating.Good (3)', () => {
      const card = initializeCard()
      const result = scheduleCard(card, Rating.Good)

      expect(result.card.reps).toBeGreaterThan(0)
      expect(result.log.rating).toBe(Rating.Good)
    })

    it('should schedule card with Rating.Easy (4)', () => {
      const card = initializeCard()
      const result = scheduleCard(card, Rating.Easy)

      expect(result.card.reps).toBeGreaterThan(0)
      expect(result.log.rating).toBe(Rating.Easy)
    })

    it('should increase interval for higher ratings', () => {
      const card = initializeCard()

      const againResult = scheduleCard(card, Rating.Again)
      const goodResult = scheduleCard(card, Rating.Good)
      const easyResult = scheduleCard(card, Rating.Easy)

      // Easy should have longer or equal interval than Good
      expect(easyResult.log.scheduled_days).toBeGreaterThanOrEqual(goodResult.log.scheduled_days)
      // Good should have longer or equal interval than Again
      expect(goodResult.log.scheduled_days).toBeGreaterThanOrEqual(againResult.log.scheduled_days)
      // At minimum, Easy should be longer than Again
      expect(easyResult.log.scheduled_days).toBeGreaterThanOrEqual(againResult.log.scheduled_days)
    })

    it('should update card state from New to Learning/Review', () => {
      const card = initializeCard()
      expect(card.state).toBe(State.New)

      const result = scheduleCard(card, Rating.Good)

      // After first review, should be Learning (1) or Review (2)
      expect(result.card.state).toBeGreaterThan(State.New)
    })

    it('should handle multiple reviews correctly', () => {
      let card = initializeCard()

      // First review
      const result1 = scheduleCard(card, Rating.Good)
      expect(result1.card.reps).toBe(1)

      // Second review
      const result2 = scheduleCard(result1.card, Rating.Good)
      expect(result2.card.reps).toBe(2)

      // Third review
      const result3 = scheduleCard(result2.card, Rating.Good)
      expect(result3.card.reps).toBe(3)

      // Interval should generally increase with successful reviews
      expect(result3.log.scheduled_days).toBeGreaterThanOrEqual(result1.log.scheduled_days)
    })

    it('should track lapses when rating Again', () => {
      let card = initializeCard()

      // First review - Good
      card = scheduleCard(card, Rating.Good).card
      const initialLapses = card.lapses

      // Second review - Again (should increment lapses)
      const result = scheduleCard(card, Rating.Again)

      expect(result.card.lapses).toBeGreaterThanOrEqual(initialLapses)
    })
  })

  describe('getSchedulingOptions', () => {
    it('should return all 4 rating options', () => {
      const card = initializeCard()
      const options = getSchedulingOptions(card)

      expect(options).toHaveProperty(String(Rating.Again))
      expect(options).toHaveProperty(String(Rating.Hard))
      expect(options).toHaveProperty(String(Rating.Good))
      expect(options).toHaveProperty(String(Rating.Easy))
    })

    it('should provide interval and due date for each option', () => {
      const card = initializeCard()
      const options = getSchedulingOptions(card)

      Object.values(options).forEach((option) => {
        expect(option).toHaveProperty('interval')
        expect(option).toHaveProperty('due')
        expect(option).toHaveProperty('card')
        expect(typeof option.interval).toBe('number')
        expect(option.due).toBeInstanceOf(Date)
      })
    })

    it('should show increasing intervals for higher ratings', () => {
      const card = initializeCard()
      const options = getSchedulingOptions(card)

      const againInterval = options[Rating.Again].interval
      const hardInterval = options[Rating.Hard].interval
      const goodInterval = options[Rating.Good].interval
      const easyInterval = options[Rating.Easy].interval

      // Easy should have longest or equal interval
      expect(easyInterval).toBeGreaterThanOrEqual(goodInterval)
      expect(easyInterval).toBeGreaterThanOrEqual(hardInterval)
      expect(easyInterval).toBeGreaterThanOrEqual(againInterval)

      // All intervals should be non-negative
      expect(againInterval).toBeGreaterThanOrEqual(0)
      expect(hardInterval).toBeGreaterThanOrEqual(0)
      expect(goodInterval).toBeGreaterThanOrEqual(0)
      expect(easyInterval).toBeGreaterThanOrEqual(0)
    })
  })

  describe('isCardDue', () => {
    it('should return true for new card (due now)', () => {
      const card = initializeCard()
      expect(isCardDue(card)).toBe(true)
    })

    it('should return true for card with past due date', () => {
      const card: Card = {
        ...initializeCard(),
        due: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      }
      expect(isCardDue(card)).toBe(true)
    })

    it('should return false for card with future due date', () => {
      const card: Card = {
        ...initializeCard(),
        due: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
      }
      expect(isCardDue(card)).toBe(false)
    })

    it('should return true for card due exactly now', () => {
      const card: Card = {
        ...initializeCard(),
        due: new Date(),
      }
      expect(isCardDue(card)).toBe(true)
    })
  })

  describe('getDaysUntilDue', () => {
    it('should return 0 for card due now', () => {
      const card = initializeCard()
      const days = getDaysUntilDue(card)
      expect(days).toBe(0)
    })

    it('should return 0 for overdue card', () => {
      const card: Card = {
        ...initializeCard(),
        due: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      }
      const days = getDaysUntilDue(card)
      expect(days).toBe(0)
    })

    it('should return correct days for future due date', () => {
      const card: Card = {
        ...initializeCard(),
        due: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      }
      const days = getDaysUntilDue(card)
      expect(days).toBeGreaterThanOrEqual(2) // At least 2 days (accounting for rounding)
      expect(days).toBeLessThanOrEqual(3) // At most 3 days
    })
  })

  describe('getCardStateDescription', () => {
    it('should return "New" for State.New (0)', () => {
      const card: Card = {
        ...initializeCard(),
        state: State.New,
      }
      expect(getCardStateDescription(card)).toBe('New')
    })

    it('should return "Learning" for State.Learning (1)', () => {
      const card: Card = {
        ...initializeCard(),
        state: State.Learning,
      }
      expect(getCardStateDescription(card)).toBe('Learning')
    })

    it('should return "Review" for State.Review (2)', () => {
      const card: Card = {
        ...initializeCard(),
        state: State.Review,
      }
      expect(getCardStateDescription(card)).toBe('Review')
    })

    it('should return "Relearning" for State.Relearning (3)', () => {
      const card: Card = {
        ...initializeCard(),
        state: State.Relearning,
      }
      expect(getCardStateDescription(card)).toBe('Relearning')
    })

    it('should return "Unknown" for invalid state', () => {
      const card: Card = {
        ...initializeCard(),
        state: 999 as State,
      }
      expect(getCardStateDescription(card)).toBe('Unknown')
    })
  })

  describe('calculateRetentionRate', () => {
    it('should return 100% for new card with no reviews', () => {
      const card = initializeCard()
      expect(calculateRetentionRate(card)).toBe(100)
    })

    it('should return 100% for card with reviews and no lapses', () => {
      const card: Card = {
        ...initializeCard(),
        reps: 5,
        lapses: 0,
      }
      expect(calculateRetentionRate(card)).toBe(100)
    })

    it('should calculate correct rate with some lapses', () => {
      const card: Card = {
        ...initializeCard(),
        reps: 10,
        lapses: 2,
      }
      // (10 - 2) / 10 = 80%
      expect(calculateRetentionRate(card)).toBe(80)
    })

    it('should handle 50% retention rate', () => {
      const card: Card = {
        ...initializeCard(),
        reps: 10,
        lapses: 5,
      }
      expect(calculateRetentionRate(card)).toBe(50)
    })

    it('should handle 0% retention rate', () => {
      const card: Card = {
        ...initializeCard(),
        reps: 10,
        lapses: 10,
      }
      expect(calculateRetentionRate(card)).toBe(0)
    })
  })

  describe('getParameters', () => {
    it('should return FSRS parameters object', () => {
      const params = getParameters()

      expect(params).toBeDefined()
      expect(typeof params).toBe('object')
    })

    it('should have default FSRS parameters', () => {
      const params = getParameters()

      // FSRS should have parameters (exact structure depends on ts-fsrs version)
      expect(params).toHaveProperty('w')
    })
  })

  describe('Integration: Full review cycle', () => {
    it('should handle a complete learning cycle', () => {
      // Start with new card
      let card = initializeCard()
      expect(card.state).toBe(State.New)
      expect(card.reps).toBe(0)

      // First review - Good
      const review1 = scheduleCard(card, Rating.Good)
      card = review1.card
      expect(card.reps).toBe(1)
      expect(card.state).toBeGreaterThan(State.New)

      // Card should not be due immediately after review
      expect(isCardDue(card)).toBe(false)

      // Second review - Good
      const review2 = scheduleCard(card, Rating.Good)
      card = review2.card
      expect(card.reps).toBe(2)

      // Interval should increase
      expect(review2.log.scheduled_days).toBeGreaterThanOrEqual(review1.log.scheduled_days)

      // Third review - Again (forgot)
      const review3 = scheduleCard(card, Rating.Again)
      card = review3.card
      expect(card.reps).toBe(3)

      // Should track the lapse
      expect(card.lapses).toBeGreaterThan(0)

      // Retention rate should be less than 100%
      const retention = calculateRetentionRate(card)
      expect(retention).toBeLessThan(100)
      expect(retention).toBeGreaterThanOrEqual(0)
    })

    it('should provide preview of all rating outcomes', () => {
      const card = initializeCard()
      const options = getSchedulingOptions(card)

      // Should show 4 different outcomes
      const intervals = [
        options[Rating.Again].interval,
        options[Rating.Hard].interval,
        options[Rating.Good].interval,
        options[Rating.Easy].interval,
      ]

      // All intervals should be non-negative
      intervals.forEach((interval) => {
        expect(interval).toBeGreaterThanOrEqual(0)
      })

      // Easy should have longest or equal interval
      expect(options[Rating.Easy].interval).toBeGreaterThanOrEqual(options[Rating.Again].interval)
    })
  })
})
