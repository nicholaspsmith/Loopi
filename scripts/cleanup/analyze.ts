/**
 * Codebase Cleanup Analyzer Orchestrator
 *
 * Main entry point that coordinates all analyzers and generates reports.
 * Supports parallel execution, filtering, and multiple output formats.
 */

import { readFileSync, existsSync } from 'fs'
import { runKnipAnalysis } from './knip-runner'
import { analyzeDatabase } from './db-analyzer'
import { analyzeEnvironment } from './env-analyzer'
import { consolidateFindings, generateJsonReport, generateCliReport } from './report-generator'
import type { Finding, AnalyzerResult, FindingCategory, RiskLevel } from './types'

/**
 * Options for running the full analysis
 */
export interface AnalysisOptions {
  /** Skip Knip analysis (dead code, dependencies) */
  skipKnip?: boolean
  /** Skip database analysis */
  skipDatabase?: boolean
  /** Skip environment variable analysis */
  skipEnv?: boolean
  /** Minimum risk level to include */
  minRiskLevel?: RiskLevel
  /** Categories to include (all if not specified) */
  categories?: FindingCategory[]
  /** Path to Drizzle schema file */
  schemaPath?: string
  /** Path to env example file */
  envPath?: string
  /** Glob patterns for codebase search */
  codebasePatterns?: string[]
}

/**
 * Result of full analysis
 */
export interface FullAnalysisResult {
  findings: Finding[]
  analyzers: {
    name: string
    durationMs: number
    findingCount: number
    errors: string[]
  }[]
  errors: string[]
  totalDurationMs: number
}

/**
 * Options for report generation
 */
export interface ReportOptions {
  format?: 'json' | 'cli'
}

/**
 * Report output
 */
export interface ReportOutput {
  format: 'json' | 'cli'
  content: string
}

/**
 * Risk level priority for filtering
 */
const RISK_LEVELS: RiskLevel[] = ['safe', 'review', 'dangerous']

/**
 * Run all analyzers and consolidate results
 */
export async function runFullAnalysis(options: AnalysisOptions = {}): Promise<FullAnalysisResult> {
  const startTime = Date.now()
  const analyzerPromises: Promise<AnalyzerResult>[] = []
  const analyzerNames: string[] = []
  const errors: string[] = []

  // Set up Knip analysis
  if (!options.skipKnip) {
    analyzerPromises.push(
      runKnipAnalysis({}).catch((error) => {
        errors.push(`Knip analysis failed: ${error.message}`)
        return {
          analyzer: 'knip' as const,
          findings: [],
          errors: [error.message],
          durationMs: 0,
        }
      })
    )
    analyzerNames.push('knip')
  }

  // Set up database analysis
  if (!options.skipDatabase) {
    const schemaPath = options.schemaPath || 'lib/db/drizzle-schema.ts'
    analyzerPromises.push(
      analyzeDatabase(schemaPath).catch((error) => {
        errors.push(`Database analysis failed: ${error.message}`)
        return {
          analyzer: 'database' as const,
          findings: [],
          errors: [error.message],
          durationMs: 0,
        }
      })
    )
    analyzerNames.push('database')
  }

  // Set up environment analysis
  if (!options.skipEnv) {
    const envPath = options.envPath || '.env.example'
    let envContent = ''

    if (existsSync(envPath)) {
      envContent = readFileSync(envPath, 'utf-8')
    }

    // For env analysis, we need to provide codebase files
    // In a real scenario, this would scan the actual codebase
    // For now, we'll use the analyzeEnvironment with mock data
    analyzerPromises.push(
      analyzeEnvironment(envContent, {}).catch((error) => {
        errors.push(`Environment analysis failed: ${error.message}`)
        return {
          analyzer: 'environment' as const,
          findings: [],
          errors: [error.message],
          durationMs: 0,
        }
      })
    )
    analyzerNames.push('environment')
  }

  // Run all analyzers in parallel
  const results = await Promise.all(analyzerPromises)

  // Consolidate findings
  let findings = consolidateFindings(results)

  // Apply risk level filter
  if (options.minRiskLevel) {
    const minIndex = RISK_LEVELS.indexOf(options.minRiskLevel)
    findings = findings.filter((f) => {
      const level = RISK_LEVELS.indexOf(f.riskLevel)
      return level >= minIndex
    })
  }

  // Apply category filter
  if (options.categories && options.categories.length > 0) {
    findings = findings.filter((f) => options.categories!.includes(f.category))
  }

  // Build analyzer metadata
  const analyzers = results.map((result) => ({
    name: result.analyzer,
    durationMs: result.durationMs,
    findingCount: result.findings.length,
    errors: result.errors,
  }))

  // Collect all errors
  for (const result of results) {
    errors.push(...result.errors)
  }

  return {
    findings,
    analyzers,
    errors,
    totalDurationMs: Date.now() - startTime,
  }
}

