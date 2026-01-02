import { describe, it, expect } from 'vitest'
import type { Finding, AnalyzerResult } from '../../../../scripts/cleanup/types'
import {
  consolidateFindings,
  assignRiskLevel,
  generateJsonReport,
  generateCliReport,
  generateSummaryStats,
  type CleanupReport,
} from '../../../../scripts/cleanup/report-generator'

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
    {
      id: 'dependency-lodash-package.json:10',
      category: 'dependency',
      name: 'lodash',
      location: 'package.json:10',
      context: 'Package "lodash" has no imports in the codebase',
      riskLevel: 'review',
      confidence: 85,
      isDevOnly: false,
      references: [],
    },
    {
      id: 'type-OldType-lib/types.ts:25',
      category: 'type',
      name: 'OldType',
      location: 'lib/types.ts:25',
      context: 'Type "OldType" is never referenced',
      riskLevel: 'safe',
      confidence: 95,
      isDevOnly: false,
      references: [],
    },
  ],
  errors: [],
  durationMs: 1500,
}

const mockDbResult: AnalyzerResult = {
  analyzer: 'database',
  findings: [
    {
      id: 'database-legacyLogs-lib/db/drizzle-schema.ts:100',
      category: 'database',
      name: 'legacyLogs',
      location: 'lib/db/drizzle-schema.ts:100',
      context: 'Table "legacyLogs" has no references in the codebase',
      riskLevel: 'dangerous',
      confidence: 75,
      isDevOnly: false,
      references: [],
    },
  ],
  errors: [],
  durationMs: 800,
}

const mockEnvResult: AnalyzerResult = {
  analyzer: 'environment',
  findings: [
    {
      id: 'config-LEGACY_API_KEY-.env',
      category: 'config',
      name: 'LEGACY_API_KEY',
      location: '.env',
      context: 'Environment variable "LEGACY_API_KEY" is defined but not referenced',
      riskLevel: 'review',
      confidence: 80,
      isDevOnly: false,
      references: [],
    },
  ],
  errors: [],
  durationMs: 200,
}

const mockTestResult: AnalyzerResult = {
  analyzer: 'knip',
  findings: [
    {
      id: 'test-oldFeature-tests/unit/old-feature.test.ts:1',
      category: 'test',
      name: 'oldFeature',
      location: 'tests/unit/old-feature.test.ts:1',
      context: 'Dev-only: Test file has unresolved import: oldFeature',
      riskLevel: 'safe',
      confidence: 85,
      isDevOnly: true,
      references: ['Unresolved import in tests/unit/old-feature.test.ts'],
    },
  ],
  errors: [],
  durationMs: 100,
}

