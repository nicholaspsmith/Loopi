# Technical Research: Claude API Integration with User API Keys

**Feature Branch**: `004-claude-api`
**Date**: 2025-12-17
**Context**: This research document supports the implementation plan at `specs/004-claude-api/plan.md`

## Overview

This document provides technical decisions and research findings for implementing Claude API integration with user-provided API keys. Each topic includes a clear decision, rationale, alternatives considered, and implementation notes specific to the memoryloop codebase.

---

## 1. PostgreSQL pgcrypto for API Key Encryption

### Decision

Use PostgreSQL's built-in `pgcrypto` extension with symmetric encryption (`pgp_sym_encrypt/decrypt`) to encrypt API keys at rest. Store the encryption key in an environment variable (`API_KEY_ENCRYPTION_SECRET`).

### Rationale

- **Database-level security**: Encryption happens at the database layer, ensuring API keys are never stored in plaintext even if the database is compromised
- **Built-in to PostgreSQL**: No external dependencies or additional services required (Supabase supports pgcrypto by default)
- **Symmetric encryption is sufficient**: We need to decrypt keys for use, so symmetric encryption (AES-256) is appropriate vs asymmetric
- **Simple integration with Drizzle**: Can use raw SQL queries for encrypt/decrypt operations within Drizzle ORM
- **Compliance-ready**: Provides encryption at rest as required by security best practices

### Alternatives Considered

1. **Application-level encryption (Node.js crypto)**
   - Pros: More flexible, no database dependency
   - Cons: Keys temporarily in plaintext in application memory, harder to audit, must handle encryption in all code paths
   - Rejected: Database-level encryption provides better security guarantees

2. **Supabase Vault** (Supabase's secrets management)
   - Pros: Purpose-built for storing secrets, additional security layer
   - Cons: Adds complexity, requires additional API calls, not part of standard PostgreSQL
   - Rejected: Overkill for this use case, adds vendor lock-in

3. **Separate secrets management service** (HashiCorp Vault, AWS Secrets Manager)
   - Pros: Enterprise-grade security, rotation capabilities
   - Cons: Significant complexity, additional infrastructure, cost
   - Rejected: Violates YAGNI principle (Principle IV)

### Implementation Notes

#### Enabling pgcrypto

```sql
-- Run this migration first (already available in Supabase by default)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

#### Schema Addition

Add to `lib/db/drizzle-schema.ts`:

```typescript
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 100 }),
  passwordHash: varchar('password_hash', { length: 60 }).notNull(),
  // NEW: Encrypted API key stored as text (base64 encrypted blob)
  encryptedApiKey: text('encrypted_api_key'), // NULL if user hasn't provided key
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})
```

#### Encryption/Decryption Operations

Create `lib/encryption/api-key.ts`:

```typescript
import { getDb } from '@/lib/db/pg-client'
import { sql } from 'drizzle-orm'

const ENCRYPTION_SECRET = process.env.API_KEY_ENCRYPTION_SECRET

if (!ENCRYPTION_SECRET) {
  throw new Error('API_KEY_ENCRYPTION_SECRET environment variable must be set')
}

/**
 * Encrypt API key using PostgreSQL pgcrypto
 * Returns base64-encoded encrypted blob
 */
export async function encryptApiKey(apiKey: string): Promise<string> {
  const db = getDb()

  const result = await db.execute(sql`
    SELECT encode(
      pgp_sym_encrypt(${apiKey}, ${ENCRYPTION_SECRET}),
      'base64'
    ) as encrypted
  `)

  return result.rows[0].encrypted as string
}

/**
 * Decrypt API key using PostgreSQL pgcrypto
 * Returns plaintext API key or null if decryption fails
 */
