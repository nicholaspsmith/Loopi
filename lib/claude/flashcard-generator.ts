import { getChatCompletion } from './client'

/**
 * Flashcard Generation Module
 *
 * Generates question-answer flashcard pairs from educational content for content generation.
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
  userApiKey?: string | null
}

const FLASHCARD_GENERATION_PROMPT = `
You are a flashcard generator. 
Your task is to create multiple question-answer pairs from educational content.

CRITICAL INSTRUCTIONS:
1. Generate AS MANY flashcards as possible (up to the specified maximum) while minimizing duplicate information
2. Return ONLY a valid JSON array - no other text
3. Each flashcard must have "question" and "answer" keys
4. Questions should use interrogative format (What, How, Why, When, Where)
5. Answers should be concise but should answer question completely (10-500 words)
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
 * Attempt to repair malformed JSON from LLM output
 * Handles common issues like unescaped quotes, incomplete objects, etc.
 */
function repairJson(jsonString: string): string {
  let repaired = jsonString

  // Remove any text before the first [ or {
  const arrayStart = repaired.indexOf('[')
  const objectStart = repaired.indexOf('{')
  const start =
    arrayStart >= 0 && objectStart >= 0
      ? Math.min(arrayStart, objectStart)
      : Math.max(arrayStart, objectStart)
  if (start > 0) {
    repaired = repaired.substring(start)
  }

  // Try to fix unbalanced brackets
  const openBrackets = (repaired.match(/\[/g) || []).length
  const closeBrackets = (repaired.match(/\]/g) || []).length
  if (openBrackets > closeBrackets) {
    repaired += ']'.repeat(openBrackets - closeBrackets)
  }

  const openBraces = (repaired.match(/\{/g) || []).length
  const closeBraces = (repaired.match(/\}/g) || []).length
  if (openBraces > closeBraces) {
    repaired += '}'.repeat(openBraces - closeBraces)
  }

  // Fix trailing commas before ] or }
  repaired = repaired.replace(/,\s*([\]}])/g, '$1')

  return repaired
}

/**
 * Extract flashcard pairs using multiple strategies
 * More aggressive regex extraction for severely malformed JSON
 */
function extractFlashcardsWithRegex(rawText: string): FlashcardPair[] {
  const flashcards: FlashcardPair[] = []

  // Strategy 1: Try to find complete question/answer pairs with standard regex
  const standardPattern = /"question"\s*:\s*"([^"]+)"\s*,\s*"answer"\s*:\s*"([^"]+)"/g
  let match
  while ((match = standardPattern.exec(rawText)) !== null) {
    flashcards.push({
      question: match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
      answer: match[2].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
    })
  }

  if (flashcards.length > 0) {
    console.log(
      `[FlashcardGenerator] Extracted ${flashcards.length} flashcards with standard regex`
    )
    return flashcards
  }

  // Strategy 2: Try matching pairs separately (handles some malformed cases)
  const questionPattern = /"question"\s*:\s*"([^"]{10,})"/g
  const answerPattern = /"answer"\s*:\s*"([^"]{10,})"/g

  const questions: string[] = []
  const answers: string[] = []

  while ((match = questionPattern.exec(rawText)) !== null) {
    questions.push(match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'))
  }

  while ((match = answerPattern.exec(rawText)) !== null) {
    answers.push(match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'))
  }

  // Only pair them if counts match
  if (questions.length > 0 && questions.length === answers.length) {
    for (let i = 0; i < questions.length; i++) {
      flashcards.push({ question: questions[i], answer: answers[i] })
    }
    console.log(`[FlashcardGenerator] Extracted ${flashcards.length} flashcards with paired regex`)
    return flashcards
  }

  // Strategy 3: Look for object boundaries and extract individually
  const objectPattern = /\{[^{}]*"question"[^{}]*"answer"[^{}]*\}/g
  const objects = rawText.match(objectPattern) || []

  for (const obj of objects) {
    const qMatch = obj.match(/"question"\s*:\s*"([^"]+)"/)
    const aMatch = obj.match(/"answer"\s*:\s*"([^"]+)"/)
    if (qMatch && aMatch && qMatch[1].length > 5 && aMatch[1].length > 5) {
      flashcards.push({
        question: qMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
        answer: aMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
      })
    }
  }

  if (flashcards.length > 0) {
    console.log(`[FlashcardGenerator] Extracted ${flashcards.length} flashcards with object regex`)
  }

  return flashcards
}

/**
 * Parse flashcard response from LLM (parses LLM response)
 */
