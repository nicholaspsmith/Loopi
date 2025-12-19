import { OLLAMA_MODEL } from './client'

/**
 * Flashcard Generation Module
 *
 * Generates question-answer flashcard pairs from educational content using Claude/Ollama.
 *
 * Maps to FR-009: Automatically create multiple Q&A flashcard pairs from response
 */

export interface FlashcardPair {
  question: string
  answer: string
}

export interface GenerateFlashcardsOptions {
  maxFlashcards?: number
  minContentLength?: number
}

const FLASHCARD_GENERATION_PROMPT = `
You are a flashcard generator. 
Your task is to create multiple question-answer pairs from educational content.

CRITICAL INSTRUCTIONS:
1. Generate AS MANY flashcards as possible (up to the specified maximum) while minimizing duplicate information
2. Return ONLY a valid JSON array - no other text
3. Each flashcard must have "question" and "answer" keys
4. Questions should use interrogative format (What, How, Why, When, Where)
5. Answers should be concise (10-200 words)
6. Cover ALL key concepts in the content

REQUIRED OUTPUT FORMAT (must be a JSON array with multiple objects):
[
  {"question": "What is X?", "answer": "X is..."},
  {"question": "How does Y work?", "answer": "Y works by..."},
  {"question": "Why is Z important?", "answer": "Z is important because..."}
]

EXAMPLES OF GOOD FLASHCARDS:
- Question: "What is photosynthesis?" Answer: "Photosynthesis is the process by which plants convert light energy into chemical energy."
- Question: "What are the three states of matter?" Answer: "The three states of matter are solid, liquid, and gas."

Remember: Generate MULTIPLE flashcards (not just one). Extract every important concept from the content.

CONTENT TO ANALYZE:`

/**
 * Generate flashcards from educational content
 *
 * @param content - The content to generate flashcards from
 * @param options - Generation options
 * @returns Array of question-answer pairs
 */
