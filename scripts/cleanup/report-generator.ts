/**
 * Report Generator
 *
 * Consolidates findings from all analyzers into a unified report
 * with risk level assignment and multiple output formats.
 */

import { type Finding, type AnalyzerResult, type FindingCategory, type RiskLevel } from './types'

/**
 * Summary statistics for the cleanup report
 */
export interface SummaryStats {
  total: number
  byCategory: Record<FindingCategory, number>
  byRiskLevel: Record<RiskLevel, number>
  devOnly: number
  production: number
}

/**
 * Analyzer metadata for the report
 */
export interface AnalyzerMeta {
  name: string
  durationMs: number
  findingCount: number
  errors: string[]
}

/**
 * Complete cleanup report structure
 */
export interface CleanupReport {
  generatedAt: string
  findings: Finding[]
  summary: SummaryStats
  analyzers: AnalyzerMeta[]
}

/**
 * Risk level priority for sorting (higher = more urgent)
 */
const RISK_PRIORITY: Record<RiskLevel, number> = {
  dangerous: 3,
  review: 2,
  safe: 1,
}

/**
 * Consolidate findings from multiple analyzer results
 *
 * - Merges all findings
 * - Deduplicates by finding ID
 * - Sorts by risk level (dangerous first)
 *
 * @param results - Array of analyzer results
 * @returns Consolidated and sorted findings
 */
export function consolidateFindings(results: AnalyzerResult[]): Finding[] {
  const findingMap = new Map<string, Finding>()

  // Merge all findings, deduplicating by ID
  for (const result of results) {
    for (const finding of result.findings) {
      if (!findingMap.has(finding.id)) {
        findingMap.set(finding.id, finding)
      }
    }
  }

  // Convert to array and sort by risk level
  const findings = Array.from(findingMap.values())

  findings.sort((a, b) => {
    return RISK_PRIORITY[b.riskLevel] - RISK_PRIORITY[a.riskLevel]
  })

  return findings
}

/**
 * Assign or adjust risk level for a finding based on category and context
 *
 * Risk level rules:
 * - database: always dangerous (data loss potential)
 * - dev-only: always safe (no production impact)
 * - test: always safe (test files only)
 * - type: safe (TypeScript-only, no runtime impact)
 * - export: safe by default, review if in index files
 * - dependency (production): review
 * - config: review (may affect runtime behavior)
 *
 * @param finding - The finding to assign risk level for
 * @returns Finding with adjusted risk level
 */
export function assignRiskLevel(finding: Finding): Finding {
  let riskLevel: RiskLevel = finding.riskLevel

  // Database findings are always dangerous
  if (finding.category === 'database') {
    riskLevel = 'dangerous'
  }
  // Dev-only findings are always safe
  else if (finding.isDevOnly) {
    riskLevel = 'safe'
  }
  // Test findings are always safe
  else if (finding.category === 'test') {
    riskLevel = 'safe'
  }
  // Type findings are safe (no runtime impact)
  else if (finding.category === 'type') {
    riskLevel = 'safe'
  }
  // Production dependencies need review
  else if (finding.category === 'dependency' && !finding.isDevOnly) {
    riskLevel = 'review'
  }
  // Config findings need review
  else if (finding.category === 'config') {
    riskLevel = 'review'
  }
  // Export findings - check if in index file
  else if (finding.category === 'export') {
    if (finding.location.includes('index.')) {
      riskLevel = 'review'
    } else {
      riskLevel = 'safe'
    }
  }

  return { ...finding, riskLevel }
}

/**
 * Generate summary statistics from findings
 *
 * @param findings - Array of findings to summarize
 * @returns Summary statistics object
 */
