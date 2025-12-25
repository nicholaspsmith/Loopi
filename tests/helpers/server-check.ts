/**
 * Helper to check if a development server is running
 * Used by contract tests that make HTTP requests to localhost:3000
 *
 * TODO: Remove this once all contract tests are converted to use route-test-helper
 */
export const isServerAvailable = async (): Promise<boolean> => {
  try {
    const response = await fetch('http://localhost:3000/api/health', {
      signal: AbortSignal.timeout(1000),
    })
    return response.ok
  } catch {
    return false
  }
}
