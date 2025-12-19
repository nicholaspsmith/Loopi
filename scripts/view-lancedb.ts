/**
 * View LanceDB contents
 * Usage: npx tsx scripts/view-lancedb.ts [table-name] [limit]
 */

import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { getDbConnection } from '@/lib/db/client'

const tableName = process.argv[2] || 'flashcards'
const limit = parseInt(process.argv[3] || '10')

async function main() {
  try {
    const db = await getDbConnection()

    // List all tables
    console.log('Available tables:', await db.tableNames())
    console.log(`\nViewing table: ${tableName} (limit: ${limit})\n`)

    const table = await db.openTable(tableName)
    const results = await table.query().limit(limit).toArray()

    console.log(`Found ${results.length} rows:\n`)
    console.log(JSON.stringify(results, null, 2))

    process.exit(0)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