export async function decryptApiKey(encryptedKey: string): Promise<string | null> {
  const db = getDb()

  try {
    const result = await db.execute(sql`
      SELECT pgp_sym_decrypt(
        decode(${encryptedKey}, 'base64'),
        ${ENCRYPTION_SECRET}
      ) as decrypted
    `)

    return result.rows[0].decrypted as string
  } catch (error) {
    console.error('[Encryption] Failed to decrypt API key:', error)
    return null
  }
}
```

#### Integration with Drizzle ORM

In `lib/db/operations/api-keys.ts`:

```typescript
import { getDb } from '@/lib/db/pg-client'
import { users } from '@/lib/db/drizzle-schema'
import { eq } from 'drizzle-orm'
import { encryptApiKey, decryptApiKey } from '@/lib/encryption/api-key'

export async function saveUserApiKey(userId: string, apiKey: string): Promise<void> {
  const db = getDb()
  const encrypted = await encryptApiKey(apiKey)

  await db
    .update(users)
    .set({
      encryptedApiKey: encrypted,
      updatedAt: new Date()
    })
    .where(eq(users.id, userId))
}

export async function getUserApiKey(userId: string): Promise<string | null> {
  const db = getDb()

  const user = await db
    .select({ encryptedApiKey: users.encryptedApiKey })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user[0]?.encryptedApiKey) {
    return null
  }

  return await decryptApiKey(user[0].encryptedApiKey)
}
```

#### Key Management Strategy

1. **Environment Variable**: Store `API_KEY_ENCRYPTION_SECRET` in `.env` file
2. **Generation**: Use `openssl rand -base64 32` to generate a strong secret
3. **Rotation**: If secret needs rotation, decrypt all keys with old secret, re-encrypt with new secret (requires maintenance script)
4. **Security**:
   - Never commit encryption secret to git
   - Use different secrets for dev/staging/prod
   - Store production secret in Supabase environment variables or deployment platform secrets manager

#### .env.example Addition

```bash
# API Key Encryption Secret (generate with: openssl rand -base64 32)
# CRITICAL: Keep this secret secure - if lost, encrypted API keys cannot be recovered
API_KEY_ENCRYPTION_SECRET=your-encryption-secret-here
```

---

## 2. Anthropic SDK (@anthropic-ai/sdk) Integration Patterns

### Decision

Create a provider abstraction layer in `lib/claude/client.ts` that initializes Anthropic client instances with user-provided API keys on a per-request basis. Maintain compatibility with existing Ollama fallback patterns.

### Rationale

- **Per-request client initialization**: Each request uses a fresh Anthropic client with the user's API key, ensuring proper isolation
- **Matches existing patterns**: Codebase already has `streamChatCompletion` and `getChatCompletion` functions that can be extended
- **Type safety**: TypeScript SDK provides full type definitions for all API interactions
- **Streaming support**: SDK v0.71.2 has robust streaming support matching current Ollama implementation
- **Error handling**: SDK provides structured error types for authentication, rate limits, and other API issues

### Alternatives Considered

1. **Single shared Anthropic client with dynamic key injection**
   - Pros: Fewer client instances
   - Cons: Potential for key leakage between requests, not thread-safe
   - Rejected: Security risk, not worth marginal performance gain

2. **Direct fetch() calls to Anthropic API**
   - Pros: Full control, no SDK dependency
   - Cons: Must implement retry logic, streaming, error handling, type definitions
   - Rejected: SDK is already installed and provides these features

3. **Middleware-based key injection**
   - Pros: Centralized key management
   - Cons: Adds complexity, harder to test, violates single responsibility
   - Rejected: Doesn't fit Next.js App Router patterns

### Implementation Notes

#### Client Initialization Pattern

Extend `lib/claude/client.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'
import type { Message } from '@/types'

export type ClaudeMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AIProvider = 'claude' | 'ollama'

export interface StreamParams {
  messages: ClaudeMessage[]
  systemPrompt: string
  onChunk: (text: string) => void
  onComplete: (fullText: string) => void
  onError: (error: Error) => void
  userApiKey?: string // Optional: use Claude API if provided
}

/**
 * Initialize Anthropic client with user's API key
 */
function createAnthropicClient(apiKey: string): Anthropic {
  return new Anthropic({
    apiKey: apiKey,
    maxRetries: 2, // Match current pattern
    timeout: 10 * 60 * 1000, // 10 minutes (SDK default)
  })
}

