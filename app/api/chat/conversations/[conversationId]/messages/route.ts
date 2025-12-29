import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { getMessagesByConversationId, createMessage } from '@/lib/db/operations/messages'
import { getFlashcardsByMessageId } from '@/lib/db/operations/flashcards'
import { getConversationById, conversationBelongsToUser } from '@/lib/db/operations/conversations'
import { success, error as errorResponse } from '@/lib/api/response'
import { validate } from '@/lib/validation/helpers'
import { AuthenticationError, AuthorizationError, NotFoundError } from '@/lib/errors'
import { streamChatCompletion, toClaudeMessages, type ClassifiedError } from '@/lib/claude/client'
import { getSystemPrompt } from '@/lib/claude/prompts'
import { buildRAGContext, shouldUseRAG } from '@/lib/claude/rag'

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

    // Populate hasFlashcards field by checking for existing flashcards
    const messagesWithFlashcards = await Promise.all(
      messages.map(async (message) => {
        // Only check for assistant messages
        if (message.role === 'assistant') {
          const flashcards = await getFlashcardsByMessageId(message.id)
          return {
            ...message,
            hasFlashcards: flashcards.length > 0,
          }
        }
        return message
      })
    )

    return success({ messages: messagesWithFlashcards })
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

    // Use server-side API key if available
    const apiKey = process.env.ANTHROPIC_API_KEY
    const aiProvider = 'claude' // Always use Claude

    // Create user message
    const userMessage = await createMessage({
      conversationId,
      userId,
      role: 'user',
      content: data.content,
    })

    // Get conversation history for context (previous messages only)
    const previousMessages = await getMessagesByConversationId(conversationId)

    // Build complete conversation including the new user message
    const conversationHistory = [...previousMessages, userMessage]

    // Convert to Claude format
    const claudeMessages = toClaudeMessages(conversationHistory)

    // Build RAG context from similar past conversations
    const useRAG = shouldUseRAG(data.content)
    const ragContext = await buildRAGContext(data.content, userId, {
      enabled: useRAG,
      maxMessages: 5,
      maxTokens: 2000,
    })

    // Combine base system prompt with RAG context
    const baseSystemPrompt = getSystemPrompt('chat')
    const systemPrompt = ragContext.context
      ? `${baseSystemPrompt}\n\n${ragContext.context}`
      : baseSystemPrompt

    if (ragContext.enabled && ragContext.sourceMessages.length > 0) {
      console.log(`[RAG] Using context from ${ragContext.sourceMessages.length} similar messages`)
    }

    // Create a readable stream for SSE
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          await streamChatCompletion({
            messages: claudeMessages,
            systemPrompt,
            userApiKey: apiKey, // Use server-side API key
            onChunk: (text) => {
              // Send text chunk via SSE
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`)
              )
            },
            onComplete: async (text) => {
              // Save assistant message to database with provider info
              const assistantMessage = await createMessage({
                conversationId,
                userId,
                role: 'assistant',
                content: text,
                aiProvider,
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
              // Handle classified errors from Claude API (T060)
              const isClassifiedError = 'type' in error && 'shouldInvalidateKey' in error
              const classifiedError = error as ClassifiedError

              // Send error event with appropriate message
              const errorMessage = isClassifiedError ? classifiedError.message : error.message

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: 'error',
                    error: errorMessage,
                    errorType: isClassifiedError ? classifiedError.type : 'unknown',
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
