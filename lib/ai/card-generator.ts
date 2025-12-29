/**
 * AI Card Generator
 *
 * Generates flashcards and multiple choice questions scoped to skill tree nodes.
 * Uses the Anthropic SDK for AI-powered card generation.
 */

import * as logger from '@/lib/logger'
import { getChatCompletion, CLAUDE_MODEL } from '@/lib/claude/client'

/**
 * Card type for generation
 */
export type CardType = 'flashcard' | 'multiple_choice' | 'scenario'

/**
 * Generated flashcard from LLM
 */
export interface GeneratedFlashcard {
  question: string
  answer: string
  cardType: 'flashcard'
}

/**
 * Generated multiple choice card from LLM
 */
export interface GeneratedMultipleChoice {
  question: string
  answer: string
  distractors: string[] // 3 plausible wrong answers
  cardType: 'multiple_choice'
}

/**
 * Generated scenario card from LLM
 */
export interface GeneratedScenario {
  context: string // The scenario setup
  question: string
  answer: string
  cardType: 'scenario'
}

export type GeneratedCard = GeneratedFlashcard | GeneratedMultipleChoice | GeneratedScenario

/**
 * Card generation result
 */
export interface CardGenerationResult {
  cards: GeneratedCard[]
  metadata: {
    model: string
    generationTimeMs: number
    cardCount: number
    retryCount: number
  }
}

/**
 * Options for card generation
 */
export interface CardGenerationOptions {
  nodeTitle: string
  nodeDescription?: string
  goalTitle: string
  cardType: CardType
  count: number
  maxRetries?: number
  timeout?: number
}

const DEFAULT_OPTIONS = {
  maxRetries: 3,
  timeout: 60000,
}

/**
 * Get the model name being used
 */
function getModelName(): string {
  return CLAUDE_MODEL
}

/**
 * Build prompt for flashcard generation
 */
function buildFlashcardPrompt(
  nodeTitle: string,
  nodeDescription: string | undefined,
  goalTitle: string,
  count: number
): string {
  const context = nodeDescription
    ? `Topic: ${nodeTitle}\nDescription: ${nodeDescription}\nLearning Goal: ${goalTitle}`
    : `Topic: ${nodeTitle}\nLearning Goal: ${goalTitle}`

  return `You are an expert educator creating flashcards for spaced repetition learning.

${context}

Generate ${count} flashcards for this topic. Each flashcard should:
- Test a single, clear concept
- Have a concise question (1-2 sentences)
- Have a clear, accurate answer (1-3 sentences)
- Progress from basic to advanced concepts

Return JSON in this format:
{
  "cards": [
    {"question": "What is...?", "answer": "It is..."},
    {"question": "How does...?", "answer": "It works by..."}
  ]
}

Generate ${count} high-quality flashcards. Return ONLY valid JSON, no markdown.`
}

/**
 * Build prompt for multiple choice generation
 * From research.md: Distractors should be plausible but clearly incorrect
 */
function buildMultipleChoicePrompt(
  nodeTitle: string,
  nodeDescription: string | undefined,
  goalTitle: string,
  count: number
): string {
  const context = nodeDescription
    ? `Topic: ${nodeTitle}\nDescription: ${nodeDescription}\nLearning Goal: ${goalTitle}`
    : `Topic: ${nodeTitle}\nLearning Goal: ${goalTitle}`

  return `You are an expert educator creating multiple choice questions for learning.

${context}

Generate ${count} multiple choice questions for this topic. Each question should:
- Test understanding, not just recall
- Have one clearly correct answer
- Have 3 plausible but incorrect distractors
- Distractors should be related to the topic
- Distractors should be similar in length to the correct answer

Return JSON in this format:
{
  "cards": [
    {
      "question": "What is the primary purpose of...?",
      "answer": "Correct answer here",
      "distractors": ["Plausible wrong 1", "Plausible wrong 2", "Plausible wrong 3"]
    }
  ]
}

Generate ${count} high-quality multiple choice questions. Return ONLY valid JSON, no markdown.`
}

/**
 * Build prompt for scenario-based questions
 */
