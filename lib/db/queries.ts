import { getDbConnection } from './client'
import type { Table } from '@lancedb/lancedb'

/**
 * Get a LanceDB table by name
 */
export async function getTable(tableName: string): Promise<Table> {
  const db = await getDbConnection()
  return (await db.openTable(tableName)) as Table
}

/**
 * Generic create operation - adds records to a table
 */
export async function create<T extends Record<string, unknown>>(
  tableName: string,
  records: T[]
): Promise<void> {
  const table = await getTable(tableName)
  await table.add(records)
}

/**
 * Generic find by ID operation
 */
export async function findById<T extends { id: string }>(
  tableName: string,
  id: string
): Promise<T | null> {
  const table = await getTable(tableName)
  const results = await table.query().where(`id = '${id}'`).limit(1).toArray()

  return results.length > 0 ? results[0] : null
}

/**
 * Generic find with filter operation
 */
export async function find<T>(tableName: string, filter: string, limit?: number): Promise<T[]> {
  const table = await getTable(tableName)
  let query = table.query().where(filter)

  if (limit) {
    query = query.limit(limit)
  }

  return await query.toArray()
}

/**
 * Generic update operation (delete + insert pattern for LanceDB)
 */
export async function update<T extends { id: string }>(
  tableName: string,
  id: string,
  updates: Partial<T>
): Promise<void> {
  const table = await getTable(tableName)

  // Find existing record
  const existing = await findById<T>(tableName, id)
  if (!existing) {
    throw new Error(`Record not found: ${id}`)
  }

  // Insert updated record - exclude embedding from existing to avoid LanceDB type issues
  const { embedding: _, ...existingWithoutEmbedding } = existing as any
  const updated = { ...existingWithoutEmbedding, ...updates }

  // Only add embedding field if it existed in the original record (e.g., messages have it, conversations don't)
  // This preserves the schema structure while avoiding LanceDB internal type issues
  if ('embedding' in existing && !('embedding' in updates)) {
    updated.embedding = null
  }

  // Delete old record AFTER preparing the update to minimize risk of data loss
  await table.delete(`id = '${id}'`)

  try {
    await table.add([updated])
  } catch (addError) {
    // If add fails, try to restore the original record
    console.error(`[DB] Failed to add updated record for ${id}, attempting to restore:`, addError)
    try {
      // Restore with embedding set to null to avoid type issues
      const restore = {
        ...existingWithoutEmbedding,
        embedding: 'embedding' in existing ? null : undefined,
      }
      if (restore.embedding === undefined) {
        delete restore.embedding
      }
      await table.add([restore])
      console.error(`[DB] Original record restored for ${id}`)
    } catch (restoreError) {
      console.error(`[DB] CRITICAL: Failed to restore record ${id}:`, restoreError)
    }
    throw addError
  }
}

/**
 * Generic delete operation
 */
export async function deleteById(tableName: string, id: string): Promise<void> {
  const table = await getTable(tableName)
  await table.delete(`id = '${id}'`)
}

/**
 * Count records matching a filter
 */
export async function count(tableName: string, filter?: string): Promise<number> {
  const table = await getTable(tableName)
  return await table.countRows(filter)
}
