/**
 * Database Analyzer - Unused Database Entity Detection
 *
 * Analyzes Drizzle ORM schema to detect unused tables and columns.
 * Searches codebase for references to database entities.
 */

import * as fs from 'fs'
import * as path from 'path'
import { type Finding, type AnalyzerResult, generateFindingId } from './types'

/**
 * Column definition extracted from schema
 */
export interface ColumnDef {
  name: string // JavaScript property name (e.g., 'createdAt')
  dbName: string // Database column name (e.g., 'created_at')
  type: string // Column type (e.g., 'uuid', 'text')
  line?: number
}

/**
 * Table definition extracted from schema
 */
export interface TableDef {
  name: string // JavaScript variable name (e.g., 'users')
  dbName: string // Database table name (e.g., 'users')
  columns: ColumnDef[]
  line?: number
}

/**
 * Parsed schema structure
 */
export interface ParsedSchema {
  tables: TableDef[]
}

/**
 * Reference found in codebase
 */
export interface Reference {
  file: string
  line: number
  context: string
}

/**
 * Parse Drizzle schema content to extract table and column definitions
 */
export function parseDrizzleSchema(content: string): ParsedSchema {
  const tables: TableDef[] = []

  // Match pgTable, mysqlTable, sqliteTable definitions
  // Use a more flexible approach that handles multiline definitions
  const tableStartRegex =
    /export\s+const\s+(\w+)\s*=\s*(?:pg|mysql|sqlite)Table\s*\(\s*['"]([^'"]+)['"]\s*,\s*\{/g

  let match
  while ((match = tableStartRegex.exec(content)) !== null) {
    const [, varName, dbTableName] = match
    const startIndex = match.index + match[0].length
    const line = content.substring(0, match.index).split('\n').length

    // Find the matching closing brace for the columns object
    let braceCount = 1
    let endIndex = startIndex
    while (braceCount > 0 && endIndex < content.length) {
      if (content[endIndex] === '{') braceCount++
      if (content[endIndex] === '}') braceCount--
      endIndex++
    }

    const columnsBlock = content.substring(startIndex, endIndex - 1)
    const columns = parseColumns(columnsBlock)

    tables.push({
      name: varName,
      dbName: dbTableName,
      columns,
      line,
    })
  }

  return { tables }
}

/**
 * Parse column definitions from a table's column block
 */
function parseColumns(columnsBlock: string): ColumnDef[] {
  const columns: ColumnDef[] = []

  // Match column definitions: columnName: type('db_column_name', ...)
  // Handles multiline and various patterns
  // e.g., email: varchar('email', { length: 255 })
  // e.g., userId: uuid('user_id')
  // e.g., createdAt: timestamp('created_at').defaultNow()
  const columnRegex = /(\w+)\s*:\s*(\w+)\s*\(\s*['"]([^'"]+)['"]/g

  let match
  while ((match = columnRegex.exec(columnsBlock)) !== null) {
    const [, propName, type, dbColName] = match
    columns.push({
      name: propName,
      dbName: dbColName,
      type,
    })
  }

  return columns
}

/**
 * Extract table variable names from schema content
 */
export function extractTableNames(content: string): string[] {
  const names: string[] = []
  const regex = /export\s+const\s+(\w+)\s*=\s*(?:pg|mysql|sqlite)Table/g

  let match
  while ((match = regex.exec(content)) !== null) {
    names.push(match[1])
  }

  return names
}

/**
 * Extract column names for a given table from parsed schema
 */
export function extractColumnNames(schema: ParsedSchema, tableName: string): string[] {
  const table = schema.tables.find((t) => t.name === tableName)
  return table?.columns.map((c) => c.name) ?? []
}

/**
 * Find references to a table in the codebase
 */
export function findTableReferences(tableName: string, files: Record<string, string>): Reference[] {
  const refs: Reference[] = []

  // Patterns to match table references:
  // - Direct import: from(tableName)
  // - Property access after import
  // - Word boundary match to avoid partial matches
  const patterns = [
    new RegExp(`\\b${tableName}\\b(?!\\w)`, 'g'), // Word boundary, not followed by word char
  ]

  for (const [filePath, content] of Object.entries(files)) {
    // Skip the schema file itself
    if (filePath.includes('drizzle-schema')) continue

    for (const pattern of patterns) {
      const lines = content.split('\n')
      lines.forEach((line, idx) => {
        if (pattern.test(line)) {
          refs.push({
            file: filePath,
            line: idx + 1,
            context: line.trim(),
          })
        }
        pattern.lastIndex = 0 // Reset regex state
      })
    }
  }

  return refs
}

/**
 * Find references to a column in the codebase
 */
export function findColumnReferences(
  tableName: string,
  columnName: string,
  files: Record<string, string>
): Reference[] {
  const refs: Reference[] = []

  // Patterns to match column references:
  // - table.column
  // - { column: table.column }
  // - select({ column: ... })
  const patterns = [
    new RegExp(`${tableName}\\.${columnName}\\b`, 'g'),
    new RegExp(`\\b${columnName}\\s*:\\s*${tableName}\\.${columnName}`, 'g'),
  ]

  for (const [filePath, content] of Object.entries(files)) {
    // Skip the schema file itself
    if (filePath.includes('drizzle-schema')) continue

    for (const pattern of patterns) {
      const lines = content.split('\n')
      lines.forEach((line, idx) => {
        if (pattern.test(line)) {
          refs.push({
            file: filePath,
            line: idx + 1,
            context: line.trim(),
          })
        }
        pattern.lastIndex = 0 // Reset regex state
      })
    }
  }

  return refs
}

/**
 * Read all TypeScript/JavaScript files from a directory recursively
 */
function readCodebaseFiles(baseDir: string): Record<string, string> {
  const files: Record<string, string> = {}

  const extensions = ['.ts', '.tsx', '.js', '.jsx']
  const ignoreDirs = ['node_modules', '.next', 'dist', 'build', 'drizzle']

  function walkDir(dir: string, relativePath = ''): void {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      const relPath = path.join(relativePath, entry.name)

      if (entry.isDirectory()) {
        // Skip ignored directories
        if (ignoreDirs.includes(entry.name) || entry.name.startsWith('.')) {
          continue
        }
        walkDir(fullPath, relPath)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name)
        if (extensions.includes(ext)) {
          try {
            files[relPath] = fs.readFileSync(fullPath, 'utf-8')
          } catch {
            // Skip files we can't read
          }
        }
      }
    }
  }

  walkDir(baseDir)
  return files
}

/**
 * Analyze database schema for unused entities
 */
export async function analyzeDatabase(
  schemaContent?: string,
  codebaseFiles?: Record<string, string>,
  schemaPath = 'lib/db/drizzle-schema.ts'
): Promise<AnalyzerResult> {
  const startTime = Date.now()
  const errors: string[] = []
  const findings: Finding[] = []

  try {
    // Read schema if not provided
    let schema: string
    if (schemaContent) {
      schema = schemaContent
    } else {
      const fullSchemaPath = path.resolve(process.cwd(), schemaPath)
      if (!fs.existsSync(fullSchemaPath)) {
        errors.push(`Schema file not found: ${schemaPath}`)
        return {
          analyzer: 'database',
          findings,
          errors,
          durationMs: Date.now() - startTime,
        }
      }
      schema = fs.readFileSync(fullSchemaPath, 'utf-8')
    }

    // Read codebase files if not provided
    const files = codebaseFiles ?? readCodebaseFiles(process.cwd())

    // Parse schema
    const parsedSchema = parseDrizzleSchema(schema)

    // Check each table for references
    for (const table of parsedSchema.tables) {
      const tableRefs = findTableReferences(table.name, files)

      if (tableRefs.length === 0) {
        // Table is not referenced anywhere
        findings.push({
          id: generateFindingId('database', table.name, schemaPath),
          category: 'database',
          name: `table:${table.name}`,
          location: `${schemaPath}:${table.line ?? 0}`,
          context: `Table "${table.dbName}" (var: ${table.name}) has no code references`,
          riskLevel: 'dangerous',
          confidence: 70,
          isDevOnly: false,
          references: [],
        })
      } else {
        // Table is referenced, check columns
        for (const column of table.columns) {
          const colRefs = findColumnReferences(table.name, column.name, files)

          if (colRefs.length === 0) {
            findings.push({
              id: generateFindingId('database', `${table.name}.${column.name}`, schemaPath),
              category: 'database',
              name: `column:${table.name}.${column.name}`,
              location: `${schemaPath}`,
              context: `Column "${column.dbName}" in table "${table.dbName}" has no code references`,
              riskLevel: 'dangerous',
              confidence: 60,
              isDevOnly: false,
              references: tableRefs.map((r) => `Table referenced in ${r.file}:${r.line}`),
            })
          }
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error analyzing database'
    errors.push(`Database analysis failed: ${message}`)
  }

  return {
    analyzer: 'database',
    findings,
    errors,
    durationMs: Date.now() - startTime,
  }
}
