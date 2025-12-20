import { describe, it, expect } from 'vitest'
import { getDbConnection } from '@/lib/db/client'

/**
 * Schema Inspection Test
 *
 * Inspects the actual LanceDB schema to see what column names exist
 *
 * Note: Database setup/teardown is handled by tests/db-setup.ts
 */

describe('LanceDB Schema Inspection', () => {
  it('should show messages table schema', async () => {
    const db = await getDbConnection()
    const table = await db.openTable('messages')

    console.log('\n========== MESSAGES TABLE OBJECT ==========')
    console.log('Table type:', typeof table)
    console.log('Table properties:', Object.keys(table))
    console.log('===========================================\n')

    // Try to query all records to see what's actually in there
    const allRecords = await table.query().toArray()
    console.log('\n========== ALL RECORDS ==========')
    console.log('Record count:', allRecords.length)
    if (allRecords.length > 0) {
      console.log('First record keys:', Object.keys(allRecords[0]))
      console.log('First record:', allRecords[0])
    }
    console.log('===========================================\n')

    expect(table).toBeDefined()
  })
})
