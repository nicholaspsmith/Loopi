// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Store original env
const originalEnv = { ...process.env }

// Create mock db
const mockExecute = vi.fn()
vi.mock('@/lib/db/pg-client', () => ({
  getDb: vi.fn(() => ({
    execute: mockExecute,
  })),
}))

describe('Health Check API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment for each test
    process.env = { ...originalEnv }
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
    process.env.NEXTAUTH_SECRET = 'test-secret'
    process.env.ENCRYPTION_KEY = 'test-encryption-key'
    // Default: database healthy
    mockExecute.mockResolvedValue([{ '1': 1 }])
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Database connectivity', () => {
    it('should return healthy when database is connected', async () => {
      mockExecute.mockResolvedValue([{ '1': 1 }])

      const { GET } = await import('@/app/api/health/route')
      const response = await GET()
      const data = await response.json()

      expect(data.checks.database.status).toBe('healthy')
    })

    it('should return unhealthy when database fails', async () => {
      mockExecute.mockRejectedValue(new Error('Connection failed'))

      const { GET } = await import('@/app/api/health/route')
      const response = await GET()
      const data = await response.json()

      expect(data.checks.database.status).toBe('unhealthy')
      expect(data.checks.database.message).toContain('Connection failed')
    })
  })

  describe('API configuration', () => {
    it('should return healthy when ANTHROPIC_API_KEY is set', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key'

      const { GET } = await import('@/app/api/health/route')
      const response = await GET()
      const data = await response.json()

      expect(data.checks.api.status).toBe('healthy')
    })

    it('should return unhealthy when ANTHROPIC_API_KEY is missing', async () => {
      delete process.env.ANTHROPIC_API_KEY

      const { GET } = await import('@/app/api/health/route')
      const response = await GET()
      const data = await response.json()

      expect(data.checks.api.status).toBe('unhealthy')
      expect(data.checks.api.message).toContain('API key not configured')
    })
  })

  describe('Environment variables', () => {
    it('should return healthy when all required env vars are set', async () => {
      process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
      process.env.NEXTAUTH_SECRET = 'test-secret'
      process.env.ENCRYPTION_KEY = 'test-encryption-key'

      const { GET } = await import('@/app/api/health/route')
      const response = await GET()
      const data = await response.json()

      expect(data.checks.environment.status).toBe('healthy')
    })

    it('should return unhealthy when required env vars are missing', async () => {
      delete process.env.DATABASE_URL
      delete process.env.NEXTAUTH_SECRET

      const { GET } = await import('@/app/api/health/route')
      const response = await GET()
      const data = await response.json()

      expect(data.checks.environment.status).toBe('unhealthy')
      expect(data.checks.environment.message).toContain('Missing required env vars')
    })
  })

  describe('Overall status', () => {
    it('should return healthy status when all checks pass', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key'
      mockExecute.mockResolvedValue([{ '1': 1 }])

      const { GET } = await import('@/app/api/health/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('healthy')
    })

    it('should return 503 when any check is unhealthy', async () => {
      delete process.env.DATABASE_URL

      const { GET } = await import('@/app/api/health/route')
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.status).toBe('unhealthy')
    })

    it('should include timestamp in response', async () => {
      const { GET } = await import('@/app/api/health/route')
      const response = await GET()
      const data = await response.json()

      expect(data.timestamp).toBeDefined()
      expect(new Date(data.timestamp).getTime()).not.toBeNaN()
    })
  })
})
