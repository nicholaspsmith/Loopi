import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { getGoalByIdForUser } from '@/lib/db/operations/goals'
import { getSkillTreeByGoalId } from '@/lib/db/operations/skill-trees'
import { getSkillNodeById } from '@/lib/db/operations/skill-nodes'
import * as logger from '@/lib/logger'
import { createAnthropicClient, CLAUDE_MODEL, MAX_TOKENS } from '@/lib/claude/client'

/**
 * Schema for refinement request
 */
const RefineRequestSchema = z.object({
  nodeId: z.string().uuid(),
  cards: z.array(
    z.object({
      tempId: z.string(),
      question: z.string().min(1),
      answer: z.string().min(1),
      cardType: z.enum(['flashcard', 'multiple_choice']),
      distractors: z.array(z.string()).optional(),
      approved: z.boolean().optional(),
      edited: z.boolean().optional(),
    })
  ),
  feedback: z.string().min(1).max(1000),
})

type RefinedCard = {
  tempId: string
  question: string
  answer: string
  cardType: 'flashcard' | 'multiple_choice'
  distractors?: string[]
  approved: boolean
  edited: boolean
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

    // Use Claude API
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable. Please try again later.' },
        { status: 503 }
      )
    }

    const client = createAnthropicClient(apiKey)

    try {
      const response = await client.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      })

      const textContent = response.content.find((block) => block.type === 'text')
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from API')
      }

      // Parse response
      let jsonText = textContent.text.trim()
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
    } catch (error) {
      logger.error('Card refinement API call failed', error as Error, {
        goalId,
        nodeId,
      })
      throw error
    }
  } catch (error) {
    logger.error('Card refinement failed', error as Error, {
      path: '/api/goals/[goalId]/generate/refine',
    })

    // Return error message
    return NextResponse.json(
      { error: 'Failed to refine cards. Please try again.' },
      { status: 500 }
    )
  }
}
