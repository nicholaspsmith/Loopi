# Implementation Plan: Email Verification and Password Reset

**Branch**: `001-email-verification-password-reset` | **Date**: 2025-12-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-email-verification-password-reset/spec.md`

## Summary

Implement secure email verification and password reset functionality for MemoryLoop authentication system. Users will be able to verify their email addresses upon registration and recover access to their accounts via password reset links. The implementation extends the existing NextAuth.js-based authentication system with:

- Token-based email verification (24-hour expiration)
- Password reset flow (1-hour expiration)
- Rate limiting (3 requests per 15 minutes)
- Email delivery with retry logic (exponential backoff)
- Comprehensive security event logging

## Technical Context

**Language/Version**: TypeScript 5.7.0, Node.js 20+
**Primary Dependencies**: Next.js 16.0.10, NextAuth 5.0.0-beta.30, Drizzle ORM 0.45.1, postgres 3.4.7
**Storage**: PostgreSQL (user data, tokens, security logs), LanceDB 0.22.3 (vector embeddings - not used for this feature)
**Testing**: Vitest 4.0.15 (unit/integration), Playwright 1.57.0 (E2E), Testing Library
**Target Platform**: Next.js App Router (React 19.2.3) web application
**Project Type**: Web application (Next.js App Router with API routes)
**Performance Goals**:

- 95% of emails delivered within 30 seconds
- Password reset flow completion under 3 minutes
- Email verification flow completion under 2 minutes
- API response time <200ms for token validation

**Constraints**:

- Must prevent email enumeration attacks (identical timing/responses)
- Token security: cryptographically secure, hashed storage
- Rate limiting: 3 requests per 15 minutes per email
- Email retry: 3 attempts with exponential backoff (1min, 5min, 15min)

**Scale/Scope**:

- Two new PostgreSQL tables (password_reset_tokens, email_verification_tokens)
- Two new user fields (emailVerified, emailVerifiedAt)
- 4 API routes (request reset, reset password, verify email, resend verification)
- 4 UI pages/components (forgot password form, reset password form, verification pages, banner)
- Comprehensive security logging with IP, user agent, geolocation

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

✅ **Documentation-First Development**: Feature spec complete with user scenarios, functional requirements (FR-001 to FR-018), and measurable success criteria

✅ **Test-First Development (TDD)**: Plan includes test tasks before implementation tasks. Tests will be written for:

- Token generation and validation
- Email sending and retry logic
- Rate limiting enforcement
- Security event logging
- API endpoints (contract and integration tests)
- UI flows (E2E tests)

✅ **Modularity & Composability**: Implementation broken into independent, testable components:

- P1 (Password Reset): Independently testable and deployable
- P2 (Email Verification): Independently testable and deployable
- Shared utilities (token generation, rate limiting, email service) are reusable

✅ **Simplicity (YAGNI)**: No over-engineering detected:

- Using existing NextAuth.js infrastructure
- Simple token table design (no complex state machines)
- Straightforward email retry with exponential backoff
- Direct PostgreSQL queries via Drizzle ORM (no repository pattern needed)

✅ **Observability & Debugging**:

- Comprehensive security event logging (FR-013)
- Structured logging for email retry attempts
- Clear error messages with actionable context (FR-017)
- Token IDs logged (hashed) for audit trail

✅ **Atomic Commits & Version Control Discipline**: Implementation will follow .claude/rules.md:

- One logical change per commit
- Commit messages under 100 characters, imperative mood
- No AI attribution in messages
- Atomic commits for database migrations, API routes, UI components

**Constitution Status**: ✅ PASS - No violations, ready for Phase 0 research

## Project Structure

### Documentation (this feature)

```text
specs/001-email-verification-password-reset/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── password-reset.yaml    # OpenAPI spec for reset endpoints
│   └── email-verification.yaml # OpenAPI spec for verification endpoints
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
# Next.js App Router Structure
app/
├── (auth)/
│   ├── forgot-password/         # NEW: Password reset request form
│   │   └── page.tsx
│   ├── reset-password/          # NEW: Password reset form (token validation)
│   │   └── page.tsx
│   └── verify-email/            # NEW: Email verification success/error page
│       └── page.tsx
└── api/
    └── auth/
        ├── forgot-password/     # NEW: Request password reset endpoint
        │   └── route.ts
        ├── reset-password/      # NEW: Reset password endpoint
        │   └── route.ts
        ├── verify-email/        # NEW: Verify email endpoint
        │   └── route.ts
        └── resend-verification/ # NEW: Resend verification email
            └── route.ts

components/
├── auth/
│   ├── ForgotPasswordForm.tsx      # NEW: Form component
│   ├── ResetPasswordForm.tsx       # NEW: Form component
│   └── EmailVerificationBanner.tsx # NEW: Persistent banner for unverified users
└── ui/                             # Existing UI primitives (reused)

lib/
├── auth/
│   ├── tokens.ts                   # NEW: Token generation and validation utilities
│   ├── rate-limit.ts               # NEW: Rate limiting logic
│   └── helpers.ts                  # EXISTING: Password hashing (reused)
├── email/
│   ├── client.ts                   # NEW: Email service client (NEEDS RESEARCH)
│   ├── templates.ts                # NEW: Email templates
│   └── retry-queue.ts              # NEW: Email retry queue with exponential backoff
├── db/
│   ├── drizzle-schema.ts           # MODIFIED: Add new tables and user fields
│   └── operations/
│       ├── password-reset-tokens.ts   # NEW: Password reset token CRUD
│       ├── email-verification-tokens.ts # NEW: Email verification token CRUD
│       └── security-logs.ts        # NEW: Security event logging
└── middleware/
    └── security-logger.ts          # NEW: Middleware for logging security events

tests/
├── contract/
│   ├── password-reset-api.test.ts     # NEW: API contract tests
│   └── email-verification-api.test.ts # NEW: API contract tests
├── integration/
│   ├── password-reset-flow.spec.ts    # NEW: End-to-end password reset flow
│   └── email-verification-flow.spec.ts # NEW: End-to-end verification flow
├── unit/
│   ├── lib/auth/tokens.test.ts        # NEW: Token generation/validation tests
│   ├── lib/auth/rate-limit.test.ts    # NEW: Rate limiting tests
│   └── lib/email/retry-queue.test.ts  # NEW: Email retry logic tests
└── e2e/
    ├── forgot-password.spec.ts        # NEW: Playwright E2E test
    └── email-verification.spec.ts     # NEW: Playwright E2E test

scripts/
└── db-migrate.ts                      # MODIFIED: Add migration for new tables
```

**Structure Decision**: Next.js App Router structure with existing patterns. New authentication features follow established conventions:

- API routes in `app/api/auth/` (matches existing NextAuth pattern)
- Auth pages in `app/(auth)/` (existing auth group)
- Reusable logic in `lib/` (existing pattern)
- Test organization by type (contract, integration, unit, e2e)

## Complexity Tracking

> No violations - section not needed per constitution check
