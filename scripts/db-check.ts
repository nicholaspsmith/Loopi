#!/usr/bin/env tsx

/**
 * Database Connection Check
 *
 * Verifies that DATABASE_URL is configured correctly
 * Usage: npm run db:check
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import postgres from 'postgres'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })

async function checkConnection() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    console.error('❌ DATABASE_URL is not set')
    console.error('')
    console.error('To fix this:')
    console.error('1. Copy .env.example to .env.local:')
    console.error('   cp .env.example .env.local')
    console.error('')
    console.error('2. Get your DATABASE_URL from Supabase:')
    console.error('   - Go to your Supabase dashboard')
    console.error('   - Settings → Database → Connection String')
    console.error('   - Copy the "Direct Connection" string')
    console.error('')
    console.error('3. Add it to .env.local:')
    console.error(
      '   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres'
    )
    console.error('')
    process.exit(1)
  }

  console.log('🔗 Connecting to database...')
  const sql = postgres(connectionString, {
    max: 1,
    connect_timeout: 5, // 5 second timeout
  })

  try {
    // Test the connection
    const result = await sql`SELECT version()`
    console.log('✅ Connected successfully!')
    console.log('')
    console.log('Database:', result[0].version)
    console.log('')

    // Check if pgvector is installed
    console.log('🔍 Checking for pgvector extension...')
    const extensions = await sql`
      SELECT * FROM pg_extension WHERE extname = 'vector'
    `

    if (extensions.length > 0) {
      console.log('✅ pgvector extension is installed')
    } else {
      console.log('⚠️  pgvector extension is NOT installed')
      console.log('')
      console.log('To enable it:')
      console.log('1. Go to your Supabase dashboard')
      console.log('2. Database → Extensions')
      console.log('3. Search for "vector"')
      console.log('4. Toggle it ON')
    }

    console.log('')
    console.log('✨ Your database is ready!')
    console.log('Next step: npm run db:migrate')
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message)
    console.error('')
    console.error('Common issues:')
    console.error('- Check your DATABASE_URL is correct')
    console.error('- Make sure you replaced [PASSWORD] and [PROJECT]')
    console.error('- Verify your Supabase project is active')
    process.exit(1)
  } finally {
    await sql.end()
  }
}

checkConnection()
