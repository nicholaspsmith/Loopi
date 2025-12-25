#!/usr/bin/env tsx

import { config } from 'dotenv'
import { resolve } from 'path'
import postgres from 'postgres'

config({ path: resolve(process.cwd(), '.env.local') })

async function verifySchema() {
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

  try {
    console.log('🔍 Verifying database schema...\n')

    // Check users table columns
    const usersColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `
    console.log('✓ Users table columns:')
    usersColumns.forEach((col: any) => {
      if (col.column_name.includes('email_verified')) {
        console.log(`  🆕 ${col.column_name}: ${col.data_type}`)
      } else {
        console.log(`     ${col.column_name}: ${col.data_type}`)
      }
    })

    // Check new tables exist
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'password_reset_tokens',
        'email_verification_tokens',
        'security_logs',
        'email_queue',
        'rate_limits'
      )
      ORDER BY table_name
    `

    console.log('\n✓ New tables created:')
    tables.forEach((table: any) => {
      console.log(`  ✓ ${table.table_name}`)
    })

    // Count records in new tables (should be 0)
    const counts = await Promise.all([
      sql`SELECT COUNT(*) as count FROM password_reset_tokens`,
      sql`SELECT COUNT(*) as count FROM email_verification_tokens`,
      sql`SELECT COUNT(*) as count FROM security_logs`,
      sql`SELECT COUNT(*) as count FROM email_queue`,
      sql`SELECT COUNT(*) as count FROM rate_limits`,
    ])

    console.log('\n✓ Table record counts:')
    const tableNames = [
      'password_reset_tokens',
      'email_verification_tokens',
      'security_logs',
      'email_queue',
      'rate_limits',
    ]
    counts.forEach((result: any, i: number) => {
      console.log(`  ${tableNames[i]}: ${result[0].count} records`)
    })

    console.log('\n✅ All email verification & password reset tables verified!')
  } catch (error) {
    console.error('❌ Verification failed:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

verifySchema()
