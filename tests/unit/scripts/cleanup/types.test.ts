import { describe, it, expect } from 'vitest'
import {
  type Finding,
  type Report,
  type ReportSummary,
  type FindingCategory,
  type RiskLevel,
  type AnalyzerResult,
  type AnalyzeOptions,
  type InteractiveSession,
  createEmptySummary,
  generateFindingId,
} from '../../../../scripts/cleanup/types'

describe('Cleanup Types', () => {
  describe('Finding interface', () => {
    it('should accept valid finding objects', () => {
      const finding: Finding = {
        id: 'export-12345678',
        category: 'export',
        name: 'unusedFunction',
        location: 'lib/utils.ts:42',
        context: 'export function unusedFunction() { ... }',
        riskLevel: 'safe',
        confidence: 95,
        isDevOnly: false,
        references: [],
      }

      expect(finding.id).toBe('export-12345678')
      expect(finding.category).toBe('export')
      expect(finding.riskLevel).toBe('safe')
    })

    it('should accept finding with optional fields', () => {
      const finding: Finding = {
        id: 'database-abcdef01',
        category: 'database',
        name: 'orphaned_table',
        location: 'lib/db/drizzle-schema.ts:100',
        context: 'Table has no code references',
        riskLevel: 'dangerous',
        confidence: 60,
        isDevOnly: false,
        lastModified: new Date('2024-01-15'),
        references: ['possibly used in external service'],
      }

      expect(finding.lastModified).toBeInstanceOf(Date)
      expect(finding.references).toHaveLength(1)
    })
  })

  describe('FindingCategory type', () => {
    it('should include all expected categories', () => {
      const categories: FindingCategory[] = [
        'export',
        'dependency',
        'file',
        'type',
        'database',
        'config',
        'test',
      ]

      expect(categories).toHaveLength(7)
    })
  })

  describe('RiskLevel type', () => {
    it('should include all expected risk levels', () => {
      const riskLevels: RiskLevel[] = ['safe', 'review', 'dangerous']

      expect(riskLevels).toHaveLength(3)
    })
  })

  describe('ReportSummary interface', () => {
    it('should track counts by category and risk level', () => {
      const summary: ReportSummary = {
        totalFindings: 47,
        byCategory: {
          export: 23,
          dependency: 8,
          file: 6,
          type: 4,
          database: 3,
          config: 2,
          test: 1,
        },
        byRiskLevel: {
          safe: 31,
          review: 12,
          dangerous: 4,
        },
        devOnlyCount: 32,
        productionCount: 15,
      }

      expect(summary.totalFindings).toBe(47)
      expect(summary.byCategory.export).toBe(23)
      expect(summary.byRiskLevel.safe).toBe(31)
      expect(summary.devOnlyCount + summary.productionCount).toBe(47)
    })
  })

  describe('Report interface', () => {
    it('should contain summary and findings', () => {
      const report: Report = {
        generatedAt: new Date(),
        summary: createEmptySummary(),
        findings: [],
      }

      expect(report.generatedAt).toBeInstanceOf(Date)
      expect(report.summary.totalFindings).toBe(0)
      expect(report.findings).toEqual([])
    })
  })

  describe('AnalyzerResult interface', () => {
    it('should track analyzer output with timing', () => {
      const result: AnalyzerResult = {
        analyzer: 'knip',
        findings: [],
        errors: [],
        durationMs: 1234,
      }

      expect(result.analyzer).toBe('knip')
      expect(result.durationMs).toBe(1234)
    })

    it('should capture errors during analysis', () => {
      const result: AnalyzerResult = {
        analyzer: 'database',
        findings: [],
        errors: ['Failed to parse schema file', 'Connection timeout'],
        durationMs: 5000,
      }

      expect(result.errors).toHaveLength(2)
    })
  })

  describe('AnalyzeOptions interface', () => {
    it('should support various analysis configurations', () => {
      const options: AnalyzeOptions = {
        reportOnly: true,
        interactive: false,
        categories: ['export', 'dependency'],
        minConfidence: 80,
        productionOnly: true,
        outputFormat: 'json',
      }

      expect(options.reportOnly).toBe(true)
      expect(options.categories).toHaveLength(2)
      expect(options.minConfidence).toBe(80)
    })

    it('should allow minimal options', () => {
      const options: AnalyzeOptions = {}

      expect(options.reportOnly).toBeUndefined()
      expect(options.interactive).toBeUndefined()
    })
  })

  describe('InteractiveSession interface', () => {
    it('should track session state for resume capability', () => {
      const session: InteractiveSession = {
        startedAt: new Date(),
        findings: [],
        currentIndex: 5,
        removedIds: ['export-001', 'export-002'],
        skippedIds: ['dependency-001'],
        undoStack: [
          {
            findingId: 'export-002',
            action: 'removed',
            timestamp: new Date(),
          },
        ],
      }

      expect(session.currentIndex).toBe(5)
      expect(session.removedIds).toHaveLength(2)
      expect(session.undoStack).toHaveLength(1)
    })
  })

  describe('createEmptySummary', () => {
    it('should return summary with all zeros', () => {
      const summary = createEmptySummary()

      expect(summary.totalFindings).toBe(0)
      expect(summary.byCategory.export).toBe(0)
      expect(summary.byCategory.dependency).toBe(0)
      expect(summary.byCategory.file).toBe(0)
      expect(summary.byCategory.type).toBe(0)
      expect(summary.byCategory.database).toBe(0)
      expect(summary.byCategory.config).toBe(0)
      expect(summary.byCategory.test).toBe(0)
      expect(summary.byRiskLevel.safe).toBe(0)
      expect(summary.byRiskLevel.review).toBe(0)
      expect(summary.byRiskLevel.dangerous).toBe(0)
      expect(summary.devOnlyCount).toBe(0)
      expect(summary.productionCount).toBe(0)
    })

    it('should return a new object each call', () => {
      const summary1 = createEmptySummary()
      const summary2 = createEmptySummary()

      summary1.totalFindings = 10

      expect(summary2.totalFindings).toBe(0)
    })
  })

  describe('generateFindingId', () => {
    it('should generate consistent IDs for same input', () => {
      const id1 = generateFindingId('export', 'myFunction', 'lib/utils.ts:42')
      const id2 = generateFindingId('export', 'myFunction', 'lib/utils.ts:42')

      expect(id1).toBe(id2)
    })

    it('should generate different IDs for different inputs', () => {
      const id1 = generateFindingId('export', 'funcA', 'lib/a.ts:1')
      const id2 = generateFindingId('export', 'funcB', 'lib/b.ts:1')

      expect(id1).not.toBe(id2)
    })

    it('should prefix with category', () => {
      const exportId = generateFindingId('export', 'test', 'file.ts:1')
      const depId = generateFindingId('dependency', 'test', 'package.json:1')

      expect(exportId).toMatch(/^export-/)
      expect(depId).toMatch(/^dependency-/)
    })

    it('should generate 8-char hex hash', () => {
      const id = generateFindingId('type', 'MyType', 'types.ts:10')

      // Format: category-xxxxxxxx (8 hex chars)
      expect(id).toMatch(/^type-[0-9a-f]{8}$/)
    })
  })
})
