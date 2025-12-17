import { getDbConnection } from './client'
import type { Table } from '@lancedb/lancedb'

/**
 * Get a LanceDB table by name
 */
export async function getTable(tableName: string): Promise<Table> {
  const db = await getDbConnection()
  return await db.openTable(tableName) as Table
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
export async function find<T>(
  tableName: string,
  filter: string,
  limit?: number
): Promise<T[]> {
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

  // Delete old record
  await table.delete(`id = '${id}'`)

  // Insert updated record
  const updated = { ...existing, ...updates }

  // Clean up embedding field to remove any LanceDB internal properties
  // LanceDB may return embeddings as objects with metadata - convert to plain array or null
  if ('embedding' in updated) {
    const emb = updated.embedding
    if (emb === null || emb === undefined) {
      updated.embedding = null
    } else if (Array.isArray(emb)) {
      // Convert to plain array to avoid LanceDB vector type issues
      updated.embedding = [...emb]
    } else if (typeof emb === 'object') {
      // Try to convert object-like embeddings to arrays
      if ('toArray' in emb && typeof (emb as any).toArray === 'function') {
        updated.embedding = (emb as any).toArray()
      } else if ('length' in emb) {
        // Array-like object with length - convert to plain array
        updated.embedding = Array.from(emb as any)
      } else {
        // Unknown type, set to null to avoid schema errors
        console.warn('[DB] Unknown embedding type, setting to null:', typeof emb)
        updated.embedding = null
      }
    } else {
      // Primitive type, set to null
      updated.embedding = null
    }
  }

  await table.add([updated])
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
