/**
 * Distractor Generator Service
 *
 * Generates plausible but incorrect answer options for multiple choice study mode.
 * Uses Claude API to create contextually relevant distractors.
 *
 * @module lib/ai/distractor-generator
 */

import { getChatCompletion } from '@/lib/claude/client'

// ============================================================================
// Types
// ============================================================================

export interface DistractorGeneratorOptions {
  maxTokens?: number // Default: 256
  temperature?: number // Default: 0.9
  timeoutMs?: number // Default: 5000
}

export interface DistractorResult {
  success: boolean
  distractors?: [string, string, string]
  error?: string
  generationTimeMs: number
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_OPTIONS: Required<DistractorGeneratorOptions> = {
  maxTokens: 256,
  temperature: 0.9,
  timeoutMs: 15000, // 15 seconds - API calls need more time
}

// ============================================================================
// Prompt Building (T006)
// ============================================================================

/**
 * Builds the prompt for distractor generation.
 *
 * Per research.md, the prompt should:
 * - Request exactly 3 distractors
 * - Ensure distractors are plausible but incorrect
 * - Be contextually relevant to the topic
 * - Return JSON format for reliable parsing
 */
export function buildDistractorPrompt(question: string, answer: string): string {
  // Security: Limit input length to prevent prompt injection attacks
  const MAX_QUESTION_LENGTH = 500
  const MAX_ANSWER_LENGTH = 200
  const SHORT_ANSWER_THRESHOLD = 10

  const sanitizedQuestion = question.slice(0, MAX_QUESTION_LENGTH).trim()
  const sanitizedAnswer = answer.slice(0, MAX_ANSWER_LENGTH).trim()

  // FR-012: Handle short answers with context-aware prompts
  const isShortAnswer = sanitizedAnswer.length <= SHORT_ANSWER_THRESHOLD
  const isNumericAnswer = /^\d+(\.\d+)?$/.test(sanitizedAnswer)
  const isYesNoAnswer = /^(yes|no)$/i.test(sanitizedAnswer)

  if (isShortAnswer) {
    console.info('[Distractor] Short answer detected', {
      answerLength: sanitizedAnswer.length,
      isNumeric: isNumericAnswer,
      isYesNo: isYesNoAnswer,
    })
  }

  let additionalGuidance = ''
  if (isNumericAnswer) {
    const num = parseFloat(sanitizedAnswer)
    additionalGuidance = `
IMPORTANT: The correct answer is a number (${num}). Generate plausible but incorrect numbers:
- Use nearby values (e.g., if answer is 42, consider 40, 44, 38)
- Consider common mathematical errors (off-by-one, wrong order of magnitude)
- Maintain the same format (integers vs decimals)`
  } else if (isYesNoAnswer) {
    additionalGuidance = `
IMPORTANT: The correct answer is "${sanitizedAnswer}". Generate full-sentence alternatives:
- Create "Yes, because X" or "No, because X" style responses
- Each distractor should give a plausible but incorrect reasoning
- Make the reasoning sound logical but be factually wrong for this question`
  } else if (isShortAnswer) {
    additionalGuidance = `
IMPORTANT: The correct answer is very short ("${sanitizedAnswer}"). 
- Generate distractors of similar brevity
- Focus on closely related but incorrect terms from the same domain
- Consider common misconceptions or confusable items`
  }

  return `You are generating multiple choice options for a flashcard study system.

Question: ${sanitizedQuestion}
Correct Answer: ${sanitizedAnswer}

Generate exactly 3 plausible but INCORRECT answer options (distractors) for this flashcard.

Requirements:
- Each distractor must be related to the topic but factually incorrect
- Distractors should be similar in length and format to the correct answer
- Distractors must be distinct from each other
- Distractors must NOT be the same as the correct answer (even with different capitalization)
- If the answer is technical, use related technical terms
- If the answer is a name, use other names from the same domain
- If the answer is a number, use plausible but incorrect numbers
${additionalGuidance}
Respond with ONLY a JSON object in this exact format:
{"distractors": ["distractor1", "distractor2", "distractor3"]}`
}

// ============================================================================
// Validation (T005)
// ============================================================================

/**
 * Validates that distractors meet quality requirements.
 *
 * Per data-model.md validation rules:
 * - Must be exactly 3 distractors
 * - Each must be non-empty string
 * - No distractor should match correct answer (case-insensitive)
 * - No duplicate distractors
 */
export function validateDistractors(distractors: string[], correctAnswer: string): boolean {
  // Must have exactly 3 distractors
  if (distractors.length !== 3) return false

  // Each distractor must be non-empty
  if (distractors.some((d) => !d.trim())) return false

  const normalizedAnswer = correctAnswer.toLowerCase().trim()
  const normalizedDistractors = distractors.map((d) => d.toLowerCase().trim())

  // No distractor should match the correct answer
  if (normalizedDistractors.includes(normalizedAnswer)) return false

  // No duplicates among distractors
  if (new Set(normalizedDistractors).size !== 3) return false

  return true
}

// ============================================================================
// Main Generation Function (T003, T004)
// ============================================================================

/**
 * Generates 3 plausible but incorrect distractors for a flashcard.
 *
 * @param question - The flashcard question (for context)
 * @param answer - The correct answer
 * @param options - Generation options (timeout, temperature, etc.)
 * @returns DistractorResult with success status and distractors or error
 */
export async function generateDistractors(
  question: string,
  answer: string,
  options: DistractorGeneratorOptions = {}
): Promise<DistractorResult> {
  const startTime = Date.now()
  const opts = { ...DEFAULT_OPTIONS, ...options }

  // Input validation
  if (!question.trim() || !answer.trim()) {
    return {
      success: false,
      error: 'Question and answer must be non-empty',
      generationTimeMs: Date.now() - startTime,
    }
  }

  const prompt = buildDistractorPrompt(question, answer)

  try {
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Generation timeout')), opts.timeoutMs)
    })