describe('report-generator', () => {
  describe('consolidateFindings (T042)', () => {
    it('should merge findings from all analyzers', () => {
      const results = [mockKnipResult, mockDbResult, mockEnvResult]
      const consolidated = consolidateFindings(results)

      expect(consolidated.length).toBe(5)
    })

    it('should preserve all finding properties', () => {
      const results = [mockKnipResult]
      const consolidated = consolidateFindings(results)

      const finding = consolidated.find((f) => f.name === 'unusedHelper')
      expect(finding).toBeDefined()
      expect(finding?.category).toBe('export')
      expect(finding?.riskLevel).toBe('safe')
      expect(finding?.confidence).toBe(95)
    })

    it('should handle empty analyzer results', () => {
      const emptyResult: AnalyzerResult = {
        analyzer: 'knip',
        findings: [],
        errors: [],
        durationMs: 0,
      }

      const consolidated = consolidateFindings([emptyResult, mockKnipResult])
      expect(consolidated.length).toBe(3)
    })

    it('should deduplicate findings with same id', () => {
      const duplicateResult: AnalyzerResult = {
        analyzer: 'knip',
        findings: [mockKnipResult.findings[0]], // Same finding
        errors: [],
        durationMs: 100,
      }

      const consolidated = consolidateFindings([mockKnipResult, duplicateResult])
      const unusedHelperCount = consolidated.filter((f) => f.name === 'unusedHelper').length
      expect(unusedHelperCount).toBe(1)
    })

    it('should sort findings by risk level (dangerous first)', () => {
      const results = [mockKnipResult, mockDbResult, mockEnvResult]
      const consolidated = consolidateFindings(results)

      // Dangerous should come first
      expect(consolidated[0].riskLevel).toBe('dangerous')
    })
  })

  describe('assignRiskLevel (T043)', () => {
    it('should assign dangerous to database findings', () => {
      const finding: Finding = {
        id: 'test',
        category: 'database',
        name: 'testTable',
        location: 'schema.ts',
        context: 'Unused table',
        riskLevel: 'safe', // Original level
        confidence: 80,
        isDevOnly: false,
        references: [],
      }

      const adjusted = assignRiskLevel(finding)
      expect(adjusted.riskLevel).toBe('dangerous')
    })

    it('should assign safe to dev-only findings', () => {
      const finding: Finding = {
        id: 'test',
        category: 'dependency',
        name: 'jest',
        location: 'package.json',
        context: 'Unused dev dependency',
        riskLevel: 'review',
        confidence: 80,
        isDevOnly: true,
        references: [],
      }

      const adjusted = assignRiskLevel(finding)
      expect(adjusted.riskLevel).toBe('safe')
    })

    it('should assign review to production dependencies', () => {
      const finding: Finding = {
        id: 'test',
        category: 'dependency',
        name: 'axios',
        location: 'package.json',
        context: 'Unused dependency',
        riskLevel: 'safe',
        confidence: 80,
        isDevOnly: false,
        references: [],
      }

      const adjusted = assignRiskLevel(finding)
      expect(adjusted.riskLevel).toBe('review')
    })

    it('should assign safe to test files', () => {
      const finding: Finding = {
        id: 'test',
        category: 'test',
        name: 'oldTest',
        location: 'tests/old.test.ts',
        context: 'Orphaned test',
        riskLevel: 'review',
        confidence: 80,
        isDevOnly: true,
        references: [],
      }

      const adjusted = assignRiskLevel(finding)
      expect(adjusted.riskLevel).toBe('safe')
    })

    it('should assign review to config findings', () => {
      const finding: Finding = {
        id: 'test',
        category: 'config',
        name: 'OLD_VAR',
        location: '.env',
        context: 'Unused env var',
        riskLevel: 'safe',
        confidence: 80,
        isDevOnly: false,
        references: [],
      }

      const adjusted = assignRiskLevel(finding)
      expect(adjusted.riskLevel).toBe('review')
    })

    it('should preserve safe for type findings', () => {
      const finding: Finding = {
        id: 'test',
        category: 'type',
        name: 'OldType',
        location: 'types.ts',
        context: 'Unused type',
        riskLevel: 'safe',
        confidence: 90,
        isDevOnly: false,
        references: [],
      }

      const adjusted = assignRiskLevel(finding)
      expect(adjusted.riskLevel).toBe('safe')
    })
  })

  describe('generateJsonReport (T044)', () => {
    it('should generate valid JSON structure', () => {
      const results = [mockKnipResult, mockDbResult]
      const report = generateJsonReport(results)

      expect(report).toHaveProperty('generatedAt')
      expect(report).toHaveProperty('findings')
      expect(report).toHaveProperty('summary')
      expect(report).toHaveProperty('analyzers')
    })

    it('should include all findings in JSON output', () => {
      const results = [mockKnipResult, mockDbResult, mockEnvResult]
      const report = generateJsonReport(results)

      expect(report.findings.length).toBe(5)
    })

    it('should include summary statistics in JSON', () => {
      const results = [mockKnipResult, mockDbResult]
      const report = generateJsonReport(results)

      expect(report.summary).toHaveProperty('total')
      expect(report.summary).toHaveProperty('byCategory')
      expect(report.summary).toHaveProperty('byRiskLevel')
    })

    it('should include analyzer metadata', () => {
      const results = [mockKnipResult, mockDbResult]
      const report = generateJsonReport(results)

      expect(report.analyzers.length).toBe(2)
      expect(report.analyzers).toContainEqual(expect.objectContaining({ name: 'knip' }))
      expect(report.analyzers).toContainEqual(expect.objectContaining({ name: 'database' }))
    })

    it('should include errors from analyzers', () => {
      const resultWithError: AnalyzerResult = {
        analyzer: 'environment',
        findings: [],
        errors: ['Something went wrong'],
        durationMs: 100,
      }

      const report = generateJsonReport([resultWithError])
      const analyzerMeta = report.analyzers.find((a) => a.name === 'environment')
      expect(analyzerMeta?.errors).toContain('Something went wrong')
    })
  })

  describe('generateCliReport (T045)', () => {
    it('should generate formatted CLI output', () => {
      const results = [mockKnipResult]
      const output = generateCliReport(results)

      expect(typeof output).toBe('string')
      expect(output.length).toBeGreaterThan(0)
    })

    it('should include section headers', () => {
      const results = [mockKnipResult, mockDbResult]
      const output = generateCliReport(results)

      expect(output).toContain('Codebase Cleanup Report')
    })

    it('should group findings by category', () => {
      const results = [mockKnipResult, mockDbResult, mockEnvResult]
      const output = generateCliReport(results)

      // Should have sections for different categories
      expect(output).toMatch(/export|dependency|database|config/i)
    })

    it('should display risk level indicators', () => {
      const results = [mockDbResult] // Has dangerous finding
      const output = generateCliReport(results)

      // Should show dangerous indicator
      expect(output).toMatch(/dangerous|DANGEROUS|!/i)
    })

    it('should include summary at end', () => {
      const results = [mockKnipResult]
      const output = generateCliReport(results)

      expect(output).toMatch(/total|summary|found/i)
    })

    it('should handle empty results gracefully', () => {
      const emptyResult: AnalyzerResult = {
        analyzer: 'knip',
        findings: [],
        errors: [],
        durationMs: 0,
      }

      const output = generateCliReport([emptyResult])
      expect(output).toContain('No findings')
    })
  })

  describe('generateSummaryStats (T052)', () => {
    it('should count total findings', () => {
      const results = [mockKnipResult, mockDbResult, mockEnvResult]
      const stats = generateSummaryStats(consolidateFindings(results))

      expect(stats.total).toBe(5)
    })

    it('should count by category', () => {
      const results = [mockKnipResult, mockDbResult, mockEnvResult]
      const stats = generateSummaryStats(consolidateFindings(results))

      expect(stats.byCategory.export).toBe(1)
      expect(stats.byCategory.dependency).toBe(1)
      expect(stats.byCategory.type).toBe(1)
      expect(stats.byCategory.database).toBe(1)
      expect(stats.byCategory.config).toBe(1)
    })

    it('should count by risk level', () => {
      const results = [mockKnipResult, mockDbResult, mockEnvResult]
      const stats = generateSummaryStats(consolidateFindings(results))

      expect(stats.byRiskLevel.safe).toBe(2) // export, type
      expect(stats.byRiskLevel.review).toBe(2) // dependency, config
      expect(stats.byRiskLevel.dangerous).toBe(1) // database
    })

    it('should count dev-only vs production', () => {
      const results = [mockKnipResult, mockTestResult]
      const stats = generateSummaryStats(consolidateFindings(results))

      expect(stats.devOnly).toBe(1)
      expect(stats.production).toBe(3)
    })

    it('should return zero counts for empty findings', () => {
      const stats = generateSummaryStats([])

      expect(stats.total).toBe(0)
      expect(stats.byCategory.export).toBe(0)
      expect(stats.byRiskLevel.safe).toBe(0)
    })
  })

  describe('dev-only vs production categorization (T049)', () => {
    it('should mark test findings as dev-only', () => {
      const results = [mockTestResult]
      const report = generateJsonReport(results)

      const testFinding = report.findings.find((f) => f.category === 'test')
      expect(testFinding?.isDevOnly).toBe(true)
    })

    it('should mark devDependencies as dev-only', () => {
      const devDepResult: AnalyzerResult = {
        analyzer: 'knip',
        findings: [
          {
            id: 'dep-eslint',
            category: 'dependency',
            name: 'eslint',
            location: 'package.json',
            context: 'Dev-only: Package "eslint" has no imports',
            riskLevel: 'safe',
            confidence: 90,
            isDevOnly: true,
            references: [],
          },
        ],
        errors: [],
        durationMs: 100,
      }

      const report = generateJsonReport([devDepResult])
      expect(report.findings[0].isDevOnly).toBe(true)
    })

    it('should mark production dependencies as non-dev-only', () => {
      const results = [mockKnipResult]
      const report = generateJsonReport(results)

      const prodDep = report.findings.find((f) => f.name === 'lodash')
      expect(prodDep?.isDevOnly).toBe(false)
    })
  })

  describe('full report generation', () => {
    it('should generate complete report from all analyzers', () => {
      const results = [mockKnipResult, mockDbResult, mockEnvResult, mockTestResult]
      const report = generateJsonReport(results)

      expect(report.findings.length).toBe(6)
      expect(report.analyzers.length).toBe(4)
      expect(report.summary.total).toBe(6)
    })

    it('should serialize to valid JSON', () => {
      const results = [mockKnipResult, mockDbResult]
      const report = generateJsonReport(results)

      const jsonString = JSON.stringify(report)
      const parsed = JSON.parse(jsonString) as CleanupReport

      expect(parsed.findings.length).toBe(4)
    })
  })
})
