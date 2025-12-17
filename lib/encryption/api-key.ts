import { getDb } from '@/lib/db/pg-client'
import { sql } from 'drizzle-orm'

/**
 * API Key Encryption Service
 *
 * Uses PostgreSQL pgcrypto extension for symmetric encryption (AES-256)
 * Encryption happens at database layer for security
 */

const ENCRYPTION_SECRET = process.env.API_KEY_ENCRYPTION_SECRET

if (!ENCRYPTION_SECRET) {
  throw new Error('API_KEY_ENCRYPTION_SECRET environment variable must be set')
}

/**
 * Encrypt API key using PostgreSQL pgcrypto
 *
 * @param apiKey - Plaintext Claude API key
 * @returns Base64-encoded encrypted blob
 */
export async function encryptApiKey(apiKey: string): Promise<string> {
  const db = getDb()

  const result = await db.execute<{ encrypted: string }>(sql`
    SELECT encode(
      pgp_sym_encrypt(${apiKey}, ${ENCRYPTION_SECRET}),
      'base64'
    ) as encrypted
  `)

  return result[0].encrypted
}

/**
 * Decrypt API key using PostgreSQL pgcrypto
 *
 * @param encryptedKey - Base64-encoded encrypted blob
 * @returns Plaintext API key or null if decryption fails
 */
export async function decryptApiKey(encryptedKey: string): Promise<string | null> {
  const db = getDb()

  try {
    const result = await db.execute<{ decrypted: string }>(sql`
      SELECT pgp_sym_decrypt(
        decode(${encryptedKey}, 'base64'),
        ${ENCRYPTION_SECRET}
      ) as decrypted
    `)

    return result[0].decrypted
  } catch (error) {
    console.error('[Encryption] Failed to decrypt API key:', error)
    return null
  }
}

/**
 * Generate masked preview of API key for display
 *
 * @param apiKey - Plaintext API key
 * @returns Masked key like "sk-ant-...xyz123"
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 11) {
    return '***'
  }

  // Show first 7 characters (sk-ant-) and last 4 characters
  const prefix = apiKey.slice(0, 7)
  const suffix = apiKey.slice(-4)

  return `${prefix}...${suffix}`
}
