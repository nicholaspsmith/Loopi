/**
 * Knip Runner - Dead Code Detection
 *
 * Wraps Knip CLI to detect unused exports, dependencies, files, and types.
 * Maps Knip output to the standardized Finding interface.
 */

import { execFileSync } from 'child_process'
import {
  type Finding,
  type AnalyzerResult,
  type FindingCategory,
  type RiskLevel,
  generateFindingId,
} from './types'

/**
 * Knip JSON output structure
 */
interface KnipIssue {
  file: string
  dependencies: KnipItem[]
  devDependencies: KnipItem[]
  optionalPeerDependencies: KnipItem[]
  unlisted: KnipItem[]
  binaries: KnipItem[]
  unresolved: KnipItem[]
  exports: KnipItem[]
  types: KnipItem[]
  enumMembers: Record<string, unknown>
  duplicates: unknown[]
  catalog: unknown[]
}

interface KnipItem {
  name: string
  line: number
  col: number
  pos: number
}

interface KnipOutput {
  files: string[]
  issues: KnipIssue[]
}

/**
 * Options for running Knip analysis
 */
export interface KnipRunOptions {
  /** Only analyze production dependencies */
  production?: boolean
  /** Only analyze dependencies (skip exports, types, etc.) */
  dependenciesOnly?: boolean
  /** Custom config file path */
  configPath?: string
}

/**
 * Parse Knip JSON output string into structured data
 */
export function parseKnipOutput(output: string): KnipOutput {
  // Strip any dotenv messages that precede the JSON
  const jsonStart = output.indexOf('{')
  const jsonContent = jsonStart >= 0 ? output.slice(jsonStart) : output
  return JSON.parse(jsonContent) as KnipOutput
}

/**
 * Determine risk level for a finding based on category and context
 */
function determineRiskLevel(
  category: FindingCategory,
  isDevOnly: boolean,
  filePath?: string
): RiskLevel {
  // Dev dependencies are generally safe to remove
  if (category === 'dependency' && isDevOnly) {
    return 'safe'
  }

  // Production dependencies need review
  if (category === 'dependency' && !isDevOnly) {
    return 'review'
  }

  // Test files are safe to remove
  if (category === 'test') {
    return 'safe'
  }

  // Types are generally safe
  if (category === 'type') {
    return 'safe'
  }

  // Unused files need review
  if (category === 'file') {
    return isDevOnly ? 'safe' : 'review'
  }

  // Exports from index files might be public API - need review
  if (category === 'export' && filePath?.includes('index.')) {
    return 'review'
  }

  // Default to safe for clearly unused exports
  return 'safe'
}

/**
 * Determine if a location/file is dev-only
 */
function isDevOnlyLocation(location: string): boolean {
  return (
    location.includes('tests/') ||
    location.includes('.test.') ||
    location.includes('.spec.') ||
    location.includes('__tests__') ||
    location.includes('__mocks__')
  )
}

/**
 * Create context string for a finding
 */
function createContext(
  category: FindingCategory,
  name: string,
  isDevOnly: boolean,
  extra?: string
): string {
  const prefix = isDevOnly ? 'Dev-only: ' : ''

  switch (category) {
    case 'file':
      return `${prefix}File is never imported anywhere in the codebase`
    case 'test':
      if (extra) {
        return `${prefix}Test file has unresolved import: ${extra}`
      }
      return `${prefix}Test file is never imported anywhere in the codebase`
    case 'export':
      return `${prefix}Export "${name}" is never imported`
    case 'type':
      return `${prefix}Type "${name}" is never referenced`
    case 'dependency':
      return `${prefix}Package "${name}" has no imports in the codebase`
    default:
      return `${prefix}Unused ${category}: ${name}`
  }
}

/**
 * Map Knip output to standardized Finding interface
 */