/**
 * Stream chat completion - routes to Claude API or Ollama based on API key availability
 */
export async function streamChatCompletion(params: StreamParams): Promise<AIProvider> {
  const { messages, systemPrompt, onChunk, onComplete, onError, userApiKey } = params

  // Route to Claude API if user has API key
  if (userApiKey) {
    try {
      await streamClaudeAPI(userApiKey, messages, systemPrompt, onChunk, onComplete, onError)
      return 'claude'
    } catch (error) {
      console.error('[Claude] API error, falling back to Ollama:', error)
      // Fall through to Ollama on error
    }
  }

  // Fallback to Ollama
  await streamOllama(messages, systemPrompt, onChunk, onComplete, onError)
  return 'ollama'
}

/**
 * Stream from Claude API using Anthropic SDK
 */
async function streamClaudeAPI(
  apiKey: string,
  messages: ClaudeMessage[],
  systemPrompt: string,
  onChunk: (text: string) => void,
  onComplete: (fullText: string) => void,
  onError: (error: Error) => void
): Promise<void> {
  const client = createAnthropicClient(apiKey)

  try {
    const stream = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929', // Latest Sonnet model
      max_tokens: 4096,
      system: systemPrompt,
      messages: messages,
      stream: true,
    })

    let fullText = ''

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const text = event.delta.text
        fullText += text
        onChunk(text)
      }
    }

    await onComplete(fullText)
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      onError(new Error(`Claude API error: ${error.message} (${error.status})`))
    } else {
      onError(error instanceof Error ? error : new Error('Unknown error'))
    }
  }
}

/**
 * Existing Ollama implementation (keep unchanged)
 */
async function streamOllama(
  messages: ClaudeMessage[],
  systemPrompt: string,
  onChunk: (text: string) => void,
  onComplete: (fullText: string) => void,
  onError: (error: Error) => void
): Promise<void> {
  // ... existing implementation from current client.ts ...
}
```

#### Error Handling Patterns

The Anthropic SDK provides structured error types:

```typescript
import Anthropic from '@anthropic-ai/sdk'

try {
  const message = await client.messages.create({...})
} catch (error) {
  if (error instanceof Anthropic.AuthenticationError) {
    // 401 - Invalid API key
    console.error('Invalid Claude API key')
  } else if (error instanceof Anthropic.RateLimitError) {
    // 429 - Rate limit exceeded
    console.error('Claude API rate limit exceeded')
  } else if (error instanceof Anthropic.PermissionDeniedError) {
    // 403 - Permission denied (e.g., API key doesn't have access to model)
    console.error('Permission denied for Claude API request')
  } else if (error instanceof Anthropic.APIError) {
    // Other API errors (4xx, 5xx)
    console.error('Claude API error:', error.status, error.message)
  } else {
    // Network errors, timeouts, etc.
    console.error('Unexpected error:', error)
  }
}
```

#### Compatibility with Existing Ollama Patterns

Current codebase uses this pattern:

```typescript
// Current: Always uses Ollama
await streamChatCompletion({
  messages: toClaudeMessages(conversationMessages),
  systemPrompt: TUTOR_SYSTEM_PROMPT,
  onChunk: (text) => { /* ... */ },
  onComplete: (text) => { /* ... */ },
  onError: (error) => { /* ... */ }
})
```

With changes:

```typescript
// New: Optionally use Claude API with user's key
const userApiKey = await getUserApiKey(userId) // from db operations

const provider = await streamChatCompletion({
  messages: toClaudeMessages(conversationMessages),
  systemPrompt: TUTOR_SYSTEM_PROMPT,
  onChunk: (text) => { /* ... */ },
  onComplete: (text) => { /* ... */ },
  onError: (error) => { /* ... */ },
  userApiKey: userApiKey || undefined // Use Claude API if key exists
})

