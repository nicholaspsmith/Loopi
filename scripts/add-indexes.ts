/**
 * Add Database Indexes
 *
 * Creates indexes for performance optimization
 * Run this script to apply indexes: npx tsx scripts/add-indexes.ts
 */

import postgres from 'postgres'
import * as fs from 'fs'
import * as path from 'path'

async function main() {
  console.log('📊 Adding database indexes...')

  // Create direct postgres connection
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

  try {
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'drizzle', '0004_add_indexes.sql')
    const sqlContent = fs.readFileSync(migrationPath, 'utf-8')

    // Split into individual statements and execute
    const statements = sqlContent
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      await sql.unsafe(statement)
    }

    console.log('✅ Indexes added successfully')
  } catch (error) {
    console.error('❌ Failed to add indexes:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export default main
