import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { getGoalByIdForUser } from '@/lib/db/operations/goals'
import { getSkillTreeByGoalId } from '@/lib/db/operations/skill-trees'
import { getSkillNodeById } from '@/lib/db/operations/skill-nodes'
import * as logger from '@/lib/logger'

/**
 * POST /api/goals/[goalId]/generate/refine
 *
 * Refine generated cards based on user feedback.
 * Preserves context from original generation and iterates.
 *
 * Per contracts/cards.md
 */

const CardSchema = z.object({
  tempId: z.string(),
  question: z.string(),
  answer: z.string(),
  cardType: z.enum(['flashcard', 'multiple_choice']),
  distractors: z.array(z.string()).optional(),
  approved: z.boolean(),
  edited: z.boolean(),
})

const RefineRequestSchema = z.object({
  nodeId: z.string().uuid(),
  cards: z.array(CardSchema),
  feedback: z.string().min(1, 'Feedback is required'),
})

interface RefinedCard {
  tempId: string
  question: string
  answer: string
  cardType: 'flashcard' | 'multiple_choice'
  distractors?: string[]
  approved: boolean
  edited: boolean
}

/**
 * Get Ollama API URL
 */
function getOllamaUrl(): string {
  return process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
}

/**
 * Get the model to use for generation
 */
function getModel(): string {
  return process.env.OLLAMA_CHAT_MODEL || 'llama3'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { goalId } = await params

    // Validate goal belongs to user
    const goal = await getGoalByIdForUser(goalId, session.user.id)
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const parseResult = RefineRequestSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.issues[0].message },
        { status: 400 }
      )
    }

    const { nodeId, cards, feedback } = parseResult.data

    // Validate node exists and belongs to goal's skill tree
    const skillTree = await getSkillTreeByGoalId(goalId)
    if (!skillTree) {
      return NextResponse.json({ error: 'Goal has no skill tree' }, { status: 404 })
    }

    const node = await getSkillNodeById(nodeId)
    if (!node || node.treeId !== skillTree.id) {
      return NextResponse.json({ error: 'Node not found in this goal' }, { status: 404 })
    }

    logger.info('Card refinement started', {
      goalId,
      nodeId,
      nodeTitle: node.title,
      cardCount: cards.length,
      feedback,
    })

    // Build refinement prompt with context
    const existingCardsContext = cards
      .map(
        (card, i) =>
          `Card ${i + 1}:\nQ: ${card.question}\nA: ${card.answer}${
            card.distractors ? `\nDistractors: ${card.distractors.join(', ')}` : ''
          }`
      )
      .join('\n\n')

    const prompt = `You are an expert educator refining flashcards for spaced repetition learning.

Topic: ${node.title}
Learning Goal: ${goal.title}

CURRENT CARDS:
${existingCardsContext}

USER FEEDBACK:
${feedback}

Please improve these cards based on the user's feedback. Apply the feedback to each card where applicable.

Return JSON in this format:
{
  "cards": [
    {"question": "Improved question...", "answer": "Improved answer..."${cards.some((c) => c.cardType === 'multiple_choice') ? ', "distractors": ["wrong1", "wrong2", "wrong3"]' : ''}}
  ]
}

Maintain the same number of cards (${cards.length}). Return ONLY valid JSON, no markdown.`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)

    try {
      const response = await fetch(`${getOllamaUrl()}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: getModel(),
          prompt,
          stream: false,
          options: {
            temperature: 0.7,
            num_predict: 2048,
          },
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.response) {
        throw new Error('Empty response from Ollama')
      }

      // Parse response
      let jsonText = data.response.trim()
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

      // Map refined cards back to original format with tempIds preserved
      const refinedCards: RefinedCard[] = parsed.cards.map(
        (card: { question: string; answer: string; distractors?: string[] }, index: number) => {
          const originalCard = cards[index] || cards[0]
          return {
            tempId: originalCard?.tempId || `temp-refined-${Date.now()}-${index}`,
            question: card.question || originalCard?.question || '',
            answer: card.answer || originalCard?.answer || '',
            cardType: originalCard?.cardType || 'flashcard',
            distractors: card.distractors || originalCard?.distractors,
            approved: true,
            edited: false,
          }
        }
      )

      logger.info('Card refinement completed', {
        goalId,
        nodeId,
        nodeTitle: node.title,
        refinedCount: refinedCards.length,
        feedback,
      })

      return NextResponse.json({
        cards: refinedCards,
        refinementApplied: feedback,
      })
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    logger.error('Card refinement failed', error as Error, {
      path: '/api/goals/[goalId]/generate/refine',
    })

    // Return original cards on failure with error message
    return NextResponse.json(
      { error: 'Failed to refine cards. Try adjusting your feedback.' },
      { status: 500 }
    )
  }
}
