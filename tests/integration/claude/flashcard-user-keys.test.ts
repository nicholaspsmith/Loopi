import { describe, it, expect, vi, beforeAll } from 'vitest'
import { generateFlashcardsFromContent } from '@/lib/claude/flashcard-generator'
import type { FlashcardPair } from '@/lib/claude/flashcard-generator'

/**
 * Integration Tests for Flashcard Generation with User API Keys
 *
 * Tests verify that flashcard generation routes requests through Anthropic SDK
 * when user API key is provided and falls back to Ollama when not.
 *
 * These tests require either:
 * - ANTHROPIC_API_KEY env var for Claude API tests
 * - Running Ollama instance for fallback tests
 *
 * Tests are skipped when required services are unavailable.
 */

// Check for real API key - tests requiring Claude will be skipped without it
// Key must exist AND look like a real Anthropic key (not a placeholder)
const CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY
const hasClaudeKey = !!CLAUDE_API_KEY && CLAUDE_API_KEY.startsWith('sk-ant-')

// Check if Ollama is available with a working model
async function isOllamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(2000),
    })
    if (!response.ok) return false

    // Check that at least one model is available
    const data = await response.json()
    const hasModels = data.models && data.models.length > 0
    if (!hasModels) {
      console.log('Ollama running but no models available')
      return false
    }
    return true
  } catch {
    return false
  }
}

