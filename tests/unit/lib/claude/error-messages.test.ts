import { describe, it, expect } from 'vitest'
import { classifyClaudeError } from '@/lib/claude/client'

/**
 * T016: Test neutral error messages (no AI branding)
 *
 * Verifies that classifyClaudeError returns error messages with no
 * AI/Claude/Anthropic/Ollama/LLM branding as required by FR-005.
 *
 * Feature: 015-remove-ai-branding
 * User Story: US1 - Seamless Content Generation
 */

describe('classifyClaudeError - Neutral Error Messages (T016)', () => {
  const BANNED_TERMS = ['Claude', 'Anthropic', 'Ollama', 'LLM', 'artificial intelligence']

  // Helper function to check if message contains any banned terms (case-insensitive)
  // For "AI", we check for word boundaries to avoid false positives like "again", "available"
  const containsBannedTerms = (message: string): string[] => {
    const found: string[] = []

    // Check each banned term
    BANNED_TERMS.forEach((term) => {
      if (message.toLowerCase().includes(term.toLowerCase())) {
        found.push(term)
      }
    })

    // Special check for "AI" as a standalone word (with word boundaries)
    const aiPattern = /\bAI\b/i
    if (aiPattern.test(message)) {
      found.push('AI')
    }

    return found
  }

  describe('Authentication Errors', () => {
    it('should return neutral message for authentication failure', () => {
      const error = new Error('authentication failed')
      const classified = classifyClaudeError(error)

      const bannedTermsFound = containsBannedTerms(classified.message)
      expect(bannedTermsFound).toEqual([])
      expect(classified.message).toBeTruthy()
      expect(classified.type).toBe('authentication_error')
    })

    it('should return neutral message for invalid API key', () => {
      const error = new Error('Invalid API key provided')
      const classified = classifyClaudeError(error)

      const bannedTermsFound = containsBannedTerms(classified.message)
      expect(bannedTermsFound).toEqual([])
      expect(classified.message).toBeTruthy()
      expect(classified.type).toBe('authentication_error')
    })

    it('should return neutral message for 401 errors', () => {
      const error = new Error('Request failed with status 401')
      const classified = classifyClaudeError(error)

      const bannedTermsFound = containsBannedTerms(classified.message)
      expect(bannedTermsFound).toEqual([])
      expect(classified.message).toBeTruthy()
      expect(classified.type).toBe('authentication_error')
    })
  })

  describe('Quota Exceeded Errors', () => {
    it('should return neutral message for quota exceeded', () => {
      const error = new Error('quota exceeded')
      const classified = classifyClaudeError(error)

      const bannedTermsFound = containsBannedTerms(classified.message)
      expect(bannedTermsFound).toEqual([])
      expect(classified.message).toBeTruthy()
      expect(classified.type).toBe('quota_exceeded')
    })

    it('should return neutral message for credit limit', () => {
      const error = new Error('credit limit reached')
      const classified = classifyClaudeError(error)

      const bannedTermsFound = containsBannedTerms(classified.message)
      expect(bannedTermsFound).toEqual([])
      expect(classified.message).toBeTruthy()
    })
  })

  describe('Rate Limit Errors', () => {
    it('should return neutral message for rate limit', () => {
      const error = new Error('rate limit exceeded')
      const classified = classifyClaudeError(error)

      const bannedTermsFound = containsBannedTerms(classified.message)
      expect(bannedTermsFound).toEqual([])
      expect(classified.message).toBeTruthy()
      expect(classified.type).toBe('rate_limit_error')
    })

    it('should return neutral message for 429 errors', () => {
      const error = new Error('Status 429: Too Many Requests')
      const classified = classifyClaudeError(error)

      const bannedTermsFound = containsBannedTerms(classified.message)
      expect(bannedTermsFound).toEqual([])
      expect(classified.message).toBeTruthy()
      // Note: 429 is currently classified as quota_exceeded, not rate_limit_error
      expect(classified.type).toBe('quota_exceeded')
    })
  })

  describe('Network Errors', () => {
    it('should return neutral message for network error', () => {
      const error = new Error('network error occurred')
      const classified = classifyClaudeError(error)

      const bannedTermsFound = containsBannedTerms(classified.message)
      expect(bannedTermsFound).toEqual([])
      expect(classified.message).toBeTruthy()
      expect(classified.type).toBe('network_error')
    })

    it('should return neutral message for timeout', () => {
      const error = new Error('Request timeout')
      const classified = classifyClaudeError(error)

      const bannedTermsFound = containsBannedTerms(classified.message)
      expect(bannedTermsFound).toEqual([])
      expect(classified.message).toBeTruthy()
      expect(classified.type).toBe('network_error')
    })

    it('should return neutral message for connection refused', () => {
      const error = new Error('Connection refused')
      const classified = classifyClaudeError(error)

      const bannedTermsFound = containsBannedTerms(classified.message)
      expect(bannedTermsFound).toEqual([])
      expect(classified.message).toBeTruthy()
      // Note: "Connection refused" is currently classified as unknown_error
      expect(classified.type).toBe('unknown_error')
    })
  })

  describe('Unknown Errors', () => {
    it('should return neutral message for unknown error', () => {
      const error = new Error('Something unexpected happened')
      const classified = classifyClaudeError(error)

      const bannedTermsFound = containsBannedTerms(classified.message)
      expect(bannedTermsFound).toEqual([])
      expect(classified.message).toBeTruthy()
      expect(classified.type).toBe('unknown_error')
    })

    it('should return neutral message for empty error', () => {
      const error = new Error('')
      const classified = classifyClaudeError(error)

      const bannedTermsFound = containsBannedTerms(classified.message)
      expect(bannedTermsFound).toEqual([])
      expect(classified.message).toBeTruthy()
    })
  })

  describe('All Error Types - No Branding', () => {
    const errorScenarios = [
      { error: new Error('authentication failed'), type: 'authentication_error' },
      { error: new Error('quota exceeded'), type: 'quota_exceeded' },
      { error: new Error('rate limit exceeded'), type: 'rate_limit_error' },
      { error: new Error('network error'), type: 'network_error' },
      { error: new Error('unknown error'), type: 'unknown_error' },
    ]

    errorScenarios.forEach(({ error, type }) => {
      it(`should never contain AI branding in ${type} messages`, () => {
        const classified = classifyClaudeError(error)

        // Check for banned terms
        const bannedTermsFound = containsBannedTerms(classified.message)
        expect(bannedTermsFound).toEqual([])
      })
    })
  })

  describe('Message Quality', () => {
    it('should return user-friendly messages for all error types', () => {
      const errors = [
        new Error('authentication failed'),
        new Error('quota exceeded'),
        new Error('rate limit exceeded'),
        new Error('network error'),
        new Error('unknown error'),
      ]

      errors.forEach((error) => {
        const classified = classifyClaudeError(error)

        // Message should be non-empty
        expect(classified.message.length).toBeGreaterThan(0)

        // Message should end with proper punctuation
        expect(classified.message).toMatch(/[.!?]$/)

        // Message should not contain technical jargon like "API", "SDK", "provider"
        expect(classified.message.toLowerCase()).not.toContain('api')
        expect(classified.message.toLowerCase()).not.toContain('sdk')
        expect(classified.message.toLowerCase()).not.toContain('provider')
      })
    })
  })
})