// Store provider info with message
console.log(`Message generated by: ${provider}`)
```

#### Non-Streaming Pattern (Flashcard Generation)

Extend `getChatCompletion` for flashcard generation:

```typescript
export async function getChatCompletion(params: {
  messages: ClaudeMessage[]
  systemPrompt: string
  userApiKey?: string
}): Promise<{ content: string; provider: AIProvider }> {
  const { messages, systemPrompt, userApiKey } = params

  // Try Claude API first if key available
  if (userApiKey) {
    try {
      const client = createAnthropicClient(userApiKey)
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages,
      })

      // Extract text content from response
      const textContent = response.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('')

      return { content: textContent, provider: 'claude' }
    } catch (error) {
      console.error('[Claude] API error in non-streaming call:', error)
      // Fall through to Ollama
    }
  }

  // Fallback to Ollama
  const content = await getOllamaCompletion(messages, systemPrompt)
  return { content, provider: 'ollama' }
}
```

---

## 3. API Key Validation Strategies

### Decision

Implement two-tier validation:
1. **Format validation**: Client-side and server-side check for `sk-ant-api03-` prefix (Claude API key format)
2. **Live validation**: Server-side test using minimal token count request to Messages API

For the test validation endpoint, use a minimal messages.count() call or a messages.create() with max_tokens=1 to minimize costs.

### Rationale

- **Fast feedback**: Format validation provides instant feedback without API calls
- **Accurate validation**: Live test confirms key is valid, active, and has proper permissions
- **Cost-effective**: Using max_tokens=1 minimizes validation cost (approximately $0.000003 per validation at Sonnet rates)
- **Security**: Server-side validation prevents invalid keys from being stored
- **User experience**: Meets SC-004 requirement (validation within 3 seconds)

### Alternatives Considered

1. **Format-only validation**
   - Pros: Instant, free, no API calls
   - Cons: Doesn't catch revoked/invalid keys, quota issues
   - Rejected: FR-006 requires real-time validation

2. **Expensive test request**
   - Pros: Thoroughly tests key capabilities
   - Cons: Costs more, slower, unnecessary
   - Rejected: Violates cost-effectiveness principle

3. **Cache validation results**
   - Pros: Reduces repeat validation costs
   - Cons: Keys can be revoked between validations, adds complexity
   - Rejected: Security risk (stale validations)

### Implementation Notes

#### Format Validation

Create `lib/validation/api-key.ts`:

```typescript
import { z } from 'zod'

/**
 * Claude API key format validation
 * Format: sk-ant-api03-... (as of 2024)
 */
export const ClaudeApiKeySchema = z
  .string()
  .min(40)
  .regex(
    /^sk-ant-api\d{2}-/,
    'API key must start with sk-ant-api03- (Claude API key format)'
  )

export function isValidClaudeKeyFormat(key: string): boolean {
  try {
    ClaudeApiKeySchema.parse(key)
    return true
  } catch {
    return false
  }
}

/**
 * Mask API key for display
 * Shows: sk-ant-api03-...xyz123 (first 14 chars + last 6 chars)
 */
export function maskApiKey(key: string): string {
  if (key.length < 20) {
    return '***'
  }

  const prefix = key.slice(0, 14) // "sk-ant-api03-"
  const suffix = key.slice(-6)     // Last 6 characters
  return `${prefix}...${suffix}`
}
```

#### Live Validation Endpoint

Create test validation in `lib/claude/validation.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'

export interface ValidationResult {
  valid: boolean
  error?: string
  errorCode?: 'INVALID_FORMAT' | 'AUTH_FAILED' | 'RATE_LIMIT' | 'NETWORK_ERROR' | 'UNKNOWN'
}

/**
 * Validate Claude API key with minimal test request
 * Cost: ~$0.000003 per validation (1 input token, 1 output token at Sonnet rates)
 */
