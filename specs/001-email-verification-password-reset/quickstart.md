# Quickstart: Email Verification and Password Reset

**Feature**: Email Verification and Password Reset
**Date**: 2025-12-24
**For**: Developers implementing this feature

## Overview

This quickstart guide walks through implementing email verification and password reset functionality. Follow these steps in order to build the feature incrementally, with tests first (TDD).

## Prerequisites

- PostgreSQL database running and accessible
- SMTP credentials for email sending (or use Ethereal for testing)
- Node.js 20+ with npm/pnpm
- Existing NextAuth.js authentication setup

## Environment Setup

Add these environment variables to `.env.local`:

```bash
# Email Configuration (Development: use Ethereal, Production: real SMTP)
SMTP_HOST=smtp.ethereal.email  # Or smtp.gmail.com, smtp.sendgrid.net, etc.
SMTP_PORT=587
SMTP_USER=your-ethereal-username  # Get from https://ethereal.email
SMTP_PASS=your-ethereal-password
SMTP_FROM=noreply@memoryloop.com

# App URLs
NEXTAUTH_URL=http://localhost:3000  # Base URL for email links
```

## Implementation Order

### Phase 1: Database Setup (Foundation)

**Duration**: ~1 hour

1. **Run database migrations**

   ```bash
   npm run db:migrate
   ```

2. **Verify schema changes**
   ```bash
   npm run db:studio
   # Check that new tables exist:
   # - password_reset_tokens
   # - email_verification_tokens
   # - security_logs
   # - email_queue
   # - rate_limits
   # And users table has: emailVerified, emailVerifiedAt columns
   ```

### Phase 2: Shared Utilities (Building Blocks)

**Duration**: ~2 hours

Implement in this order (TDD: write tests first):

1. **Token Generation & Validation** (`lib/auth/tokens.ts`)
   - Test: `tests/unit/lib/auth/tokens.test.ts`
   - Functions:
     - `generateToken()` → returns {rawToken, hashedToken}
     - `hashToken(rawToken)` → returns hashedToken
     - `validateToken(rawToken, storedHash)` → returns boolean

2. **Rate Limiting** (`lib/auth/rate-limit.ts`)
   - Test: `tests/unit/lib/auth/rate-limit.test.ts`
   - Functions:
     - `checkRateLimit(email)` → returns {allowed: boolean, retryAfter?: number}
     - `recordAttempt(email)` → void

3. **Email Service** (`lib/email/client.ts`, `lib/email/templates.ts`)
   - Test: `tests/unit/lib/email/client.test.ts`
   - Functions:
     - `sendEmail(to, subject, body)` → queues email
     - `passwordResetEmail({email, resetLink})` → template
     - `emailVerificationEmail({email, verificationLink})` → template

4. **Email Retry Queue** (`lib/email/retry-queue.ts`)
   - Test: `tests/unit/lib/email/retry-queue.test.ts`
   - Functions:
     - `queueEmail(params)` → inserts into email_queue
     - `processQueue()` → background worker function

5. **Security Logging** (`lib/db/operations/security-logs.ts`)
   - Test: `tests/unit/lib/db/operations/security-logs.test.ts`
   - Functions:
     - `logSecurityEvent(params)` → inserts into security_logs

### Phase 3: Password Reset Flow (P1)

**Duration**: ~3 hours

Implement in this order (TDD: write tests first):

1. **Database Operations** (`lib/db/operations/password-reset-tokens.ts`)
   - Test: `tests/unit/lib/db/operations/password-reset-tokens.test.ts`
   - Functions:
     - `createResetToken(userId)` → creates token, returns rawToken
     - `validateResetToken(rawToken)` → returns {valid, userId}
     - `markTokenUsed(tokenHash)` → updates token

2. **API Route: Request Reset** (`app/api/auth/forgot-password/route.ts`)
   - Test: `tests/contract/password-reset-api.test.ts`
   - Logic:
     1. Validate email format
     2. Check rate limit
     3. Find user by email (or fake timing if not found)
     4. Create reset token
     5. Queue reset email
     6. Log security event
     7. Return success (always)

3. **API Route: Reset Password** (`app/api/auth/reset-password/route.ts`)
   - Test: `tests/contract/password-reset-api.test.ts`
   - Logic:
     1. Validate token and new password
     2. Check token expiration
     3. Check if token already used
     4. Hash new password
     5. Update user password
     6. Mark token as used
     7. Log security event
     8. Return success

