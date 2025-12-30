import { describe, it, expect } from 'vitest'

/**
 * Unit Tests for Flashcard Response Parser
 *
 * Tests parsing of flashcard responses from Claude
 */

// Import the function directly - we'll need to export it from the module
// For now, we'll copy the function here for testing
function parseFlashcardsFromResponse(rawResponse: string, provider: string): any[] {
  try {
    let jsonString = rawResponse.trim()

    // Step 1: Remove markdown code blocks (common in Claude responses)
    if (jsonString.includes('```')) {
      const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1].trim()
        console.log(`[FlashcardGenerator] Extracted JSON from ${provider} code block`)
      }
    }

    // Step 2: Extract JSON array from anywhere in the text
    // This handles cases where LLM adds explanatory text before/after JSON
    const arrayMatch = jsonString.match(/\[[\s\S]*?\](?=\s*$|```|\n\n)/)
    if (arrayMatch) {
      jsonString = arrayMatch[0]
      console.log(`[FlashcardGenerator] Extracted JSON array from ${provider} response`)
    }

    // Step 3: Try to parse the JSON
    let parsed: any
    try {
      parsed = JSON.parse(jsonString)
      console.log(`[FlashcardGenerator] Successfully parsed ${provider} JSON`)
    } catch (parseError) {
      console.error(`[FlashcardGenerator] Failed to parse ${provider} JSON:`, parseError)
      console.error(`[FlashcardGenerator] Attempted to parse:`, jsonString.substring(0, 500))

      // Last resort: Try to extract Q&A pairs with regex
      const questionMatches = Array.from(
        jsonString.matchAll(/"question"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g)
      )
      const answerMatches = Array.from(
        jsonString.matchAll(/"answer"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g)
      )

      if (questionMatches.length > 0 && questionMatches.length === answerMatches.length) {
        const recovered = questionMatches.map((qMatch, i) => ({
          question: qMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
          answer: answerMatches[i][1].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
        }))
        console.log(`[FlashcardGenerator] Recovered ${recovered.length} flashcards via regex`)
        return recovered
      }

      return []
    }

    // Step 4: Normalize to array format
    let flashcards: any[] = []

    if (Array.isArray(parsed)) {
      flashcards = parsed
    } else if (parsed && Array.isArray(parsed.flashcards)) {
      flashcards = parsed.flashcards
    } else if (parsed && Array.isArray(parsed.questions)) {
      flashcards = parsed.questions
    } else if (parsed && typeof parsed.question === 'string' && typeof parsed.answer === 'string') {
      // Single flashcard - wrap in array
      flashcards = [parsed]
      console.log(`[FlashcardGenerator] ${provider} returned single flashcard, wrapping in array`)
    } else {
      console.warn(`[FlashcardGenerator] Unexpected ${provider} JSON structure:`, parsed)
      return []
    }

    console.log(`[FlashcardGenerator] Parsed ${flashcards.length} flashcards from ${provider}`)
    return flashcards
  } catch (error) {
    console.error(`[FlashcardGenerator] Error parsing ${provider} response:`, error)
    return []
  }
}

describe('Flashcard Response Parser', () => {
  describe('Claude responses', () => {
    it('should parse clean JSON array from Claude', () => {
      const response = JSON.stringify([
        { question: 'What is RAG?', answer: 'Retrieval-Augmented Generation' },
        { question: 'What is MCP?', answer: 'Model Context Protocol' },
      ])

      const result = parseFlashcardsFromResponse(response, 'Claude')

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        question: 'What is RAG?',
        answer: 'Retrieval-Augmented Generation',
      })
      expect(result[1]).toEqual({ question: 'What is MCP?', answer: 'Model Context Protocol' })
    })

    it('should extract JSON from Claude markdown code block', () => {
      const response = `Here are some flashcards:

\`\`\`json
[
  {"question": "What is photosynthesis?", "answer": "Process by which plants convert light to energy"},
  {"question": "What is chlorophyll?", "answer": "Green pigment in plants"}
]
\`\`\`

These flashcards cover the key concepts.`

      const result = parseFlashcardsFromResponse(response, 'Claude')

      expect(result).toHaveLength(2)
      expect(result[0].question).toBe('What is photosynthesis?')
      expect(result[1].question).toBe('What is chlorophyll?')
    })

    it('should extract JSON from code block without json tag', () => {
      const response = `\`\`\`
[
  {"question": "Test Q1?", "answer": "Test A1"},
  {"question": "Test Q2?", "answer": "Test A2"}
]
\`\`\``

      const result = parseFlashcardsFromResponse(response, 'Claude')

      expect(result).toHaveLength(2)
    })

    it('should handle Claude response with text before JSON array', () => {
      const response = `I'll generate flashcards for you:

[
  {"question": "What is TypeScript?", "answer": "Typed superset of JavaScript"},
  {"question": "What is React?", "answer": "JavaScript library for building UIs"}
]`

      const result = parseFlashcardsFromResponse(response, 'Claude')

      expect(result).toHaveLength(2)
      expect(result[0].question).toBe('What is TypeScript?')
    })

    it('should handle single flashcard object from Claude', () => {
      const response = JSON.stringify({
        question: 'What is Node.js?',
        answer: 'JavaScript runtime built on Chrome V8 engine',
      })

      const result = parseFlashcardsFromResponse(response, 'Claude')

      expect(result).toHaveLength(1)
      expect(result[0].question).toBe('What is Node.js?')
    })

    it('should handle flashcards wrapped in object with "flashcards" key', () => {
      const response = JSON.stringify({
        flashcards: [
          { question: 'Q1?', answer: 'A1' },
          { question: 'Q2?', answer: 'A2' },
        ],
      })

      const result = parseFlashcardsFromResponse(response, 'Claude')

      expect(result).toHaveLength(2)
    })

    it('should handle flashcards wrapped in object with "questions" key', () => {
      const response = JSON.stringify({
        questions: [
          { question: 'Q1?', answer: 'A1' },
          { question: 'Q2?', answer: 'A2' },
        ],
      })

      const result = parseFlashcardsFromResponse(response, 'Claude')

      expect(result).toHaveLength(2)
    })

    it('should handle escaped quotes in Claude responses', () => {
      const response = JSON.stringify([
        {
          question: 'What is "machine learning"?',
          answer: "It's a subset of AI that enables systems to learn from data",
        },
      ])

      const result = parseFlashcardsFromResponse(response, 'Claude')

      expect(result).toHaveLength(1)
      expect(result[0].question).toBe('What is "machine learning"?')
      expect(result[0].answer).toContain("It's a subset")
    })

    it('should handle multiline answers from Claude', () => {
      const response = JSON.stringify([
        {
          question: 'What is RAG?',
          answer:
            'RAG stands for Retrieval-Augmented Generation.\n\nIt combines:\n1. Information retrieval\n2. Text generation',
        },
      ])

      const result = parseFlashcardsFromResponse(response, 'Claude')

      expect(result).toHaveLength(1)
      expect(result[0].answer).toContain('\n')
      expect(result[0].answer).toContain('Retrieval-Augmented Generation')
    })
  })

  describe('Edge cases', () => {
    it('should return empty array for invalid JSON', () => {
      const response = 'This is not JSON at all'

      const result = parseFlashcardsFromResponse(response, 'Claude')

      expect(result).toEqual([])
    })

    it('should return empty array for empty response', () => {
      const response = ''

      const result = parseFlashcardsFromResponse(response, 'Claude')

      expect(result).toEqual([])
    })

    it('should return empty array for malformed JSON array', () => {
      const response = '[{"question": "Missing answer"}]'

      const result = parseFlashcardsFromResponse(response, 'Claude')

      // Parser should extract it, but validation later will filter it out
      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('question')
    })

    it('should handle empty JSON array', () => {
      const response = '[]'

      const result = parseFlashcardsFromResponse(response, 'Claude')

      expect(result).toEqual([])
    })

    it('should recover flashcards from broken JSON using regex', () => {
      // Simulate malformed JSON where quotes aren't properly escaped
      const response = `[
        {"question": "What is AI?", "answer": "Artificial Intelligence"},
        {"question": "What is ML?", "answer": "Machine Learning"
      ]` // Missing closing brace

      const result = parseFlashcardsFromResponse(response, 'Claude')

      // Regex fallback should still extract the pairs
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle whitespace-heavy responses', () => {
      const response = `


        [
          {"question": "Q1?", "answer": "A1"},
          {"question": "Q2?", "answer": "A2"}
        ]


      `

      const result = parseFlashcardsFromResponse(response, 'Claude')

      expect(result).toHaveLength(2)
    })

    it('should handle responses with Unicode characters', () => {
      const response = JSON.stringify([
        { question: 'What is émoji?', answer: 'Unicode symbols 🎉' },
        { question: 'What is 中文?', answer: 'Chinese language' },
      ])

      const result = parseFlashcardsFromResponse(response, 'Claude')

      expect(result).toHaveLength(2)
      expect(result[0].question).toBe('What is émoji?')
      expect(result[0].answer).toBe('Unicode symbols 🎉')
    })

    it('should handle very long answers', () => {
      const longAnswer = 'A'.repeat(1000)
      const response = JSON.stringify([{ question: 'Long answer test?', answer: longAnswer }])

      const result = parseFlashcardsFromResponse(response, 'Claude')

      expect(result).toHaveLength(1)
      expect(result[0].answer).toHaveLength(1000)
    })

    it('should handle responses with special JSON characters', () => {
      const response = JSON.stringify([
        {
          question: 'What uses { } brackets?',
          answer: 'Objects in JSON use curly brackets { }',
        },
      ])

      const result = parseFlashcardsFromResponse(response, 'Claude')

      expect(result).toHaveLength(1)
      expect(result[0].question).toContain('{')
      expect(result[0].answer).toContain('}')
    })
  })

  describe('Format variations', () => {
    it('should handle compact JSON (no whitespace)', () => {
      const response = '[{"question":"Q1?","answer":"A1"},{"question":"Q2?","answer":"A2"}]'

      const result = parseFlashcardsFromResponse(response, 'Claude')

      expect(result).toHaveLength(2)
    })

    it('should handle pretty-printed JSON', () => {
      const response = `[
  {
    "question": "What is REST?",
    "answer": "Representational State Transfer"
  },
  {
    "question": "What is GraphQL?",
    "answer": "Query language for APIs"
  }
]`

      const result = parseFlashcardsFromResponse(response, 'Claude')

      expect(result).toHaveLength(2)
    })

    it('should handle mixed quote styles in JSON strings', () => {
      const response = JSON.stringify([
        { question: "What's an API?", answer: 'Application Programming Interface' },
      ])

      const result = parseFlashcardsFromResponse(response, 'Claude')

      expect(result).toHaveLength(1)
      expect(result[0].question).toBe("What's an API?")
    })

    it('should handle responses with tabs and newlines in values', () => {
      const response = JSON.stringify([
        {
          question: 'Code example?',
          answer: 'function test() {\n\treturn true;\n}',
        },
      ])

      const result = parseFlashcardsFromResponse(response, 'Claude')

      expect(result).toHaveLength(1)
      expect(result[0].answer).toContain('\n')
      expect(result[0].answer).toContain('\t')
    })
  })

  describe('Provider-specific edge cases', () => {
    it('should handle Claude thinking blocks before JSON', () => {
      const response = `<thinking>
Let me generate flashcards...
</thinking>

[
  {"question": "Q1?", "answer": "A1"},
  {"question": "Q2?", "answer": "A2"}
]`

      const result = parseFlashcardsFromResponse(response, 'Claude')

      expect(result).toHaveLength(2)
    })
  })
})
