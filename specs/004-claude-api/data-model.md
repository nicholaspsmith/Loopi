# Data Model: Claude API Integration with User API Keys

**Feature**: Claude API Integration
**Branch**: 004-claude-api
**Date**: 2025-12-17

## Overview

This feature extends the existing database schema to support user-managed Claude API keys with encryption at rest. The data model integrates with the existing NextAuth-based user system and message tracking.

## Naming Conventions

This project follows standard naming conventions across different layers:

- **Database Layer** (PostgreSQL, Drizzle schema): `snake_case` for table names, column names, and constraints
  - Tables: `api_keys`, `messages`, `users`
  - Columns: `user_id`, `encrypted_key`, `is_valid`, `last_validated_at`
  - Foreign keys: `api_key_id`, `user_id`

- **TypeScript/JavaScript Layer** (application code): `camelCase` for variables/properties, `PascalCase` for types/components
  - Types/Interfaces: `ApiKey`, `Message`, `ProviderBadge`
  - Variables/Properties: `userId`, `encryptedKey`, `isValid`, `lastValidatedAt`
  - Functions: `validateApiKey()`, `getUserApiKey()`

- **File Names**:
  - Components: `PascalCase.tsx` (e.g., `ApiKeyForm.tsx`, `ProviderBadge.tsx`)
  - Other TypeScript files: `kebab-case.ts` (e.g., `api-key.ts`, `flashcard-generator.ts`)
  - Test files: Match source file convention with `.test` suffix (e.g., `ApiKeyForm.test.tsx`, `api-key.test.ts`)

## New Entities

### ApiKey

Stores encrypted Claude API keys associated with user accounts.

**Table**: `api_keys`

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | uuid | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier for the API key record |
| `userId` | varchar(255) | NOT NULL, FOREIGN KEY → users(id), UNIQUE | User who owns this API key (one-to-one relationship) |
| `encryptedKey` | text | NOT NULL | Encrypted API key using pgcrypto |
| `keyPreview` | varchar(20) | NOT NULL | Masked preview (e.g., "sk-ant-...xyz123") for UI display |
| `isValid` | boolean | NOT NULL, DEFAULT true | Validation status (set to false on repeated auth failures) |
| `lastValidatedAt` | timestamp | NULL | Timestamp of last successful validation |
| `createdAt` | timestamp | NOT NULL, DEFAULT now() | When the key was first added |
| `updatedAt` | timestamp | NOT NULL, DEFAULT now() | When the key was last updated |

**Indexes**:
- Primary key on `id`
- Unique index on `userId` (one key per user)
- Index on `userId` for fast lookup

**Encryption**:
- `encryptedKey` field uses PostgreSQL pgcrypto `pgp_sym_encrypt()` function
- Encryption key stored in environment variable `API_KEY_ENCRYPTION_SECRET`
- Decryption only happens server-side, never exposed to client

## Modified Entities

### Message

Extend existing `messages` table to track which AI provider generated each message.

**New Fields**:

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `aiProvider` | varchar(20) | NULL | Which provider generated this message: "claude" or "ollama" |
| `apiKeyId` | uuid | NULL, FOREIGN KEY → api_keys(id) ON DELETE SET NULL | Which API key was used (if Claude API) |

**Rationale**:
- `aiProvider` enables per-message attribution (FR-009, FR-014)
- `apiKeyId` provides audit trail for which user key generated the response
- `ON DELETE SET NULL` preserves message history even if API key is deleted
- Both fields nullable for backward compatibility with existing messages

## Relationships

```
users (1) ──< messages (many)
users (1) ──< api_keys (0..1)      # One-to-one (user can have 0 or 1 API key)
api_keys (1) ──< messages (many)   # API key can generate many messages
```

## Validation Rules

### ApiKey Validation

1. **Format Validation** (FR-005):
   - Must start with `sk-ant-`
   - Length: minimum 20 characters
   - Alphanumeric and dashes only
   - Enforced at application layer before save

2. **Uniqueness** (FR-013):
   - One API key per user (enforced by UNIQUE constraint on `userId`)
   - Attempting to insert second key returns error; use UPDATE instead

3. **Encryption** (FR-002):
   - Must be encrypted before storage using `pgp_sym_encrypt(key, encryption_secret)`
   - Never store plaintext API keys
   - Decryption only for outgoing Claude API requests

4. **Preview Generation** (FR-007):
   - Extract first 7 chars: `sk-ant-`
   - Extract last 4 chars of key
   - Format: `{first7}...{last4}` (e.g., "sk-ant-...xyz123")
   - Stored in `keyPreview` for fast UI display without decryption

### Message Provider Tracking

1. **Provider Values** (FR-014):
   - Valid values: `"claude"`, `"ollama"`, or NULL
   - NULL for legacy messages (before this feature)
   - Set during message creation based on which client was used