function buildScenarioPrompt(
  nodeTitle: string,
  nodeDescription: string | undefined,
  goalTitle: string,
  count: number
): string {
  const context = nodeDescription
    ? `Topic: ${nodeTitle}\nDescription: ${nodeDescription}\nLearning Goal: ${goalTitle}`
    : `Topic: ${nodeTitle}\nLearning Goal: ${goalTitle}`

  return `You are an expert educator creating scenario-based questions for applied learning.

${context}

Generate ${count} scenario-based questions for this topic. Each question should:
- Present a realistic situation or problem
- Require applying knowledge to solve
- Have a context (2-3 sentences describing the scenario)
- Have a specific question about the scenario
- Have a clear, actionable answer

Return JSON in this format:
{
  "cards": [
    {
      "context": "You are working on a project and...",
      "question": "What should you do to...?",
      "answer": "You should..."
    }
  ]
}

Generate ${count} high-quality scenario questions. Return ONLY valid JSON, no markdown.`
}

/**
 * Parse flashcard response
 */
function parseFlashcardResponse(responseText: string): GeneratedFlashcard[] {
  const json = extractJson(responseText)
  const parsed = JSON.parse(json)

  if (!parsed.cards || !Array.isArray(parsed.cards)) {
    throw new Error('Invalid response: missing cards array')
  }

  return parsed.cards.map((card: unknown) => {
    if (typeof card !== 'object' || card === null) {
      throw new Error('Invalid card: not an object')
    }

    const c = card as Record<string, unknown>

    if (typeof c.question !== 'string' || typeof c.answer !== 'string') {
      throw new Error('Invalid card: missing question or answer')
    }

    return {
      question: c.question,
      answer: c.answer,
      cardType: 'flashcard' as const,
    }
  })
}

/**
 * Parse multiple choice response
 */
function parseMultipleChoiceResponse(responseText: string): GeneratedMultipleChoice[] {
  const json = extractJson(responseText)
  const parsed = JSON.parse(json)

  if (!parsed.cards || !Array.isArray(parsed.cards)) {
    throw new Error('Invalid response: missing cards array')
  }

  return parsed.cards.map((card: unknown) => {
    if (typeof card !== 'object' || card === null) {
      throw new Error('Invalid card: not an object')
    }

    const c = card as Record<string, unknown>

    if (
      typeof c.question !== 'string' ||
      typeof c.answer !== 'string' ||
      !Array.isArray(c.distractors)
    ) {
      throw new Error('Invalid MC card: missing question, answer, or distractors')
    }

    if (c.distractors.length !== 3) {
      throw new Error(`Invalid MC card: expected 3 distractors, got ${c.distractors.length}`)
    }

    return {
      question: c.question,
      answer: c.answer,
      distractors: c.distractors as string[],
      cardType: 'multiple_choice' as const,
    }
  })
}

/**
 * Parse scenario response
 */
function parseScenarioResponse(responseText: string): GeneratedScenario[] {
  const json = extractJson(responseText)
  const parsed = JSON.parse(json)

  if (!parsed.cards || !Array.isArray(parsed.cards)) {
    throw new Error('Invalid response: missing cards array')
  }

  return parsed.cards.map((card: unknown) => {
    if (typeof card !== 'object' || card === null) {
      throw new Error('Invalid card: not an object')
    }

    const c = card as Record<string, unknown>

    if (
      typeof c.context !== 'string' ||
      typeof c.question !== 'string' ||
      typeof c.answer !== 'string'
    ) {
      throw new Error('Invalid scenario card: missing context, question, or answer')
    }

    return {
      context: c.context,
      question: c.question,
      answer: c.answer,
      cardType: 'scenario' as const,
    }
  })
}

/**
 * Extract JSON from response (handles markdown code blocks)
 */
function extractJson(text: string): string {
  let jsonText = text.trim()

  if (jsonText.startsWith('```')) {
    const match = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      jsonText = match[1].trim()
    }
  }

  return jsonText
}

/**
 * Generate cards for a skill tree node
 * Uses the Anthropic SDK for AI-powered card generation
 */