4. **UI: Forgot Password Form** (`app/(auth)/forgot-password/page.tsx`, `components/auth/ForgotPasswordForm.tsx`)
   - Test: `tests/e2e/forgot-password.spec.ts`
   - Features:
     - Email input with validation
     - Submit button (shows loading state)
     - Success message
     - Error handling (rate limit, validation)

5. **UI: Reset Password Form** (`app/(auth)/reset-password/page.tsx`, `components/auth/ResetPasswordForm.tsx`)
   - Test: `tests/e2e/forgot-password.spec.ts` (continued)
   - Features:
     - Extract token from URL query param
     - New password input with strength indicator
     - Confirm password input
     - Submit button (shows loading state)
     - Success message with login link
     - Error handling (invalid token, expired, weak password)

6. **Integration Test** (`tests/integration/password-reset-flow.spec.ts`)
   - Test complete flow:
     1. Request reset → email queued
     2. Extract token from email
     3. Reset password → success
     4. Login with new password → works
     5. Try reusing token → fails

### Phase 4: Email Verification Flow (P2)

**Duration**: ~3 hours

Implement in this order (TDD: write tests first):

1. **Database Operations** (`lib/db/operations/email-verification-tokens.ts`)
   - Test: `tests/unit/lib/db/operations/email-verification-tokens.test.ts`
   - Functions:
     - `createVerificationToken(userId)` → creates token, returns rawToken
     - `validateVerificationToken(rawToken)` → returns {valid, userId}
     - `markTokenUsed(tokenHash)` → updates token

2. **API Route: Verify Email** (`app/api/auth/verify-email/route.ts`)
   - Test: `tests/contract/email-verification-api.test.ts`
   - Logic:
     1. Validate token
     2. Check token expiration
     3. Check if token already used
     4. Update user.emailVerified = true, emailVerifiedAt = NOW()
     5. Mark token as used
     6. Log security event
     7. Return success

3. **API Route: Resend Verification** (`app/api/auth/resend-verification/route.ts`)
   - Test: `tests/contract/email-verification-api.test.ts`
   - Logic:
     1. Check authentication (NextAuth session)
     2. Check if already verified
     3. Check rate limit
     4. Create new verification token
     5. Queue verification email
     6. Log security event
     7. Return success

4. **UI: Verification Banner** (`components/auth/EmailVerificationBanner.tsx`)
   - Test: `tests/component/EmailVerificationBanner.test.tsx`
   - Features:
     - Shows only if user logged in AND not verified
     - "Resend verification email" button
     - Dismissable (session storage)
     - Shows success message after resend
     - Shows error if rate limited

5. **UI: Verification Success/Error Page** (`app/(auth)/verify-email/page.tsx`)
   - Test: `tests/e2e/email-verification.spec.ts`
   - Features:
     - Extract token from URL query param
     - Auto-verify on page load
     - Show success message (with link to home/dashboard)
     - Show error message (with resend button)

6. **Modify Registration Flow** (if exists: `app/api/auth/register/route.ts` or similar)
   - Set emailVerified = false for new users
   - Create verification token
     - Queue verification email
   - Log security event

7. **Integration Test** (`tests/integration/email-verification-flow.spec.ts`)
   - Test complete flow:
     1. Register new user → verification email queued
     2. Login → banner appears
     3. Click verification link → email verified
     4. Reload page → banner gone

### Phase 5: Background Jobs

**Duration**: ~1 hour

1. **Email Queue Processor** (cron job or background worker)
   - File: `lib/email/background-worker.ts`
   - Test: `tests/unit/lib/email/background-worker.test.ts`
   - Schedule: Every 1 minute
   - Logic: Call `processQueue()` from retry-queue.ts

2. **Token Cleanup Job** (cron job)
   - File: `scripts/cleanup-expired-tokens.ts`
   - Test: `tests/unit/scripts/cleanup-expired-tokens.test.ts`
   - Schedule: Daily at 2 AM UTC
   - Logic: Delete expired tokens older than 7 days

3. **Security Logs Retention** (cron job)
   - File: `scripts/cleanup-security-logs.ts`
   - Test: `tests/unit/scripts/cleanup-security-logs.test.ts`
   - Schedule: Weekly on Sunday
   - Logic: Delete logs older than 90 days

## Testing Strategy

### Unit Tests (Write First - TDD)

Test individual functions in isolation with mocked dependencies.

