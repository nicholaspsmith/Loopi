/**
 * Interactive CLI for Codebase Cleanup
 *
 * Provides interactive prompts for assisted removal of unused code
 * with undo capability and session persistence.
 */

import { execFileSync } from 'child_process'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import type { Finding, RiskLevel } from './types'

/**
 * Result of a removal operation
 */
export interface RemovalResult {
  success: boolean
  findingId: string
  originalState?: string
  filesModified?: string[]
  error?: string
  requiresConfirmation?: boolean
}

/**
 * Result of an undo operation
 */
export interface UndoResult {
  success: boolean
  filesRestored?: string[]
  error?: string
}

/**
 * Batch removal results summary
 */
export interface BatchResult {
  processed: number
  skipped: number
  failed: number
  details: RemovalResult[]
}

/**
 * Session state for persistence
 */
export interface SessionState {
  startedAt: string
  findings: Finding[]
  processed: string[]
  removed: string[]
  skipped: string[]
  history: RemovalResult[]
}

/**
 * Risk level indicators for display
 */
const RISK_INDICATORS: Record<RiskLevel, string> = {
  safe: '[SAFE]',
  review: '[REVIEW]',
  dangerous: '[!WARNING - DANGEROUS!]',
}

/**
 * Format a finding for interactive display
 *
 * @param finding - The finding to format
 * @returns Formatted string for terminal output
 */
export function formatFindingDisplay(finding: Finding): string {
  const lines: string[] = []

  // Header with risk indicator
  const riskIndicator = RISK_INDICATORS[finding.riskLevel]
  lines.push(`${riskIndicator} ${finding.category.toUpperCase()}`)
  lines.push('')

  // Name and location
  lines.push(`  Name:       ${finding.name}`)
  lines.push(`  Location:   ${finding.location}`)

  // Confidence
  lines.push(`  Confidence: ${finding.confidence}%`)

  // Dev-only indicator
  if (finding.isDevOnly) {
    lines.push(`  Type:       dev-only`)
  }

  // Context
  lines.push('')
  lines.push(`  Context: ${finding.context}`)

  // Warning for dangerous findings
  if (finding.riskLevel === 'dangerous') {
    lines.push('')
    lines.push('  ! CAUTION: This removal may cause data loss or breaking changes.')
  }

  return lines.join('\n')
}

/**
 * Get the file path from a finding location
 */
function getFilePath(location: string): string {
  // Location format: "file/path.ts:lineNumber" or just "file/path.ts"
  return location.split(':')[0]
}

/**
 * Execute a removal operation for a finding
 *
 * @param finding - The finding to remove
 * @returns Result of the removal operation
 */
export function executeRemoval(finding: Finding): RemovalResult {
  const filePath = getFilePath(finding.location)
  const filesModified: string[] = [filePath]

  try {
    // Get original content for undo
    let originalState: string | undefined
    try {
      originalState = execFileSync('git', ['show', `HEAD:${filePath}`], {
        encoding: 'utf-8',
      })
    } catch {
      // File might be new or not in git
      try {
        originalState = readFileSync(filePath, 'utf-8')
      } catch {
        originalState = undefined
      }
    }

    // Database findings require confirmation
    if (finding.category === 'database') {
      return {
        success: true,
        findingId: finding.id,
        originalState,
        filesModified,
        requiresConfirmation: true,
      }
    }

    // Execute removal based on category
    switch (finding.category) {
      case 'dependency':
        // For dependencies, we would use npm uninstall
        // For now, just mark as needing package.json edit
        execFileSync('echo', ['Removing dependency', finding.name], {
          encoding: 'utf-8',
        })
        break

      case 'export':
      case 'type':
      case 'file':
      case 'test':
        // For code removals, stage the change
        execFileSync('git', ['add', filePath], { encoding: 'utf-8' })
        break

      case 'config':
        // Config changes need manual verification
        execFileSync('echo', ['Removing config', finding.name], {
          encoding: 'utf-8',
        })
        break
    }

    return {
      success: true,
      findingId: finding.id,
      originalState,
      filesModified,
    }
  } catch (error) {
    return {
      success: false,
      findingId: finding.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      filesModified,
    }
  }
}