export async function generateFlashcardsFromContent(
  content: string,
  options: GenerateFlashcardsOptions = {}
): Promise<FlashcardPair[]> {
  const { maxFlashcards = 20, minContentLength = 50 } = options

  // Validate content length
  const trimmedContent = content.trim()
  if (trimmedContent.length < minContentLength) {
    console.log(`[FlashcardGenerator] Content too short (${trimmedContent.length} chars), skipping`)
    return []
  }

  // Check if content is educational (simple heuristic)
  if (!hasEducationalContent(trimmedContent)) {
    console.log('[FlashcardGenerator] Content not educational, skipping')
    return []
  }

  try {
    const prompt = `${FLASHCARD_GENERATION_PROMPT}\n\n${trimmedContent}\n\nGenerate up to ${maxFlashcards} flashcards as a JSON array:`

    console.log('[FlashcardGenerator] Generating flashcards...')

    const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a flashcard generator. You MUST generate MULTIPLE flashcards from educational content. MINIMUM 3 flashcards, preferably 5-10. Each important concept should have its own flashcard. Always return a JSON array with multiple flashcard objects, never just a single flashcard.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: false,
        format: 'json',
        options: {
          temperature: 0.7,
          num_predict: 2048,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`)
    }

    const data = await response.json()
    const rawResponse = data.message?.content || ''
    console.log('[FlashcardGenerator] Raw response:', rawResponse.substring(0, 200))

    // Parse JSON response
    let flashcards: FlashcardPair[] | undefined
    try {
      let parsed: unknown

      try {
        parsed = JSON.parse(rawResponse)
      } catch (firstParseError) {
        // Try to fix common JSON issues
        let fixed = rawResponse.trim()

        // If it starts with { but isn't an array, try to wrap it
        if (fixed.startsWith('{') && !fixed.startsWith('[')) {
          // Try to extract individual Q&A objects and create an array
          const questionMatches = fixed.matchAll(/["{]question["']?\s*:\s*["']([^"']+)["']/g)
          const answerMatches = fixed.matchAll(/["{]answer["']?\s*:\s*["']([^"']+)["']/g)

          const questions = [...questionMatches].map((m) => m[1])
          const answers = [...answerMatches].map((m) => m[1])

          if (questions.length > 0 && questions.length === answers.length) {
            flashcards = questions.map((q, i) => ({
              question: q,
              answer: answers[i],
            }))
            console.log(
              `[FlashcardGenerator] Recovered ${flashcards.length} flashcards from malformed JSON`
            )
          } else {
            throw firstParseError
          }
        } else {
          throw firstParseError
        }
      }

      // Handle different response formats
      if (!flashcards) {
        if (Array.isArray(parsed)) {
          flashcards = parsed as FlashcardPair[]
        } else if (
          parsed &&
          typeof parsed === 'object' &&
          'questions' in parsed &&
          Array.isArray((parsed as Record<string, unknown>).questions)
        ) {
          flashcards = (parsed as Record<string, unknown>).questions as FlashcardPair[]
        } else if (
          parsed &&
          typeof parsed === 'object' &&
          'flashcards' in parsed &&
          Array.isArray((parsed as Record<string, unknown>).flashcards)
        ) {
          flashcards = (parsed as Record<string, unknown>).flashcards as FlashcardPair[]
        } else if (
          parsed &&
          typeof parsed === 'object' &&
          'question' in parsed &&
          'answer' in parsed &&
          typeof (parsed as Record<string, unknown>).question === 'string' &&
          typeof (parsed as Record<string, unknown>).answer === 'string'
        ) {
          // Single flashcard object
          flashcards = [parsed as FlashcardPair]
        } else {
          console.warn('[FlashcardGenerator] Unexpected JSON format:', parsed)
          flashcards = []
        }
      }
    } catch (parseError) {
      console.error('[FlashcardGenerator] Failed to parse JSON:', parseError)
      console.error('[FlashcardGenerator] Raw response was:', rawResponse)
      return []
    }

    // Validate and filter flashcards
    const validFlashcards = (flashcards ?? [])
      .filter((fc) => {
        return (
          fc &&
          typeof fc.question === 'string' &&
          typeof fc.answer === 'string' &&
          fc.question.trim().length > 5 &&
          fc.question.trim().length <= 1000 &&
          fc.answer.trim().length > 5 &&
          fc.answer.trim().length <= 5000
        )
      })
      .map((fc) => ({
        question: fc.question.trim(),
        answer: fc.answer.trim(),
      }))
      .slice(0, maxFlashcards) // Enforce max limit

    console.log(`[FlashcardGenerator] Generated ${validFlashcards.length} valid flashcards`)

    // Remove duplicates
    const uniqueFlashcards = removeDuplicates(validFlashcards)

    return uniqueFlashcards
  } catch (error) {
    console.error('[FlashcardGenerator] Error generating flashcards:', error)
    return []
  }
}

/**
 * Check if content has educational value (simple heuristic)
 */
function hasEducationalContent(content: string): boolean {
  const lowerContent = content.toLowerCase()

  // Too short to be educational
  if (content.length < 50) {
    return false
  }

  // Purely conversational phrases
  const conversationalPhrases = [
    'hello',
    'how are you',
    'good morning',
    'good afternoon',
    'good evening',
    'nice to meet',
    'see you later',
    'goodbye',
    'thank you',
    "you're welcome",
  ]

  const isConversational = conversationalPhrases.some((phrase) => lowerContent.includes(phrase))

  if (isConversational && content.length < 100) {
    return false
  }

  // Educational indicators
  const educationalIndicators = [
    'is a',
    'is the',
    'are the',
    'means',
    'defined as',
    'refers to',
    'consists of',
    'includes',
    'example',
    'such as',
    'because',
    'therefore',
    'however',
    'key concept',
    'important',
    'algorithm',
    'process',
    'method',
    'theory',
    'principle',
  ]

  const hasEducationalIndicators = educationalIndicators.some((indicator) =>
    lowerContent.includes(indicator)
  )

  // Has structured content (lists, numbered items)
  const hasStructure =
    /\n\d+[\.\)]\s/.test(content) || // Numbered lists
    /\n[-•*]\s/.test(content) || // Bullet points
    /:\n/.test(content) // Colons followed by newlines

  return hasEducationalIndicators || hasStructure
}

/**
 * Remove duplicate flashcards based on question similarity
 */
function removeDuplicates(flashcards: FlashcardPair[]): FlashcardPair[] {
  const seen = new Set<string>()
  const unique: FlashcardPair[] = []

  for (const fc of flashcards) {
    // Normalize question for comparison
    const normalizedQuestion = fc.question
      .toLowerCase()
      .replace(/[?.,!]/g, '')
      .trim()

    if (!seen.has(normalizedQuestion)) {
      seen.add(normalizedQuestion)
      unique.push(fc)
    }
  }

  return unique
}
