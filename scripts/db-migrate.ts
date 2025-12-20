#!/usr/bin/env tsx

/**
 * Database Migration Script
 *
 * Runs SQL migrations without requiring psql to be installed
 * Usage: npm run db:migrate
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import postgres from 'postgres'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })

async function runMigration() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL environment variable is not set')
    console.error('Please add DATABASE_URL to your .env.local file')
    process.exit(1)
  }

  console.log('🔗 Connecting to database...')
  const sql = postgres(connectionString, {
    max: 1, // Only need one connection for migration
  })

  try {
    // Read the migration SQL file
    const migrationPath = join(process.cwd(), 'drizzle', '0000_initial.sql')
    console.log(`📄 Reading migration: ${migrationPath}`)
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    // Execute the migration
    console.log('🚀 Running migration...')
    await sql.unsafe(migrationSQL)

    console.log('✅ Migration completed successfully!')
    console.log('')
    console.log('Your database schema is now ready.')
    console.log('You can start the dev server with: npm run dev')
    console.log('Or explore your database with: npm run db:studio')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

// Run the migration
runMigration()