Example: `tests/unit/lib/auth/tokens.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { generateToken, hashToken, validateToken } from '@/lib/auth/tokens'

describe('Token Generation', () => {
  it('generates 64-character hex token', () => {
    const { rawToken } = generateToken()
    expect(rawToken).toMatch(/^[a-f0-9]{64}$/)
  })

  it('generates unique tokens', () => {
    const token1 = generateToken()
    const token2 = generateToken()
    expect(token1.rawToken).not.toBe(token2.rawToken)
  })

  it('hashes token consistently', () => {
    const { rawToken } = generateToken()
    const hash1 = hashToken(rawToken)
    const hash2 = hashToken(rawToken)
    expect(hash1).toBe(hash2)
  })

  it('validates correct token', () => {
    const { rawToken, hashedToken } = generateToken()
    expect(validateToken(rawToken, hashedToken)).toBe(true)
  })

  it('rejects incorrect token', () => {
    const { hashedToken } = generateToken()
    const wrongToken = generateToken().rawToken
    expect(validateToken(wrongToken, hashedToken)).toBe(false)
  })
})
```

### Contract Tests (API Endpoints)

Test API contracts without full integration.

Example: `tests/contract/password-reset-api.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST as forgotPasswordHandler } from '@/app/api/auth/forgot-password/route'

// Mock dependencies
vi.mock('@/lib/email/client', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}))

describe('POST /api/auth/forgot-password', () => {
  it('returns 200 for valid email', async () => {
    const request = new Request('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    })

    const response = await forgotPasswordHandler(request)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.success).toBe(true)
  })

  it('returns 200 for non-existent email (prevents enumeration)', async () => {
    const request = new Request('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'nonexistent@example.com' }),
    })

    const response = await forgotPasswordHandler(request)
    expect(response.status).toBe(200)
  })

  it('returns 429 when rate limited', async () => {
    // Make 4 requests in quick succession
    const requests = Array(4)
      .fill(null)
      .map(() =>
        forgotPasswordHandler(
          new Request('http://localhost/api/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email: 'test@example.com' }),
          })
        )
      )

    const responses = await Promise.all(requests)
    expect(responses[3].status).toBe(429)
  })
})
```

### Integration Tests (Full Flow)

Test complete user journeys with database and all services.

Example: `tests/integration/password-reset-flow.spec.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { createTestUser, clearDatabase } from '../helpers/db'
import { getEmailQueue } from '@/lib/db/operations/email-queue'

describe('Password Reset Flow', () => {
  beforeEach(async () => {
    await clearDatabase()
  })

  it('completes full password reset flow', async () => {
    // 1. Create test user
    const user = await createTestUser({ email: 'test@example.com' })

    // 2. Request password reset
    const resetResponse = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: user.email }),
    })
    expect(resetResponse.status).toBe(200)

    // 3. Verify email was queued
    const queuedEmails = await getEmailQueue()
    expect(queuedEmails).toHaveLength(1)
    expect(queuedEmails[0].to).toBe(user.email)

    // 4. Extract token from email body
    const token = extractTokenFromEmail(queuedEmails[0].textBody)

    // 5. Reset password with token
    const newPassword = 'newPassword123'
    const resetPasswordResponse = await fetch('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    })
    expect(resetPasswordResponse.status).toBe(200)

    // 6. Verify login with new password works
    const loginResponse = await signIn('credentials', {
      email: user.email,
      password: newPassword,
      redirect: false,
    })
    expect(loginResponse.ok).toBe(true)

    // 7. Verify old password doesn't work
    const oldLoginResponse = await signIn('credentials', {
      email: user.email,
      password: 'oldPassword',
      redirect: false,
    })
    expect(oldLoginResponse.ok).toBe(false)
  })
})
```

### E2E Tests (Browser Tests)

Test user interactions with Playwright.

Example: `tests/e2e/forgot-password.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Password Reset', () => {
  test('user can reset password via email link', async ({ page }) => {
    // 1. Navigate to login page
    await page.goto('/login')

    // 2. Click "Forgot Password"
    await page.click('text=Forgot Password')
    expect(page.url()).toContain('/forgot-password')

    // 3. Enter email
    await page.fill('input[name="email"]', 'test@example.com')
    await page.click('button[type="submit"]')

    // 4. See success message
    await expect(page.locator('text=reset link has been sent')).toBeVisible()

    // 5. Get reset link from email (use test email service or mock)
    const resetLink = await getResetLinkFromEmail('test@example.com')

    // 6. Navigate to reset link
    await page.goto(resetLink)
    expect(page.url()).toContain('/reset-password')

    // 7. Enter new password
    await page.fill('input[name="newPassword"]', 'newSecurePassword123')
    await page.fill('input[name="confirmPassword"]', 'newSecurePassword123')
    await page.click('button[type="submit"]')

    // 8. See success message
    await expect(page.locator('text=Password reset successful')).toBeVisible()

    // 9. Login with new password
    await page.click('text=Log in')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'newSecurePassword123')
    await page.click('button[type="submit"]')

    // 10. Verify logged in
    await expect(page.locator('text=Dashboard')).toBeVisible()
  })
})
```

