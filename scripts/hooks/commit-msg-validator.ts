#!/usr/bin/env tsx

/**
 * Commit Message Validator
 *
 * Validates commit messages against project standards defined in .claude/rules.md
 * See specs/008-pre-commit-hooks/data-model.md for schema definitions
 */

// Validation constants from data-model.md
const SUBJECT_MAX_LENGTH = 72

const PAST_TENSE_PREFIXES = [
  'Added',
  'Fixed',
  'Updated',
  'Created',
  'Implemented',
  'Modified',
  'Changed',
  'Removed',
  'Deleted',
  'Resolved',
]

const THIRD_PERSON_PREFIXES = ['Adds', 'Fixes', 'Updates', 'Creates', 'Implements']

const FORBIDDEN_TEXT = ['Generated with', 'Claude Code', '🤖']

// Types from data-model.md
export interface CommitValidationError {
  rule: 'subject-length' | 'imperative-mood' | 'body-format' | 'ai-attribution' | 'empty-message'
  message: string
  line: number
}

export interface CommitValidationWarning {
  rule: 'multiple-responsibilities'
  message: string
  suggestion: string
}

export interface CommitValidationResult {
  valid: boolean
  errors: CommitValidationError[]
  warnings: CommitValidationWarning[]
}

/**
 * Validate a commit message against project standards
 */
export function validateCommitMessage(message: string): CommitValidationResult {
  const errors: CommitValidationError[] = []
  const warnings: CommitValidationWarning[] = []

  // Handle empty or whitespace-only messages
  const trimmedMessage = message.trim()
  if (!trimmedMessage) {
    errors.push({
      rule: 'empty-message',
      message: 'Commit message cannot be empty',
      line: 1,
    })
    return { valid: false, errors, warnings }
  }

  // Split message into lines
  const lines = trimmedMessage.split('\n')
  const subject = lines[0].trim()

  // T021: Subject length validation (max 72 chars)
  if (subject.length > SUBJECT_MAX_LENGTH) {
    errors.push({
      rule: 'subject-length',
      message: `Subject line must be ${SUBJECT_MAX_LENGTH} characters or less (currently ${subject.length}). See .claude/rules.md`,
      line: 1,
    })
  }

  // T022: Imperative mood check (pattern match past tense prefixes)
  const firstWord = subject.split(' ')[0]
  if (PAST_TENSE_PREFIXES.some((prefix) => firstWord === prefix)) {
    errors.push({
      rule: 'imperative-mood',
      message: `Use imperative mood ("Add" not "Added"). Found "${firstWord}". See .claude/rules.md`,
      line: 1,
    })
  }
  if (THIRD_PERSON_PREFIXES.some((prefix) => firstWord === prefix)) {
    errors.push({
      rule: 'imperative-mood',
      message: `Use imperative mood ("Add" not "Adds"). Found "${firstWord}". See .claude/rules.md`,
      line: 1,
    })
  }

  // T023: Body format validation (only Co-Authored-By allowed)
  if (lines.length > 1) {
    // Find body content (skip empty lines after subject)
    const bodyLines = lines.slice(1).filter((line) => line.trim() !== '')

    // Check for non-Co-Authored-By content
    const nonCoAuthorLines = bodyLines.filter(
      (line) =>
        !line.trim().startsWith('Co-Authored-By:') && !line.trim().startsWith('Co-authored-by:')
    )

    if (nonCoAuthorLines.length > 0) {
      errors.push({
        rule: 'body-format',
        message:
          'Commit body should only contain Co-Authored-By line. Remove other content. See .claude/rules.md',
        line: 2,
      })
    }
  }

  // T024: AI attribution check (forbidden patterns)
  const fullMessage = trimmedMessage
  for (const forbidden of FORBIDDEN_TEXT) {
    if (fullMessage.includes(forbidden)) {
      const lineIndex = lines.findIndex((line) => line.includes(forbidden))
      errors.push({
        rule: 'ai-attribution',
        message: `Remove AI attribution text "${forbidden}". This violates .claude/rules.md`,
        line: lineIndex + 1,
      })
      break // Only report once
    }
  }

  // T025: Multiple responsibilities warning
  const multiplePatterns = [
    /\band\b/i, // "and" suggests multiple changes
    /,\s*\w+\s+\w+/i, // comma-separated list of actions
  ]

  for (const pattern of multiplePatterns) {
    if (pattern.test(subject)) {
      warnings.push({
        rule: 'multiple-responsibilities',
        message: 'Commit may contain multiple responsibilities',
        suggestion:
          'Consider splitting into separate commits for single responsibility. See .claude/rules.md',
      })
      break // Only warn once
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Format validation result for terminal output
 */
export function formatValidationResult(result: CommitValidationResult): string {
  const output: string[] = []

  if (result.errors.length > 0) {
    output.push('❌ Commit message validation failed:\n')
    for (const error of result.errors) {
      output.push(`  Line ${error.line}: ${error.message}`)
    }
    // T026: Reference to .claude/rules.md
    output.push('\n📚 See .claude/rules.md for commit message standards.')
  }

  if (result.warnings.length > 0) {
    if (output.length > 0) output.push('')
    output.push('⚠️  Warnings:')
    for (const warning of result.warnings) {
      output.push(`  ${warning.message}`)
      output.push(`  💡 ${warning.suggestion}`)
    }
  }

  if (result.valid && result.warnings.length === 0) {
    output.push('✅ Commit message is valid.')
  }

  return output.join('\n')
}

// CLI entry point
if (
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('commit-msg-validator.ts')
) {
  import('fs').then((fs) => {
    const commitMsgFile = process.argv[2]
    if (!commitMsgFile) {
      console.error('Usage: commit-msg-validator.ts <commit-msg-file>')
      process.exit(2)
    }

    try {
      const message = fs.readFileSync(commitMsgFile, 'utf-8')
      const result = validateCommitMessage(message)

      console.log(formatValidationResult(result))

      if (!result.valid) {
        process.exit(1)
      }
    } catch (error) {
      console.error(`Error reading commit message file: ${error}`)
      process.exit(2)
    }
  })
}
