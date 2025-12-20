import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { validateClaudeApiKey } from '@/lib/claude/validation'

/**
 * POST /api/settings/api-key/validate
 *
 * Validates a Claude API key by checking format and making a test API call
 *
 * Request body:
 * - apiKey: string - The Claude API key to validate
 *
 * Response codes:
 * - 200: API key is valid
 * - 400: Invalid format or validation error
 * - 401: Not authenticated OR authentication with API failed
 * - 500: Server error
 */
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

    // Parse request body
    let body: { apiKey?: string }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Validate request
    if (!body.apiKey && body.apiKey !== '') {
      return NextResponse.json(
        { error: 'API key is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // Validate the API key
    const result = await validateClaudeApiKey(body.apiKey)

    // Handle validation results
    if (!result.valid) {
      // Format errors return 400
      if (result.code === 'INVALID_FORMAT') {
        return NextResponse.json(
          {
            valid: false,
            error: result.error,
            code: result.code,
          },
          { status: 400 }
        )
      }

      // Authentication failures return 401
      if (result.code === 'AUTHENTICATION_FAILED') {
        return NextResponse.json(
          {
            valid: false,
            error: result.error,
            code: result.code,
          },
          { status: 401 }
        )
      }

      // Other errors return 400
      return NextResponse.json(
        {
          valid: false,
          error: result.error,
          code: result.code,
        },
        { status: 400 }
      )
    }

    // Success
    return NextResponse.json(
      {
        valid: true,
        message: result.message,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('[API] Error validating API key:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}
