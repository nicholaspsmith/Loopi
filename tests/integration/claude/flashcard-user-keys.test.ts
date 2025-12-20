import { describe, it, expect } from 'vitest'
import { generateFlashcardsFromContent } from '@/lib/claude/flashcard-generator'
import type { FlashcardPair } from '@/lib/claude/flashcard-generator'

/**
 * Integration Tests for Flashcard Generation with User API Keys
 *
 * Tests verify that flashcard generation routes requests through Anthropic SDK
 * when user API key is provided and falls back to Ollama when not.
 * Following TDD - these should FAIL until implementation is complete.
 */

describe('Flashcard Generation with User API Keys', () => {
  const mockApiKey = 'sk-ant-api03-test-key-long-enough-for-validation-1234567890abcdef'
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

  describe('generateFlashcardsFromContent with user API key', () => {
    it('should generate flashcards using Claude API when userApiKey is provided', async () => {
      const flashcards = await generateFlashcardsFromContent(educationalContent, {
        userApiKey: mockApiKey,
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
    })

    it('should fall back to Ollama when userApiKey is not provided', async () => {
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
    })

    it('should handle authentication errors with invalid API key', async () => {
      const invalidKey = 'sk-ant-api03-invalid-key'

      const flashcards = await generateFlashcardsFromContent(educationalContent, {
        userApiKey: invalidKey,
        maxFlashcards: 10,
      })

      // Should return empty array on error
      expect(flashcards).toEqual([])
    })

    it('should respect maxFlashcards limit with Claude API', async () => {
      const maxCards = 3

      const flashcards = await generateFlashcardsFromContent(educationalContent, {
        userApiKey: mockApiKey,
        maxFlashcards: maxCards,
      })

      expect(flashcards.length).toBeLessThanOrEqual(maxCards)
    })

    it('should generate quality flashcards about machine learning content', async () => {
      const flashcards = await generateFlashcardsFromContent(educationalContent, {
        userApiKey: mockApiKey,
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
    })

    it('should skip generating flashcards for non-educational content', async () => {
      const conversationalContent = 'Hello! How are you doing today?'

      const flashcards = await generateFlashcardsFromContent(conversationalContent, {
        userApiKey: mockApiKey,
        maxFlashcards: 10,
      })

      expect(flashcards).toEqual([])
    })

    it('should skip generating flashcards for content that is too short', async () => {
      const shortContent = 'Test'

      const flashcards = await generateFlashcardsFromContent(shortContent, {
        userApiKey: mockApiKey,
        maxFlashcards: 10,
      })

      expect(flashcards).toEqual([])
    })

    it('should remove duplicate flashcards', async () => {
      const flashcards = await generateFlashcardsFromContent(educationalContent, {
        userApiKey: mockApiKey,
        maxFlashcards: 10,
      })

      // Check for unique questions
      const questions = flashcards.map((card: FlashcardPair) => card.question.toLowerCase())
      const uniqueQuestions = new Set(questions)

      expect(uniqueQuestions.size).toBe(questions.length)
    })

    it('should handle complex educational content with multiple concepts', async () => {
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
        userApiKey: mockApiKey,
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
    })
  })

  describe('Provider selection for flashcard generation', () => {
    it('should not call Ollama endpoint when Claude API key is provided', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch')

      await generateFlashcardsFromContent(educationalContent, {
        userApiKey: mockApiKey,
        maxFlashcards: 5,
      })

      // Should NOT call Ollama endpoint
      const ollamaCalls = fetchSpy.mock.calls.filter((call) =>
        call[0]?.toString().includes('localhost:11434')
      )
      expect(ollamaCalls).toHaveLength(0)

      fetchSpy.mockRestore()
    })

    it('should call Ollama endpoint when no API key is provided', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch')

      await generateFlashcardsFromContent(educationalContent, {
        maxFlashcards: 5,
      })

      // Should call Ollama endpoint
      const ollamaCalls = fetchSpy.mock.calls.filter((call) =>
        call[0]?.toString().includes('localhost:11434')
      )
      expect(ollamaCalls.length).toBeGreaterThan(0)

      fetchSpy.mockRestore()
    })
  })
})