export function mapKnipToFindings(knipOutput: KnipOutput): Finding[] {
  const findings: Finding[] = []

  // Map unused files
  for (const file of knipOutput.files) {
    const isDevOnly = isDevOnlyLocation(file)
    const category: FindingCategory =
      file.includes('.test.') || file.includes('.spec.') || file.includes('tests/')
        ? 'test'
        : 'file'

    findings.push({
      id: generateFindingId(category, file, file),
      category,
      name: file,
      location: file,
      context: createContext(category, file, isDevOnly),
      riskLevel: determineRiskLevel(category, isDevOnly),
      confidence: 90,
      isDevOnly,
      references: [],
    })
  }

  // Map issues from each file
  for (const issue of knipOutput.issues) {
    const file = issue.file

    // Map unused exports
    for (const exp of issue.exports) {
      const location = `${file}:${exp.line}`
      const isDevOnly = isDevOnlyLocation(file)

      findings.push({
        id: generateFindingId('export', exp.name, location),
        category: 'export',
        name: exp.name,
        location,
        context: createContext('export', exp.name, isDevOnly),
        riskLevel: determineRiskLevel('export', isDevOnly, file),
        confidence: 95,
        isDevOnly,
        references: [],
      })
    }

    // Map unused types
    for (const type of issue.types) {
      const location = `${file}:${type.line}`
      const isDevOnly = isDevOnlyLocation(file)

      findings.push({
        id: generateFindingId('type', type.name, location),
        category: 'type',
        name: type.name,
        location,
        context: createContext('type', type.name, isDevOnly),
        riskLevel: determineRiskLevel('type', isDevOnly),
        confidence: 95,
        isDevOnly,
        references: [],
      })
    }

    // Map unused dependencies (production)
    for (const dep of issue.dependencies) {
      const location = `${file}:${dep.line}`

      findings.push({
        id: generateFindingId('dependency', dep.name, location),
        category: 'dependency',
        name: dep.name,
        location,
        context: createContext('dependency', dep.name, false),
        riskLevel: 'review', // Production deps always need review
        confidence: 85,
        isDevOnly: false,
        references: [],
      })
    }

    // Map unused devDependencies
    for (const dep of issue.devDependencies) {
      const location = `${file}:${dep.line}`

      findings.push({
        id: generateFindingId('dependency', dep.name, location),
        category: 'dependency',
        name: dep.name,
        location,
        context: createContext('dependency', dep.name, true),
        riskLevel: 'safe', // Dev deps are safe to remove
        confidence: 90,
        isDevOnly: true,
        references: [],
      })
    }

    // Map unresolved imports (orphaned test indicator)
    // Unresolved imports in test files indicate tests for removed functionality
    for (const unresolved of issue.unresolved) {
      const location = `${file}:${unresolved.line}`
      const isTestFile =
        file.includes('.test.') ||
        file.includes('.spec.') ||
        file.includes('tests/') ||
        file.includes('__tests__')

      // If unresolved import is in a test file, categorize as orphaned test
      const category: FindingCategory = isTestFile ? 'test' : 'file'
      const isDevOnly = isTestFile || isDevOnlyLocation(file)

      findings.push({
        id: generateFindingId(category, unresolved.name, location),
        category,
        name: unresolved.name,
        location,
        context: createContext(category, unresolved.name, isDevOnly, unresolved.name),
        riskLevel: isTestFile ? 'safe' : 'review',
        confidence: isTestFile ? 85 : 70,
        isDevOnly,
        references: [`Unresolved import in ${file}`],
      })
    }
  }

  return findings
}

/**
 * Run Knip analysis and return structured results
 */
export async function runKnipAnalysis(options: KnipRunOptions = {}): Promise<AnalyzerResult> {
  const startTime = Date.now()
  const errors: string[] = []
  let findings: Finding[] = []

  try {
    // Build Knip command arguments
    const args = ['knip', '--reporter', 'json']

    if (options.production) {
      args.push('--production')
    }

    if (options.dependenciesOnly) {
      args.push('--dependencies')
    }

    if (options.configPath) {
      args.push('--config', options.configPath)
    }

    let output: string

    try {
      // Execute Knip using execFileSync to prevent command injection
      output = execFileSync('npx', args, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large outputs
      })
    } catch (execError) {
      // Knip exits with code 1 when issues are found, but still outputs JSON
      // Check if we got stdout with valid JSON
      const execResult = execError as {
        stdout?: string
        stderr?: string
        status?: number
      }
      if (execResult.stdout && execResult.status === 1) {
        // Exit code 1 means issues found - this is expected
        output = execResult.stdout
      } else {
        throw execError
      }
    }

    // Parse and map output
    const knipOutput = parseKnipOutput(output)
    findings = mapKnipToFindings(knipOutput)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error running Knip'
    errors.push(`Knip failed: ${message}`)
  }

  return {
    analyzer: 'knip',
    findings,
    errors,
    durationMs: Date.now() - startTime,
  }
}
