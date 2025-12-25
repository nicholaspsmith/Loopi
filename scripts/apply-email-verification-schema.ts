#!/usr/bin/env tsx

/**
 * Apply Email Verification & Password Reset Schema Changes
 *
 * This script adds:
 * - email_verified and email_verified_at columns to users table
 * - password_reset_tokens table
 * - email_verification_tokens table
 * - security_logs table
 * - email_queue table
 * - rate_limits table
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import postgres from 'postgres'

config({ path: resolve(process.cwd(), '.env.local') })

async function applySchema() {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL environment variable is not set')
    process.exit(1)
  }

  console.log('🔗 Connecting to database...')
  const sql = postgres(connectionString, { max: 1 })

  try {
    console.log('📝 Adding email verification columns to users table...')
    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false NOT NULL,
      ADD COLUMN IF NOT EXISTS email_verified_at timestamp
    `

    console.log('📝 Creating password_reset_tokens table...')
    await sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash varchar(64) NOT NULL UNIQUE,
        expires_at timestamp NOT NULL,
        used boolean DEFAULT false NOT NULL,
        used_at timestamp,
        created_at timestamp DEFAULT NOW() NOT NULL
      )
    `

    console.log('📝 Creating email_verification_tokens table...')
    await sql`
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash varchar(64) NOT NULL UNIQUE,
        expires_at timestamp NOT NULL,
        used boolean DEFAULT false NOT NULL,
        used_at timestamp,
        created_at timestamp DEFAULT NOW() NOT NULL
      )
    `

    console.log('📝 Creating security_logs table...')
    await sql`
      CREATE TABLE IF NOT EXISTS security_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        event_type varchar(50) NOT NULL,
        email varchar(255) NOT NULL,
        ip_address varchar(45) NOT NULL,
        user_agent text,
        geolocation jsonb,
        token_id varchar(64),
        outcome varchar(20) NOT NULL,
        metadata jsonb,
        created_at timestamp DEFAULT NOW() NOT NULL
      )
    `

    console.log('📝 Creating email_queue table...')
    await sql`
      CREATE TABLE IF NOT EXISTS email_queue (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "to" varchar(255) NOT NULL,
        subject varchar(500) NOT NULL,
        text_body text NOT NULL,
        html_body text,
        attempts integer DEFAULT 0 NOT NULL,
        next_retry_at timestamp,
        status varchar(20) DEFAULT 'pending' NOT NULL,
        error text,
        created_at timestamp DEFAULT NOW() NOT NULL,
        sent_at timestamp
      )
    `

    console.log('📝 Creating rate_limits table...')
    await sql`
      CREATE TABLE IF NOT EXISTS rate_limits (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar(255) NOT NULL UNIQUE,
        attempts jsonb DEFAULT '[]'::jsonb NOT NULL,
        window_start timestamp NOT NULL,
        created_at timestamp DEFAULT NOW() NOT NULL
      )
    `

    console.log('✅ All schema changes applied successfully!')
    console.log('')
    console.log('New tables created:')
    console.log('  - password_reset_tokens')
    console.log('  - email_verification_tokens')
    console.log('  - security_logs')
    console.log('  - email_queue')
    console.log('  - rate_limits')
    console.log('')
    console.log('Users table updated with email verification columns.')
  } catch (error) {
    console.error('❌ Schema update failed:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

applySchema()
