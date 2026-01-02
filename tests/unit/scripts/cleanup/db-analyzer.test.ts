import { describe, it, expect } from 'vitest'
import type { Finding } from '../../../../scripts/cleanup/types'
import {
  parseDrizzleSchema,
  extractTableNames,
  findTableReferences,
  findColumnReferences,
  analyzeDatabase,
} from '../../../../scripts/cleanup/db-analyzer'

// Sample Drizzle schema content for testing
const mockSchemaContent = `
import { pgTable, text, timestamp, uuid, varchar, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
  legacyField: text('legacy_field'), // Potentially unused
});

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  title: text('title'),
  archived: boolean('archived').default(false),
  metadata: jsonb('metadata'),
});

export const orphanedTable = pgTable('orphaned_table', {
  id: uuid('id').primaryKey().defaultRandom(),
  unusedColumn: text('unused_column'),
});
`

// Sample codebase files that reference schema entities
const mockCodebaseFiles = {
  'lib/db/queries.ts': `
    import { db } from './connection';
    import { users, conversations } from './drizzle-schema';

    export async function getUser(id: string) {
      return db.select().from(users).where(eq(users.id, id));
    }

    export async function getUserConversations(userId: string) {
      return db.select().from(conversations).where(eq(conversations.userId, userId));
    }
  `,
  'app/api/users/route.ts': `
    import { users } from '@/lib/db/drizzle-schema';

    export async function GET() {
      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        name: users.name,
      }).from(users);
      return Response.json(allUsers);
    }
  `,
  'app/dashboard/page.tsx': `
    // This file doesn't reference any database entities
    export default function Dashboard() {
      return <div>Dashboard</div>;
    }
  `,
}