export async function generateCards(options: CardGenerationOptions): Promise<CardGenerationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const startTime = Date.now()
  const model = getModelName()

  let lastError: Error | null = null
  let retryCount = 0

  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      logger.info('Generating cards', {
        nodeTitle: options.nodeTitle,
        cardType: options.cardType,
        count: options.count,
        model,
        attempt: attempt + 1,
      })

      // Build appropriate prompt
      let prompt: string
      switch (options.cardType) {
        case 'flashcard':
          prompt = buildFlashcardPrompt(
            options.nodeTitle,
            options.nodeDescription,
            options.goalTitle,
            options.count
          )
          break
        case 'multiple_choice':
          prompt = buildMultipleChoicePrompt(
            options.nodeTitle,
            options.nodeDescription,
            options.goalTitle,
            options.count
          )
          break
        case 'scenario':
          prompt = buildScenarioPrompt(
            options.nodeTitle,
            options.nodeDescription,
            options.goalTitle,
            options.count
          )
          break
      }

      const systemPrompt = `You are an expert educator creating study materials. Return ONLY valid JSON, no markdown code blocks or explanations.`

      const responseText = await getChatCompletion({
        messages: [{ role: 'user', content: prompt }],
        systemPrompt,
      })

      if (!responseText) {
        throw new Error('Empty response from LLM')
      }

      // Parse based on card type
      let cards: GeneratedCard[]
      switch (options.cardType) {
        case 'flashcard':
          cards = parseFlashcardResponse(responseText)
          break
        case 'multiple_choice':
          cards = parseMultipleChoiceResponse(responseText)
          break
        case 'scenario':
          cards = parseScenarioResponse(responseText)
          break
      }

      logger.info('Cards generated successfully', {
        nodeTitle: options.nodeTitle,
        cardType: options.cardType,
        cardCount: cards.length,
        model,
        generationTimeMs: Date.now() - startTime,
      })

      return {
        cards,
        metadata: {
          model,
          generationTimeMs: Date.now() - startTime,
          cardCount: cards.length,
          retryCount,
        },
      }
    } catch (error) {
      // Handle ClassifiedError from Claude client (has .message property but isn't Error instance)
      if (error instanceof Error) {
        lastError = error
      } else if (error && typeof error === 'object' && 'message' in error) {
        lastError = new Error(String((error as { message: string }).message))
      } else {
        lastError = new Error(String(error))
      }
      retryCount = attempt + 1

      logger.warn('Card generation attempt failed', {
        nodeTitle: options.nodeTitle,
        cardType: options.cardType,
        model,
        attempt: attempt + 1,
        error: lastError.message,
      })

      if (attempt < opts.maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
      }
    }
  }

  logger.error('Card generation failed after all retries', lastError!, {
    nodeTitle: options.nodeTitle,
    cardType: options.cardType,
    model,
    retryCount,
  })

  throw new Error(
    `Failed to generate cards after ${opts.maxRetries} attempts: ${lastError?.message}`
  )
}

/**
 * Generate mixed cards (combination of types)
 */
export async function generateMixedCards(
  options: Omit<CardGenerationOptions, 'cardType'> & {
    flashcardCount?: number
    multipleChoiceCount?: number
    scenarioCount?: number
  }
): Promise<CardGenerationResult> {
  const startTime = Date.now()
  const allCards: GeneratedCard[] = []
  let totalRetries = 0

  const tasks: Array<{ type: CardType; count: number }> = []

  if (options.flashcardCount && options.flashcardCount > 0) {
    tasks.push({ type: 'flashcard', count: options.flashcardCount })
  }
  if (options.multipleChoiceCount && options.multipleChoiceCount > 0) {
    tasks.push({ type: 'multiple_choice', count: options.multipleChoiceCount })
  }
  if (options.scenarioCount && options.scenarioCount > 0) {
    tasks.push({ type: 'scenario', count: options.scenarioCount })
  }

  for (const task of tasks) {
    const result = await generateCards({
      ...options,
      cardType: task.type,
      count: task.count,
    })
    allCards.push(...result.cards)
    totalRetries += result.metadata.retryCount
  }

  return {
    cards: allCards,
    metadata: {
      model: getModelName(),
      generationTimeMs: Date.now() - startTime,
      cardCount: allCards.length,
      retryCount: totalRetries,
    },
  }
}
