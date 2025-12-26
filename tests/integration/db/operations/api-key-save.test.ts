import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createUser } from '@/lib/db/operations/users'
import {
  saveUserApiKey,
  getUserApiKey,
  getUserApiKeyRecord,
  deleteUserApiKey,
} from '@/lib/db/operations/api-keys'
import { hashPassword } from '@/lib/auth/helpers'
import { getDb } from '@/lib/db/pg-client'
import { users } from '@/lib/db/drizzle-schema'
import { eq } from 'drizzle-orm'

/**
 * Integration Tests for API Key Save Functionality
 *
 * Tests verify that users can successfully save API keys with encryption.
 * This tests the entire flow from user creation to API key storage.
 */

describe('API Key Save Integration Tests', () => {
  let testUserId: string
  const testEmail = `test-api-key-${Date.now()}@example.com`
  const testPassword = 'SecurePass123!'
  const testApiKey = 'sk-ant-api03-test-key-long-enough-for-validation-1234567890abcdef'

  beforeAll(async () => {
    // Create a test user in PostgreSQL
    const passwordHash = await hashPassword(testPassword)
    const user = await createUser({
      email: testEmail,
      passwordHash,
      name: 'API Key Test User',
    })

    testUserId = user.id
    console.log(`[Test] Created test user: ${testUserId}`)
  })

  afterAll(async () => {
    // Clean up test user
    const db = getDb()
    await db.delete(users).where(eq(users.id, testUserId))
    console.log(`[Test] Cleaned up test user: ${testUserId}`)
  })

  describe('User Creation and Verification', () => {
    it('should create user in PostgreSQL', async () => {
      const db = getDb()
      const [user] = await db.select().from(users).where(eq(users.id, testUserId)).limit(1)

      expect(user).toBeDefined()
      expect(user.id).toBe(testUserId)
      expect(user.email).toBe(testEmail)
    })

    it('should have valid user ID format', () => {
      expect(testUserId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    })
  })

  describe('API Key Save Operation', () => {
    it('should save API key successfully', async () => {
      const savedKey = await saveUserApiKey(testUserId, testApiKey)

      expect(savedKey).toBeDefined()
      expect(savedKey.id).toBeDefined()
      expect(savedKey.userId).toBe(testUserId)
      expect(savedKey.encryptedKey).toBeDefined()
      expect(savedKey.encryptedKey).not.toBe(testApiKey) // Should be encrypted
      expect(savedKey.keyPreview).toBe('sk-ant-...cdef')
      expect(savedKey.isValid).toBe(true)
      expect(savedKey.createdAt).toBeInstanceOf(Date)
      expect(savedKey.updatedAt).toBeInstanceOf(Date)
    })

    it('should retrieve encrypted API key record', async () => {
      const record = await getUserApiKeyRecord(testUserId)

      expect(record).toBeDefined()
      expect(record?.userId).toBe(testUserId)
      expect(record?.encryptedKey).toBeDefined()
      expect(record?.keyPreview).toBe('sk-ant-...cdef')
    })

    it('should decrypt API key correctly', async () => {
      const decryptedKey = await getUserApiKey(testUserId)

      expect(decryptedKey).toBe(testApiKey)
    })

    it('should return null for non-existent user', async () => {
      const fakeUserId = '00000000-0000-0000-0000-000000000000'
      const key = await getUserApiKey(fakeUserId)

      expect(key).toBeNull()
    })
  })

  describe('API Key Update Operation', () => {
    it('should update existing API key', async () => {
      const newApiKey = 'sk-ant-api03-updated-key-long-enough-for-validation-0987654321fedcba'

      const updatedKey = await saveUserApiKey(testUserId, newApiKey)

      expect(updatedKey).toBeDefined()
      expect(updatedKey.userId).toBe(testUserId)
      expect(updatedKey.keyPreview).toBe('sk-ant-...dcba')

      // Verify decryption returns new key
      const decryptedKey = await getUserApiKey(testUserId)
      expect(decryptedKey).toBe(newApiKey)
    })

    it('should maintain single API key per user (unique constraint)', async () => {
      const record = await getUserApiKeyRecord(testUserId)
      expect(record).toBeDefined()

      // There should be only one record for this user
      const db = getDb()
      const { apiKeys } = await import('@/lib/db/drizzle-schema')
      const records = await db.select().from(apiKeys).where(eq(apiKeys.userId, testUserId))

      expect(records).toHaveLength(1)
    })
  })

  describe('API Key Deletion Operation', () => {
    it('should delete API key successfully', async () => {
      const deleted = await deleteUserApiKey(testUserId)

      expect(deleted).toBe(true)
    })

    it('should return null after deletion', async () => {
      const key = await getUserApiKey(testUserId)

      expect(key).toBeNull()
    })

    it('should return false when deleting non-existent key', async () => {
      const deleted = await deleteUserApiKey(testUserId)

      expect(deleted).toBe(false)
    })
  })

  describe('Encryption Security', () => {
    it('should encrypt API key (not store plaintext)', async () => {
      const testKey = 'sk-ant-api03-security-test-key-long-enough-validation-1234567890'
      await saveUserApiKey(testUserId, testKey)

      const record = await getUserApiKeyRecord(testUserId)

      expect(record?.encryptedKey).toBeDefined()
      expect(record?.encryptedKey).not.toBe(testKey)
      expect(record?.encryptedKey).not.toContain('sk-ant-')
      expect(record?.encryptedKey.length).toBeGreaterThan(testKey.length)
    })

    it('should decrypt correctly after encryption', async () => {
      const testKey = 'sk-ant-api03-decrypt-test-key-long-enough-validation-abcdef123456'
      await saveUserApiKey(testUserId, testKey)

      const decrypted = await getUserApiKey(testUserId)

      expect(decrypted).toBe(testKey)
    })

    it('should create different encrypted values for same key', async () => {
      const testKey = 'sk-ant-api03-same-key-long-enough-for-validation-1234567890'

      // Save key
      await saveUserApiKey(testUserId, testKey)
      const record1 = await getUserApiKeyRecord(testUserId)

      // Delete and save same key again
      await deleteUserApiKey(testUserId)
      await saveUserApiKey(testUserId, testKey)
      const record2 = await getUserApiKeyRecord(testUserId)

      // Encrypted values should be different (encryption is non-deterministic)
      expect(record1?.encryptedKey).not.toBe(record2?.encryptedKey)

      // But both should decrypt to the same value
      const decrypted = await getUserApiKey(testUserId)
      expect(decrypted).toBe(testKey)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid user ID gracefully', async () => {
      const invalidUserId = 'not-a-uuid'

      await expect(saveUserApiKey(invalidUserId, testApiKey)).rejects.toThrow()
    })

    it('should handle non-existent user ID', async () => {
      const fakeUserId = '12345678-1234-1234-1234-123456789012'

      await expect(saveUserApiKey(fakeUserId, testApiKey)).rejects.toThrow()
    })
  })
})
