# Data Model: Email Verification and Password Reset

**Feature**: Email Verification and Password Reset
**Date**: 2025-12-24
**Database**: PostgreSQL with Drizzle ORM

## Entity Relationship Diagram

```
┌─────────────────┐
│     users       │
├─────────────────┤
│ id (PK)         │◄─────┐
│ email (unique)  │      │
│ passwordHash    │      │
│ emailVerified   │ NEW  │
│ emailVerifiedAt │ NEW  │
│ createdAt       │      │
│ updatedAt       │      │
└─────────────────┘      │
                         │
        ┌────────────────┼────────────────┬────────────────┐
        │                │                │                │
        │                │                │                │
┌───────▼───────────┐ ┌──▼──────────────────┐ ┌──────▼──────────┐ ┌─────▼──────────┐
│password_reset_    │ │email_verification_  │ │security_logs    │ │rate_limits     │
│     tokens        │ │     tokens          │ │                 │ │                │
├───────────────────┤ ├─────────────────────┤ ├─────────────────┤ ├────────────────┤
│ id (PK)           │ │ id (PK)             │ │ id (PK)         │ │ id (PK)        │
│ userId (FK)       │ │ userId (FK)         │ │ userId (FK,null)│ │ email          │
│ tokenHash         │ │ tokenHash           │ │ eventType       │ │ attempts       │
│ expiresAt         │ │ expiresAt           │ │ email           │ │ windowStart    │
│ used              │ │ used                │ │ ipAddress       │ │ createdAt      │
│ usedAt            │ │ usedAt              │ │ userAgent       │ └────────────────┘
│ createdAt         │ │ createdAt           │ │ geolocation     │
└───────────────────┘ └─────────────────────┘ │ tokenId         │
                                              │ outcome         │
                                              │ metadata        │
                                              │ createdAt       │
                                              └─────────────────┘

┌─────────────────┐
│  email_queue    │
├─────────────────┤
│ id (PK)         │
│ to              │
│ subject         │
│ textBody        │
│ htmlBody        │
│ attempts        │
│ nextRetryAt     │
│ status          │
│ error           │
│ createdAt       │
│ sentAt          │
└─────────────────┘
```

## Tables

### 1. users (Modified)

**Purpose**: Existing user table extended with email verification status

**Columns**:

| Column              | Type         | Constraints             | Description                    |
| ------------------- | ------------ | ----------------------- | ------------------------------ |
| id                  | uuid         | PK, default random()    | User identifier                |
| email               | varchar(255) | NOT NULL, UNIQUE        | User email address             |
| name                | varchar(100) | NULL                    | User display name              |
| passwordHash        | varchar(60)  | NOT NULL                | bcrypt hash of password        |
| **emailVerified**   | boolean      | NOT NULL, default false | NEW: Email verification status |
| **emailVerifiedAt** | timestamp    | NULL                    | NEW: When email was verified   |
| createdAt           | timestamp    | NOT NULL, default NOW() | Account creation timestamp     |
| updatedAt           | timestamp    | NOT NULL, default NOW() | Last update timestamp          |

**Indexes**:

- `idx_users_email` on `(email)` - existing, for login lookups
- `idx_users_email_verified` on `(emailVerified)` - NEW, for filtering unverified users

**Validation Rules**:

- `email`: Must be valid email format (enforced by app layer)
- `emailVerified`: Cannot be true if `emailVerifiedAt` is null
- `emailVerifiedAt`: Must be >= `createdAt`

### 2. password_reset_tokens (New)

**Purpose**: Store hashed password reset tokens with expiration tracking

**Columns**:

| Column    | Type        | Constraints             | Description                            |
| --------- | ----------- | ----------------------- | -------------------------------------- |
| id        | uuid        | PK, default random()    | Token identifier                       |
| userId    | uuid        | NOT NULL, FK → users.id | User requesting reset                  |
| tokenHash | varchar(64) | NOT NULL, UNIQUE        | SHA-256 hash of reset token            |
| expiresAt | timestamp   | NOT NULL                | Expiration time (1 hour from creation) |
| used      | boolean     | NOT NULL, default false | Whether token has been used            |
| usedAt    | timestamp   | NULL                    | When token was used                    |
| createdAt | timestamp   | NOT NULL, default NOW() | Token creation time                    |

