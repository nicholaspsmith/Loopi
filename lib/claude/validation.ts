/**
 * Claude API Key Validation Module
 *
 * Validates Claude API keys by:
 * 1. Checking format (sk-ant-api03-... pattern)
 * 2. Making a minimal API call to verify authentication
 *
 * Used in User Story 3: API Key Validation and Feedback
 */

export interface ValidationResult {
  valid: boolean
  error?: string
  code?: string
  message?: string
}

// Claude API key format: sk-ant-api03-{95+ alphanumeric/special chars}
const CLAUDE_API_KEY_PATTERN = /^sk-ant-api03-.{95,}$/
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

/**
 * Validate a Claude API key (T064 - with structured logging)
 *
 * @param apiKey - The API key to validate
 * @returns Validation result with success/error details
 */
export async function validateClaudeApiKey(
  apiKey: string | null | undefined
): Promise<ValidationResult> {
  const startTime = Date.now()

  // Step 1: Format validation
  const formatResult = validateFormat(apiKey)
  if (!formatResult.valid) {
    // Structured logging for validation failure (T064)
    console.log(
      JSON.stringify({
        event: 'api_key_validation',
        stage: 'format',
        valid: false,
        code: formatResult.code,
        executionTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      })
    )

    return formatResult
  }

  const trimmedKey = apiKey!.trim()

  // Step 2: API authentication validation
  try {
    const authResult = await testApiAuthentication(trimmedKey)

    // Structured logging for validation result (T064)
    console.log(
      JSON.stringify({
        event: 'api_key_validation',
        stage: 'authentication',
        valid: authResult.valid,
        code: authResult.code,
        executionTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      })
    )

    return authResult
  } catch (error) {
    // Structured logging for network error (T064)
    console.log(
      JSON.stringify({
        event: 'api_key_validation',
        stage: 'authentication',
        valid: false,
        code: 'NETWORK_ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      })
    )

    return {
      valid: false,
      code: 'NETWORK_ERROR',
      error: 'Network error: Unable to validate API key. Please check your internet connection and try again.',
    }
  }
}

/**
 * Validate API key format
 */
function validateFormat(
  apiKey: string | null | undefined
): ValidationResult {
  // Check for null/undefined
  if (apiKey === null || apiKey === undefined) {
    return {
      valid: false,
      code: 'INVALID_FORMAT',
      error: 'API key cannot be empty.',
    }
  }

  // Check for empty string
  const trimmed = apiKey.trim()
  if (trimmed.length === 0) {
    return {
      valid: false,
      code: 'INVALID_FORMAT',
      error: 'API key cannot be empty.',
    }
  }

  // Check prefix
  if (!trimmed.startsWith('sk-ant-')) {
    return {
      valid: false,
      code: 'INVALID_FORMAT',
      error: 'Invalid API key format. Claude API keys start with "sk-ant-".',
    }
  }

  // Check against full pattern
  if (!CLAUDE_API_KEY_PATTERN.test(trimmed)) {
    return {
      valid: false,
      code: 'INVALID_FORMAT',
      error: 'Invalid API key format. Claude API keys should be in the format: sk-ant-api03-{95+ characters}.',
    }
  }

  // Check maximum length (reasonable upper bound)
  if (trimmed.length > 200) {
    return {
      valid: false,
      code: 'INVALID_FORMAT',
      error: 'API key is too long. Please check that you copied the key correctly.',
    }
  }

  return { valid: true }
}

/**
 * Test API key authentication by making a minimal API call
 */
async function testApiAuthentication(
  apiKey: string
): Promise<ValidationResult> {
  try {
    // Make minimal API call to test authentication
    // Using max_tokens: 1 to minimize cost
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1,
        messages: [
          {
            role: 'user',
            content: 'Hi',
          },
        ],
      }),
    })

    // Handle different response statuses
    if (response.ok) {
      // Try to parse response to ensure it's valid
      try {
        await response.json()
        return {
          valid: true,
          message: 'API key is valid and working correctly.',
        }
      } catch (jsonError) {
        // Malformed JSON in response
        return {
          valid: false,
          code: 'API_ERROR',
          error: 'Received invalid response from API. Please try again.',
        }
      }
    }

    // Parse error response
    let errorData: any
    try {
      errorData = await response.json()
    } catch {
      errorData = null
    }

    // Handle authentication errors (401, 403)
    if (response.status === 401 || response.status === 403) {
      return {
        valid: false,
        code: 'AUTHENTICATION_FAILED',
        error: 'API key authentication failed. Please verify your API key is correct and active.',
      }
    }

    // Handle rate limiting
    if (response.status === 429) {
      return {
        valid: false,
        code: 'RATE_LIMITED',
        error: 'Rate limit exceeded. Please try again in a few moments.',
      }
    }

    // Handle other API errors
    return {
      valid: false,
      code: 'API_ERROR',
      error: errorData?.error?.message || `API error: ${response.status}. Please try again.`,
    }
  } catch (error) {
    // Network errors, timeouts, etc.
    throw error // Will be caught by validateClaudeApiKey and return NETWORK_ERROR
  }
}
