/**
 * View PostgreSQL contents
 * Usage: npx tsx scripts/view-postgres.ts [table-name] [limit]
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { getDb } from '@/lib/db/pg-client'
import { users, conversations, messages, apiKeys } from '@/lib/db/drizzle-schema'
import { sql } from 'drizzle-orm'

const tableName = process.argv[2] || 'messages'
const limit = parseInt(process.argv[3] || '10')

async function main() {
  try {
    const db = getDb()

    console.log(`\nViewing table: ${tableName} (limit: ${limit})\n`)

    let results: any[] = []

    switch (tableName) {
      case 'users':
        results = await db.select().from(users).limit(limit)
        break
      case 'conversations':
        results = await db.select().from(conversations).limit(limit)
        break
      case 'messages':
        results = await db.select().from(messages).limit(limit)
        break
      case 'api_keys':
        results = await db.select().from(apiKeys).limit(limit)
        break
      default:
        console.error(`Unknown table: ${tableName}`)
        console.log('Available tables: users, conversations, messages, api_keys')
        process.exit(1)
    }

    console.log(`Found ${results.length} rows:\n`)
    console.log(JSON.stringify(results, null, 2))

    // Get counts
    console.log('\n--- Table Counts ---')
    const userCount = await db.select({ count: sql<number>`count(*)` }).from(users)
    const convCount = await db.select({ count: sql<number>`count(*)` }).from(conversations)
    const msgCount = await db.select({ count: sql<number>`count(*)` }).from(messages)
    const keyCount = await db.select({ count: sql<number>`count(*)` }).from(apiKeys)

    console.log(`Users: ${userCount[0].count}`)
    console.log(`Conversations: ${convCount[0].count}`)
    console.log(`Messages: ${msgCount[0].count}`)
    console.log(`API Keys: ${keyCount[0].count}`)

    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