**Indexes**:

- `idx_password_reset_tokens_hash` on `(tokenHash)` - for fast token lookup
- `idx_password_reset_tokens_user_id` on `(userId, createdAt DESC)` - for finding latest token per user
- `idx_password_reset_tokens_expires` on `(expiresAt)` - for cleanup job

**Validation Rules**:

- `tokenHash`: Must be 64 characters (SHA-256 hex output)
- `expiresAt`: Must be > `createdAt`
- `used`: If true, `usedAt` must not be null
- `usedAt`: Must be <= NOW() and >= `createdAt`

**State Transitions**:

```
[Created] → used=false, usedAt=null
    ↓
[Used] → used=true, usedAt=NOW()
    (terminal state)

[Created] → expiresAt < NOW()
    → [Expired] (terminal state, should be cleaned up)
```

**Business Rules**:

- Only one active (unused, non-expired) token per user (FR-015)
- When new token created, mark all previous user tokens as `used=true` (invalidation)
- Tokens expire 1 hour after creation (FR-003)

### 3. email_verification_tokens (New)

**Purpose**: Store hashed email verification tokens with expiration tracking

**Columns**:

| Column    | Type        | Constraints             | Description                              |
| --------- | ----------- | ----------------------- | ---------------------------------------- |
| id        | uuid        | PK, default random()    | Token identifier                         |
| userId    | uuid        | NOT NULL, FK → users.id | User verifying email                     |
| tokenHash | varchar(64) | NOT NULL, UNIQUE        | SHA-256 hash of verification token       |
| expiresAt | timestamp   | NOT NULL                | Expiration time (24 hours from creation) |
| used      | boolean     | NOT NULL, default false | Whether token has been used              |
| usedAt    | timestamp   | NULL                    | When token was used                      |
| createdAt | timestamp   | NOT NULL, default NOW() | Token creation time                      |

**Indexes**:

- `idx_email_verification_tokens_hash` on `(tokenHash)` - for fast token lookup
- `idx_email_verification_tokens_user_id` on `(userId, createdAt DESC)` - for finding latest token per user
- `idx_email_verification_tokens_expires` on `(expiresAt)` - for cleanup job

**Validation Rules**: (Same as password_reset_tokens)

- `tokenHash`: Must be 64 characters (SHA-256 hex output)
- `expiresAt`: Must be > `createdAt`
- `used`: If true, `usedAt` must not be null
- `usedAt`: Must be <= NOW() and >= `createdAt`

**State Transitions**: (Same as password_reset_tokens)

**Business Rules**:

- Tokens expire 24 hours after creation (FR-008)
- Can have multiple unused tokens per user (user may request resend multiple times)
- When token is used, set `users.emailVerified = true, emailVerifiedAt = NOW()`

### 4. security_logs (New)

**Purpose**: Audit trail for all security-related events (password reset, verification)

**Columns**:

| Column      | Type         | Constraints             | Description                                    |
| ----------- | ------------ | ----------------------- | ---------------------------------------------- |
| id          | uuid         | PK, default random()    | Log entry identifier                           |
| userId      | uuid         | NULL, FK → users.id     | User involved (null if user not found)         |
| eventType   | varchar(50)  | NOT NULL                | Event type (see Event Types below)             |
| email       | varchar(255) | NOT NULL                | Email involved in event                        |
| ipAddress   | varchar(45)  | NOT NULL                | Client IP (IPv4 or IPv6)                       |
| userAgent   | text         | NULL                    | Client user agent string                       |
| geolocation | jsonb        | NULL                    | {country, region, city}                        |
| tokenId     | varchar(64)  | NULL                    | Hashed token ID if applicable                  |
| outcome     | varchar(20)  | NOT NULL                | 'success', 'failed', 'rate_limited', 'expired' |
| metadata    | jsonb        | NULL                    | Additional context                             |
| createdAt   | timestamp    | NOT NULL, default NOW() | Event timestamp                                |

