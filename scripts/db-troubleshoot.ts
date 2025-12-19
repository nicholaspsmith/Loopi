#!/usr/bin/env tsx

/**
 * Database Connection Troubleshooter
 *
 * Helps diagnose connection issues
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local file
config({ path: resolve(process.cwd(), '.env.local') })

console.log('🔍 Troubleshooting Database Connection\n')

const dbUrl = process.env.DATABASE_URL

if (!dbUrl) {
  console.error('❌ DATABASE_URL is not set in .env.local')
  process.exit(1)
}

console.log('✅ DATABASE_URL is set')
console.log('')

// Parse the URL (safely without showing password)
try {
  const url = new URL(dbUrl)

  console.log('Connection Details:')
  console.log('━'.repeat(50))
  console.log(`Protocol:  ${url.protocol}`)
  console.log(`Host:      ${url.hostname}`)
  console.log(`Port:      ${url.port}`)
  console.log(`Database:  ${url.pathname.substring(1)}`)
  console.log(`Username:  ${url.username}`)
  console.log(`Password:  ${url.password ? '***' + url.password.slice(-4) : 'NOT SET'}`)
  console.log('━'.repeat(50))
  console.log('')

  // Check port
  if (url.port === '5432') {
    console.log("⚠️  You're using port 5432 (Direct Connection)")
    console.log('   This uses IPv6 and may not work on all networks.')
    console.log('')
    console.log('💡 RECOMMENDED FIX:')
    console.log('   Use the Connection Pooler (Transaction mode) instead:')
    console.log('')
    console.log('   1. Go to Supabase Dashboard → Settings → Database')
    console.log('   2. Find "Connection string"')
    console.log('   3. Select "Transaction" tab (NOT Direct Connection)')
    console.log('   4. Copy that connection string')
    console.log('   5. Update DATABASE_URL in .env.local')
    console.log('')
    console.log('   The pooler URL uses port 6543 and works with IPv4.')
    console.log('')
  } else if (url.port === '6543') {
    console.log("✅ You're using port 6543 (Connection Pooler)")
    console.log('   This should work on all networks.')
    console.log('')
  } else {
    console.log(`⚠️  Unexpected port: ${url.port}`)
    console.log('   Supabase uses:')
    console.log('   - 5432 for Direct Connection (IPv6)')
    console.log('   - 6543 for Connection Pooler (IPv4 compatible)')
    console.log('')
  }

  // Check hostname format
  if (!url.hostname.includes('supabase.co')) {
    console.log("⚠️  Hostname doesn't look like a Supabase URL")
    console.log('   Expected format: db.xxxxx.supabase.co')
    console.log('')
  }

  // Check if password is still placeholder
  if (url.password.includes('[') || url.password.includes(']')) {
    console.log('❌ Password contains [ or ] characters')
    console.log('   Did you forget to replace [YOUR-PASSWORD]?')
    console.log('')
  }
} catch (error: any) {
  console.error('❌ Invalid DATABASE_URL format:', error.message)
  console.log('')
  console.log('Expected format:')
  console.log('postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:PORT/postgres')
  process.exit(1)
}

console.log('Next steps:')
console.log("1. If you're using port 5432, switch to the Connection Pooler (6543)")
console.log('2. Make sure your Supabase project is active (not paused)')
console.log('3. After updating, run: npm run db:check')
