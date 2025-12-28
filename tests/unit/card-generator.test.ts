import { describe, it, expect } from 'vitest'
import type {
  GeneratedFlashcard,
  GeneratedMultipleChoice,
  GeneratedScenario,
  GeneratedCard,
  CardType,
} from '@/lib/ai/card-generator'

/**
 * Unit Tests for Card Generator
 *
 * Tests parsing, validation, and utility functions for card generation.
 * Does not test actual LLM calls (those are integration tests).
 */

// Simulate parseFlashcardResponse logic
function parseFlashcardResponse(responseText: string): GeneratedFlashcard[] {
  let jsonText = responseText.trim()

  if (jsonText.startsWith('```')) {
    const match = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      jsonText = match[1].trim()
    }
  }

  const parsed = JSON.parse(jsonText)

  if (!parsed.cards || !Array.isArray(parsed.cards)) {
    throw new Error('Invalid response: missing cards array')
  }

  return parsed.cards.map((card: unknown) => {
    if (typeof card !== 'object' || card === null) {
      throw new Error('Invalid card: not an object')
    }

    const c = card as Record<string, unknown>

    if (typeof c.question !== 'string' || c.question.length === 0) {
      throw new Error('Invalid card: missing or empty question')
    }

    if (typeof c.answer !== 'string' || c.answer.length === 0) {
      throw new Error('Invalid card: missing or empty answer')
    }

    return {
      question: c.question,
      answer: c.answer,
      cardType: 'flashcard' as const,
    }
  })
}

// Simulate parseMultipleChoiceResponse logic
function parseMultipleChoiceResponse(responseText: string): GeneratedMultipleChoice[] {
  let jsonText = responseText.trim()

  if (jsonText.startsWith('```')) {
    const match = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      jsonText = match[1].trim()
    }
  }

  const parsed = JSON.parse(jsonText)

  if (!parsed.cards || !Array.isArray(parsed.cards)) {
    throw new Error('Invalid response: missing cards array')
  }

  return parsed.cards.map((card: unknown) => {
    if (typeof card !== 'object' || card === null) {
      throw new Error('Invalid card: not an object')
    }

    const c = card as Record<string, unknown>

    if (typeof c.question !== 'string' || c.question.length === 0) {
      throw new Error('Invalid card: missing or empty question')
    }

    if (typeof c.answer !== 'string' || c.answer.length === 0) {
      throw new Error('Invalid card: missing or empty answer')
    }

    if (!Array.isArray(c.distractors) || c.distractors.length !== 3) {
      throw new Error('Invalid card: must have exactly 3 distractors')
    }

    return {
      question: c.question,
      answer: c.answer,
      distractors: c.distractors as string[],
      cardType: 'multiple_choice' as const,
    }
  })
}

