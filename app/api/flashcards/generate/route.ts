import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { getMessageById } from '@/lib/db/operations/messages'
import { generateFlashcardsFromContent } from '@/lib/claude/flashcard-generator'
import {
  createFlashcard,
  getFlashcardsByMessageId,
} from '@/lib/db/operations/flashcards'
import { markMessageWithFlashcards } from '@/lib/db/operations/messages'
import { generateEmbedding } from '@/lib/embeddings/ollama'

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
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
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
      return NextResponse.json(
        { error: 'Forbidden', code: 'FORBIDDEN' },
        { status: 403 }
      )
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

    console.log(
      `[FlashcardGenerate] Generating flashcards from message ${messageId}`
    )

    // Generate flashcards using Claude/Ollama (FR-009)
    const flashcardPairs = await generateFlashcardsFromContent(
      message.content,
      { maxFlashcards }
    )

    // Check for insufficient content (FR-019)
    if (flashcardPairs.length === 0) {
      return NextResponse.json(
        {
          error:
            'Insufficient educational content for flashcard generation',
          code: 'INSUFFICIENT_CONTENT',
          details:
            'The message contains only conversational content without factual information suitable for flashcards.',
        },
        { status: 400 }
      )
    }

    // Create flashcard records in database (FR-010)
    const flashcards = await Promise.all(
      flashcardPairs.map(async (pair) => {
        const flashcard = await createFlashcard({
          userId,
          conversationId: message.conversationId,
          messageId: message.id,
          question: pair.question,
          answer: pair.answer,
        })

        // Generate question embedding asynchronously (fire and forget)
        generateQuestionEmbeddingAsync(flashcard.id, pair.question).catch(
          (error) => {
            console.error(
              `[FlashcardGenerate] Failed to generate embedding for flashcard ${flashcard.id}:`,
              error
            )
          }
        )

        return flashcard
      })
    )

    // Mark message as having flashcards (FR-017)
    await markMessageWithFlashcards(messageId)

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
          details: error.errors,
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

/**
 * Generate question embedding asynchronously
 * (Fire and forget - don't block flashcard creation)
 */
async function generateQuestionEmbeddingAsync(
  flashcardId: string,
  question: string
): Promise<void> {
  try {
    const { updateFlashcardEmbedding } = await import(
      '@/lib/db/operations/flashcards'
    )

    const embedding = await generateEmbedding(question)

    if (embedding) {
      await updateFlashcardEmbedding(flashcardId, embedding)
      console.log(
        `[FlashcardGenerate] Generated embedding for flashcard ${flashcardId}`
      )
    }
  } catch (error) {
    console.error(
      `[FlashcardGenerate] Error generating embedding for flashcard ${flashcardId}:`,
      error
    )
    // Don't throw - this is fire-and-forget
  }
}