export async function validateClaudeApiKey(apiKey: string): Promise<ValidationResult> {
  // Format validation first
  if (!isValidClaudeKeyFormat(apiKey)) {
    return {
      valid: false,
      error: 'Invalid API key format. Keys should start with sk-ant-api03-',
      errorCode: 'INVALID_FORMAT'
    }
  }

  // Live validation with minimal request
  try {
    const client = new Anthropic({
      apiKey: apiKey,
      maxRetries: 0, // Don't retry validation requests
      timeout: 5000,  // 5 second timeout for validation
    })

    // Minimal test request (1 token output)
    await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1, // Minimize cost
      messages: [{ role: 'user', content: 'Hi' }],
    })

    return { valid: true }
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return {
        valid: false,
        error: 'Authentication failed. Please check your API key.',
        errorCode: 'AUTH_FAILED'
      }
    } else if (error instanceof Anthropic.RateLimitError) {
      return {
        valid: false,
        error: 'Rate limit exceeded. Please try again later.',
        errorCode: 'RATE_LIMIT'
      }
    } else if (error instanceof Anthropic.PermissionDeniedError) {
      return {
        valid: false,
        error: 'Permission denied. Your API key may not have access to Claude Sonnet.',
        errorCode: 'AUTH_FAILED'
      }
    } else if (error instanceof Anthropic.APIConnectionError) {
      return {
        valid: false,
        error: 'Network error. Please check your connection.',
        errorCode: 'NETWORK_ERROR'
      }
    } else {
      return {
        valid: false,
        error: 'Validation failed. Please try again.',
        errorCode: 'UNKNOWN'
      }
    }
  }
}
```

#### API Route for Validation

Create `app/api/settings/api-key/validate/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { validateClaudeApiKey } from '@/lib/claude/validation'

const ValidateRequestSchema = z.object({
  apiKey: z.string().min(1)
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request
    const body = await request.json()
    const { apiKey } = ValidateRequestSchema.parse(body)

    // Validate API key
    const result = await validateClaudeApiKey(apiKey)

    if (result.valid) {
      return NextResponse.json({
        valid: true,
        message: 'API key is valid and ready to use'
      })
    } else {
      return NextResponse.json({
        valid: false,
        error: result.error,
        errorCode: result.errorCode
      }, { status: 400 })
    }
  } catch (error) {
    console.error('[APIKeyValidate] Error:', error)

    return NextResponse.json(
      { error: 'Validation failed' },
      { status: 500 }
    )
  }
}
```

#### User Feedback Patterns

In the settings UI component:

```typescript
// Validation state machine
type ValidationState = 'idle' | 'validating' | 'valid' | 'invalid'

const [validationState, setValidationState] = useState<ValidationState>('idle')
const [validationError, setValidationError] = useState<string>('')

