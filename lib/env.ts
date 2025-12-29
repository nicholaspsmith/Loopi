/**
 * Environment Variable Validation
 *
 * This module validates required environment variables at build time.
 * Import this module early in the application lifecycle to ensure
 * all required variables are present before the app starts.
 */

const requiredEnvVars = ['JINA_API_KEY', 'ANTHROPIC_API_KEY'] as const

function validateEnv() {
  // Skip validation if explicitly disabled (for CI builds)
  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    return
  }

  const missing = requiredEnvVars.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

// Run validation immediately on import
validateEnv()

export const env = {
  JINA_API_KEY: process.env.JINA_API_KEY!,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
}