export function generateSummaryStats(findings: Finding[]): SummaryStats {
  const stats: SummaryStats = {
    total: findings.length,
    byCategory: {
      file: 0,
      export: 0,
      type: 0,
      dependency: 0,
      database: 0,
      config: 0,
      test: 0,
    },
    byRiskLevel: {
      safe: 0,
      review: 0,
      dangerous: 0,
    },
    devOnly: 0,
    production: 0,
  }

  for (const finding of findings) {
    // Count by category
    stats.byCategory[finding.category]++

    // Count by risk level
    stats.byRiskLevel[finding.riskLevel]++

    // Count dev-only vs production
    if (finding.isDevOnly) {
      stats.devOnly++
    } else {
      stats.production++
    }
  }

  return stats
}

/**
 * Generate a JSON report from analyzer results
 *
 * @param results - Array of analyzer results
 * @returns Complete cleanup report object
 */
export function generateJsonReport(results: AnalyzerResult[]): CleanupReport {
  // Consolidate findings from all analyzers
  const consolidatedFindings = consolidateFindings(results)

  // Apply risk level assignment rules
  const findings = consolidatedFindings.map(assignRiskLevel)

  // Generate summary stats
  const summary = generateSummaryStats(findings)

  // Collect analyzer metadata
  const analyzers: AnalyzerMeta[] = results.map((result) => ({
    name: result.analyzer,
    durationMs: result.durationMs,
    findingCount: result.findings.length,
    errors: result.errors,
  }))

  return {
    generatedAt: new Date().toISOString(),
    findings,
    summary,
    analyzers,
  }
}

/**
 * Format a risk level for CLI display with color indicators
 */
function formatRiskLevel(level: RiskLevel): string {
  switch (level) {
    case 'dangerous':
      return '! DANGEROUS'
    case 'review':
      return '? REVIEW'
    case 'safe':
      return '  SAFE'
  }
}

/**
 * Format a category name for display
 */
function formatCategory(category: FindingCategory): string {
  return category.charAt(0).toUpperCase() + category.slice(1)
}

/**
 * Generate a CLI-friendly formatted report
 *
 * @param results - Array of analyzer results
 * @returns Formatted string for terminal output
 */
export function generateCliReport(results: AnalyzerResult[]): string {
  const consolidatedFindings = consolidateFindings(results)
  const findings = consolidatedFindings.map(assignRiskLevel)
  const summary = generateSummaryStats(findings)

  const lines: string[] = []

  // Header
  lines.push('')
  lines.push('='.repeat(60))
  lines.push('  Codebase Cleanup Report')
  lines.push('='.repeat(60))
  lines.push('')

  // Check for empty results
  if (findings.length === 0) {
    lines.push('No findings detected. Your codebase is clean!')
    lines.push('')
    return lines.join('\n')
  }

  // Group findings by category
  const byCategory = new Map<FindingCategory, Finding[]>()
  for (const finding of findings) {
    const existing = byCategory.get(finding.category) || []
    existing.push(finding)
    byCategory.set(finding.category, existing)
  }

  // Display each category
  for (const [category, categoryFindings] of byCategory) {
    lines.push(`[${formatCategory(category)}] (${categoryFindings.length} found)`)
    lines.push('-'.repeat(40))

    for (const finding of categoryFindings) {
      lines.push(`  ${formatRiskLevel(finding.riskLevel)}  ${finding.name}`)
      lines.push(`           ${finding.location}`)
      if (finding.isDevOnly) {
        lines.push(`           (dev-only)`)
      }
    }
    lines.push('')
  }

  // Summary section
  lines.push('='.repeat(60))
  lines.push('  Summary')
  lines.push('='.repeat(60))
  lines.push('')
  lines.push(`  Total findings: ${summary.total}`)
  lines.push('')
  lines.push('  By Risk Level:')
  lines.push(`    Dangerous: ${summary.byRiskLevel.dangerous}`)
  lines.push(`    Review:    ${summary.byRiskLevel.review}`)
  lines.push(`    Safe:      ${summary.byRiskLevel.safe}`)
  lines.push('')
  lines.push('  By Environment:')
  lines.push(`    Production: ${summary.production}`)
  lines.push(`    Dev-only:   ${summary.devOnly}`)
  lines.push('')

  return lines.join('\n')
}
