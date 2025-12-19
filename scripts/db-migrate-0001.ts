#!/usr/bin/env tsx

/**
 * Run migration 0001_add_api_keys.sql
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import postgres from 'postgres'
import { readFileSync } from 'fs'
import { join } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

async function runMigration() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL not set')
    process.exit(1)
  }

  console.log('🔗 Connecting to database...')
  const sql = postgres(connectionString, { max: 1 })

  try {
    const migrationPath = join(process.cwd(), 'drizzle', '0001_add_api_keys.sql')
    console.log(`📄 Reading migration: ${migrationPath}`)
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    console.log('🚀 Running migration...')
    await sql.unsafe(migrationSQL)

    console.log('✅ Migration 0001_add_api_keys.sql completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

runMigration()