2. **API Key Reference**:
   - Must be NULL if `aiProvider` is "ollama"
   - Should reference valid `api_keys.id` if `aiProvider` is "claude"
   - Orphaned references (deleted key) set to NULL automatically

## State Transitions

### API Key Lifecycle

```
[User has no key]
    ↓ (User enters valid key via Settings)
[Key saved, isValid=true, lastValidatedAt=now()]
    ↓ (API returns 401/403 during usage)
[isValid=false, require user action]
    ↓ (User updates key or acknowledges)
[Key updated/deleted OR falls back to Ollama]
```

### Message Provider Selection

```
[User sends chat message]
    ↓
[Check if user has valid API key]
    ↓ YES → Use Claude API, set aiProvider="claude", apiKeyId=<id>
    ↓ NO  → Use Ollama, set aiProvider="ollama", apiKeyId=NULL
[Message created with provider metadata]
```

## Migration Strategy

### Database Migration

**File**: `drizzle/migrations/NNNN_add_claude_api_keys.sql`

```sql
-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create api_keys table
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  encrypted_key TEXT NOT NULL,
  key_preview VARCHAR(20) NOT NULL,
  is_valid BOOLEAN NOT NULL DEFAULT true,
  last_validated_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Index for fast user lookup
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);

-- Add provider tracking to messages table
ALTER TABLE messages
  ADD COLUMN ai_provider VARCHAR(20),
  ADD COLUMN api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL;

-- Index for provider analytics
CREATE INDEX idx_messages_ai_provider ON messages(ai_provider);
CREATE INDEX idx_messages_api_key_id ON messages(api_key_id);

-- Updated_at trigger for api_keys
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Drizzle Schema Updates

**File**: `lib/db/drizzle-schema.ts`

```typescript
// Add to imports
import { pgCrypto } from 'drizzle-orm/pg-core'

// New table
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  encryptedKey: text('encrypted_key').notNull(),
  keyPreview: varchar('key_preview', { length: 20 }).notNull(),
  isValid: boolean('is_valid').notNull().default(true),
  lastValidatedAt: timestamp('last_validated_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Update messages table
export const messages = pgTable('messages', {
  // ... existing fields ...
  aiProvider: varchar('ai_provider', { length: 20 }),
  apiKeyId: uuid('api_key_id').references(() => apiKeys.id, { onDelete: 'set null' }),
})
```

## Data Volume & Scale

**Expected Scale** (from spec SC-001, SC-002):
- Users: Initially 10-100 users
- API keys: At most 1 per user (one-to-one relationship)
- Messages: Existing volume plus new messages with provider metadata
- Storage impact: ~100 bytes per encrypted key + 40 bytes per message for provider fields

**Performance Considerations**:
- API key decryption: O(1) per request, cached in-memory during request lifecycle
- Provider lookup: Indexed queries on `userId` and `api_key_id`
- No N+1 queries: Join messages with api_keys when fetching conversation history

## Security & Privacy

### Encryption Details

- **Algorithm**: AES-256 via pgcrypto `pgp_sym_encrypt()`
- **Key Storage**: `API_KEY_ENCRYPTION_SECRET` environment variable (NOT in code)
- **Key Rotation**: Out of scope for v1 (manual process if needed)
- **Access Control**: Only server-side code can decrypt; never send to client

### Data Protection (FR-012)

- API keys never appear in:
  - Client-side JavaScript bundles
  - HTTP responses (except masked preview)
  - Server logs (use keyPreview for logging)
  - Error messages
  - Git repository
- Only encrypted values stored in database
- Decryption happens in-memory only during Claude API request construction

## Edge Cases

### Concurrent Key Updates

**Scenario**: User updates API key in two browser tabs simultaneously

**Handling**:
- Database-level UNIQUE constraint on `userId` prevents duplicates
- Last write wins (updated_at timestamp)
- Front-end should refresh after successful update

### Deleted API Keys with Message References

**Scenario**: User deletes API key; old messages reference deleted key

**Handling**:
- `ON DELETE SET NULL` on messages.api_key_id foreign key
- Messages preserve `aiProvider="claude"` metadata
- UI shows "Claude API (key deleted)" for orphaned references

### Key Validation Failure During Active Session

**Scenario**: User's API key becomes invalid mid-conversation (quota exceeded, key revoked)

**Handling**:
- Set `isValid=false` in database
- Return error to client with actionable message
- User must either fix key or acknowledge fallback
- System does NOT automatically fall back (per clarification #2)

## Future Considerations (Out of Scope)

- Key rotation/expiration (automatic or manual)
- Multiple keys per user
- Key sharing between users
- Usage analytics (cost tracking, request counts)
- Admin interface to view/manage user keys
