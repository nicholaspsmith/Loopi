/**
 * API Key Validation Utilities
 *
 * Format validation and basic security checks for Claude API keys
 */

/**
 * Validate Claude API key format
 *
 * Claude API keys follow the format: sk-ant-api03-...
 *
 * @param apiKey - API key to validate
 * @returns True if format is valid
 */
export function validateApiKeyFormat(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return false
  }

  // Trim whitespace
  const trimmed = apiKey.trim()

  // Check minimum length (Claude keys are typically 95+ characters)
  if (trimmed.length < 50) {
    return false
  }

  // Check starts with expected prefix
  if (!trimmed.startsWith('sk-ant-')) {
    return false
  }

  // Check for invalid characters (should be alphanumeric, hyphens, underscores)
  const validCharsRegex = /^[a-zA-Z0-9_-]+$/
  if (!validCharsRegex.test(trimmed)) {
    return false
  }

  return true
}

/**
 * Sanitize API key (remove whitespace)
 *
 * @param apiKey - API key to sanitize
 * @returns Sanitized API key
 */
export function sanitizeApiKey(apiKey: string): string {
  return apiKey.trim()
}

/**
 * Validation result with specific error message
 */
export interface ValidationResult {
  valid: boolean
  error?: string
}

/**
 * Comprehensive API key validation with detailed error messages
 *
 * @param apiKey - API key to validate
 * @returns Validation result with error message if invalid
 */
export function validateApiKey(apiKey: string): ValidationResult {
  if (!apiKey) {
    return { valid: false, error: 'API key is required' }
  }

  if (typeof apiKey !== 'string') {
    return { valid: false, error: 'API key must be a string' }
  }

  const trimmed = apiKey.trim()

  if (trimmed.length < 50) {
    return { valid: false, error: 'API key is too short' }
  }

  if (!trimmed.startsWith('sk-ant-')) {
    return { valid: false, error: 'API key must start with "sk-ant-"' }
  }

  const validCharsRegex = /^[a-zA-Z0-9_-]+$/
  if (!validCharsRegex.test(trimmed)) {
    return { valid: false, error: 'API key contains invalid characters' }
  }

  return { valid: true }
}
