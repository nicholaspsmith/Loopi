import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateFlashcardsFromContent } from '@/lib/claude/flashcard-generator'

/**
 * Unit Tests for Flashcard Generator
 *
 * Tests the flashcard generation logic that extracts Q&A pairs from content
 */

describe('Flashcard Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore global.fetch after each test to avoid interfering with dev server
    vi.restoreAllMocks()
  })

  it('should generate flashcards from educational content', async () => {
    const content = `Quantum entanglement is a physical phenomenon that occurs when pairs of particles remain connected.

Key concepts:
1. Non-locality: Particles remain connected regardless of distance
2. Superposition: Multiple states exist simultaneously
3. Correlation: Measuring one affects the other`

    // Mock Ollama API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: JSON.stringify([
            {
              question: 'What is quantum entanglement?',
              answer:
                'Quantum entanglement is a physical phenomenon that occurs when pairs of particles remain connected.',
            },
            {
              question: 'What is non-locality in quantum physics?',
              answer: 'Non-locality means particles remain connected regardless of distance.',
            },
          ]),
        },
      }),
    })

    const flashcards = await generateFlashcardsFromContent(content)

    expect(Array.isArray(flashcards)).toBe(true)
    expect(flashcards.length).toBeGreaterThan(0)

    // Check flashcard structure
    flashcards.forEach((fc) => {
      expect(fc).toHaveProperty('question')
      expect(fc).toHaveProperty('answer')
      expect(typeof fc.question).toBe('string')
      expect(typeof fc.answer).toBe('string')
      expect(fc.question.length).toBeGreaterThan(0)
      expect(fc.answer.length).toBeGreaterThan(0)
    })
  }, 30000)

  it('should respect maxFlashcards limit', async () => {
    const content = 'Educational content. '.repeat(100)

    const flashcards = await generateFlashcardsFromContent(content, {
      maxFlashcards: 3,
    })

    expect(flashcards.length).toBeLessThanOrEqual(3)
  })

  it('should return empty array for insufficient content', async () => {
    const content = 'Hello! How are you?'

    const flashcards = await generateFlashcardsFromContent(content)

    expect(Array.isArray(flashcards)).toBe(true)
    expect(flashcards.length).toBe(0)
  })

  it('should handle empty string', async () => {
    const flashcards = await generateFlashcardsFromContent('')

    expect(flashcards).toEqual([])
  })

  it('should extract multiple flashcards from rich content', async () => {
    const content = `Machine Learning is a subset of artificial intelligence that enables systems to learn from data.

Types of Machine Learning:
1. Supervised Learning: Uses labeled data for training
2. Unsupervised Learning: Finds patterns in unlabeled data
3. Reinforcement Learning: Learns through trial and error

Common algorithms include decision trees, neural networks, and support vector machines.`

    const flashcards = await generateFlashcardsFromContent(content)

    // llama3.2 may generate 1 or more flashcards depending on the run
    expect(flashcards.length).toBeGreaterThan(0)
    expect(flashcards.length).toBeLessThanOrEqual(10)
  }, 30000)

  it('should generate questions that are interrogative', async () => {
    const content = `Photosynthesis is the process by which plants convert light energy into chemical energy.
It occurs in chloroplasts and requires sunlight, carbon dioxide, and water.`

    const flashcards = await generateFlashcardsFromContent(content)

    flashcards.forEach((fc) => {
      // Questions should end with ? or be interrogative
      const isInterrogative =
        fc.question.includes('?') ||
        fc.question.toLowerCase().startsWith('what') ||
        fc.question.toLowerCase().startsWith('how') ||
        fc.question.toLowerCase().startsWith('why') ||
        fc.question.toLowerCase().startsWith('when') ||
        fc.question.toLowerCase().startsWith('where') ||
        fc.question.toLowerCase().startsWith('define')

      expect(isInterrogative).toBe(true)
    })
  }, 30000)

  it('should generate answers that are declarative', async () => {
    const content = `DNA stands for Deoxyribonucleic Acid. It contains genetic instructions for living organisms.`

    const flashcards = await generateFlashcardsFromContent(content)

    flashcards.forEach((fc) => {
      // Answers should be statements, not questions
      expect(fc.answer).not.toMatch(/\?$/)
      expect(fc.answer.length).toBeGreaterThan(10) // Substantive answers
    })
  })

  it('should handle technical content with jargon', async () => {
    const content = `RESTful APIs use HTTP methods (GET, POST, PUT, DELETE) to perform CRUD operations.
They are stateless and can return data in JSON or XML format.`

    // Mock Ollama API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: JSON.stringify([
            {
              question: 'What are RESTful APIs?',
              answer:
                'RESTful APIs use HTTP methods (GET, POST, PUT, DELETE) to perform CRUD operations.',
            },
            {
              question: 'What data formats can RESTful APIs return?',
              answer: 'RESTful APIs can return data in JSON or XML format.',
            },
          ]),
        },
      }),
    })

    const flashcards = await generateFlashcardsFromContent(content)

    expect(flashcards.length).toBeGreaterThan(0)

    // Should preserve technical content (may rephrase but keep core concepts)
    const allText = flashcards
      .map((fc) => fc.question + ' ' + fc.answer)
      .join(' ')
      .toLowerCase()
    // Check for REST or API related terms
    const hasTechnicalContent =
      allText.includes('rest') || allText.includes('api') || allText.includes('http')
    expect(hasTechnicalContent).toBe(true)
  }, 30000)

  it('should validate question and answer lengths', async () => {
    const content = 'The speed of light is approximately 299,792 kilometers per second.'

    const flashcards = await generateFlashcardsFromContent(content)

    flashcards.forEach((fc) => {
      expect(fc.question.length).toBeLessThanOrEqual(1000)
      expect(fc.answer.length).toBeLessThanOrEqual(5000)
      expect(fc.question.length).toBeGreaterThan(5)
      expect(fc.answer.length).toBeGreaterThan(5)
    })
  }, 30000)

  it('should not generate duplicate flashcards', async () => {
    const content = `Water boils at 100 degrees Celsius. Water freezes at 0 degrees Celsius.
Water is essential for life.`

    const flashcards = await generateFlashcardsFromContent(content)

    // Check for exact duplicates
    const questions = flashcards.map((fc) => fc.question)
    const uniqueQuestions = new Set(questions)
    expect(uniqueQuestions.size).toBe(questions.length)
  })

  it('should handle content with lists and bullet points', async () => {
    const content = `Three states of matter:
• Solid: Fixed shape and volume
• Liquid: Fixed volume, variable shape
• Gas: Variable shape and volume`

    const flashcards = await generateFlashcardsFromContent(content)

    expect(flashcards.length).toBeGreaterThan(0)
  }, 30000)

  it('should handle content with code examples', async () => {
    const content = `A JavaScript function is defined using the function keyword:
function add(a, b) {
  return a + b;
}
Functions can be assigned to variables and passed as arguments.`

    const flashcards = await generateFlashcardsFromContent(content)

    expect(flashcards.length).toBeGreaterThan(0)
  }, 30000)
})
