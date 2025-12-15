import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import {
  getMessagesByConversationId,
  createMessage,
} from '@/lib/db/operations/messages'
import {
  getConversationById,
  conversationBelongsToUser,
} from '@/lib/db/operations/conversations'
import { success, error as errorResponse } from '@/lib/api/response'
import { validate } from '@/lib/validation/helpers'
import { AuthenticationError, AuthorizationError, NotFoundError } from '@/lib/errors'
import { streamChatCompletion, toClaudeMessages } from '@/lib/claude/client'
import { getSystemPrompt } from '@/lib/claude/prompts'

/**
 * GET /api/chat/conversations/[conversationId]/messages
 *
 * Get all messages for a conversation
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      throw new AuthenticationError('Not authenticated')
    }

    const { conversationId } = await params

    // Verify conversation exists and belongs to user
    const conversation = await getConversationById(conversationId)

    if (!conversation) {
      throw new NotFoundError('Conversation', conversationId)
    }

    if (conversation.userId !== session.user.id) {
      throw new AuthorizationError('Not authorized to access this conversation')
    }

    const messages = await getMessagesByConversationId(conversationId)

    return success({ messages })
  } catch (err) {
    return errorResponse(err)
  }
}

/**
 * POST /api/chat/conversations/[conversationId]/messages
 *
 * Send a message and stream Claude's response using Server-Sent Events
 */
const SendMessageSchema = z.object({
  content: z.string().min(1).max(50000),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      throw new AuthenticationError('Not authenticated')
    }

    const { conversationId } = await params
    const userId = session.user.id // Capture userId for use in callbacks

    // Verify conversation exists and belongs to user
    const belongsToUser = await conversationBelongsToUser(conversationId, userId)

    if (!belongsToUser) {
      throw new NotFoundError('Conversation', conversationId)
    }

    const body = await request.json()
    const data = validate(SendMessageSchema, body)

    // Create user message
    await createMessage({
      conversationId,
      userId,
      role: 'user',
      content: data.content,
    })

    // Get conversation history for context
    const conversationHistory = await getMessagesByConversationId(conversationId)

    // Convert to Claude format
    const claudeMessages = toClaudeMessages(conversationHistory)

    // Create a readable stream for SSE
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          await streamChatCompletion({
            messages: claudeMessages,
            systemPrompt: getSystemPrompt('chat'),
            onChunk: (text) => {
              // Send text chunk via SSE
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`)
              )
            },
            onComplete: async (text) => {
              // Save assistant message to database
              const assistantMessage = await createMessage({
                conversationId,
                userId,
                role: 'assistant',
                content: text,
              })

              // Send completion event
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'complete',
                    messageId: assistantMessage.id,
                  })}\n\n`
                )
              )

              controller.close()
            },
            onError: (error) => {
              // Send error event
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'error',
                    error: error.message,
                  })}\n\n`
                )
              )
              controller.close()
            },
          })
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: 'error',
                error: error instanceof Error ? error.message : 'Unknown error',
              })}\n\n`
            )
          )
          controller.close()
        }
      },
    })

    // Return SSE stream
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    return errorResponse(err)
  }
}