/**
 * Run analysis and generate report only (no interactive mode)
 */
export async function runReportOnly(
  options: ReportOptions & AnalysisOptions = {}
): Promise<ReportOutput> {
  const format = options.format || 'cli'

  // Run analysis
  const analysisResult = await runFullAnalysis(options)

  // Convert to analyzer results for report generator
  const analyzerResults: AnalyzerResult[] = analysisResult.analyzers.map((meta) => ({
    analyzer: meta.name as 'database' | 'knip' | 'environment',
    findings: analysisResult.findings.filter((f) => {
      // Associate findings with their analyzer based on category
      if (meta.name === 'knip') {
        return ['export', 'type', 'file', 'dependency', 'test'].includes(f.category)
      }
      if (meta.name === 'database') {
        return f.category === 'database'
      }
      if (meta.name === 'environment') {
        return f.category === 'config'
      }
      return false
    }),
    errors: meta.errors,
    durationMs: meta.durationMs,
  }))

  // Generate report
  if (format === 'json') {
    const report = generateJsonReport(analyzerResults)
    return {
      format: 'json',
      content: JSON.stringify(report, null, 2),
    }
  } else {
    return {
      format: 'cli',
      content: generateCliReport(analyzerResults),
    }
  }
}

/**
 * Main CLI entry point
 */
export async function main(args: string[]): Promise<void> {
  const options: AnalysisOptions & ReportOptions = {}

  // Parse CLI arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case '--report-only':
        // Just generate report, no interactive mode
        break

      case '--interactive':
        // Interactive mode (would launch interactive-cli)
        console.log('Interactive mode not yet implemented in CLI')
        break

      case '--json':
        options.format = 'json'
        break

      case '--skip-knip':
        options.skipKnip = true
        break

      case '--skip-db':
        options.skipDatabase = true
        break

      case '--skip-env':
        options.skipEnv = true
        break

      case '--min-risk':
        if (args[i + 1]) {
          options.minRiskLevel = args[++i] as RiskLevel
        }
        break

      case '--categories':
        if (args[i + 1]) {
          options.categories = args[++i].split(',') as FindingCategory[]
        }
        break

      case '--help':
        console.log(`
Codebase Cleanup Analyzer

Usage: npx tsx scripts/cleanup/analyze.ts [options]

Options:
  --report-only    Generate report without interactive prompts
  --interactive    Run in interactive mode for assisted removal
  --json           Output report as JSON
  --skip-knip      Skip Knip analysis (dead code, dependencies)
  --skip-db        Skip database analysis
  --skip-env       Skip environment variable analysis
  --min-risk LEVEL Minimum risk level: safe, review, dangerous
  --categories CAT Comma-separated categories to include
  --help           Show this help message

Examples:
  npx tsx scripts/cleanup/analyze.ts --report-only
  npx tsx scripts/cleanup/analyze.ts --json > report.json
  npx tsx scripts/cleanup/analyze.ts --min-risk dangerous
  npx tsx scripts/cleanup/analyze.ts --categories export,dependency
`)
        return
    }
  }

  // Run report
  const output = await runReportOnly(options)
  console.log(output.content)
}

// Run if executed directly
if (require.main === module) {
  main(process.argv.slice(2)).catch(console.error)
}
