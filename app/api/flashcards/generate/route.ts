import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { getMessageById } from '@/lib/db/operations/messages'
import { generateFlashcardsFromContent } from '@/lib/claude/flashcard-generator'
import { createFlashcard, getFlashcardsByMessageId } from '@/lib/db/operations/flashcards'

/**
 * POST /api/flashcards/generate
 *
 * Generate flashcards from a Claude (assistant) message
 *
 * Maps to FR-008, FR-009, FR-017, FR-018, FR-019
 */

const GenerateRequestSchema = z.object({
  messageId: z.string().uuid(),
  maxFlashcards: z.number().int().min(1).max(50).optional().default(20),
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 })
    }

    const userId = session.user.id

    // Parse and validate request body
    const body = await request.json()
    const { messageId, maxFlashcards } = GenerateRequestSchema.parse(body)

    // Get the message
    const message = await getMessageById(messageId)

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found', code: 'MESSAGE_NOT_FOUND' },
        { status: 404 }
      )
    }

    // Verify message belongs to user
    if (message.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 })
    }

    // Verify message is from assistant (FR-008)
    if (message.role !== 'assistant') {
      return NextResponse.json(
        {
          error: 'Can only generate flashcards from Claude (assistant) messages',
          code: 'INVALID_MESSAGE_ROLE',
        },
        { status: 400 }
      )
    }

    // Check if flashcards already generated (FR-017)
    const existingFlashcards = await getFlashcardsByMessageId(messageId)
    if (existingFlashcards.length > 0) {
      return NextResponse.json(
        {
          error: 'Flashcards have already been generated from this message',
          code: 'FLASHCARDS_ALREADY_EXIST',
          existingFlashcardIds: existingFlashcards.map((fc) => fc.id),
        },
        { status: 409 }
      )
    }

    console.log(`[FlashcardGenerate] Generating flashcards from message ${messageId}`)

    // Generate flashcards using Claude (FR-009)
    // Uses server-side ANTHROPIC_API_KEY for content generation
    const flashcardPairs = await generateFlashcardsFromContent(message.content, {
      maxFlashcards,
      userApiKey: process.env.ANTHROPIC_API_KEY,
    })

    // Check for insufficient content (FR-019)
    if (flashcardPairs.length === 0) {
      return NextResponse.json(
        {
          error: 'Insufficient educational content for flashcard generation',
          code: 'INSUFFICIENT_CONTENT',
          details:
            'The message contains only conversational content without factual information suitable for flashcards.',
        },
        { status: 400 }
      )
    }

    // Create flashcard records in database (FR-010)
    // Note: createFlashcard handles embedding generation via syncFlashcardToLanceDB
    const flashcards = await Promise.all(
      flashcardPairs.map(async (pair) => {
        return createFlashcard({
          userId,
          conversationId: message.conversationId,
          messageId: message.id,
          question: pair.question,
          answer: pair.answer,
        })
      })
    )

    // Note: We don't need to mark the message with hasFlashcards flag
    // Duplicate prevention (FR-017) is handled by checking existing flashcards above
    // The hasFlashcards field can be populated when fetching messages if needed for UI optimization

    console.log(
      `[FlashcardGenerate] Created ${flashcards.length} flashcards from message ${messageId}`
    )

    // Return success with count (FR-018)
    return NextResponse.json(
      {
        success: true,
        flashcards,
        count: flashcards.length,
        sourceMessage: {
          id: messageId,
          conversationId: message.conversationId,
          hasFlashcards: true,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[FlashcardGenerate] Error:', error)

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          code: 'VALIDATION_ERROR',
          details: error.issues,
        },
        { status: 400 }
      )
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'Failed to generate flashcards',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }
}