async function handleValidate() {
  setValidationState('validating')

  const response = await fetch('/api/settings/api-key/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: inputValue })
  })

  const data = await response.json()

  if (data.valid) {
    setValidationState('valid')
    setValidationError('')
  } else {
    setValidationState('invalid')
    setValidationError(data.error || 'Validation failed')
  }
}
```

#### Rate Limiting Considerations

- Validation endpoint should be rate-limited to prevent abuse (e.g., max 10 validations per user per hour)
- Can implement simple in-memory rate limiting or use Next.js middleware
- Consider adding user-facing messaging: "Please wait before validating another key"

---

## 4. Provider Routing Logic

### Decision

Implement provider routing at the request level in `lib/claude/client.ts`, with metadata tracking in the messages table. Add a `provider` column to the messages table to store which AI provider generated each message.

### Rationale

- **Simplicity**: Routing decision made at the point of use, no complex middleware
- **Auditability**: Storing provider in messages table creates audit trail (FR-014)
- **UI feedback**: Messages table metadata enables per-message provider badges (FR-009)
- **Flexible fallback**: Easy to implement fallback logic (Claude API error → Ollama)
- **Session independence**: Each message can use different provider based on current user state

### Alternatives Considered

1. **Session-level provider selection**
   - Pros: Consistency within session
   - Cons: Inflexible if API key changes/fails mid-session, requires session state management
   - Rejected: Too rigid, doesn't handle failures well

2. **Global provider configuration**
   - Pros: Simple, one place to change
   - Cons: Doesn't support per-user API keys, violates requirements
   - Rejected: Not compatible with user-specific keys

3. **Separate routing service**
   - Pros: Centralized logic
   - Cons: Adds complexity, extra network hop
   - Rejected: Over-engineering (violates YAGNI)

### Implementation Notes

#### Database Schema Update

Extend messages table in `lib/db/drizzle-schema.ts`:

```typescript
export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(), // 'user' | 'assistant'
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 768 }),
  hasFlashcards: boolean('has_flashcards').notNull().default(false),
  // NEW: Track which AI provider generated this message
  provider: varchar('provider', { length: 20 }), // 'claude' | 'ollama' | NULL (for user messages)
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
```

#### Routing Logic in Client

Already shown in section 2, but key pattern:

```typescript
export async function streamChatCompletion(params: StreamParams): Promise<AIProvider> {
  const { userApiKey } = params

  // Primary: Use Claude API if key available
  if (userApiKey) {
    try {
      await streamClaudeAPI(...)
      return 'claude'
    } catch (error) {
      console.error('[Claude] Falling back to Ollama:', error)
      // Fall through to Ollama
    }
  }

  // Fallback: Ollama
  await streamOllama(...)
  return 'ollama'
}
```

#### Message Creation with Provider Tracking

In `lib/db/operations/messages.ts` (extend existing):

```typescript
export async function createMessage(data: {
  conversationId: string
  userId: string
  role: 'user' | 'assistant'
  content: string
  provider?: 'claude' | 'ollama' | null
}): Promise<Message> {
  const db = getDb()

  const message = {
    id: uuidv4(),
    conversationId: data.conversationId,
    userId: data.userId,
    role: data.role,
    content: data.content,
    provider: data.provider || null, // NULL for user messages
    hasFlashcards: false,
    createdAt: new Date()
  }

  await db.insert(messages).values(message)

  return message
}
```

#### UI Component Integration

In chat route handler (where messages are created):

```typescript
// After streaming completes
const provider = await streamChatCompletion({
  messages: conversationMessages,
  systemPrompt: TUTOR_SYSTEM_PROMPT,
  onChunk: (text) => { /* append to response */ },
  onComplete: async (fullText) => {
    // Save assistant message with provider metadata
    await createMessage({
      conversationId,
      userId,
      role: 'assistant',
      content: fullText,
      provider: provider // 'claude' or 'ollama'
    })
  },
  onError: (error) => { /* handle error */ },
  userApiKey: await getUserApiKey(userId)
})
```

#### Provider Badge Component

Create `components/settings/ProviderBadge.tsx`:

```typescript
interface ProviderBadgeProps {
  provider: 'claude' | 'ollama' | null
}

export function ProviderBadge({ provider }: ProviderBadgeProps) {
  if (!provider) return null // Don't show for user messages

  const config = {
    'claude': {
      label: 'Claude API',
      icon: '🤖',
      className: 'bg-purple-100 text-purple-800'
    },
    'ollama': {
      label: 'Ollama',
      icon: '🦙',
      className: 'bg-blue-100 text-blue-800'
    }
  }

  const { label, icon, className } = config[provider]

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}>
      <span className="mr-1">{icon}</span>
      {label}
    </span>
  )
}
```

Usage in message display:

```typescript
<div className="message">
  <div className="message-header">
    <span>Assistant</span>
    <ProviderBadge provider={message.provider} />
  </div>
  <div className="message-content">{message.content}</div>
