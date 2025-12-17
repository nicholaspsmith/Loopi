/**
 * Type definitions for Claude API Integration
 */

/**
 * AI Provider types
 */
export type AIProvider = 'claude' | 'ollama'

/**
 * API Key with all database fields
 */
export interface ApiKeyRecord {
  id: string
  userId: string
  encryptedKey: string
  keyPreview: string
  isValid: boolean
  lastValidatedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * API Key for insertion (without auto-generated fields)
 */
export interface NewApiKeyRecord {
  userId: string
  encryptedKey: string
  keyPreview: string
  isValid?: boolean
  lastValidatedAt?: Date | null
}

/**
 * API Key validation request
 */
export interface ValidateApiKeyRequest {
  apiKey: string
}

/**
 * API Key validation response
 */
export interface ValidateApiKeyResponse {
  valid: boolean
  error?: string
}

/**
 * API Key save/update request
 */
export interface SaveApiKeyRequest {
  apiKey: string
}

/**
 * API Key save/update response
 */
export interface SaveApiKeyResponse {
  success: boolean
  message: string
  keyPreview?: string
}

/**
 * API Key retrieval response
 */
export interface GetApiKeyResponse {
  exists: boolean
  keyPreview?: string
  isValid?: boolean
  lastValidatedAt?: string | null
}

/**
 * API Key deletion response
 */
export interface DeleteApiKeyResponse {
  success: boolean
  message: string
}

/**
 * Message with AI provider metadata
 */
export interface MessageWithProvider {
  id: string
  conversationId: string
  userId: string
  role: 'user' | 'assistant'
  content: string
  aiProvider: AIProvider | null
  apiKeyId: string | null
  createdAt: Date
}