**Indexes**:

- `idx_security_logs_user_id` on `(userId, createdAt DESC)` - for user audit history
- `idx_security_logs_email` on `(email, createdAt DESC)` - for email audit history
- `idx_security_logs_event_type` on `(eventType, createdAt DESC)` - for event analysis
- `idx_security_logs_created_at` on `(createdAt DESC)` - for time-based queries and cleanup

**Event Types**:

- `password_reset_request`: User requested password reset
- `password_reset_complete`: User successfully reset password
- `password_reset_failed`: Password reset attempt failed (invalid token, expired, etc.)
- `email_verification_request`: User requested verification email
- `email_verification_complete`: User successfully verified email
- `email_verification_failed`: Verification attempt failed (invalid token, expired, etc.)
- `rate_limit_exceeded`: Request rejected due to rate limiting

**Outcome Values**:

- `success`: Operation completed successfully
- `failed`: Operation failed (invalid token, wrong password, etc.)
- `rate_limited`: Request blocked by rate limiter
- `expired`: Token or session expired

**Geolocation JSONB Schema**:

```json
{
  "country": "United States",
  "region": "California",
  "city": "San Francisco"
}
```

**Metadata JSONB Examples**:

```json
// Password reset request
{
  "tokenId": "abc123...",
  "expiresAt": "2025-12-24T15:00:00Z"
}

// Rate limit exceeded
{
  "attemptCount": 4,
  "windowStart": "2025-12-24T14:00:00Z",
  "nextAllowedAt": "2025-12-24T14:15:00Z"
}
```

### 5. email_queue (New)

**Purpose**: Persistent queue for email sending with retry logic

**Columns**:

| Column      | Type         | Constraints                 | Description                            |
| ----------- | ------------ | --------------------------- | -------------------------------------- |
| id          | uuid         | PK, default random()        | Queue entry identifier                 |
| to          | varchar(255) | NOT NULL                    | Recipient email address                |
| subject     | varchar(500) | NOT NULL                    | Email subject line                     |
| textBody    | text         | NOT NULL                    | Plain text email body                  |
| htmlBody    | text         | NULL                        | HTML email body (optional)             |
| attempts    | integer      | NOT NULL, default 0         | Number of send attempts                |
| nextRetryAt | timestamp    | NULL                        | When to retry (null if sent/failed)    |
| status      | varchar(20)  | NOT NULL, default 'pending' | 'pending', 'sending', 'sent', 'failed' |
| error       | text         | NULL                        | Last error message if failed           |
| createdAt   | timestamp    | NOT NULL, default NOW()     | Queue entry creation time              |
| sentAt      | timestamp    | NULL                        | When successfully sent                 |

**Indexes**:

- `idx_email_queue_next_retry` on `(nextRetryAt)` WHERE `status = 'pending'` - for background worker polling
- `idx_email_queue_status` on `(status, createdAt DESC)` - for monitoring queue health

**Status Values**:

- `pending`: Waiting to be sent or retried
- `sending`: Currently being sent (prevent duplicate sends)
- `sent`: Successfully delivered
- `failed`: All retry attempts exhausted

**State Transitions**:

```
[pending] → attempts=0, nextRetryAt=NOW()
    ↓
[sending] → status='sending' (optimistic lock)
    ↓
    ├─[sent] → status='sent', sentAt=NOW(), nextRetryAt=null
    │    (terminal state)
    │
    └─[retry] → status='pending', attempts++, nextRetryAt=NOW() + exponential backoff
         ↓
         [failed] → status='failed', attempts>=3, nextRetryAt=null
              (terminal state)
```

**Retry Schedule** (exponential backoff):