## Common Patterns

### Pattern 1: Token Flow

```typescript
// 1. Generate token (lib/auth/tokens.ts)
const { rawToken, hashedToken } = generateToken()

// 2. Store hashed token in database
await createResetToken({ userId, tokenHash: hashedToken, expiresAt: oneHourFromNow })

// 3. Send raw token via email (only once!)
await queueEmail({
  to: user.email,
  subject: 'Reset your password',
  body: `Click here: ${process.env.NEXTAUTH_URL}/reset-password?token=${rawToken}`,
})

// 4. User clicks link → raw token comes back in request
const { token } = await request.json()

// 5. Hash incoming token and validate against stored hash
const hashedIncomingToken = hashToken(token)
const storedToken = await findTokenByHash(hashedIncomingToken)

if (!storedToken || storedToken.used || storedToken.expiresAt < new Date()) {
  return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 })
}

// 6. Mark token as used (single-use!)
await markTokenUsed(hashedIncomingToken)
```

### Pattern 2: Rate Limiting

```typescript
// Check rate limit before expensive operations
const { allowed, retryAfter } = await checkRateLimit(email)

if (!allowed) {
  await logSecurityEvent({
    eventType: 'rate_limit_exceeded',
    email,
    outcome: 'rate_limited',
  })

  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: `Please wait ${Math.ceil(retryAfter / 60)} minutes`,
      retryAfter,
    }),
    { status: 429 }
  )
}

// Record attempt (even for invalid emails - prevents enumeration)
await recordAttempt(email)
```

### Pattern 3: Email Enumeration Prevention

```typescript
// ALWAYS return success, regardless of email existence
const user = await getUserByEmail(email)

if (!user) {
  // Simulate processing time to prevent timing attacks
  await new Promise((resolve) => setTimeout(resolve, 100))

  // Log the attempt (with no userId)
  await logSecurityEvent({
    eventType: 'password_reset_request',
    email,
    outcome: 'success', // Yes, "success" even though email doesn't exist
  })

  // Return success message
  return new Response(
    JSON.stringify({
      success: true,
      message: 'If an account exists for that email, a reset link has been sent',
    }),
    { status: 200 }
  )
}

// Continue with actual reset for existing user...
```

### Pattern 4: Security Logging

```typescript
// Log all security events (non-blocking)
await logSecurityEvent({
  userId: user?.id || null,
  eventType: 'password_reset_request',
  email,
  ipAddress:
    request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
  userAgent: request.headers.get('user-agent'),
  geolocation: await getGeolocation(ipAddress), // Optional, cached
  tokenId: hashedToken,
  outcome: 'success',
  metadata: { expiresAt: token.expiresAt },
})
```

## Troubleshooting

### Emails Not Sending

1. Check `.env.local` has correct SMTP credentials
2. Test SMTP connection: `npm run test:email`
3. Check email_queue table for failed emails: `SELECT * FROM email_queue WHERE status = 'failed'`
4. View Ethereal inbox: https://ethereal.email

### Rate Limiting Not Working

1. Check rate_limits table: `SELECT * FROM rate_limits`
2. Verify sliding window logic clears old attempts
3. Test with curl: `for i in {1..5}; do curl -X POST http://localhost:3000/api/auth/forgot-password -d '{"email":"test@example.com"}'; done`

### Tokens Expiring Too Fast

1. Check token creation: `SELECT * FROM password_reset_tokens ORDER BY created_at DESC LIMIT 10`
2. Verify `expiresAt` calculation is correct
3. Check system time on server

### Security Logs Missing

1. Verify logging is non-blocking (don't await)
2. Check security_logs table: `SELECT COUNT(*) FROM security_logs`
3. Test logging directly: `await logSecurityEvent({...})`

## Next Steps

After completing this implementation:

1. **Deploy to staging** - Test with real email provider
2. **Monitor logs** - Watch security_logs for suspicious patterns
3. **Set up alerts** - Alert on high rate of failed password resets
4. **Review UX** - Get user feedback on email copy and flow
5. **Performance testing** - Load test rate limiting under high traffic

## Additional Resources

- [Nodemailer Documentation](https://nodemailer.com/)
- [NextAuth.js Credentials Provider](https://next-auth.js.org/providers/credentials)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
