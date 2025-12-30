// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Unit Tests for Distractor Generator
 *
 * Tests the distractor generation service that creates plausible but incorrect
 * options for multiple choice questions using the Claude API.
 *
 * Per spec 017-multi-choice-distractors:
 * - Must return exactly 3 distractors
 * - Must complete within 15 seconds (timeout)
 * - Must handle Claude API errors gracefully
 * - Must validate distractors don't match correct answer
 */

// Mock the Claude client
vi.mock('@/lib/claude/client', () => ({
  getChatCompletion: vi.fn(),
}))

// Mock the database operations
vi.mock('@/lib/db/operations/distractors', () => ({
  createDistractors: vi.fn(),
}))

import {
  generateDistractors,
  validateDistractors,
  buildDistractorPrompt,
  generateAndPersistDistractors,
} from '@/lib/ai/distractor-generator'
import { getChatCompletion } from '@/lib/claude/client'
import { createDistractors } from '@/lib/db/operations/distractors'
import type { Mock } from 'vitest'

// Cast to access mock methods
const mockGetChatCompletion = getChatCompletion as Mock
const mockCreateDistractors = createDistractors as Mock

describe('Distractor Generator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateDistractors', () => {
    describe('T001: Unit test for distractor generator', () => {
      it('should return exactly 3 distractors on success', async () => {
        // Mock successful Claude response
        mockGetChatCompletion.mockResolvedValue(
          JSON.stringify({
            distractors: ['London', 'Berlin', 'Madrid'],
          })
        )

        const result = await generateDistractors('What is the capital of France?', 'Paris')

        expect(result.success).toBe(true)
        expect(result.distractors).toHaveLength(3)
        expect(result.distractors).toEqual(['London', 'Berlin', 'Madrid'])
      })

      it('should include generationTimeMs in response', async () => {
        mockGetChatCompletion.mockResolvedValue(
          JSON.stringify({
            distractors: ['London', 'Berlin', 'Madrid'],
          })
        )

        const result = await generateDistractors('What is the capital of France?', 'Paris')

        expect(result.generationTimeMs).toBeDefined()
        expect(typeof result.generationTimeMs).toBe('number')
        // Can be 0 if mock resolves instantly - just check it's a non-negative number
        expect(result.generationTimeMs).toBeGreaterThanOrEqual(0)
      })

      it('should handle Claude API errors gracefully', async () => {
        // Mock API error
        mockGetChatCompletion.mockRejectedValue(new Error('Claude API timeout'))

        const result = await generateDistractors('What is the capital of France?', 'Paris')

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
        expect(result.error).toContain('Claude API timeout')
        expect(result.distractors).toBeUndefined()
      })

      it('should timeout after 15 seconds', async () => {
        // Mock slow response (>15 seconds)
        mockGetChatCompletion.mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => resolve(JSON.stringify({ distractors: ['a', 'b', 'c'] })), 16000)
            })
        )

        const startTime = Date.now()
        const result = await generateDistractors('What is the capital of France?', 'Paris')
        const duration = Date.now() - startTime

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
        expect(duration).toBeLessThan(16000) // Should timeout before 16s
        expect(duration).toBeGreaterThanOrEqual(14990) // Should wait ~15s (allow 10ms margin for timer precision)
      }, 20000) // Test timeout of 20s

      it('should handle invalid JSON response from Claude', async () => {
        mockGetChatCompletion.mockResolvedValue('invalid json response')

        const result = await generateDistractors('What is the capital of France?', 'Paris')

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })

      it('should handle response with wrong number of distractors', async () => {
        mockGetChatCompletion.mockResolvedValue(
          JSON.stringify({
            distractors: ['London', 'Berlin'], // Only 2 instead of 3
          })
        )

        const result = await generateDistractors('What is the capital of France?', 'Paris')

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })

      it('should handle empty question', async () => {
        const result = await generateDistractors('', 'Paris')

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })

      it('should handle empty answer', async () => {
        const result = await generateDistractors('What is the capital of France?', '')

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('buildDistractorPrompt', () => {
    describe('T006: Prompt building with FR-012 short answer handling', () => {
      it('should include question and answer in prompt', () => {
        const question = 'What is Kubernetes?'
        const answer = 'A container orchestration platform'
        const prompt = buildDistractorPrompt(question, answer)

        expect(prompt).toContain(question)
        expect(prompt).toContain(answer)
        expect(prompt).toContain('exactly 3 plausible')
        expect(prompt).toContain('JSON')
      })

      it('should detect and handle numeric answers', () => {
        const question = 'What is the default Kubernetes API server port?'
        const answer = '6443'
        const prompt = buildDistractorPrompt(question, answer)

        expect(prompt).toContain('IMPORTANT: The correct answer is a number')
        expect(prompt).toContain('nearby values')
        expect(prompt).toContain('plausible but incorrect numbers')
      })

      it('should handle decimal numeric answers', () => {
        const question = 'What is the value of pi to 2 decimal places?'
        const answer = '3.14'
        const prompt = buildDistractorPrompt(question, answer)

        expect(prompt).toContain('IMPORTANT: The correct answer is a number')
        expect(prompt).toContain('integers vs decimals')
      })

      it('should detect and handle yes/no answers', () => {
        const question = 'Is Kubernetes open source?'
        const answer = 'Yes'
        const prompt = buildDistractorPrompt(question, answer)

        expect(prompt).toContain('IMPORTANT: The correct answer is "Yes"')
        expect(prompt).toContain('full-sentence alternatives')
        expect(prompt).toContain('Yes, because X')
      })

      it('should handle no/No answers case-insensitively', () => {
        const question = 'Is Docker a database?'
        const answer = 'no'
        const prompt = buildDistractorPrompt(question, answer)

        expect(prompt).toContain('IMPORTANT: The correct answer is "no"')
      })

      it('should detect generic short answers (≤10 chars)', () => {
        const question = 'What HTTP verb is used to create resources?'
        const answer = 'POST'
        const prompt = buildDistractorPrompt(question, answer)

        expect(prompt).toContain('IMPORTANT: The correct answer is very short')
        expect(prompt).toContain('similar brevity')
        expect(prompt).toContain('same domain')
      })

      it('should not trigger short answer handling for longer answers', () => {
        const question = 'What is Kubernetes?'
        const answer = 'A container orchestration platform'
        const prompt = buildDistractorPrompt(question, answer)

        expect(prompt).not.toContain('IMPORTANT: The correct answer is very short')
        expect(prompt).not.toContain('IMPORTANT: The correct answer is a number')
      })

      it('should sanitize overly long questions (security)', () => {
        const longQuestion = 'Q'.repeat(1000)
        const answer = 'A'
        const prompt = buildDistractorPrompt(longQuestion, answer)

        // Should truncate question to 500 chars max
        // Extract the question from prompt using regex to find "Question: ..."
        const questionMatch = prompt.match(/Question: ([^\n]+)/)
        expect(questionMatch).toBeDefined()
        const extractedQuestion = questionMatch![1]
        expect(extractedQuestion.length).toBeLessThanOrEqual(500)
      })

      it('should sanitize overly long answers (security)', () => {
        const question = 'What is X?'
        const longAnswer = 'A'.repeat(500)
        const prompt = buildDistractorPrompt(question, longAnswer)

        // Should truncate answer to 200 chars max
        // Extract the answer from prompt using regex to find "Correct Answer: ..."
        const answerMatch = prompt.match(/Correct Answer: ([^\n]+)/)
        expect(answerMatch).toBeDefined()
        const extractedAnswer = answerMatch![1]
        expect(extractedAnswer.length).toBeLessThanOrEqual(200)
      })

      it('should request exact JSON format', () => {
        const prompt = buildDistractorPrompt('Q', 'A')
        expect(prompt).toContain('{"distractors":')
        expect(prompt).toContain('distractor1')
      })
    })
  })

  describe('validateDistractors', () => {
    describe('T002: Unit test for distractor validation', () => {
      it('should return true for 3 valid distractors', () => {
        const distractors = ['London', 'Berlin', 'Madrid']
        const correctAnswer = 'Paris'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(true)
      })

      it('should reject if count is not 3 (too few)', () => {
        const distractors = ['London', 'Berlin']
        const correctAnswer = 'Paris'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(false)
      })

      it('should reject if count is not 3 (too many)', () => {
        const distractors = ['London', 'Berlin', 'Madrid', 'Rome']
        const correctAnswer = 'Paris'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(false)
      })

      it('should reject if count is not 3 (empty array)', () => {
        const distractors: string[] = []
        const correctAnswer = 'Paris'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(false)
      })

      it('should reject if any distractor matches correct answer (exact match)', () => {
        const distractors = ['London', 'Paris', 'Madrid']
        const correctAnswer = 'Paris'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(false)
      })

      it('should reject if any distractor matches correct answer (case-insensitive)', () => {
        const distractors = ['London', 'PARIS', 'Madrid']
        const correctAnswer = 'Paris'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(false)
      })

      it('should reject if any distractor matches correct answer (with whitespace)', () => {
        const distractors = ['London', '  Paris  ', 'Madrid']
        const correctAnswer = 'Paris'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(false)
      })

      it('should reject if distractors have duplicates (exact)', () => {
        const distractors = ['London', 'London', 'Madrid']
        const correctAnswer = 'Paris'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(false)
      })

      it('should reject if distractors have duplicates (case-insensitive)', () => {
        const distractors = ['London', 'london', 'Madrid']
        const correctAnswer = 'Paris'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(false)
      })

      it('should reject if distractors have duplicates (with whitespace)', () => {
        const distractors = ['London', '  London  ', 'Madrid']
        const correctAnswer = 'Paris'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(false)
      })

      it('should reject if any distractor is empty string', () => {
        const distractors = ['London', '', 'Madrid']
        const correctAnswer = 'Paris'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(false)
      })

      it('should reject if any distractor is whitespace only', () => {
        const distractors = ['London', '   ', 'Madrid']
        const correctAnswer = 'Paris'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(false)
      })

      it('should handle different types of content (numbers)', () => {
        const distractors = ['1776', '1492', '1865']
        const correctAnswer = '1789'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(true)
      })

      it('should handle technical content', () => {
        const distractors = ['O(n^2)', 'O(log n)', 'O(n log n)']
        const correctAnswer = 'O(n)'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(true)
      })

      it('should handle multi-word answers', () => {
        const distractors = ['William Shakespeare', 'Charles Dickens', 'Jane Austen']
        const correctAnswer = 'Mark Twain'

        const result = validateDistractors(distractors, correctAnswer)

        expect(result).toBe(true)
      })
    })
  })

  describe('generateAndPersistDistractors', () => {
    const mockFlashcardId = '123e4567-e89b-12d3-a456-426614174000'

    describe('T007: Generate and persist distractors with database integration', () => {
      it('should generate and persist distractors successfully', async () => {
        const mockResponse = JSON.stringify({
          distractors: ['Docker', 'Podman', 'Mesos'],
        })
        mockGetChatCompletion.mockResolvedValue(mockResponse)
        mockCreateDistractors.mockResolvedValue(undefined)

        const result = await generateAndPersistDistractors(
          mockFlashcardId,
          'What is Kubernetes?',
          'A container orchestration platform'
        )

        expect(result.success).toBe(true)
        expect(result.distractors).toEqual(['Docker', 'Podman', 'Mesos'])
        expect(mockCreateDistractors).toHaveBeenCalledWith(mockFlashcardId, [
          'Docker',
          'Podman',
          'Mesos',
        ])
      })

      it('should skip persistence if generation fails', async () => {
        mockGetChatCompletion.mockRejectedValue(new Error('API Error'))

        const result = await generateAndPersistDistractors(mockFlashcardId, 'Q', 'A')

        expect(result.success).toBe(false)
        expect(mockCreateDistractors).not.toHaveBeenCalled()
      })

      it('should return error if persistence fails', async () => {
        const mockResponse = JSON.stringify({
          distractors: ['A', 'B', 'C'],
        })
        mockGetChatCompletion.mockResolvedValue(mockResponse)
        mockCreateDistractors.mockRejectedValue(new Error('Database error'))

        const result = await generateAndPersistDistractors(mockFlashcardId, 'Q', 'D')

        expect(result.success).toBe(false)
        expect(result.error).toBe('Database error')
      })

      it('should handle non-Error database exceptions', async () => {
        const mockResponse = JSON.stringify({
          distractors: ['A', 'B', 'C'],
        })
        mockGetChatCompletion.mockResolvedValue(mockResponse)
        mockCreateDistractors.mockRejectedValue('String error')

        const result = await generateAndPersistDistractors(mockFlashcardId, 'Q', 'D')

        expect(result.success).toBe(false)
        expect(result.error).toBe('Database persistence failed')
      })

      it('should track total time including persistence', async () => {
        const mockResponse = JSON.stringify({
          distractors: ['A', 'B', 'C'],
        })
        mockGetChatCompletion.mockResolvedValue(mockResponse)
        mockCreateDistractors.mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 50))
        )

        const result = await generateAndPersistDistractors(mockFlashcardId, 'Q', 'D')

        expect(result.success).toBe(true)
        expect(result.generationTimeMs).toBeGreaterThanOrEqual(50)
      })

      it('should respect custom generation options', async () => {
        const mockResponse = JSON.stringify({
          distractors: ['A', 'B', 'C'],
        })
        mockGetChatCompletion.mockResolvedValue(mockResponse)
        mockCreateDistractors.mockResolvedValue(undefined)

        const options = {
          maxTokens: 512,
          temperature: 0.7,
          timeoutMs: 10000,
        }

        const result = await generateAndPersistDistractors(mockFlashcardId, 'Q', 'D', options)

        expect(result.success).toBe(true)
        expect(mockGetChatCompletion).toHaveBeenCalled()
      })

      it('should handle empty question', async () => {
        const result = await generateAndPersistDistractors(mockFlashcardId, '', 'Answer')

        expect(result.success).toBe(false)
        expect(result.error).toBe('Question and answer must be non-empty')
        expect(mockCreateDistractors).not.toHaveBeenCalled()
      })

      it('should handle empty answer', async () => {
        const result = await generateAndPersistDistractors(mockFlashcardId, 'Question', '')

        expect(result.success).toBe(false)
        expect(result.error).toBe('Question and answer must be non-empty')
        expect(mockCreateDistractors).not.toHaveBeenCalled()
      })
    })
  })
})
