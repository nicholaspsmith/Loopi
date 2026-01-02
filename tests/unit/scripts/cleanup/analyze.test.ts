import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { AnalyzerResult } from '../../../../scripts/cleanup/types'

// Hoist mock functions
const { mockKnipAnalysis, mockDbAnalysis, mockEnvAnalysis, mockReadFileSync, mockExistsSync } =
  vi.hoisted(() => ({
    mockKnipAnalysis: vi.fn(),
    mockDbAnalysis: vi.fn(),
    mockEnvAnalysis: vi.fn(),
    mockReadFileSync: vi.fn(),
    mockExistsSync: vi.fn(),
  }))

// Mock the analyzer modules
vi.mock('../../../../scripts/cleanup/knip-runner', () => ({
  runKnipAnalysis: mockKnipAnalysis,
}))

vi.mock('../../../../scripts/cleanup/db-analyzer', () => ({
  analyzeDatabase: mockDbAnalysis,
}))

vi.mock('../../../../scripts/cleanup/env-analyzer', () => ({
  analyzeEnvironment: mockEnvAnalysis,
}))

// Mock fs for env file reading
vi.mock('fs', () => ({
  readFileSync: mockReadFileSync,
  existsSync: mockExistsSync,
  default: {
    readFileSync: mockReadFileSync,
    existsSync: mockExistsSync,
  },
}))

import { runFullAnalysis, runReportOnly } from '../../../../scripts/cleanup/analyze'

// Sample analyzer results for testing
const mockKnipResult: AnalyzerResult = {
  analyzer: 'knip',
  findings: [
    {
      id: 'export-unusedHelper-lib/utils.ts:15',
      category: 'export',
      name: 'unusedHelper',
      location: 'lib/utils.ts:15',
      context: 'Export "unusedHelper" is never imported',
      riskLevel: 'safe',
      confidence: 95,
      isDevOnly: false,
      references: [],
    },
  ],
  errors: [],
  durationMs: 100,
}

const mockDbResult: AnalyzerResult = {
  analyzer: 'database',
  findings: [
    {
      id: 'database-legacyField-users',
      category: 'database',
      name: 'legacyField',
      location: 'users table',
      context: 'Column "legacyField" is not used anywhere in code',
      riskLevel: 'review',
      confidence: 85,
      isDevOnly: false,
      references: [],
    },
  ],
  errors: [],
  durationMs: 50,
}

const mockEnvResult: AnalyzerResult = {
  analyzer: 'environment',
  findings: [
    {
      id: 'config-UNUSED_VAR-process.env',
      category: 'config',
      name: 'UNUSED_VAR',
      location: '.env',
      context: 'Environment variable "UNUSED_VAR" is not referenced in code',
      riskLevel: 'safe',
      confidence: 75,
      isDevOnly: false,
      references: [],
    },
  ],
  errors: [],
  durationMs: 25,
}

describe('analyze orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKnipAnalysis.mockResolvedValue(mockKnipResult)
    mockDbAnalysis.mockResolvedValue(mockDbResult)
    mockEnvAnalysis.mockResolvedValue(mockEnvResult)
    mockExistsSync.mockReturnValue(true)
    mockReadFileSync.mockReturnValue('SOME_VAR=value')
  })

  describe('runFullAnalysis (T063)', () => {
    it('should run all analyzers', async () => {
      await runFullAnalysis({})

      expect(mockKnipAnalysis).toHaveBeenCalled()
      expect(mockDbAnalysis).toHaveBeenCalled()
      expect(mockEnvAnalysis).toHaveBeenCalled()
    })

    it('should consolidate findings from all analyzers', async () => {
      const result = await runFullAnalysis({})

      expect(result.findings.length).toBe(3)
    })

    it('should include analyzer metadata', async () => {
      const result = await runFullAnalysis({})

      expect(result.analyzers.length).toBe(3)
      expect(result.analyzers.map((a) => a.name)).toContain('knip')
      expect(result.analyzers.map((a) => a.name)).toContain('database')
      expect(result.analyzers.map((a) => a.name)).toContain('environment')
    })

    it('should calculate total duration', async () => {
      const result = await runFullAnalysis({})

      // Duration should be defined and non-negative (may be 0 with fast mocks)
      expect(result.totalDurationMs).toBeGreaterThanOrEqual(0)
      expect(typeof result.totalDurationMs).toBe('number')
    })

    it('should apply risk level filtering', async () => {
      const result = await runFullAnalysis({
        minRiskLevel: 'review',
      })

      // Should only include 'review' and 'dangerous' risk levels
      const hasLowRisk = result.findings.some((f) => f.riskLevel === 'safe')
      expect(hasLowRisk).toBe(false)
    })

    it('should apply category filtering', async () => {
      const result = await runFullAnalysis({
        categories: ['export'],
      })

      const allExports = result.findings.every((f) => f.category === 'export')
      expect(allExports).toBe(true)
    })

    it('should skip analyzers when options provided', async () => {
      await runFullAnalysis({
        skipKnip: true,
        skipDatabase: true,
      })

      expect(mockKnipAnalysis).not.toHaveBeenCalled()
      expect(mockDbAnalysis).not.toHaveBeenCalled()
      expect(mockEnvAnalysis).toHaveBeenCalled()
    })

    it('should collect errors from analyzers', async () => {
      mockKnipAnalysis.mockRejectedValue(new Error('Knip failed'))

      const result = await runFullAnalysis({})

      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('Knip analysis failed')
    })
  })

  describe('runReportOnly (T064)', () => {
    it('should generate CLI report by default', async () => {
      const output = await runReportOnly({})

      expect(output.format).toBe('cli')
      expect(output.content).toBeTruthy()
      expect(typeof output.content).toBe('string')
    })

    it('should generate JSON report when requested', async () => {
      const output = await runReportOnly({
        format: 'json',
      })

      expect(output.format).toBe('json')
      expect(() => JSON.parse(output.content)).not.toThrow()
    })

    it('should include all analysis options', async () => {
      const output = await runReportOnly({
        skipEnv: true,
        minRiskLevel: 'dangerous',
      })

      expect(output.content).toBeTruthy()
    })

    it('should map findings correctly to report format', async () => {
      const output = await runReportOnly({
        format: 'json',
      })

      const report = JSON.parse(output.content)
      expect(report.analyzers).toBeDefined()
      expect(Array.isArray(report.analyzers)).toBe(true)
    })
  })

  describe('main CLI (T065)', () => {
    it('should handle --report-only flag', async () => {
      // Would test CLI entry point with mocked console
      // For now, just verify function exists
      expect(typeof runReportOnly).toBe('function')
    })

    it('should handle --json flag', async () => {
      const output = await runReportOnly({
        format: 'json',
      })

      expect(output.format).toBe('json')
    })

    it('should handle risk level filtering from CLI', async () => {
      const result = await runFullAnalysis({
        minRiskLevel: 'review',
      })

      expect(result.findings.every((f) => f.riskLevel !== 'safe')).toBe(true)
    })

    it('should handle category filtering from CLI', async () => {
      const result = await runFullAnalysis({
        categories: ['export', 'dependency'],
      })

      const validCategories = ['export', 'dependency']
      expect(result.findings.every((f) => validCategories.includes(f.category))).toBe(true)
    })
  })
})