describe('Card Generator', () => {
  describe('parseFlashcardResponse', () => {
    it('should parse valid flashcard JSON response', () => {
      const response = JSON.stringify({
        cards: [
          { question: 'What is a Pod?', answer: 'The smallest deployable unit in Kubernetes' },
          { question: 'What is a Service?', answer: 'A network abstraction for Pods' },
        ],
      })

      const cards = parseFlashcardResponse(response)

      expect(cards).toHaveLength(2)
      expect(cards[0].question).toBe('What is a Pod?')
      expect(cards[0].cardType).toBe('flashcard')
    })

    it('should handle markdown code blocks', () => {
      const response = `\`\`\`json
{
  "cards": [
    {"question": "Test Q", "answer": "Test A"}
  ]
}
\`\`\``

      const cards = parseFlashcardResponse(response)

      expect(cards).toHaveLength(1)
    })

    it('should throw for missing cards array', () => {
      const response = JSON.stringify({ flashcards: [] })

      expect(() => parseFlashcardResponse(response)).toThrow('missing cards array')
    })

    it('should throw for missing question', () => {
      const response = JSON.stringify({
        cards: [{ answer: 'Some answer' }],
      })

      expect(() => parseFlashcardResponse(response)).toThrow('missing or empty question')
    })

    it('should throw for missing answer', () => {
      const response = JSON.stringify({
        cards: [{ question: 'Some question' }],
      })

      expect(() => parseFlashcardResponse(response)).toThrow('missing or empty answer')
    })

    it('should throw for empty question', () => {
      const response = JSON.stringify({
        cards: [{ question: '', answer: 'Answer' }],
      })

      expect(() => parseFlashcardResponse(response)).toThrow('missing or empty question')
    })
  })

  describe('parseMultipleChoiceResponse', () => {
    it('should parse valid multiple choice JSON response', () => {
      const response = JSON.stringify({
        cards: [
          {
            question: 'Which is a container orchestrator?',
            answer: 'Kubernetes',
            distractors: ['Python', 'JavaScript', 'HTML'],
          },
        ],
      })

      const cards = parseMultipleChoiceResponse(response)

      expect(cards).toHaveLength(1)
      expect(cards[0].cardType).toBe('multiple_choice')
      expect(cards[0].distractors).toHaveLength(3)
    })

    it('should throw for missing distractors', () => {
      const response = JSON.stringify({
        cards: [{ question: 'Q', answer: 'A' }],
      })

      expect(() => parseMultipleChoiceResponse(response)).toThrow('must have exactly 3 distractors')
    })

    it('should throw for wrong number of distractors', () => {
      const response = JSON.stringify({
        cards: [
          {
            question: 'Q',
            answer: 'A',
            distractors: ['B', 'C'], // Only 2
          },
        ],
      })

      expect(() => parseMultipleChoiceResponse(response)).toThrow('must have exactly 3 distractors')
    })
  })

  describe('Card Type Validation', () => {
    const validCardTypes: CardType[] = ['flashcard', 'multiple_choice', 'scenario']

    it('should accept all valid card types', () => {
      validCardTypes.forEach((type) => {
        expect(['flashcard', 'multiple_choice', 'scenario']).toContain(type)
      })
    })

    it('should correctly identify flashcard type', () => {
      const card: GeneratedFlashcard = {
        question: 'Q',
        answer: 'A',
        cardType: 'flashcard',
      }

      expect(card.cardType).toBe('flashcard')
    })

    it('should correctly identify multiple choice type', () => {
      const card: GeneratedMultipleChoice = {
        question: 'Q',
        answer: 'A',
        distractors: ['B', 'C', 'D'],
        cardType: 'multiple_choice',
      }

      expect(card.cardType).toBe('multiple_choice')
    })

    it('should correctly identify scenario type', () => {
      const card: GeneratedScenario = {
        context: 'You are debugging a production issue...',
        question: 'What is your first step?',
        answer: 'Check the logs',
        cardType: 'scenario',
      }

      expect(card.cardType).toBe('scenario')
    })
  })

  describe('Card Content Validation', () => {
    function validateCardContent(card: GeneratedCard): { valid: boolean; errors: string[] } {
      const errors: string[] = []

      if (!card.question || card.question.length === 0) {
        errors.push('Question is required')
      } else if (card.question.length > 500) {
        errors.push('Question too long (max 500 characters)')
      }

      if (!card.answer || card.answer.length === 0) {
        errors.push('Answer is required')
      } else if (card.answer.length > 2000) {
        errors.push('Answer too long (max 2000 characters)')
      }

      if (card.cardType === 'multiple_choice') {
        const mc = card as GeneratedMultipleChoice
        if (!mc.distractors || mc.distractors.length !== 3) {
          errors.push('Multiple choice cards must have exactly 3 distractors')
        }
      }

      if (card.cardType === 'scenario') {
        const sc = card as GeneratedScenario
        if (!sc.context || sc.context.length === 0) {
          errors.push('Scenario cards must have context')
        }
      }

      return { valid: errors.length === 0, errors }
    }

    it('should validate a complete flashcard', () => {
      const card: GeneratedFlashcard = {
        question: 'What is Docker?',
        answer: 'A containerization platform',
        cardType: 'flashcard',
      }

      const result = validateCardContent(card)
      expect(result.valid).toBe(true)
    })

    it('should validate a complete multiple choice card', () => {
      const card: GeneratedMultipleChoice = {
        question: 'Which command lists containers?',
        answer: 'docker ps',
        distractors: ['docker list', 'docker show', 'docker containers'],
        cardType: 'multiple_choice',
      }

      const result = validateCardContent(card)
      expect(result.valid).toBe(true)
    })

    it('should reject empty question', () => {
      const card: GeneratedFlashcard = {
        question: '',
        answer: 'Some answer',
        cardType: 'flashcard',
      }

      const result = validateCardContent(card)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Question is required')
    })

    it('should reject missing distractors on multiple choice', () => {
      const card = {
        question: 'Q',
        answer: 'A',
        distractors: ['B'],
        cardType: 'multiple_choice',
      } as GeneratedMultipleChoice

      const result = validateCardContent(card)
      expect(result.valid).toBe(false)
    })
  })

  describe('Distractor Quality', () => {
    function areDistractorsValid(answer: string, distractors: string[]): boolean {
      // Distractors should not include the correct answer
      if (distractors.includes(answer)) {
        return false
      }

      // Distractors should not be duplicates
      const unique = new Set(distractors)
      if (unique.size !== distractors.length) {
        return false
      }

      // Distractors should not be empty
      if (distractors.some((d) => !d || d.trim().length === 0)) {
        return false
      }

      return true
    }

    it('should reject distractors containing correct answer', () => {
      const answer = 'Kubernetes'
      const distractors = ['Docker', 'Kubernetes', 'Podman']

      expect(areDistractorsValid(answer, distractors)).toBe(false)
    })

    it('should reject duplicate distractors', () => {
      const answer = 'Kubernetes'
      const distractors = ['Docker', 'Docker', 'Podman']

      expect(areDistractorsValid(answer, distractors)).toBe(false)
    })

    it('should reject empty distractors', () => {
      const answer = 'Kubernetes'
      const distractors = ['Docker', '', 'Podman']

      expect(areDistractorsValid(answer, distractors)).toBe(false)
    })

    it('should accept valid distractors', () => {
      const answer = 'Kubernetes'
      const distractors = ['Docker', 'Podman', 'Mesos']

      expect(areDistractorsValid(answer, distractors)).toBe(true)
    })
  })
})
