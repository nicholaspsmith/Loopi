import { getOllamaClient } from './client'

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

const FLASHCARD_GENERATION_PROMPT = `You are a flashcard generator. Your task is to analyze the given content and extract multiple question-answer pairs suitable for spaced repetition learning.

RULES:
1. Generate ONLY factual, educational question-answer pairs
2. Questions must be clear, specific, and answerable from the content
3. Answers must be concise but complete (10-200 words)
4. Focus on key concepts, definitions, relationships, and important details
5. Questions should use interrogative format (What, How, Why, When, Where, Define, Explain)
6. Avoid yes/no questions - prefer open-ended questions
7. Each Q&A pair must be independent and self-contained
8. Return ONLY the JSON array, no other text

OUTPUT FORMAT (JSON array):
[
  {"question": "What is quantum entanglement?", "answer": "A phenomenon where pairs of particles remain connected..."},
  {"question": "What is Bell's theorem?", "answer": "Bell's theorem proves that..."}
]

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
  const {
    maxFlashcards = 20,
    minContentLength = 50,
  } = options

  // Validate content length
  const trimmedContent = content.trim()
  if (trimmedContent.length < minContentLength) {
    console.log(
      `[FlashcardGenerator] Content too short (${trimmedContent.length} chars), skipping`
    )
    return []
  }

  // Check if content is educational (simple heuristic)
  if (!hasEducationalContent(trimmedContent)) {
    console.log('[FlashcardGenerator] Content not educational, skipping')
    return []
  }

  try {
    const client = getOllamaClient()

    const prompt = `${FLASHCARD_GENERATION_PROMPT}\n\n${trimmedContent}\n\nGenerate up to ${maxFlashcards} flashcards as a JSON array:`

    console.log('[FlashcardGenerator] Generating flashcards...')

    const response = await client.chat({
      model: 'llama3.2',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      format: 'json',
    })

    const rawResponse = response.message.content
    console.log('[FlashcardGenerator] Raw response:', rawResponse.substring(0, 200))

    // Parse JSON response
    let flashcards: FlashcardPair[]
    try {
      const parsed = JSON.parse(rawResponse)
      flashcards = Array.isArray(parsed) ? parsed : []
    } catch (parseError) {
      console.error('[FlashcardGenerator] Failed to parse JSON:', parseError)
      return []
    }

    // Validate and filter flashcards
    const validFlashcards = flashcards
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

    console.log(
      `[FlashcardGenerator] Generated ${validFlashcards.length} valid flashcards`
    )

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

  const isConversational = conversationalPhrases.some((phrase) =>
    lowerContent.includes(phrase)
  )

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