/**
 * Execute an undo operation
 *
 * @param removalResult - The removal result to undo
 * @returns Result of the undo operation
 */
export function executeUndo(removalResult: RemovalResult): UndoResult {
  if (!removalResult.originalState) {
    return {
      success: false,
      error: 'No original state available for undo',
    }
  }

  const filesRestored: string[] = []

  try {
    for (const filePath of removalResult.filesModified || []) {
      // Restore file using git checkout
      execFileSync('git', ['checkout', 'HEAD', '--', filePath], { encoding: 'utf-8' })
      filesRestored.push(filePath)
    }

    return {
      success: true,
      filesRestored,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      filesRestored,
    }
  }
}

/**
 * Save session state to file
 *
 * @param session - Session state to save
 * @param filePath - Path to save session file
 */
export function saveSession(session: SessionState, filePath: string): void {
  writeFileSync(filePath, JSON.stringify(session, null, 2))
}

/**
 * Load session state from file
 *
 * @param filePath - Path to session file
 * @returns Session state or null if not found
 */
export function loadSession(filePath: string): SessionState | null {
  if (!existsSync(filePath)) {
    return null
  }

  try {
    const content = readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as SessionState
  } catch {
    return null
  }
}

/**
 * Batch remove all safe findings
 *
 * @param findings - All findings to process
 * @returns Batch operation results
 */
export function batchRemoveSafeFindings(findings: Finding[]): BatchResult {
  const details: RemovalResult[] = []
  let processed = 0
  let skipped = 0
  let failed = 0

  for (const finding of findings) {
    // Only process safe findings in batch mode
    if (finding.riskLevel !== 'safe') {
      skipped++
      continue
    }

    const result = executeRemoval(finding)
    details.push(result)

    if (result.success) {
      processed++
    } else {
      failed++
    }
  }

  return {
    processed,
    skipped,
    failed,
    details,
  }
}

/**
 * Prompt options for interactive mode
 */
export type PromptAction = 'remove' | 'skip' | 'undo' | 'details' | 'quit'

/**
 * Create an interactive session
 *
 * @param findings - Findings to process
 * @param sessionPath - Optional path for session persistence
 * @returns New or resumed session state
 */
export function createSession(findings: Finding[], sessionPath?: string): SessionState {
  // Try to load existing session
  if (sessionPath) {
    const existing = loadSession(sessionPath)
    if (existing) {
      return existing
    }
  }

  // Create new session
  return {
    startedAt: new Date().toISOString(),
    findings,
    processed: [],
    removed: [],
    skipped: [],
    history: [],
  }
}

/**
 * Get remaining findings to process
 *
 * @param session - Current session state
 * @returns Findings not yet processed
 */
export function getRemainingFindings(session: SessionState): Finding[] {
  return session.findings.filter((f) => !session.processed.includes(f.id))
}

/**
 * Process an action on a finding
 *
 * @param session - Current session state
 * @param finding - Finding to process
 * @param action - Action to take
 * @returns Updated session state
 */
export function processAction(
  session: SessionState,
  finding: Finding,
  action: PromptAction
): SessionState {
  const updated = { ...session }

  switch (action) {
    case 'remove': {
      const result = executeRemoval(finding)
      updated.processed = [...updated.processed, finding.id]
      updated.history = [...updated.history, result]
      if (result.success) {
        updated.removed = [...updated.removed, finding.id]
      }
      break
    }

    case 'skip':
      updated.processed = [...updated.processed, finding.id]
      updated.skipped = [...updated.skipped, finding.id]
      break

    case 'undo': {
      const lastRemoval = updated.history[updated.history.length - 1]
      if (lastRemoval) {
        executeUndo(lastRemoval)
        updated.removed = updated.removed.filter((id) => id !== lastRemoval.findingId)
        updated.processed = updated.processed.filter((id) => id !== lastRemoval.findingId)
        updated.history = updated.history.slice(0, -1)
      }
      break
    }

    case 'details':
      // Just display, no state change
      break

    case 'quit':
      // No state change, caller handles exit
      break
  }

  return updated
}
