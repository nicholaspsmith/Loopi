import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getUserApiKeyRecord, saveUserApiKey, deleteUserApiKey } from '@/lib/db/operations/api-keys'
import { validateApiKey } from '@/lib/validation/api-key'
import { z } from 'zod'

/**
 * API Route: User API Key Settings
 *
 * Handles CRUD operations for user Claude API keys
 */

const SaveApiKeySchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
})

/**
 * GET /api/settings/api-key
 *
 * Returns user's API key status (without decrypting the key)
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const apiKeyRecord = await getUserApiKeyRecord(session.user.id)

    if (!apiKeyRecord) {
      return NextResponse.json({
        success: true,
        data: {
          exists: false,
        },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        exists: true,
        keyPreview: apiKeyRecord.keyPreview,
        isValid: apiKeyRecord.isValid,
        lastValidatedAt: apiKeyRecord.lastValidatedAt?.toISOString() || null,
      },
    })
  } catch (error) {
    console.error('Error fetching API key:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch API key' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/settings/api-key
 *
 * Save or update user's Claude API key
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validation = SaveApiKeySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error.errors[0]?.message || 'Invalid request',
        },
        { status: 400 }
      )
    }

    const { apiKey } = validation.data

    // Validate API key format
    const keyValidation = validateApiKey(apiKey)
    if (!keyValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: keyValidation.error || 'Invalid API key format',
        },
        { status: 400 }
      )
    }

    // Save the API key (encrypted)
    const savedKey = await saveUserApiKey(session.user.id, apiKey)

    return NextResponse.json(
      {
        success: true,
        data: {
          message: 'API key saved successfully',
          keyPreview: savedKey.keyPreview,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error saving API key:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to save API key' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/settings/api-key
 *
 * Delete user's Claude API key
 */
export async function DELETE(_request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const deleted = await deleteUserApiKey(session.user.id)

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'API key not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'API key deleted successfully',
      },
    })
  } catch (error) {
    console.error('Error deleting API key:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete API key' },
      { status: 500 }
    )
  }
}