- Attempt 1: Immediate (nextRetryAt = NOW())
- Attempt 2: +1 minute (nextRetryAt = NOW() + 1 min)
- Attempt 3: +5 minutes (nextRetryAt = NOW() + 5 min)
- Attempt 4: +15 minutes (nextRetryAt = NOW() + 15 min)
- If attempt 4 fails: status = 'failed'

### 6. rate_limits (New)

**Purpose**: Track rate limiting state for email/password operations

**Columns**:

| Column      | Type         | Constraints             | Description                    |
| ----------- | ------------ | ----------------------- | ------------------------------ |
| id          | uuid         | PK, default random()    | Rate limit entry identifier    |
| email       | varchar(255) | NOT NULL, UNIQUE        | Email being rate limited       |
| attempts    | jsonb        | NOT NULL, default '[]'  | Array of attempt timestamps    |
| windowStart | timestamp    | NOT NULL                | Current 15-minute window start |
| createdAt   | timestamp    | NOT NULL, default NOW() | Entry creation time            |

**Indexes**:

- `idx_rate_limits_email` on `(email)` - for fast rate limit lookups
- `idx_rate_limits_window_start` on `(windowStart)` - for cleanup of old windows

**Attempts JSONB Schema**:

```json
["2025-12-24T14:00:23Z", "2025-12-24T14:05:11Z", "2025-12-24T14:12:45Z"]
```

**Business Logic**:

- Sliding window: Keep only attempts from last 15 minutes
- Rate limit: Max 3 attempts per 15-minute window (FR-016)
- Cleanup: Remove entries where `windowStart < NOW() - 15 minutes` (scheduled job)

**Rate Limit Check Algorithm**:

```typescript
// 1. Get or create rate_limits entry for email
// 2. Filter attempts array: keep only timestamps > (NOW() - 15 minutes)
// 3. If filtered_attempts.length >= 3: RATE LIMITED
// 4. Else: Add NOW() to attempts array, allow request
// 5. Update windowStart = oldest timestamp in filtered array
```

## Drizzle ORM Schema Definitions

```typescript
// lib/db/drizzle-schema.ts additions

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
} from 'drizzle-orm/pg-core'

// Modified: users table (add emailVerified fields)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 100 }),
  passwordHash: varchar('password_hash', { length: 60 }).notNull(),
  emailVerified: boolean('email_verified').notNull().default(false), // NEW
  emailVerifiedAt: timestamp('email_verified_at'), // NEW
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// New: password_reset_tokens table
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').notNull().default(false),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// New: email_verification_tokens table
export const emailVerificationTokens = pgTable('email_verification_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').notNull().default(false),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// New: security_logs table
export const securityLogs = pgTable('security_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }).notNull(),
  userAgent: text('user_agent'),
  geolocation: jsonb('geolocation'),
  tokenId: varchar('token_id', { length: 64 }),
  outcome: varchar('outcome', { length: 20 }).notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// New: email_queue table
export const emailQueue = pgTable('email_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  to: varchar('to', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 500 }).notNull(),
  textBody: text('text_body').notNull(),
  htmlBody: text('html_body'),
  attempts: integer('attempts').notNull().default(0),
  nextRetryAt: timestamp('next_retry_at'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  error: text('error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  sentAt: timestamp('sent_at'),
})

// New: rate_limits table
export const rateLimits = pgTable('rate_limits', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  attempts: jsonb('attempts').notNull().default('[]'),
  windowStart: timestamp('window_start').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Type exports
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert

export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect
export type NewEmailVerificationToken = typeof emailVerificationTokens.$inferInsert

export type SecurityLog = typeof securityLogs.$inferSelect
export type NewSecurityLog = typeof securityLogs.$inferInsert

export type EmailQueueEntry = typeof emailQueue.$inferSelect
export type NewEmailQueueEntry = typeof emailQueue.$inferInsert

export type RateLimit = typeof rateLimits.$inferSelect
export type NewRateLimit = typeof rateLimits.$inferInsert
```

## Data Retention & Cleanup

### Cleanup Jobs (Scheduled Tasks)

