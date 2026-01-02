/**
 * Codebase Cleanup - Shared Types
 *
 * These types define the structure for findings and reports generated
 * by the cleanup analyzers (knip-runner, db-analyzer, env-analyzer).
 */

/**
 * Category of the finding - maps to different analyzers
 */
export type FindingCategory =
  | 'export' // Unused export (function, class, constant)
  | 'dependency' // Unused npm dependency
  | 'file' // Unused file (never imported)
  | 'type' // Unused TypeScript type or interface
  | 'database' // Unused database table or column
  | 'config' // Unused environment variable or config entry
  | 'test' // Orphaned test file

/**
 * Risk level determines how confident we are that removal is safe
 */
export type RiskLevel =
  | 'safe' // High confidence: no references found, safe to remove
  | 'review' // Medium confidence: may have dynamic usage, needs human review
  | 'dangerous' // Low confidence: external dependencies, has data, requires caution

/**
 * Represents a single finding of unused code/resource
 */
export interface Finding {
  /** Unique identifier for this finding */
  id: string

  /** Category of unused item */
  category: FindingCategory

  /** Name of the unused item (function name, package name, table name, etc.) */
  name: string

  /** Location: file path with line number, or package name for dependencies */
  location: string

  /** Surrounding code or usage information for context */
  context: string

  /** Risk level for removal */
  riskLevel: RiskLevel

  /** Confidence score 0-100 (100 = definitely unused) */
  confidence: number

  /** Whether this is dev-only code (devDependencies, test utils, etc.) */
  isDevOnly: boolean

  /** When the file/code was last modified (for prioritization) */
  lastModified?: Date

  /** Any detected references (for "review" items that may have dynamic usage) */
  references: string[]
}

/**
 * Summary statistics for the report
 */
export interface ReportSummary {
  /** Total number of findings */
  totalFindings: number

  /** Count by category */
  byCategory: Record<FindingCategory, number>

  /** Count by risk level */
  byRiskLevel: Record<RiskLevel, number>

  /** Number of dev-only findings */
  devOnlyCount: number

  /** Number of production findings */
  productionCount: number
}

/**
 * Consolidated report from all analyzers
 */
export interface Report {
  /** When the report was generated */
  generatedAt: Date

  /** Summary statistics */
  summary: ReportSummary

  /** All findings from all analyzers */
  findings: Finding[]
}

/**
 * Result from an individual analyzer
 */
export interface AnalyzerResult {
  /** Which analyzer produced this result */
  analyzer: 'knip' | 'database' | 'environment'

  /** Findings from this analyzer */
  findings: Finding[]

  /** Any errors encountered during analysis */
  errors: string[]

  /** How long the analysis took in milliseconds */
  durationMs: number
}

/**
 * Options for running the cleanup analysis
 */
export interface AnalyzeOptions {
  /** Only generate report, don't prompt for interactive removal */
  reportOnly?: boolean

  /** Run in interactive mode with prompts */
  interactive?: boolean

  /** Categories to include (default: all) */
  categories?: FindingCategory[]

  /** Minimum confidence threshold (default: 0) */
  minConfidence?: number

  /** Only show production code issues */
  productionOnly?: boolean

  /** Output format */
  outputFormat?: 'json' | 'cli'
}

/**
 * Interactive CLI action for a finding
 */
export type InteractiveAction =
  | 'remove' // Remove the item
  | 'skip' // Skip (keep) the item
  | 'undo' // Undo last removal
  | 'details' // Show more details
  | 'quit' // Quit the session

/**
 * Session state for interactive mode (for resume capability)
 */
export interface InteractiveSession {
  /** Session start time */
  startedAt: Date

  /** All findings in this session */
  findings: Finding[]

  /** Index of current finding being reviewed */
  currentIndex: number

  /** IDs of findings that have been removed */
  removedIds: string[]

  /** IDs of findings that have been skipped */
  skippedIds: string[]

  /** Stack of removal actions for undo */
  undoStack: Array<{
    findingId: string
    action: 'removed'
    timestamp: Date
  }>
}

/**
 * Helper to create an empty report summary
 */
export function createEmptySummary(): ReportSummary {
  return {
    totalFindings: 0,
    byCategory: {
      export: 0,
      dependency: 0,
      file: 0,
      type: 0,
      database: 0,
      config: 0,
      test: 0,
    },
    byRiskLevel: {
      safe: 0,
      review: 0,
      dangerous: 0,
    },
    devOnlyCount: 0,
    productionCount: 0,
  }
}

/**
 * Helper to generate a unique finding ID
 */
export function generateFindingId(
  category: FindingCategory,
  name: string,
  location: string
): string {
  const hash = `${category}:${name}:${location}`
    .split('')
    .reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0)
  return `${category}-${Math.abs(hash).toString(16).padStart(8, '0')}`
}