    // Race between API call and timeout
    const responsePromise = getChatCompletion({
      messages: [{ role: 'user', content: prompt }],
      systemPrompt:
        'You are a helpful assistant that generates multiple choice distractors. Always respond with valid JSON only.',
    })

    const response = await Promise.race([responsePromise, timeoutPromise])

    // Parse JSON response
    let parsed: { distractors?: string[] }
    try {
      // Handle potential markdown code blocks in response
      const jsonStr = response.replace(/```json\n?|\n?```/g, '').trim()
      parsed = JSON.parse(jsonStr)
    } catch {
      console.warn('[Distractor] Failed to parse JSON response:', response)
      return {
        success: false,
        error: 'Invalid JSON response from AI',
        generationTimeMs: Date.now() - startTime,
      }
    }

    // Validate structure
    if (!parsed.distractors || !Array.isArray(parsed.distractors)) {
      return {
        success: false,
        error: 'Response missing distractors array',
        generationTimeMs: Date.now() - startTime,
      }
    }

    // Validate distractors
    if (!validateDistractors(parsed.distractors, answer)) {
      console.warn('[Distractor] Validation failed for:', parsed.distractors)
      return {
        success: false,
        error: 'Generated distractors failed validation',
        generationTimeMs: Date.now() - startTime,
      }
    }

    // Success - log per plan.md observability section
    const generationTimeMs = Date.now() - startTime
    console.info('[Distractor] Generation success', {
      questionLength: question.length,
      generationTimeMs,
    })

    return {
      success: true,
      distractors: parsed.distractors as [string, string, string],
      generationTimeMs,
    }
  } catch (error) {
    const generationTimeMs = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Log failure per plan.md observability section
    console.warn('[Distractor] Generation failed', {
      error: errorMessage,
      questionLength: question.length,
      generationTimeMs,
      fallbackTriggered: true,
    })

    return {
      success: false,
      error: errorMessage,
      generationTimeMs,
    }
  }
}

/**
 * Generate distractors and persist them to the database.
 * Combines AI generation with database storage in a single operation.
 *
 * @param flashcardId - The ID of the flashcard to associate distractors with
 * @param question - The flashcard question
 * @param answer - The correct answer
 * @param options - Optional generation parameters
 * @returns DistractorResult with success/error and generation time
 */
export async function generateAndPersistDistractors(
  flashcardId: string,
  question: string,
  answer: string,
  options: DistractorGeneratorOptions = {}
): Promise<DistractorResult> {
  const startTime = Date.now()

  console.info('[Distractor] Starting generation and persistence', {
    flashcardId,
    questionLength: question.length,
    answerLength: answer.length,
  })

  // Generate distractors using AI
  const result = await generateDistractors(question, answer, options)

  if (!result.success || !result.distractors) {
    console.warn('[Distractor] Generation failed, skipping persistence', {
      flashcardId,
      error: result.error,
      generationTimeMs: result.generationTimeMs,
    })
    return result
  }

  // Persist to database
  try {
    const { createDistractors } = await import('@/lib/db/operations/distractors')
    await createDistractors(flashcardId, result.distractors)

    const totalTimeMs = Date.now() - startTime
    console.info('[Distractor] Generation and persistence successful', {
      flashcardId,
      generationTimeMs: result.generationTimeMs,
      totalTimeMs,
    })

    return {
      success: true,
      distractors: result.distractors,
      generationTimeMs: totalTimeMs,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Database persistence failed'
    const totalTimeMs = Date.now() - startTime

    console.error('[Distractor] Persistence failed', {
      flashcardId,
      error: errorMessage,
      generationTimeMs: result.generationTimeMs,
      totalTimeMs,
    })

    return {
      success: false,
      error: errorMessage,
      generationTimeMs: totalTimeMs,
    }
  }
}