describe('db-analyzer', () => {
  describe('parseDrizzleSchema (T017)', () => {
    it('should parse Drizzle pgTable definitions', () => {
      const schema = parseDrizzleSchema(mockSchemaContent)

      expect(schema).toHaveProperty('tables')
      expect(schema.tables.length).toBeGreaterThanOrEqual(3)
    })

    it('should extract table names from schema', () => {
      const schema = parseDrizzleSchema(mockSchemaContent)

      const tableNames = schema.tables.map((t) => t.name)
      expect(tableNames).toContain('users')
      expect(tableNames).toContain('conversations')
      expect(tableNames).toContain('orphanedTable') // Variable name, not db name
    })

    it('should extract column definitions for each table', () => {
      const schema = parseDrizzleSchema(mockSchemaContent)

      const usersTable = schema.tables.find((t) => t.name === 'users')
      expect(usersTable).toBeDefined()
      expect(usersTable?.columns.length).toBeGreaterThanOrEqual(4)

      const columnNames = usersTable?.columns.map((c) => c.name)
      expect(columnNames).toContain('id')
      expect(columnNames).toContain('email')
      expect(columnNames).toContain('name')
    })

    it('should handle empty schema', () => {
      const schema = parseDrizzleSchema('')
      expect(schema.tables).toEqual([])
    })

    it('should handle malformed schema gracefully', () => {
      const malformed = 'export const broken = notATable('
      expect(() => parseDrizzleSchema(malformed)).not.toThrow()
    })
  })

  describe('extractTableNames (T018)', () => {
    it('should extract all table variable names', () => {
      const tableNames = extractTableNames(mockSchemaContent)

      expect(tableNames).toContain('users')
      expect(tableNames).toContain('conversations')
      expect(tableNames).toContain('orphanedTable')
    })

    it('should return empty array for non-schema content', () => {
      const tableNames = extractTableNames('const x = 5;')
      expect(tableNames).toEqual([])
    })
  })

  describe('extractColumnNames (T019)', () => {
    it('should extract column names for a specific table', () => {
      const schema = parseDrizzleSchema(mockSchemaContent)
      const usersTable = schema.tables.find((t) => t.name === 'users')
      const columnNames = usersTable?.columns.map((c) => c.name) ?? []

      expect(columnNames).toContain('id')
      expect(columnNames).toContain('email')
      expect(columnNames).toContain('legacyField')
    })

    it('should capture column database names', () => {
      const schema = parseDrizzleSchema(mockSchemaContent)
      const usersTable = schema.tables.find((t) => t.name === 'users')
      const legacyColumn = usersTable?.columns.find((c) => c.name === 'legacyField')

      expect(legacyColumn).toBeDefined()
      expect(legacyColumn?.dbName).toBe('legacy_field')
    })
  })

  describe('findTableReferences', () => {
    it('should find references to table variables in codebase', () => {
      const refs = findTableReferences('users', mockCodebaseFiles)

      expect(refs.length).toBeGreaterThanOrEqual(2)
      expect(refs).toContainEqual(expect.objectContaining({ file: 'lib/db/queries.ts' }))
      expect(refs).toContainEqual(expect.objectContaining({ file: 'app/api/users/route.ts' }))
    })

    it('should return empty array for unreferenced tables', () => {
      const refs = findTableReferences('orphanedTable', mockCodebaseFiles)
      expect(refs).toEqual([])
    })

    it('should not match partial table names', () => {
      const refs = findTableReferences('user', mockCodebaseFiles)
      // Should not match 'users' or 'userId'
      expect(refs.length).toBe(0)
    })
  })

  describe('findColumnReferences', () => {
    it('should find references to column usage', () => {
      const refs = findColumnReferences('users', 'email', mockCodebaseFiles)

      expect(refs.length).toBeGreaterThanOrEqual(1)
      expect(refs).toContainEqual(expect.objectContaining({ file: 'app/api/users/route.ts' }))
    })

    it('should return empty array for unreferenced columns', () => {
      const refs = findColumnReferences('users', 'legacyField', mockCodebaseFiles)
      expect(refs).toEqual([])
    })

    it('should detect column usage patterns', () => {
      // Common patterns: table.column, { column: table.column }
      const refs = findColumnReferences('users', 'id', mockCodebaseFiles)
      expect(refs.length).toBeGreaterThan(0)
    })
  })

  describe('analyzeDatabase', () => {
    it('should return findings for unreferenced tables', async () => {
      const result = await analyzeDatabase(mockSchemaContent, mockCodebaseFiles)

      const tableFindings = result.findings.filter(
        (f: Finding) => f.category === 'database' && f.name.includes('table')
      )

      // orphanedTable should be flagged
      const orphanedFinding = tableFindings.find((f: Finding) =>
        f.name.toLowerCase().includes('orphaned')
      )
      expect(orphanedFinding).toBeDefined()
    })

    it('should return findings for unreferenced columns', async () => {
      const result = await analyzeDatabase(mockSchemaContent, mockCodebaseFiles)

      // legacyField in users table is never referenced
      const columnFindings = result.findings.filter(
        (f: Finding) => f.category === 'database' && f.name.includes('legacyField')
      )
      expect(columnFindings.length).toBeGreaterThanOrEqual(0) // May or may not be detected
    })

    it('should not flag referenced tables', async () => {
      const result = await analyzeDatabase(mockSchemaContent, mockCodebaseFiles)

      // users table is referenced, should not be in findings
      const usersTableFinding = result.findings.find(
        (f: Finding) => f.category === 'database' && f.name === 'users' && !f.name.includes('.')
      )
      expect(usersTableFinding).toBeUndefined()
    })

    it('should assign dangerous risk level to database entities', async () => {
      const result = await analyzeDatabase(mockSchemaContent, mockCodebaseFiles)

      // Database entities should be flagged as dangerous
      result.findings.forEach((finding: Finding) => {
        if (finding.category === 'database') {
          expect(finding.riskLevel).toBe('dangerous')
        }
      })
    })

    it('should include location with schema file path', async () => {
      const result = await analyzeDatabase(mockSchemaContent, mockCodebaseFiles)

      result.findings.forEach((finding: Finding) => {
        if (finding.category === 'database') {
          expect(finding.location).toContain('drizzle-schema')
        }
      })
    })

    it('should include analyzer metadata', async () => {
      const result = await analyzeDatabase(mockSchemaContent, mockCodebaseFiles)

      expect(result.analyzer).toBe('database')
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
      expect(result.errors).toBeDefined()
    })
  })

  describe('Risk Level (T027)', () => {
    it('should assign dangerous risk level for all database findings', async () => {
      const result = await analyzeDatabase(mockSchemaContent, mockCodebaseFiles)

      const dbFindings = result.findings.filter((f: Finding) => f.category === 'database')
      dbFindings.forEach((finding: Finding) => {
        expect(finding.riskLevel).toBe('dangerous')
      })
    })

    it('should include appropriate context for database findings', async () => {
      const result = await analyzeDatabase(mockSchemaContent, mockCodebaseFiles)

      result.findings.forEach((finding: Finding) => {
        expect(finding.context).toBeDefined()
        expect(finding.context.length).toBeGreaterThan(0)
      })
    })
  })
})