</div>
```

#### Persistence Strategy

- **User messages**: `provider` field is NULL (users don't generate content via API)
- **Assistant messages**: Always set `provider` to either 'claude' or 'ollama'
- **Flashcards**: Track provider in separate metadata if needed, or infer from source message
- **Analytics**: Can query messages table to track API usage per user

---

## 5. Next.js Server Actions vs API Routes

### Decision

Use **API Routes** (not Server Actions) for all API key management operations (CRUD: save, retrieve, update, delete, validate).

### Rationale

- **Consistency**: Codebase already uses API Routes pattern extensively (see `/app/api/flashcards`, `/app/api/quiz`, etc.)
- **REST conventions**: CRUD operations map naturally to HTTP methods (POST, GET, PUT, DELETE)
- **Error handling**: API Routes provide structured error responses with status codes
- **Testing**: Easier to write contract tests for API routes vs Server Actions
- **Security**: Explicit authentication checks at route level, clear separation of concerns
- **Client compatibility**: Works with any client (fetch, axios, etc.) not just React Server Components

### Alternatives Considered

1. **Server Actions for settings page**
   - Pros: Direct form binding, progressive enhancement, less boilerplate
   - Cons: Inconsistent with existing codebase, harder to test, requires 'use server' directives
   - Rejected: Violates consistency principle, existing codebase uses API Routes

2. **Mixed approach (Server Actions for mutations, API Routes for reads)**
   - Pros: Leverages both paradigms
   - Cons: Confusing for developers, inconsistent patterns, harder to maintain
   - Rejected: Violates simplicity principle (Principle IV)

3. **GraphQL or tRPC**
   - Pros: Type-safe end-to-end, better DX
   - Cons: Major architectural change, significant migration effort
   - Rejected: Out of scope, violates YAGNI

### Implementation Notes

#### API Routes Structure

Create routes at `app/api/settings/api-key/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { saveUserApiKey, getUserApiKey, deleteUserApiKey } from '@/lib/db/operations/api-keys'
import { validateClaudeApiKey } from '@/lib/claude/validation'
import { maskApiKey } from '@/lib/validation/api-key'

// ============================================================================
// GET /api/settings/api-key - Retrieve user's API key (masked)
// ============================================================================

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const apiKey = await getUserApiKey(session.user.id)

    if (!apiKey) {
      return NextResponse.json({
        hasApiKey: false,
        maskedKey: null
      })
    }

    return NextResponse.json({
      hasApiKey: true,
      maskedKey: maskApiKey(apiKey) // Never return plaintext key
    })
  } catch (error) {
    console.error('[APIKey] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve API key' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST /api/settings/api-key - Save/update user's API key
// ============================================================================

const SaveApiKeySchema = z.object({
  apiKey: z.string().min(40),
  skipValidation: z.boolean().optional().default(false)
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { apiKey, skipValidation } = SaveApiKeySchema.parse(body)

    // Validate API key (unless explicitly skipped)
    if (!skipValidation) {
      const validation = await validateClaudeApiKey(apiKey)
      if (!validation.valid) {
        return NextResponse.json({
          error: validation.error || 'Invalid API key',
          errorCode: validation.errorCode
        }, { status: 400 })
      }
    }

    // Save encrypted key
    await saveUserApiKey(session.user.id, apiKey)

    return NextResponse.json({
      success: true,
      message: 'API key saved successfully',
      maskedKey: maskApiKey(apiKey)
    })
  } catch (error) {
    console.error('[APIKey] POST error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to save API key' },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE /api/settings/api-key - Remove user's API key
// ============================================================================

export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await deleteUserApiKey(session.user.id)

    return NextResponse.json({
      success: true,
      message: 'API key removed successfully'
    })
  } catch (error) {
    console.error('[APIKey] DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to remove API key' },
      { status: 500 }
    )
  }
}
```

Validation route at `app/api/settings/api-key/validate/route.ts` (shown in Section 3).

#### Settings Page Implementation

Settings page at `app/(protected)/settings/page.tsx`:

```typescript
import { Metadata } from 'next'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { ApiKeyForm } from '@/components/settings/ApiKeyForm'

export const metadata: Metadata = {
  title: 'Settings - MemoryLoop',
  description: 'Manage your account settings and API keys',
}

export default async function SettingsPage() {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="max-w-2xl">
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Claude API Key</h2>
          <p className="text-gray-600 mb-4">
            Provide your own Claude API key to enable AI-powered chat and flashcard generation.
            Without an API key, the system will use the local Ollama instance as a fallback.
          </p>

          <ApiKeyForm />
        </section>
      </div>
    </div>
  )
}
```

#### Client Component (ApiKeyForm)

Create `components/settings/ApiKeyForm.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { maskApiKey } from '@/lib/validation/api-key'

