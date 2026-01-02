/**
 * Environment Variable Analyzer
 *
 * Detects environment variables defined in .env files that are not
 * referenced anywhere in the codebase.
 */

import { type Finding, type AnalyzerResult, generateFindingId } from './types'

/**
 * Reference to an environment variable in the codebase
 */
export interface EnvReference {
  file: string
  line: number
  context: string
}

/**
 * Parse a .env file content and extract variable names
 *
 * @param content - Raw content of the .env file
 * @returns Array of environment variable names
 */
export function parseEnvFile(content: string): string[] {
  if (!content.trim()) {
    return []
  }

  const lines = content.split('\n')
  const envVars: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    // Extract variable name (everything before the first =)
    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=/i)
    if (match) {
      envVars.push(match[1])
    }
  }

  return envVars
}

/**
 * Find references to an environment variable in the codebase
 *
 * @param varName - The environment variable name to search for
 * @param codebaseFiles - Map of file paths to file contents
 * @returns Array of references found
 */
export function findEnvReferences(
  varName: string,
  codebaseFiles: Record<string, string>
): EnvReference[] {
  const references: EnvReference[] = []

  // Patterns to search for:
  // 1. process.env.VAR_NAME
  // 2. process.env['VAR_NAME']
  // 3. process.env["VAR_NAME"]
  // 4. env.VAR_NAME (common wrapper pattern)
  const patterns = [
    new RegExp(`process\\.env\\.${varName}(?![A-Z0-9_])`, 'g'),
    new RegExp(`process\\.env\\['${varName}'\\]`, 'g'),
    new RegExp(`process\\.env\\["${varName}"\\]`, 'g'),
    new RegExp(`\\benv\\.${varName}(?![A-Z0-9_])`, 'g'),
  ]

  for (const [filePath, content] of Object.entries(codebaseFiles)) {
    const lines = content.split('\n')

    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum]

      for (const pattern of patterns) {
        // Reset regex lastIndex for global patterns
        pattern.lastIndex = 0

        if (pattern.test(line)) {
          references.push({
            file: filePath,
            line: lineNum + 1,
            context: line.trim(),
          })
          break // Only add one reference per line
        }
      }
    }
  }

  return references
}

/**
 * Analyze environment variables for unreferenced entries
 *
 * @param envContent - Content of the .env file
 * @param codebaseFiles - Map of file paths to file contents
 * @returns Analyzer result with findings
 */
export async function analyzeEnvironment(
  envContent: string,
  codebaseFiles: Record<string, string>
): Promise<AnalyzerResult> {
  const startTime = Date.now()
  const errors: string[] = []
  const findings: Finding[] = []

  try {
    // Parse env file to get all variable names
    const envVars = parseEnvFile(envContent)

    // Check each variable for references
    for (const varName of envVars) {
      const refs = findEnvReferences(varName, codebaseFiles)

      // If no references found, add as a finding
      if (refs.length === 0) {
        findings.push({
          id: generateFindingId('config', varName, '.env'),
          category: 'config',
          name: varName,
          location: '.env',
          context: `Environment variable "${varName}" is defined but not referenced in the codebase`,
          riskLevel: 'review',
          confidence: 80,
          isDevOnly: false,
          references: [],
        })
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error analyzing environment'
    errors.push(`Environment analysis failed: ${message}`)
  }

  return {
    analyzer: 'environment',
    findings,
    errors,
    durationMs: Date.now() - startTime,
  }
}
