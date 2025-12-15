import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import {
  createConversation,
  getConversationsByUserId,
} from '@/lib/db/operations/conversations'
import { success, error as errorResponse } from '@/lib/api/response'
import { validate } from '@/lib/validation/helpers'
import { AuthenticationError } from '@/lib/errors'

/**
 * GET /api/chat/conversations
 *
 * Get all conversations for the authenticated user
 */
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      throw new AuthenticationError('Not authenticated')
    }

    const conversations = await getConversationsByUserId(session.user.id)

    return success({ conversations })
  } catch (err) {
    return errorResponse(err)
  }
}

/**
 * POST /api/chat/conversations
 *
 * Create a new conversation
 */
const CreateConversationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      throw new AuthenticationError('Not authenticated')
    }

    const body = await request.json()
    const data = validate(CreateConversationSchema, body)

    const conversation = await createConversation({
      userId: session.user.id,
      title: data.title,
    })

    return success({ conversation }, 201)
  } catch (err) {
    return errorResponse(err)
  }
}
