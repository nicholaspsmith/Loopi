# Research: Email Verification and Password Reset

**Feature**: Email Verification and Password Reset
**Date**: 2025-12-24
**Status**: Complete

## Research Questions

### 1. Email Service Provider Selection

**Question**: Which email service provider should be used for sending verification and password reset emails?

**Decision**: Nodemailer with SMTP (configurable provider)

**Rationale**:

- **Flexibility**: Nodemailer supports any SMTP provider (SendGrid, AWS SES, Gmail, Mailgun, etc.)
- **Cost**: No additional dependencies beyond `nodemailer` package
- **Testing**: Easy to mock for testing, supports test mode
- **Integration**: Well-documented, widely used in Node.js ecosystem
- **Future-proof**: Can switch SMTP providers by changing configuration without code changes

**Alternatives Considered**:

1. **SendGrid SDK**: Pros: Robust, good deliverability. Cons: Vendor lock-in, additional cost
2. **AWS SES SDK**: Pros: Low cost, AWS integration. Cons: Requires AWS setup, more complex
3. **Resend**: Pros: Modern API, developer-friendly. Cons: New service, less proven at scale

**Implementation Notes**:

- Use environment variables for SMTP configuration (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`)
- Default to console logging in development/test environments
- Store email templates as plain text with variable substitution

### 2. Token Generation Strategy

**Question**: What approach should be used for generating secure, unique tokens?

**Decision**: Use Node.js `crypto.randomBytes()` with SHA-256 hashing

**Rationale**:

- **Security**: Cryptographically secure random number generation (CSPRNG)
- **Standard**: Node.js crypto module is well-tested and audited
- **Performance**: Fast generation and hashing
- **Storage**: Store SHA-256 hash of token, not plaintext (prevents token theft from database breach)
- **Uniqueness**: 32 bytes (256 bits) provides sufficient entropy

**Implementation**:

```typescript
// Token generation pattern
const rawToken = crypto.randomBytes(32).toString('hex') // 64 hex characters
const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex')

// Store hashedToken in database
// Send rawToken via email (one-time visibility)
// Validate by hashing incoming token and comparing with stored hash
```

**Alternatives Considered**:

1. **UUID v4**: Pros: Simple. Cons: Less entropy (122 bits vs 256 bits), predictable format
2. **JWT**: Pros: Self-contained. Cons: Overkill, exposes metadata, larger token size
3. **bcrypt for hashing**: Pros: Intentionally slow. Cons: Too slow for token validation, designed for passwords

### 3. Rate Limiting Implementation

**Question**: How should rate limiting be implemented and stored?

**Decision**: In-memory Map with sliding window (development) + PostgreSQL table (production)

**Rationale**:

- **Simplicity**: In-memory Map for development, easy to implement
- **Production**: PostgreSQL table for persistent rate limit tracking across server restarts
- **Scalability**: Can upgrade to Redis later if needed without changing API
- **Accuracy**: Sliding window provides more accurate rate limiting than fixed windows

**Implementation**:

```typescript
// Development: Map<email, {attempts: number[], windowStart: Date}>
// Production: Table rate_limits (email, attempt_timestamp[], window_start)
// Sliding window: Count attempts in last 15 minutes, remove old attempts
```

**Alternatives Considered**:

1. **Redis**: Pros: Fast, distributed. Cons: Additional infrastructure dependency, overkill for MVP
2. **Fixed window**: Pros: Simpler. Cons: Burst attacks at window boundaries
3. **Token bucket**: Pros: Smoother rate control. Cons: More complex, harder to explain in error messages

### 4. Email Retry Queue Implementation

**Question**: How should email retry logic be implemented with exponential backoff?

**Decision**: PostgreSQL-based queue with background worker polling

**Rationale**:

- **Reliability**: Persistent queue survives server restarts
- **Simplicity**: No additional infrastructure (Redis, SQS, etc.)
- **Observability**: Easy to query failed emails, retry status
- **Testing**: Can test retry logic synchronously in tests

**Implementation**:

- Table: `email_queue` (id, to, subject, body, attempts, next_retry_at, status, created_at)
- Background worker: Poll every minute for emails where `next_retry_at <= NOW() AND attempts < 3`
- Exponential backoff: Calculate `next_retry_at = NOW() + (2^attempts) * 1 minute`
- Statuses: 'pending', 'sending', 'sent', 'failed'

**Alternatives Considered**:

1. **BullMQ (Redis)**: Pros: Robust, full-featured. Cons: Requires Redis, added complexity
2. **In-memory retry**: Pros: Simple. Cons: Lost on server restart
3. **Third-party service (SendGrid retries)**: Pros: Handled externally. Cons: Less control, vendor-specific

### 5. Security Event Logging Schema

**Question**: What structure should security logs use and where should they be stored?

**Decision**: PostgreSQL table with structured JSONB fields for extensibility

**Rationale**:

- **Query**: SQL queries for security audits and analytics
- **Retention**: Easy to implement retention policies (delete old logs)
- **Extensibility**: JSONB fields allow adding new properties without schema changes
- **Cost**: PostgreSQL already in stack, no additional infrastructure

**Schema**:

```typescript
security_logs {
  id: uuid
  event_type: varchar ('password_reset_request', 'password_reset_complete', 'email_verification', etc.)
  email: varchar (hashed or plaintext - decision: plaintext for audit)
  ip_address: varchar
  user_agent: text
  geolocation: jsonb {country, region, city}
  token_id: varchar (hashed)
  outcome: varchar ('success', 'failed', 'rate_limited', 'expired')
  metadata: jsonb (extensible for future fields)
  created_at: timestamp
}
```

**Alternatives Considered**:

1. **Logging service (DataDog, Splunk)**: Pros: Specialized tools. Cons: Cost, external dependency
2. **File-based logs**: Pros: Simple. Cons: Hard to query, no structured search
3. **Separate audit database**: Pros: Isolation. Cons: Complexity, two databases to manage

### 6. Geolocation Service

**Question**: How should IP geolocation be implemented for security logging?

**Decision**: ip-api.com free tier with in-memory caching

**Rationale**:

- **Cost**: Free tier: 45 requests/minute, sufficient for rate-limited operations (3/15min)
- **No API key**: Simple setup, no registration required
- **Accuracy**: City-level accuracy sufficient for security logs
- **Caching**: Cache IP→location for 24 hours to reduce API calls

**Implementation**:

```typescript
// Cache: Map<ip, {country, region, city, timestamp}>
// API: http://ip-api.com/json/{ip}?fields=country,regionName,city
// Fallback: Log 'unknown' if API fails (non-blocking)
```

**Alternatives Considered**:

1. **MaxMind GeoLite2**: Pros: Offline database. Cons: Requires updates, license agreement, larger package
2. **ipstack.com**: Pros: More accurate. Cons: Requires API key, paid tiers
3. **No geolocation**: Pros: Simpler. Cons: Less useful security logs (IP alone harder to interpret)

### 7. Email Template Approach

**Question**: How should email templates be structured and rendered?

**Decision**: Simple string templates with variable substitution (template literals)

**Rationale**:

- **Simplicity**: No template engine needed (Handlebars, EJS, etc.)
- **Type safety**: TypeScript template literals provide type checking
- **Maintenance**: Templates stored as functions returning strings
- **Testing**: Easy to test template rendering

**Implementation**:

```typescript
// lib/email/templates.ts
export const passwordResetEmail = (params: { resetLink: string; email: string }) => ({
  subject: 'Reset your MemoryLoop password',
  text: `Hi,\n\nClick here to reset your password: ${params.resetLink}\n\nThis link expires in 1 hour.`,
  html: `<p>Hi,</p><p>Click here to reset your password: <a href="${params.resetLink}">Reset Password</a></p><p>This link expires in 1 hour.</p>`,
})
```

**Alternatives Considered**:

1. **Handlebars/EJS**: Pros: Powerful, widely used. Cons: Additional dependency, learning curve
2. **React Email**: Pros: JSX-based, type-safe. Cons: Overkill for simple transactional emails
3. **External template service**: Pros: Non-technical team can edit. Cons: Added complexity, external dependency

## Dependencies

**New npm packages required**:

- `nodemailer` (^6.9.0): SMTP email sending
- `@types/nodemailer` (^6.4.0): TypeScript types for nodemailer

**No new packages needed for**:

- Token generation: Node.js `crypto` (built-in)
- Hashing: Node.js `crypto` (built-in)
- Geolocation: Native `fetch` API
- Rate limiting: PostgreSQL + existing Drizzle ORM
- Retry queue: PostgreSQL + existing Drizzle ORM

## Best Practices

### Token Security

- **Storage**: Always hash tokens before storing in database (SHA-256)
- **Transmission**: Send raw token only once (via email), never log or store plaintext
- **Validation**: Hash incoming token and compare with stored hash
- **Cleanup**: Delete expired tokens via scheduled job (prevent table bloat)

### Email Sending

- **Testing**: Use Nodemailer's test account (ethereal.email) in development
- **Production**: Validate SMTP credentials on app startup, fail fast if misconfigured
- **Retry**: Always queue emails for retry (never send synchronously without retry)
- **Errors**: Log email failures with sufficient context for debugging

### Rate Limiting

- **Precision**: Use sliding window (not fixed window) to prevent burst attacks
- **Logging**: Log rate limit violations to security_logs table
- **Error messages**: Show time until next attempt allowed (FR-017)
- **Testing**: Rate limiting should be easily disabled in tests

### Security Logging

- **Non-blocking**: Logging failures should never block request processing
- **Sensitive data**: Hash token IDs, don't log full tokens
- **Privacy**: Store IP addresses (required for security), but consider retention policy
- **Performance**: Use async inserts, don't await log writes in request handlers

## Migration Strategy

### Database Migrations

1. Add `emailVerified`, `emailVerifiedAt` columns to existing `users` table
2. Create `password_reset_tokens` table
3. Create `email_verification_tokens` table
4. Create `security_logs` table
5. Create `email_queue` table
6. Create `rate_limits` table
7. Create indexes on frequently queried columns (token hashes, email, expiration timestamps)

### Backward Compatibility

- Existing users: Set `emailVerified = false`, trigger verification email on next login
- Authentication: NextAuth.js flow unchanged, add verification check after successful login
- Database: Use Drizzle Kit migrations for schema changes

## Performance Considerations

- **Token validation**: O(1) hash lookup, < 1ms
- **Rate limit check**: Index on `(email, created_at)`, < 5ms
- **Email queue polling**: Limit to 100 emails per poll cycle
- **Security logging**: Async insert, non-blocking
- **Geolocation caching**: In-memory Map, < 1ms cache hit

## Security Considerations

- **Timing attacks**: Use constant-time comparison for token validation
- **Email enumeration**: Return identical responses for valid/invalid emails (FR-012)
- **Token entropy**: 256 bits minimum (crypto.randomBytes(32))
- **HTTPS only**: Reset/verification links must use HTTPS in production
- **CSRF protection**: NextAuth.js provides CSRF tokens for state-changing operations
