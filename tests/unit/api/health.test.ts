import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/health/route'

/**
 * T017: Test health check endpoint for neutral terminology
 *
 * Verifies that the health check endpoint returns neutral field names
 * and messages with no AI/Claude/Anthropic/Ollama branding.
 *
 * Feature: 015-remove-ai-branding
 * User Story: US1 - Seamless Content Generation
 */

describe('Health Check API - Neutral Terminology (T017)', () => {
  const BANNED_TERMS = ['Claude', 'Anthropic', 'AI', 'Ollama', 'LLM', 'artificial intelligence']

  // Helper function to check if text contains any banned terms (case-insensitive)
  const containsBannedTerms = (text: string): string[] => {
    return BANNED_TERMS.filter((term) => text.toLowerCase().includes(term.toLowerCase()))
  }

  // Helper to recursively search JSON for banned terms
  const findBannedTermsInObject = (obj: unknown, path = ''): string[] => {
    const found: string[] = []

    if (typeof obj === 'string') {
      const terms = containsBannedTerms(obj)
      if (terms.length > 0) {
        found.push(`${path}: found terms [${terms.join(', ')}] in value "${obj}"`)
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        const terms = containsBannedTerms(key)
        if (terms.length > 0) {
          found.push(`${path}.${key}: found terms [${terms.join(', ')}] in key name`)
        }
        found.push(...findBannedTermsInObject(value, path ? `${path}.${key}` : key))
      }
    }

    return found
  }

  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('Response Structure', () => {
    it('should return status, timestamp, and checks fields', async () => {
      const response = await GET()
      const data = await response.json()

      expect(data).toHaveProperty('status')
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('checks')
    })

    it('should have neutral check field names (database, api, environment)', async () => {
      const response = await GET()
      const data = await response.json()

      expect(data.checks).toBeDefined()
      expect(typeof data.checks).toBe('object')

      // Should have neutral field names
      const allowedKeys = ['database', 'api', 'environment']
      const actualKeys = Object.keys(data.checks)

      // All actual keys should be in allowed list
      actualKeys.forEach((key) => {
        expect(allowedKeys).toContain(key)
      })
    })

    it('should NOT have AI-specific check field names', async () => {
      const response = await GET()
      const data = await response.json()

      const bannedKeys = ['claude', 'anthropic', 'ollama', 'llm', 'ai']
      const actualKeys = Object.keys(data.checks).map((k) => k.toLowerCase())

      bannedKeys.forEach((bannedKey) => {
        expect(actualKeys).not.toContain(bannedKey)
      })
    })
  })

  describe('No AI Branding in Response', () => {
    it('should not contain any AI branding terms in the entire response', async () => {
      const response = await GET()
      const data = await response.json()

      const bannedTermsFound = findBannedTermsInObject(data)

      expect(bannedTermsFound).toEqual([])
    })

    it('should not contain AI branding in status field', async () => {
      const response = await GET()
      const data = await response.json()

      if (typeof data.status === 'string') {
        const terms = containsBannedTerms(data.status)
        expect(terms).toEqual([])
      }
    })

    it('should not contain AI branding in any check messages', async () => {
      const response = await GET()
      const data = await response.json()

      for (const [, checkValue] of Object.entries(data.checks)) {
        if (typeof checkValue === 'object' && checkValue !== null) {
          const checkObj = checkValue as Record<string, unknown>
          if (typeof checkObj.message === 'string') {
            const terms = containsBannedTerms(checkObj.message)
            expect(terms).toEqual([])
          }
        }
      }
    })
  })

  describe('Field Name Validation', () => {
    it('should use "api" instead of provider-specific names', async () => {
      const response = await GET()
      const data = await response.json()

      const checkKeys = Object.keys(data.checks)

      // Should have generic "api" check if API connectivity is checked
      // Should NOT have "claude_api" or "anthropic_api" or "ollama_api"
      checkKeys.forEach((key) => {
        expect(key.toLowerCase()).not.toMatch(/claude.*api/)
        expect(key.toLowerCase()).not.toMatch(/anthropic.*api/)
        expect(key.toLowerCase()).not.toMatch(/ollama.*api/)
      })
    })

    it('should use neutral terminology for all check names', async () => {
      const response = await GET()
      const data = await response.json()

      const neutralTerms = ['database', 'api', 'environment', 'service', 'system']
      const checkKeys = Object.keys(data.checks)

      checkKeys.forEach((key) => {
        const isNeutral = neutralTerms.some((term) => key.toLowerCase().includes(term))
        expect(isNeutral).toBe(true)
      })
    })
  })

  describe('Message Quality', () => {
    it('should provide user-friendly messages without technical jargon', async () => {
      const response = await GET()
      const data = await response.json()

      for (const checkValue of Object.values(data.checks)) {
        if (typeof checkValue === 'object' && checkValue !== null) {
          const checkObj = checkValue as Record<string, unknown>
          if (typeof checkObj.message === 'string') {
            // Should not contain technical jargon
            expect(checkObj.message.toLowerCase()).not.toContain('sdk')
            expect(checkObj.message.toLowerCase()).not.toContain('provider')
            expect(checkObj.message.toLowerCase()).not.toContain('anthropic')

            // Message should be non-empty
            expect(checkObj.message.length).toBeGreaterThan(0)
          }
        }
      }
    })
  })

  describe('HTTP Status and Headers', () => {
    it('should return appropriate status code (200 if healthy, 503 if not)', async () => {
      const response = await GET()
      // Accept either 200 (healthy) or 503 (service unavailable, e.g., missing API key)
      expect([200, 503]).toContain(response.status)
    })

    it('should return JSON content type', async () => {
      const response = await GET()
      const contentType = response.headers.get('content-type')
      expect(contentType).toContain('application/json')
    })
  })
})