1. **Expired Tokens Cleanup** (daily at 2 AM UTC):
   - Delete from `password_reset_tokens` WHERE `expiresAt < NOW() - INTERVAL '7 days'`
   - Delete from `email_verification_tokens` WHERE `expiresAt < NOW() - INTERVAL '7 days'`
   - Rationale: Keep expired tokens for 7 days for debugging, then purge

2. **Security Logs Retention** (weekly on Sunday):
   - Delete from `security_logs` WHERE `createdAt < NOW() - INTERVAL '90 days'`
   - Rationale: 90-day retention for compliance and debugging

3. **Email Queue Cleanup** (daily at 3 AM UTC):
   - Delete from `email_queue` WHERE `status IN ('sent', 'failed') AND createdAt < NOW() - INTERVAL '7 days'`
   - Rationale: Keep sent/failed emails for 7 days for debugging

4. **Rate Limits Cleanup** (hourly):
   - Delete from `rate_limits` WHERE `windowStart < NOW() - INTERVAL '15 minutes'`
   - Or: Update `attempts` array to remove timestamps > 15 minutes old
   - Rationale: No need to keep old rate limit data

## Migration Path

### Migration 001: Add Email Verification to Users

```sql
-- Add new columns to users table
ALTER TABLE users
  ADD COLUMN email_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN email_verified_at timestamp;

-- Create index for filtering unverified users
CREATE INDEX idx_users_email_verified ON users(email_verified);

-- Set existing users as unverified (they'll need to verify on next login)
UPDATE users SET email_verified = false;
```

### Migration 002: Create Token Tables

```sql
-- password_reset_tokens table
CREATE TABLE password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash varchar(64) NOT NULL UNIQUE,
  expires_at timestamp NOT NULL,
  used boolean NOT NULL DEFAULT false,
  used_at timestamp,
  created_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id, created_at DESC);
CREATE INDEX idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

-- email_verification_tokens table
CREATE TABLE email_verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash varchar(64) NOT NULL UNIQUE,
  expires_at timestamp NOT NULL,
  used boolean NOT NULL DEFAULT false,
  used_at timestamp,
  created_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_verification_tokens_hash ON email_verification_tokens(token_hash);
CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id, created_at DESC);
CREATE INDEX idx_email_verification_tokens_expires ON email_verification_tokens(expires_at);
```

### Migration 003: Create Security Logs Table

```sql
CREATE TABLE security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type varchar(50) NOT NULL,
  email varchar(255) NOT NULL,
  ip_address varchar(45) NOT NULL,
  user_agent text,
  geolocation jsonb,
  token_id varchar(64),
  outcome varchar(20) NOT NULL,
  metadata jsonb,
  created_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_security_logs_user_id ON security_logs(user_id, created_at DESC);
CREATE INDEX idx_security_logs_email ON security_logs(email, created_at DESC);
CREATE INDEX idx_security_logs_event_type ON security_logs(event_type, created_at DESC);
CREATE INDEX idx_security_logs_created_at ON security_logs(created_at DESC);
```

### Migration 004: Create Email Queue Table

```sql
CREATE TABLE email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to varchar(255) NOT NULL,
  subject varchar(500) NOT NULL,
  text_body text NOT NULL,
  html_body text,
  attempts integer NOT NULL DEFAULT 0,
  next_retry_at timestamp,
  status varchar(20) NOT NULL DEFAULT 'pending',
  error text,
  created_at timestamp NOT NULL DEFAULT NOW(),
  sent_at timestamp
);

CREATE INDEX idx_email_queue_next_retry ON email_queue(next_retry_at) WHERE status = 'pending';
CREATE INDEX idx_email_queue_status ON email_queue(status, created_at DESC);
```

### Migration 005: Create Rate Limits Table

```sql
CREATE TABLE rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) NOT NULL UNIQUE,
  attempts jsonb NOT NULL DEFAULT '[]'::jsonb,
  window_start timestamp NOT NULL,
  created_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rate_limits_email ON rate_limits(email);
CREATE INDEX idx_rate_limits_window_start ON rate_limits(window_start);
```
