// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Unit Tests for Flashcard Generator
 *
 * Tests the flashcard generation using mocked Claude API.
 * NO REAL API CALLS - all responses are mocked.
 */

// Mock the Claude client to prevent real API calls
vi.mock('@/lib/claude/client', () => ({
  getChatCompletion: vi.fn(),
}))

import { generateFlashcardsFromContent } from '@/lib/claude/flashcard-generator'
import { getChatCompletion } from '@/lib/claude/client'
import type { Mock } from 'vitest'

// Cast to access mock methods
const mockGetChatCompletion = getChatCompletion as Mock

describe('Flashcard Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateFlashcardsFromContent', () => {
    it('should generate flashcards from educational content', async () => {
      // Mock successful Claude response with JSON flashcards
      mockGetChatCompletion.mockResolvedValue(
        JSON.stringify([
          {
            question: 'What is quantum entanglement?',
            answer:
              'A physical phenomenon where pairs of particles remain connected regardless of distance.',
          },
          {
            question: 'What is superposition in quantum physics?',
            answer: 'A state where multiple quantum states exist simultaneously until measured.',
          },
          {
            question: 'What is non-locality in quantum entanglement?',
            answer:
              'The property where entangled particles remain connected regardless of distance.',
          },
        ])
      )

      const content = `Quantum entanglement is a physical phenomenon that occurs when pairs of particles remain connected.

Key concepts:
1. Non-locality: Particles remain connected regardless of distance
2. Superposition: Multiple states exist simultaneously
3. Correlation: Measuring one affects the other`

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
    })

    it('should respect maxFlashcards limit', async () => {
      // Mock response with more cards than limit
      mockGetChatCompletion.mockResolvedValue(
        JSON.stringify([
          { question: 'What is supervised learning?', answer: 'ML that uses labeled data.' },
          { question: 'What is unsupervised learning?', answer: 'ML that finds patterns in data.' },
          {
            question: 'What are neural networks?',
            answer: 'Computational models inspired by the brain.',
          },
          { question: 'What is deep learning?', answer: 'Neural networks with multiple layers.' },
          { question: 'What is gradient descent?', answer: 'An optimization algorithm.' },
        ])
      )

      const content = `Machine Learning is a subset of artificial intelligence.

Key concepts:
1. Supervised Learning: Uses labeled data
2. Unsupervised Learning: Finds patterns
3. Neural Networks: Inspired by brain
4. Deep Learning: Multiple layers
5. Gradient Descent: Optimization method`

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
      // Should not call API for non-educational content
      expect(mockGetChatCompletion).not.toHaveBeenCalled()
    })

    it('should handle empty string', async () => {
      const flashcards = await generateFlashcardsFromContent('')

      expect(flashcards).toEqual([])
      // Should not call API for empty content
      expect(mockGetChatCompletion).not.toHaveBeenCalled()
    })

    it('should extract multiple flashcards from rich content', async () => {
      mockGetChatCompletion.mockResolvedValue(
        JSON.stringify([
          {
            question: 'What is Machine Learning?',
            answer: 'A subset of AI that enables systems to learn from data.',
          },
          {
            question: 'What is supervised learning?',
            answer: 'A type of ML that uses labeled data for training.',
          },
          {
            question: 'What is unsupervised learning?',
            answer: 'A type of ML that finds patterns in unlabeled data.',
          },
          {
            question: 'What is reinforcement learning?',
            answer: 'A type of ML that learns through trial and error.',
          },
          {
            question: 'What are common ML algorithms?',
            answer: 'Decision trees, neural networks, and support vector machines.',
          },
        ])
      )

      const content = `Machine Learning is a subset of artificial intelligence that enables systems to learn from data.

Types of Machine Learning:
1. Supervised Learning: Uses labeled data for training
2. Unsupervised Learning: Finds patterns in unlabeled data
3. Reinforcement Learning: Learns through trial and error

Common algorithms include decision trees, neural networks, and support vector machines.`

      const flashcards = await generateFlashcardsFromContent(content)

      expect(flashcards.length).toBeGreaterThan(0)
      expect(flashcards.length).toBeLessThanOrEqual(20)
    })

    it('should generate questions that are interrogative', async () => {
      mockGetChatCompletion.mockResolvedValue(
        JSON.stringify([
          {
            question: 'What is photosynthesis?',
            answer: 'The process by which plants convert light energy into chemical energy.',
          },
          {
            question: 'Where does photosynthesis occur?',
            answer: 'In chloroplasts within plant cells.',
          },
          {
            question: 'What does photosynthesis require?',
            answer: 'Sunlight, carbon dioxide, and water.',
          },
        ])
      )

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
    })

    it('should generate answers that are declarative', async () => {
      mockGetChatCompletion.mockResolvedValue(
        JSON.stringify([
          {
            question: 'What does DNA stand for?',
            answer: 'DNA stands for Deoxyribonucleic Acid.',
          },
          {
            question: 'What does DNA contain?',
            answer: 'DNA contains genetic instructions for living organisms.',
          },
        ])
      )

      const content = `DNA stands for Deoxyribonucleic Acid. It contains genetic instructions for living organisms.`

      const flashcards = await generateFlashcardsFromContent(content)

      flashcards.forEach((fc) => {
        // Answers should be statements, not questions
        expect(fc.answer).not.toMatch(/\?$/)
        expect(fc.answer.length).toBeGreaterThan(10) // Substantive answers
      })
    })

    it('should handle technical content with jargon', async () => {
      mockGetChatCompletion.mockResolvedValue(
        JSON.stringify([
          {
            question: 'What HTTP methods do RESTful APIs use?',
            answer: 'GET, POST, PUT, and DELETE for CRUD operations.',
          },
          {
            question: 'What is a key characteristic of REST APIs?',
            answer: 'They are stateless and can return data in JSON or XML format.',
          },
        ])
      )

      const content = `RESTful APIs use HTTP methods (GET, POST, PUT, DELETE) to perform CRUD operations.
They are stateless and can return data in JSON or XML format.`

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
    })

    it('should validate question and answer lengths', async () => {
      mockGetChatCompletion.mockResolvedValue(
        JSON.stringify([
          {
            question: 'What is the speed of light?',
            answer: 'Approximately 299,792 kilometers per second in a vacuum.',
          },
        ])
      )

      const content =
        'The speed of light is approximately 299,792 kilometers per second in a vacuum.'

      const flashcards = await generateFlashcardsFromContent(content)

      flashcards.forEach((fc) => {
        expect(fc.question.length).toBeLessThanOrEqual(1000)
        expect(fc.answer.length).toBeLessThanOrEqual(5000)
        expect(fc.question.length).toBeGreaterThan(5)
        expect(fc.answer.length).toBeGreaterThan(5)
      })
    })

    it('should not generate duplicate flashcards', async () => {
      mockGetChatCompletion.mockResolvedValue(
        JSON.stringify([
          {
            question: 'At what temperature does water boil?',
            answer: 'Water boils at 100 degrees Celsius at standard atmospheric pressure.',
          },
          {
            question: 'At what temperature does water freeze?',
            answer: 'Water freezes at 0 degrees Celsius.',
          },
          {
            question: 'Why is water essential?',
            answer: 'Water is essential for all known forms of life.',
          },
        ])
      )

      const content = `Water boils at 100 degrees Celsius at standard atmospheric pressure.
Water freezes at 0 degrees Celsius. Water is essential for all known forms of life.`

      const flashcards = await generateFlashcardsFromContent(content)

      // Check for exact duplicates
      const questions = flashcards.map((fc) => fc.question)
      const uniqueQuestions = new Set(questions)
      expect(uniqueQuestions.size).toBe(questions.length)
    })

    it('should handle content with lists and bullet points', async () => {
      mockGetChatCompletion.mockResolvedValue(
        JSON.stringify([
          {
            question: 'What are the three states of matter?',
            answer: 'Solid, liquid, and gas.',
          },
          {
            question: 'What characterizes a solid?',
            answer: 'Fixed shape and fixed volume.',
          },
          {
            question: 'What characterizes a liquid?',
            answer: 'Fixed volume but variable shape.',
          },
        ])
      )

      const content = `Three states of matter:
- Solid: Fixed shape and volume
- Liquid: Fixed volume, variable shape
- Gas: Variable shape and volume`

      const flashcards = await generateFlashcardsFromContent(content)

      expect(flashcards.length).toBeGreaterThan(0)
    })

    it('should handle content with code examples', async () => {
      mockGetChatCompletion.mockResolvedValue(
        JSON.stringify([
          {
            question: 'How is a JavaScript function defined?',
            answer: 'Using the function keyword followed by a name and parameters.',
          },
          {
            question: 'What can functions in JavaScript be assigned to?',
            answer: 'Variables, and they can also be passed as arguments to other functions.',
          },
        ])
      )

      const content = `A JavaScript function is defined using the function keyword:
function add(a, b) {
  return a + b;
}
Functions can be assigned to variables and passed as arguments.`

      const flashcards = await generateFlashcardsFromContent(content)

      expect(flashcards.length).toBeGreaterThan(0)
    })

    it('should handle Claude API errors gracefully', async () => {
      mockGetChatCompletion.mockRejectedValue(new Error('API request failed'))

      const content = `The mitochondria is the powerhouse of the cell. It generates ATP through cellular respiration.`

      const flashcards = await generateFlashcardsFromContent(content)

      // Should return empty array on error, not throw
      expect(flashcards).toEqual([])
    })

    it('should handle invalid JSON response from Claude', async () => {
      mockGetChatCompletion.mockResolvedValue('This is not valid JSON at all')

      const content = `The mitochondria is the powerhouse of the cell. It generates ATP through cellular respiration.`

      const flashcards = await generateFlashcardsFromContent(content)

      // Should handle gracefully
      expect(Array.isArray(flashcards)).toBe(true)
    })

    it('should handle response with malformed flashcard objects', async () => {
      mockGetChatCompletion.mockResolvedValue(
        JSON.stringify([
          { question: 'Valid question?', answer: 'Valid answer' },
          { question: '', answer: 'Missing question' }, // Invalid: empty question
          { question: 'Missing answer' }, // Invalid: no answer
          { notQuestion: 'wrong field', notAnswer: 'wrong field' }, // Invalid: wrong fields
        ])
      )

      const content = `The mitochondria is the powerhouse of the cell. It generates ATP through cellular respiration.`

      const flashcards = await generateFlashcardsFromContent(content)

      // Should filter out invalid flashcards
      flashcards.forEach((fc) => {
        expect(fc.question.length).toBeGreaterThan(5)
        expect(fc.answer.length).toBeGreaterThan(5)
      })
    })
  })
})
