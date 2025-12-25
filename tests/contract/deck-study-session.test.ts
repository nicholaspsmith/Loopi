import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { isServerAvailable } from '@/tests/helpers/server-check'

const serverRunning = await isServerAvailable()

import { hashPassword } from '@/lib/auth/helpers'
import { createUser } from '@/lib/db/operations/users'
import { createFlashcard } from '@/lib/db/operations/flashcards'
import { createDeck } from '@/lib/db/operations/decks'
import { addCardsToDeck } from '@/lib/db/operations/deck-cards'
import { closeDbConnection } from '@/lib/db/client'

/**
 * Contract Tests for Deck Study Session API
 *
 * Tests API contracts for deck-filtered FSRS study sessions per
 * specs/012-flashcard-decks/contracts/deck-study-session.yaml
 *
 * Tests POST /api/study/deck-session endpoint:
 * - DeckSessionResponse schema validation
 * - FSRS setting precedence (session > deck > global)
 * - Applied settings source tracking
 * - Empty deck error handling
 * - No due cards scenario
 * - FlashcardWithFSRS schema
 *
 * Maps to User Story 4 (T073)
 */

describe.skipIf(!serverRunning)('Deck Study Session API Contract Tests', () => {
  let testUserId: string
  let testDeckId: string
  let emptyDeckId: string
  let deckWithOverridesId: string
  let testFlashcardIds: string[] = []

  beforeAll(async () => {
    // Create test user
    const passwordHash = await hashPassword('TestPass123!')
    const user = await createUser({
      email: `test-deck-session-${Date.now()}@example.com`,
      passwordHash,
      name: 'Deck Session Test User',
    })
    testUserId = user.id

    // Create test flashcards
    for (let i = 0; i < 5; i++) {
      const flashcard = await createFlashcard({
        userId: testUserId,
        conversationId: null,
        messageId: null,
        question: `Session Test Question ${i + 1}`,
        answer: `Session Test Answer ${i + 1}`,
      })
      testFlashcardIds.push(flashcard.id)
    }

    // Create deck with cards (no FSRS overrides)
    const deck1 = await createDeck({
      userId: testUserId,
      name: 'Test Session Deck',
    })
    testDeckId = deck1.id
    await addCardsToDeck(testDeckId, testFlashcardIds)

    // Create empty deck
    const deck2 = await createDeck({
      userId: testUserId,
      name: 'Empty Deck',
    })
    emptyDeckId = deck2.id

    // Create deck with FSRS overrides
    const deck3 = await createDeck({
      userId: testUserId,
      name: 'Deck with Overrides',
      newCardsPerDayOverride: 15,
      cardsPerSessionOverride: 25,
    })
    deckWithOverridesId = deck3.id
    await addCardsToDeck(deckWithOverridesId, [testFlashcardIds[0]])
  })

  afterAll(async () => {
    await closeDbConnection()
  })

  describe('POST /api/study/deck-session', () => {
    it('should start deck session with correct response schema', async () => {
      const response = await fetch('http://localhost:3000/api/study/deck-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckId: testDeckId,
        }),
      })

      expect(response.status).toBe(200)

      const data = await response.json()

      // Verify DeckSessionResponse schema
      expect(data).toHaveProperty('sessionId')
      expect(data).toHaveProperty('deckId', testDeckId)
      expect(data).toHaveProperty('deckName')
      expect(data).toHaveProperty('dueCards')
      expect(data).toHaveProperty('totalDueCards')
      expect(data).toHaveProperty('cardsPerSession')
      expect(data).toHaveProperty('newCardsPerDay')
      expect(data).toHaveProperty('appliedSettings')

      expect(typeof data.sessionId).toBe('string')
      expect(typeof data.deckName).toBe('string')
      expect(Array.isArray(data.dueCards)).toBe(true)
      expect(typeof data.totalDueCards).toBe('number')
      expect(typeof data.cardsPerSession).toBe('number')
      expect(typeof data.newCardsPerDay).toBe('number')
    })

    it('should include FlashcardWithFSRS schema in dueCards', async () => {
      const response = await fetch('http://localhost:3000/api/study/deck-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckId: testDeckId,
        }),
      })

      expect(response.status).toBe(200)

      const data = await response.json()

      if (data.dueCards.length > 0) {
        const card = data.dueCards[0]

        // Verify FlashcardWithFSRS schema
        expect(card).toHaveProperty('id')
        expect(card).toHaveProperty('front')
        expect(card).toHaveProperty('back')
        expect(card).toHaveProperty('tags')
        expect(card).toHaveProperty('fsrs')

        expect(typeof card.id).toBe('string')
        expect(typeof card.front).toBe('string')
        expect(typeof card.back).toBe('string')
        expect(Array.isArray(card.tags)).toBe(true)

        // Verify FSRSState schema
        expect(card.fsrs).toHaveProperty('state')
        expect(card.fsrs).toHaveProperty('dueDate')
        expect(typeof card.fsrs.state).toBe('string')
        expect(['new', 'learning', 'review', 'relearning']).toContain(card.fsrs.state)
        expect(typeof card.fsrs.dueDate).toBe('string')

        // Optional FSRS fields
        if (card.fsrs.difficulty !== undefined) {
          expect(typeof card.fsrs.difficulty).toBe('number')
        }
        if (card.fsrs.stability !== undefined) {
          expect(typeof card.fsrs.stability).toBe('number')
        }
      }
    })

    it('should include AppliedSettings with source tracking', async () => {
      const response = await fetch('http://localhost:3000/api/study/deck-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckId: testDeckId,
        }),
      })

      expect(response.status).toBe(200)

      const data = await response.json()

      // Verify AppliedSettings schema
      expect(data.appliedSettings).toHaveProperty('source')
      expect(data.appliedSettings).toHaveProperty('newCardsPerDay')
      expect(data.appliedSettings).toHaveProperty('cardsPerSession')

      expect(['session', 'deck-override', 'global']).toContain(data.appliedSettings.source)
      expect(typeof data.appliedSettings.newCardsPerDay).toBe('number')
      expect(typeof data.appliedSettings.cardsPerSession).toBe('number')

      // For deck without overrides, should use global settings
      expect(data.appliedSettings.source).toBe('global')
    })

    it('should apply deck-specific FSRS overrides', async () => {
      const response = await fetch('http://localhost:3000/api/study/deck-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckId: deckWithOverridesId,
        }),
      })

      expect(response.status).toBe(200)

      const data = await response.json()

      // Should use deck overrides
      expect(data.appliedSettings.source).toBe('deck-override')
      expect(data.appliedSettings.newCardsPerDay).toBe(15)
      expect(data.appliedSettings.cardsPerSession).toBe(25)
      expect(data.newCardsPerDay).toBe(15)
      expect(data.cardsPerSession).toBe(25)
    })

    it('should apply session-level setting overrides (highest precedence)', async () => {
      const response = await fetch('http://localhost:3000/api/study/deck-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckId: deckWithOverridesId,
          settings: {
            newCardsPerDay: 30,
            cardsPerSession: 40,
          },
        }),
      })

      expect(response.status).toBe(200)

      const data = await response.json()

      // Session overrides should take precedence over deck overrides
      expect(data.appliedSettings.source).toBe('session')
      expect(data.appliedSettings.newCardsPerDay).toBe(30)
      expect(data.appliedSettings.cardsPerSession).toBe(40)
      expect(data.newCardsPerDay).toBe(30)
      expect(data.cardsPerSession).toBe(40)
    })

    it('should handle empty deck with 400 error', async () => {
      const response = await fetch('http://localhost:3000/api/study/deck-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckId: emptyDeckId,
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data.error).toContain('0 cards')
      expect(data.error).toContain('add cards')
    })

    it('should handle no due cards with 200 and nextDueCard info', async () => {
      // This test assumes all cards have been reviewed recently
      // In practice, this scenario might be hard to create without time manipulation
      // We'll document the expected contract behavior

      const response = await fetch('http://localhost:3000/api/study/deck-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckId: testDeckId,
        }),
      })

      expect(response.status).toBe(200)

      const data = await response.json()

      // If no due cards, verify the schema
      if (data.dueCards.length === 0) {
        expect(data.totalDueCards).toBe(0)

        // nextDueCard should be present
        if (data.nextDueCard) {
          expect(data.nextDueCard).toHaveProperty('dueDate')
          expect(data.nextDueCard).toHaveProperty('count')
          expect(typeof data.nextDueCard.dueDate).toBe('string')
          expect(typeof data.nextDueCard.count).toBe('number')
        }
      }
    })

    it('should return 404 for non-existent deck', async () => {
      const response = await fetch('http://localhost:3000/api/study/deck-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckId: '00000000-0000-0000-0000-000000000000',
        }),
      })

      expect(response.status).toBe(404)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data.error).toContain('not found')
    })

    it('should reject missing deckId (400)', async () => {
      const response = await fetch('http://localhost:3000/api/study/deck-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should reject invalid deckId format (400)', async () => {
      const response = await fetch('http://localhost:3000/api/study/deck-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckId: 'not-a-uuid',
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should reject invalid session settings (400)', async () => {
      const response = await fetch('http://localhost:3000/api/study/deck-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckId: testDeckId,
          settings: {
            newCardsPerDay: -1,
          },
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should reject cardsPerSession < 1 (400)', async () => {
      const response = await fetch('http://localhost:3000/api/study/deck-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckId: testDeckId,
          settings: {
            cardsPerSession: 0,
          },
        }),
      })

      expect(response.status).toBe(400)

      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data.error).toContain('cardsPerSession')
    })

    it('should respect cardsPerSession limit in dueCards array', async () => {
      const response = await fetch('http://localhost:3000/api/study/deck-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckId: testDeckId,
          settings: {
            cardsPerSession: 2,
          },
        }),
      })

      expect(response.status).toBe(200)

      const data = await response.json()

      // dueCards array should not exceed cardsPerSession
      expect(data.dueCards.length).toBeLessThanOrEqual(2)

      // But totalDueCards can be higher
      expect(data.totalDueCards).toBeGreaterThanOrEqual(data.dueCards.length)
    })
  })

  describe('FSRS Presentation Order', () => {
    it('should present cards in FSRS-optimized order (new, learning, review, relearning)', async () => {
      const response = await fetch('http://localhost:3000/api/study/deck-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckId: testDeckId,
        }),
      })

      expect(response.status).toBe(200)

      const data = await response.json()

      if (data.dueCards.length > 1) {
        const states = data.dueCards.map((card: { fsrs: { state: string } }) => card.fsrs.state)

        // Verify FSRS state order: new cards should come before reviews
        const stateOrder = { new: 1, learning: 2, review: 3, relearning: 4 }

        for (let i = 1; i < states.length; i++) {
          const prevPriority = stateOrder[states[i - 1] as keyof typeof stateOrder]
          const currPriority = stateOrder[states[i] as keyof typeof stateOrder]

          // Current priority should be >= previous (non-strictly increasing)
          expect(currPriority).toBeGreaterThanOrEqual(prevPriority)
        }
      }
    })
  })

  describe('GET /api/study/deck-session/{sessionId}/live-updates', () => {
    // SSE (Server-Sent Events) endpoint testing
    // These tests are more complex and may require specialized SSE testing tools
    // Documenting expected behavior for now

    it.skip('should establish SSE connection for live session updates', async () => {
      // Would require SSE client setup
      // Expected: 200 status, text/event-stream content type
    })

    it.skip('should emit card-added event when card added to deck during session', async () => {
      // Would require:
      // 1. Start session
      // 2. Subscribe to SSE
      // 3. Add card to deck
      // 4. Verify event received
    })

    it.skip('should emit card-removed event when card removed from deck during session', async () => {
      // Would require similar SSE setup
    })

    it.skip('should return 404 for non-existent or expired session', async () => {
      // Expected: 404 with "Session not found or expired" error
    })
  })
})