// Run sequentially to avoid Ollama resource contention
describe.sequential('Flashcard Generation with User API Keys', () => {
  const educationalContent = `
    Machine Learning is a subset of artificial intelligence that enables systems
    to learn and improve from experience without being explicitly programmed.

    There are three main types of machine learning:
    1. Supervised Learning - learns from labeled data
    2. Unsupervised Learning - finds patterns in unlabeled data
    3. Reinforcement Learning - learns through trial and error

    Neural networks are a key technology in machine learning, inspired by
    the human brain's structure. They consist of layers of interconnected
    nodes that process information.
  `

  let ollamaAvailable = false

  beforeAll(async () => {
    ollamaAvailable = await isOllamaAvailable()
  })

  describe('generateFlashcardsFromContent with user API key', () => {
    it.skipIf(!hasClaudeKey)(
      'should generate flashcards using Claude API when userApiKey is provided',
      async () => {
        const flashcards = await generateFlashcardsFromContent(educationalContent, {
          userApiKey: CLAUDE_API_KEY!,
          maxFlashcards: 10,
        })

        expect(flashcards).toBeDefined()
        expect(Array.isArray(flashcards)).toBe(true)
        expect(flashcards.length).toBeGreaterThan(0)

        // Verify flashcard structure
        flashcards.forEach((card: FlashcardPair) => {
          expect(card).toHaveProperty('question')
          expect(card).toHaveProperty('answer')
          expect(typeof card.question).toBe('string')
          expect(typeof card.answer).toBe('string')
          expect(card.question.length).toBeGreaterThan(5)
          expect(card.answer.length).toBeGreaterThan(5)
        })
      },
      60000
    )

    it('should fall back to Ollama when userApiKey is not provided', async function () {
      if (!ollamaAvailable) {
        console.log('Skipping: Ollama not available')
        return
      }

      const flashcards = await generateFlashcardsFromContent(educationalContent, {
        maxFlashcards: 10,
      })

      expect(flashcards).toBeDefined()
      expect(Array.isArray(flashcards)).toBe(true)

      // Should still generate flashcards with Ollama
      if (flashcards.length > 0) {
        flashcards.forEach((card: FlashcardPair) => {
          expect(card).toHaveProperty('question')
          expect(card).toHaveProperty('answer')
        })
      }
    }, 15000)

    it.skipIf(!hasClaudeKey)(
      'should handle authentication errors with invalid API key',
      async () => {
        const invalidKey = 'sk-ant-api03-invalid-key-for-testing-purposes-1234567890'

        const flashcards = await generateFlashcardsFromContent(educationalContent, {
          userApiKey: invalidKey,
          maxFlashcards: 10,
        })

        // Should return empty array on error
        expect(flashcards).toEqual([])
      },
      30000
    )

    it.skipIf(!hasClaudeKey)(
      'should respect maxFlashcards limit with Claude API',
      async () => {
        const maxCards = 3

        const flashcards = await generateFlashcardsFromContent(educationalContent, {
          userApiKey: CLAUDE_API_KEY!,
          maxFlashcards: maxCards,
        })

        expect(flashcards.length).toBeLessThanOrEqual(maxCards)
      },
      15000
    )

    it.skipIf(!hasClaudeKey)(
      'should generate quality flashcards about machine learning content',
      async () => {
        const flashcards = await generateFlashcardsFromContent(educationalContent, {
          userApiKey: CLAUDE_API_KEY!,
          maxFlashcards: 10,
        })

        expect(flashcards.length).toBeGreaterThan(0)

        // Verify questions are interrogative
        flashcards.forEach((card: FlashcardPair) => {
          const hasQuestionWord = /^(what|how|why|when|where|which|who)/i.test(card.question)
          const hasQuestionMark = card.question.includes('?')
          expect(hasQuestionWord || hasQuestionMark).toBe(true)
        })

        // At least one flashcard should be about machine learning
        const hasMachineLearningContent = flashcards.some(
          (card: FlashcardPair) =>
            card.question.toLowerCase().includes('machine learning') ||
            card.answer.toLowerCase().includes('machine learning')
        )
        expect(hasMachineLearningContent).toBe(true)
      },
      60000
    )

    it.skipIf(!hasClaudeKey)(
      'should skip generating flashcards for non-educational content',
      async () => {
        const conversationalContent = 'Hello! How are you doing today?'

        const flashcards = await generateFlashcardsFromContent(conversationalContent, {
          userApiKey: CLAUDE_API_KEY!,
          maxFlashcards: 10,
        })

        expect(flashcards).toEqual([])
      },
      30000
    )

    it.skipIf(!hasClaudeKey)(
      'should skip generating flashcards for content that is too short',
      async () => {
        const shortContent = 'Test'

        const flashcards = await generateFlashcardsFromContent(shortContent, {
          userApiKey: CLAUDE_API_KEY!,
          maxFlashcards: 10,
        })

        expect(flashcards).toEqual([])
      },
      30000
    )

    it.skipIf(!hasClaudeKey)(
      'should remove duplicate flashcards',
      async () => {
        const flashcards = await generateFlashcardsFromContent(educationalContent, {
          userApiKey: CLAUDE_API_KEY!,
          maxFlashcards: 10,
        })

        // Check for unique questions
        const questions = flashcards.map((card: FlashcardPair) => card.question.toLowerCase())
        const uniqueQuestions = new Set(questions)

        expect(uniqueQuestions.size).toBe(questions.length)
      },
      15000
    )

    it.skipIf(!hasClaudeKey)(
      'should handle complex educational content with multiple concepts',
      async () => {
        const complexContent = `
        Quantum computing leverages quantum mechanics principles like superposition
        and entanglement to process information. Unlike classical bits that are
        either 0 or 1, quantum bits (qubits) can exist in multiple states simultaneously.

        Key quantum computing concepts:
        - Superposition: A qubit can be in multiple states at once
        - Entanglement: Qubits can be correlated in ways impossible classically
        - Quantum gates: Operations that manipulate qubits
        - Decoherence: The loss of quantum properties due to environmental interference

        Quantum computers excel at optimization problems, cryptography, and
        simulating molecular structures for drug discovery.
      `

        const flashcards = await generateFlashcardsFromContent(complexContent, {
          userApiKey: CLAUDE_API_KEY!,
          maxFlashcards: 15,
        })

        expect(flashcards.length).toBeGreaterThan(2)

        // Should cover multiple concepts
        const topics = ['quantum', 'qubit', 'superposition', 'entanglement']
        const coveredTopics = topics.filter((topic) =>
          flashcards.some(
            (card: FlashcardPair) =>
              card.question.toLowerCase().includes(topic) ||
              card.answer.toLowerCase().includes(topic)
          )
        )

        expect(coveredTopics.length).toBeGreaterThan(1)
      },
      60000
    )
  })

  describe('Provider selection for flashcard generation', () => {
    it.skipIf(!hasClaudeKey)(
      'should not call Ollama endpoint when Claude API key is provided',
      async () => {
        const fetchSpy = vi.spyOn(global, 'fetch')

        await generateFlashcardsFromContent(educationalContent, {
          userApiKey: CLAUDE_API_KEY!,
          maxFlashcards: 5,
        })

        // Should NOT call Ollama endpoint
        const ollamaCalls = fetchSpy.mock.calls.filter((call: [RequestInfo | URL, RequestInit?]) =>
          call[0]?.toString().includes('localhost:11434')
        )
        expect(ollamaCalls).toHaveLength(0)

        fetchSpy.mockRestore()
      },
      60000
    )

    it('should call Ollama endpoint when no API key is provided', async function () {
      if (!ollamaAvailable) {
        console.log('Skipping: Ollama not available')
        return
      }

      const fetchSpy = vi.spyOn(global, 'fetch')

      await generateFlashcardsFromContent(educationalContent, {
        maxFlashcards: 5,
      })

      // Should call Ollama endpoint
      const ollamaCalls = fetchSpy.mock.calls.filter((call: [RequestInfo | URL, RequestInit?]) =>
        call[0]?.toString().includes('localhost:11434')
      )
      expect(ollamaCalls.length).toBeGreaterThan(0)

      fetchSpy.mockRestore()
    }, 15000)
  })
})