function parseFlashcardsFromResponse(rawResponse: string): FlashcardPair[] {
  try {
    let jsonString = rawResponse.trim()

    // Step 1: Remove markdown code blocks (common in Claude responses)
    if (jsonString.includes('```')) {
      const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1].trim()
        console.log('[FlashcardGenerator] Extracted JSON from code block')
      }
    }

    // Step 2: Extract JSON array from anywhere in the text
    // This handles cases where LLM adds explanatory text before/after JSON
    const arrayMatch = jsonString.match(/\[[\s\S]*\]/)
    if (arrayMatch) {
      jsonString = arrayMatch[0]
      console.log('[FlashcardGenerator] Extracted JSON array from response')
    }

    // Step 3: Try to parse the JSON (with repair attempt)
    let parsed: any
    try {
      parsed = JSON.parse(jsonString)
      console.log('[FlashcardGenerator] Successfully parsed JSON')
    } catch (parseError) {
      console.warn(`[FlashcardGenerator] Initial parse failed, attempting repair...`)

      // Try repairing the JSON
      const repairedJson = repairJson(jsonString)
      try {
        parsed = JSON.parse(repairedJson)
        console.log('[FlashcardGenerator] Successfully parsed repaired JSON')
      } catch (repairError) {
        console.error(`[FlashcardGenerator] Repair failed, trying regex extraction`)
        console.error(`[FlashcardGenerator] Attempted to parse:`, jsonString.substring(0, 500))

        // Fall back to regex extraction
        const regexResults = extractFlashcardsWithRegex(rawResponse)
        if (regexResults.length > 0) {
          return regexResults
        }

        console.error('[FlashcardGenerator] All parsing strategies failed')
        return []
      }
    }

    // Step 4: Normalize to array format
    let flashcards: FlashcardPair[] = []

    if (Array.isArray(parsed)) {
      flashcards = parsed
    } else if (parsed && Array.isArray(parsed.flashcards)) {
      flashcards = parsed.flashcards
    } else if (parsed && Array.isArray(parsed.questions)) {
      flashcards = parsed.questions
    } else if (parsed && typeof parsed.question === 'string' && typeof parsed.answer === 'string') {
      // Single flashcard - wrap in array
      flashcards = [parsed]
      console.log('[FlashcardGenerator] Returned single flashcard, wrapping in array')
    } else {
      console.warn('[FlashcardGenerator] Unexpected JSON structure:', parsed)
      return []
    }

    console.log('[FlashcardGenerator] Parsed ' + flashcards.length + ' flashcards')
    return flashcards
  } catch (error) {
    console.error('[FlashcardGenerator] Error parsing response:', error)
    return []
  }
}

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
  const { maxFlashcards = 20, minContentLength = 50, userApiKey = null } = options

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

    const systemPrompt =
      'You are a flashcard generator. You MUST generate MULTIPLE flashcards from educational content. MINIMUM 3 flashcards, preferably 5-10. Each important concept should have its own flashcard. Always return a JSON array with multiple flashcard objects, never just a single flashcard. Return ONLY valid JSON, no additional text.'

    // Use the unified client that routes based on userApiKey
    const rawResponse = await getChatCompletion({
      messages: [{ role: 'user', content: prompt }],
      systemPrompt,
      userApiKey,
    })

    const usingUserKey = !!userApiKey
    console.log(`[FlashcardGenerator] Using server API key: ${!usingUserKey}`)
    console.log('[FlashcardGenerator] Raw response length:', rawResponse.length)
    console.log('[FlashcardGenerator] Raw response preview:', rawResponse.substring(0, 500))

    // Parse response - parse LLM response
    const flashcards = parseFlashcardsFromResponse(rawResponse)

    if (flashcards.length === 0) {
      console.log('[FlashcardGenerator] No flashcards parsed from response')
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

  // If content is long enough (>200 chars), assume it has educational value
  // This allows Claude to decide what's educational rather than our heuristic
  if (content.length > 200) {
    return true
  }

  // Purely conversational phrases (only reject very short conversations)
  const conversationalPhrases = [
    'hello',
    'how are you',
    'good morning',
    'good afternoon',
    'good evening',
    'nice to meet',
    'see you later',
    'goodbye',
  ]

  const isOnlyConversational = conversationalPhrases.some((phrase) => lowerContent.includes(phrase))

  if (isOnlyConversational && content.length < 100) {
    return false
  }

  // For content between 50-200 chars, check for educational indicators
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
    'can',
    'will',
    'should',
    'would',
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