export function ApiKeyForm() {
  const [apiKey, setApiKey] = useState('')
  const [maskedKey, setMaskedKey] = useState<string | null>(null)
  const [hasKey, setHasKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validating, setValidating] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Load existing key on mount
  useEffect(() => {
    async function loadKey() {
      const res = await fetch('/api/settings/api-key')
      const data = await res.json()

      if (data.hasApiKey) {
        setHasKey(true)
        setMaskedKey(data.maskedKey)
      }
    }

    loadKey()
  }, [])

  async function handleValidate() {
    setValidating(true)
    setError('')
    setMessage('')

    try {
      const res = await fetch('/api/settings/api-key/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey })
      })

      const data = await res.json()

      if (data.valid) {
        setMessage('✓ API key is valid')
      } else {
        setError(data.error || 'Validation failed')
      }
    } catch (err) {
      setError('Validation request failed')
    } finally {
      setValidating(false)
    }
  }

  async function handleSave() {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const res = await fetch('/api/settings/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey })
      })

      const data = await res.json()

      if (res.ok) {
        setMessage('API key saved successfully')
        setHasKey(true)
        setMaskedKey(data.maskedKey)
        setApiKey('') // Clear input
      } else {
        setError(data.error || 'Failed to save API key')
      }
    } catch (err) {
      setError('Save request failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Remove your API key? You will fall back to Ollama.')) {
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/settings/api-key', {
        method: 'DELETE'
      })

      if (res.ok) {
        setMessage('API key removed')
        setHasKey(false)
        setMaskedKey(null)
      } else {
        setError('Failed to remove API key')
      }
    } catch (err) {
      setError('Delete request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {hasKey && maskedKey && (
        <div className="p-4 bg-green-50 border border-green-200 rounded">
          <p className="text-sm text-green-800">
            Current API key: <code className="font-mono">{maskedKey}</code>
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-2">
          {hasKey ? 'Update API Key' : 'Enter API Key'}
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-ant-api03-..."
          className="w-full px-4 py-2 border rounded"
          disabled={loading || validating}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleValidate}
          disabled={!apiKey || validating || loading}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {validating ? 'Validating...' : 'Validate'}
        </button>

        <button
          onClick={handleSave}
          disabled={!apiKey || loading || validating}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >
          {loading ? 'Saving...' : hasKey ? 'Update' : 'Save'}
        </button>

        {hasKey && (
          <button
            onClick={handleDelete}
            disabled={loading || validating}
            className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50"
          >
            Remove
          </button>
        )}
      </div>

      {message && (
        <p className="text-green-600 text-sm">{message}</p>
      )}

      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}
    </div>
  )
}
```

#### Security Implications

**API Routes (chosen approach)**:
- ✓ Explicit authentication checks with `auth()` at each endpoint
- ✓ No exposure of API keys in client bundle
- ✓ Server-side encryption/decryption only
- ✓ Structured error handling with status codes
- ✓ CORS protection via Next.js default headers

**Server Actions (not chosen)**:
- Risk: Actions embedded in Server Components can leak sensitive data if not careful
- Risk: Requires 'use server' directives, harder to audit security boundaries
- Benefit: Progressive enhancement (forms work without JS)
- Not relevant: Settings page requires JS anyway (validation, masked display, etc.)

---

## Summary

This research provides concrete implementation guidance for the Claude API integration feature:

1. **PostgreSQL pgcrypto** provides database-level encryption with minimal complexity
2. **Anthropic SDK** offers robust streaming and error handling, matching existing patterns
3. **Two-tier validation** (format + live test) balances UX and security
4. **Request-level routing** with database tracking enables flexible provider selection and audit trails
5. **API Routes** maintain consistency with existing codebase architecture

All decisions align with the project constitution's principles of simplicity, security, and maintainability.
