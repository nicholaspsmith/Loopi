# Tasks: Email Verification and Password Reset

**Input**: Design documents from `/specs/001-email-verification-password-reset/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: TDD approach required per constitution - tests are written FIRST before implementation

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

Next.js App Router structure:

- API routes: `app/api/auth/`
- Auth pages: `app/(auth)/`
- Components: `components/auth/`
- Utilities: `lib/auth/`, `lib/email/`, `lib/db/`
- Tests: `tests/unit/`, `tests/contract/`, `tests/integration/`, `tests/e2e/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Environment configuration, dependencies, and database schema

- [ ] T001 Install nodemailer dependency (npm install nodemailer @types/nodemailer)
- [ ] T002 Configure SMTP environment variables in .env.local (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM)
- [ ] T003 [P] Add emailVerified and emailVerifiedAt columns to users table in lib/db/drizzle-schema.ts
- [ ] T004 [P] Create password_reset_tokens table schema in lib/db/drizzle-schema.ts
- [ ] T005 [P] Create email_verification_tokens table schema in lib/db/drizzle-schema.ts
- [ ] T006 [P] Create security_logs table schema in lib/db/drizzle-schema.ts
- [ ] T007 [P] Create email_queue table schema in lib/db/drizzle-schema.ts
- [ ] T008 [P] Create rate_limits table schema in lib/db/drizzle-schema.ts
- [ ] T009 Create database migration for all schema changes in scripts/db-migrate.ts
- [ ] T010 Run database migration and verify schema with npm run db:push
- [ ] T011 Verify all tables created successfully using npm run db:studio

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core shared utilities that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Shared Utilities

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T012 [P] Unit test for token generation in tests/unit/lib/auth/tokens.test.ts
- [ ] T013 [P] Unit test for token hashing in tests/unit/lib/auth/tokens.test.ts
- [ ] T014 [P] Unit test for token validation in tests/unit/lib/auth/tokens.test.ts
- [ ] T015 [P] Unit test for rate limiting check in tests/unit/lib/auth/rate-limit.test.ts
- [ ] T016 [P] Unit test for rate limiting record attempt in tests/unit/lib/auth/rate-limit.test.ts
- [ ] T017 [P] Unit test for email client in tests/unit/lib/email/client.test.ts
- [ ] T018 [P] Unit test for email retry queue in tests/unit/lib/email/retry-queue.test.ts
- [ ] T019 [P] Unit test for security logging in tests/unit/lib/db/operations/security-logs.test.ts

### Implementation for Shared Utilities

- [ ] T020 [P] Implement generateToken() function in lib/auth/tokens.ts
- [ ] T021 [P] Implement hashToken() function in lib/auth/tokens.ts
- [ ] T022 [P] Implement validateToken() function in lib/auth/tokens.ts
- [ ] T023 [P] Implement checkRateLimit() function in lib/auth/rate-limit.ts
- [ ] T024 [P] Implement recordAttempt() function in lib/auth/rate-limit.ts
- [ ] T025 [P] Create CRUD operations for rate_limits table in lib/db/operations/rate-limits.ts
- [ ] T026 [P] Implement email templates (passwordResetEmail, emailVerificationEmail) in lib/email/templates.ts
- [ ] T027 [P] Implement sendEmail() function with Nodemailer in lib/email/client.ts
- [ ] T028 [P] Implement queueEmail() function in lib/email/retry-queue.ts
- [ ] T029 [P] Implement processQueue() function with exponential backoff in lib/email/retry-queue.ts
- [ ] T030 [P] Create CRUD operations for email_queue table in lib/db/operations/email-queue.ts
- [ ] T031 [P] Implement logSecurityEvent() function in lib/db/operations/security-logs.ts
- [ ] T032 [P] Create CRUD operations for security_logs table in lib/db/operations/security-logs.ts
- [ ] T033 [P] Implement IP geolocation helper with caching in lib/auth/geolocation.ts
- [ ] T034 Run all foundational unit tests and verify they pass

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Password Recovery (Priority: P1) 🎯 MVP

**Goal**: Users can reset forgotten passwords via email link, with secure token-based authentication and rate limiting

**Independent Test**: Create user account → request password reset → receive email → click link → set new password → login with new credentials

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T035 [P] [US1] Contract test for POST /api/auth/forgot-password in tests/contract/password-reset-api.test.ts
- [ ] T036 [P] [US1] Contract test for POST /api/auth/reset-password in tests/contract/password-reset-api.test.ts
- [ ] T037 [P] [US1] Unit test for createResetToken() in tests/unit/lib/db/operations/password-reset-tokens.test.ts
- [ ] T038 [P] [US1] Unit test for validateResetToken() in tests/unit/lib/db/operations/password-reset-tokens.test.ts
- [ ] T039 [P] [US1] Unit test for markTokenUsed() in tests/unit/lib/db/operations/password-reset-tokens.test.ts
- [ ] T040 [P] [US1] Integration test for complete password reset flow in tests/integration/password-reset-flow.spec.ts
- [ ] T041 [P] [US1] E2E test for forgot password UI flow in tests/e2e/forgot-password.spec.ts

### Implementation for User Story 1

**Database Operations:**

- [ ] T042 [P] [US1] Implement createResetToken(userId) in lib/db/operations/password-reset-tokens.ts
- [ ] T043 [P] [US1] Implement validateResetToken(rawToken) in lib/db/operations/password-reset-tokens.ts
- [ ] T044 [P] [US1] Implement markTokenUsed(tokenHash) in lib/db/operations/password-reset-tokens.ts
- [ ] T045 [P] [US1] Implement invalidatePreviousTokens(userId) in lib/db/operations/password-reset-tokens.ts

**API Routes:**

- [ ] T046 [US1] Implement POST /api/auth/forgot-password route in app/api/auth/forgot-password/route.ts (rate limiting, token creation, email queueing, security logging)
- [ ] T047 [US1] Implement POST /api/auth/reset-password route in app/api/auth/reset-password/route.ts (token validation, password update, security logging)

**UI Components:**

- [ ] T048 [P] [US1] Create ForgotPasswordForm component in components/auth/ForgotPasswordForm.tsx
- [ ] T049 [P] [US1] Create forgot password page in app/(auth)/forgot-password/page.tsx
- [ ] T050 [P] [US1] Create ResetPasswordForm component in components/auth/ResetPasswordForm.tsx
- [ ] T051 [P] [US1] Create reset password page in app/(auth)/reset-password/page.tsx
- [ ] T052 [US1] Add "Forgot Password?" link to login page (find existing login page and add link)

**Integration & Validation:**

- [ ] T053 [US1] Run all User Story 1 tests and verify they pass
- [ ] T054 [US1] Manual test: Complete password reset flow end-to-end
- [ ] T055 [US1] Verify email enumeration prevention (identical responses for valid/invalid emails)
- [ ] T056 [US1] Verify rate limiting (3 requests per 15 minutes)
- [ ] T057 [US1] Verify token expiration (1 hour)
- [ ] T058 [US1] Verify security logging (check security_logs table for all events)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Email Verification for New Users (Priority: P2)

**Goal**: New users receive verification email and can verify their email address while maintaining full app access with persistent reminder banner

**Independent Test**: Create new account → receive verification email → see banner → click verification link → email verified → banner disappears

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T059 [P] [US2] Contract test for POST /api/auth/verify-email in tests/contract/email-verification-api.test.ts
- [ ] T060 [P] [US2] Contract test for POST /api/auth/resend-verification in tests/contract/email-verification-api.test.ts
- [ ] T061 [P] [US2] Unit test for createVerificationToken() in tests/unit/lib/db/operations/email-verification-tokens.test.ts
- [ ] T062 [P] [US2] Unit test for validateVerificationToken() in tests/unit/lib/db/operations/email-verification-tokens.test.ts
- [ ] T063 [P] [US2] Unit test for markTokenUsed() in tests/unit/lib/db/operations/email-verification-tokens.test.ts
- [ ] T064 [P] [US2] Component test for EmailVerificationBanner in tests/component/EmailVerificationBanner.test.tsx
- [ ] T065 [P] [US2] Integration test for complete email verification flow in tests/integration/email-verification-flow.spec.ts
- [ ] T066 [P] [US2] E2E test for email verification UI flow in tests/e2e/email-verification.spec.ts

### Implementation for User Story 2

**Database Operations:**

- [ ] T067 [P] [US2] Implement createVerificationToken(userId) in lib/db/operations/email-verification-tokens.ts
- [ ] T068 [P] [US2] Implement validateVerificationToken(rawToken) in lib/db/operations/email-verification-tokens.ts
- [ ] T069 [P] [US2] Implement markTokenUsed(tokenHash) in lib/db/operations/email-verification-tokens.ts
- [ ] T070 [P] [US2] Implement updateUserEmailVerified(userId) in lib/db/operations/users.ts

**API Routes:**

- [ ] T071 [US2] Implement POST /api/auth/verify-email route in app/api/auth/verify-email/route.ts (token validation, user update, security logging)
- [ ] T072 [US2] Implement POST /api/auth/resend-verification route in app/api/auth/resend-verification/route.ts (auth check, rate limiting, token creation, email queueing)

**UI Components:**

- [ ] T073 [P] [US2] Create EmailVerificationBanner component in components/auth/EmailVerificationBanner.tsx (dismissable, resend button, session storage)
- [ ] T074 [P] [US2] Create verify email success/error page in app/(auth)/verify-email/page.tsx (auto-verify on load, show success/error)
- [ ] T075 [US2] Add EmailVerificationBanner to main layout (show only for unverified authenticated users)

**Registration Flow Integration:**

- [ ] T076 [US2] Find existing registration route (likely app/api/auth/register/route.ts or similar)
- [ ] T077 [US2] Modify registration to set emailVerified=false for new users
- [ ] T078 [US2] Modify registration to create verification token and queue email
- [ ] T079 [US2] Modify registration to log security event

**Integration & Validation:**

- [ ] T080 [US2] Run all User Story 2 tests and verify they pass
- [ ] T081 [US2] Manual test: Register new user → see banner → verify email → banner disappears
- [ ] T082 [US2] Verify unverified users can access all features (soft restriction)
- [ ] T083 [US2] Verify token expiration (24 hours)
- [ ] T084 [US2] Verify resend rate limiting (3 requests per 15 minutes)
- [ ] T085 [US2] Verify security logging (check security_logs table for all events)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Background jobs, cleanup, and improvements that affect multiple user stories

### Background Jobs

- [ ] T086 [P] Implement email queue processor background worker in lib/email/background-worker.ts
- [ ] T087 [P] Create token cleanup cron job script in scripts/cleanup-expired-tokens.ts
- [ ] T088 [P] Create security logs retention cron job script in scripts/cleanup-security-logs.ts
- [ ] T089 [P] Create rate limits cleanup logic (remove old windows)
- [ ] T090 [P] Unit test for email queue processor in tests/unit/lib/email/background-worker.test.ts
- [ ] T091 [P] Unit test for token cleanup script in tests/unit/scripts/cleanup-expired-tokens.test.ts

### Documentation & Validation

- [ ] T092 [P] Update README.md with email configuration instructions
- [ ] T093 [P] Update .env.example with SMTP variables
- [ ] T094 Run quickstart.md validation (follow implementation order, verify all steps work)
- [ ] T095 Verify all migrations are idempotent (can run multiple times safely)
- [ ] T096 Verify all tests pass (npm run test && npm run test:integration && npm run test:e2e)

### Security Hardening

- [ ] T097 [P] Verify constant-time token comparison to prevent timing attacks
- [ ] T098 [P] Verify HTTPS-only reset/verification links in production
- [ ] T099 [P] Review all error messages to ensure no sensitive data leakage
- [ ] T100 [P] Verify CSRF protection on all state-changing endpoints

### Performance Optimization

- [ ] T101 [P] Add database indexes for frequently queried columns (token hashes, email, expiration timestamps)
- [ ] T102 [P] Verify email queue processor handles high volume (test with 100+ queued emails)
- [ ] T103 [P] Verify rate limiting performs well under load

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion
- **User Story 2 (Phase 4)**: Depends on Foundational phase completion - Can run in parallel with US1
- **Polish (Phase 5)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - Password Recovery**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2) - Email Verification**: Can start after Foundational (Phase 2) - Independent of US1 (can run in parallel)

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Database operations before API routes
- API routes before UI components
- Core implementation before integration tests
- Story complete and validated before moving to next priority

### Parallel Opportunities

**Setup Phase (Phase 1):**

- T003-T008 (all schema definitions) can run in parallel

**Foundational Phase (Phase 2):**

- All test tasks (T012-T019) can run in parallel
- All implementation tasks (T020-T033) can run in parallel AFTER their tests are written

**User Story 1 (Phase 3):**

- All test tasks (T035-T041) can run in parallel
- Database operations (T042-T045) can run in parallel
- UI components (T048-T051) can run in parallel after API routes complete

**User Story 2 (Phase 4):**

- All test tasks (T059-T066) can run in parallel
- Database operations (T067-T070) can run in parallel
- UI components (T073-T074) can run in parallel after API routes complete

**Entire User Stories:**

- After Foundational phase completes, User Story 1 and User Story 2 can be worked on in parallel by different team members

**Polish Phase (Phase 5):**

- Background jobs (T086-T091) can run in parallel
- Documentation (T092-T094) can run in parallel
- Security tasks (T097-T100) can run in parallel
- Performance tasks (T101-T103) can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Contract test for POST /api/auth/forgot-password in tests/contract/password-reset-api.test.ts"
Task: "Contract test for POST /api/auth/reset-password in tests/contract/password-reset-api.test.ts"
Task: "Unit test for createResetToken() in tests/unit/lib/db/operations/password-reset-tokens.test.ts"
Task: "Unit test for validateResetToken() in tests/unit/lib/db/operations/password-reset-tokens.test.ts"
Task: "Unit test for markTokenUsed() in tests/unit/lib/db/operations/password-reset-tokens.test.ts"
Task: "Integration test for complete password reset flow in tests/integration/password-reset-flow.spec.ts"
Task: "E2E test for forgot password UI flow in tests/e2e/forgot-password.spec.ts"

# Launch all database operations for User Story 1 together:
Task: "Implement createResetToken(userId) in lib/db/operations/password-reset-tokens.ts"
Task: "Implement validateResetToken(rawToken) in lib/db/operations/password-reset-tokens.ts"
Task: "Implement markTokenUsed(tokenHash) in lib/db/operations/password-reset-tokens.ts"
Task: "Implement invalidatePreviousTokens(userId) in lib/db/operations/password-reset-tokens.ts"

# Launch all UI components for User Story 1 together (after API routes):
Task: "Create ForgotPasswordForm component in components/auth/ForgotPasswordForm.tsx"
Task: "Create forgot password page in app/(auth)/forgot-password/page.tsx"
Task: "Create ResetPasswordForm component in components/auth/ResetPasswordForm.tsx"
Task: "Create reset password page in app/(auth)/reset-password/page.tsx"
```

---

## Parallel Example: User Story 2

```bash
# Launch all tests for User Story 2 together:
Task: "Contract test for POST /api/auth/verify-email in tests/contract/email-verification-api.test.ts"
Task: "Contract test for POST /api/auth/resend-verification in tests/contract/email-verification-api.test.ts"
Task: "Unit test for createVerificationToken() in tests/unit/lib/db/operations/email-verification-tokens.test.ts"
Task: "Unit test for validateVerificationToken() in tests/unit/lib/db/operations/email-verification-tokens.test.ts"
Task: "Unit test for markTokenUsed() in tests/unit/lib/db/operations/email-verification-tokens.test.ts"
Task: "Component test for EmailVerificationBanner in tests/component/EmailVerificationBanner.test.tsx"
Task: "Integration test for complete email verification flow in tests/integration/email-verification-flow.spec.ts"
Task: "E2E test for email verification UI flow in tests/e2e/email-verification.spec.ts"

# Launch all database operations for User Story 2 together:
Task: "Implement createVerificationToken(userId) in lib/db/operations/email-verification-tokens.ts"
Task: "Implement validateVerificationToken(rawToken) in lib/db/operations/email-verification-tokens.ts"
Task: "Implement markTokenUsed(tokenHash) in lib/db/operations/email-verification-tokens.ts"
Task: "Implement updateUserEmailVerified(userId) in lib/db/operations/users.ts"

# Launch all UI components for User Story 2 together (after API routes):
Task: "Create EmailVerificationBanner component in components/auth/EmailVerificationBanner.tsx"
Task: "Create verify email success/error page in app/(auth)/verify-email/page.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T011) - ~1 hour
2. Complete Phase 2: Foundational (T012-T034) - ~2 hours
3. Complete Phase 3: User Story 1 (T035-T058) - ~3 hours
4. **STOP and VALIDATE**: Test password reset flow independently
5. Total MVP time: ~6 hours

**MVP Deliverable**: Users can reset forgotten passwords via secure email link

### Incremental Delivery

1. **Foundation** (Setup + Foundational) → Core infrastructure ready (~3 hours)
2. **MVP** (+ User Story 1) → Password reset functional → Deploy/Demo (~6 hours total)
3. **Full Feature** (+ User Story 2) → Email verification functional → Deploy/Demo (~10 hours total)
4. **Production Ready** (+ Polish) → Background jobs, cleanup, hardening → Deploy (~11 hours total)

Each increment adds value without breaking previous functionality.

### Parallel Team Strategy

With 2 developers after Foundational phase completes:

1. **Both**: Complete Setup + Foundational together (~3 hours)
2. **Developer A**: User Story 1 (Password Reset) (~3 hours)
3. **Developer B**: User Story 2 (Email Verification) (~3 hours)
4. **Both**: Polish & Cross-Cutting Concerns (~1 hour)

Total time: ~7 hours (vs ~11 hours sequential)

---

## Notes

- **[P] tasks** = different files, no dependencies - can run in parallel
- **[Story] label** = maps task to specific user story for traceability
- **TDD Required**: Tests MUST be written first and FAIL before implementation
- **Each user story** should be independently completable and testable
- **Verify tests fail** before implementing to ensure they're actually testing the functionality
- **Commit strategy**: Atomic commits per .claude/rules.md (one logical change per commit)
- **Checkpoints**: Stop at each checkpoint to validate story independently before proceeding
- **Security**: All tokens hashed before storage, rate limiting enforced, enumeration prevented
- **Email**: Use Ethereal (ethereal.email) for development, real SMTP for production

---

## Task Count Summary

- **Total Tasks**: 103
- **Phase 1 (Setup)**: 11 tasks
- **Phase 2 (Foundational)**: 23 tasks (19 tests + 15 implementation - note some tests cover multiple functions)
- **Phase 3 (User Story 1)**: 24 tasks (7 tests + 17 implementation)
- **Phase 4 (User Story 2)**: 27 tasks (8 tests + 19 implementation)
- **Phase 5 (Polish)**: 18 tasks

**Test Coverage**: 42 test tasks (41% of total) ensuring comprehensive TDD approach

**Parallel Opportunities**:

- Phase 1: 6 tasks can run in parallel
- Phase 2: 23 tasks can run in parallel (after tests written)
- Phase 3: 18 tasks can run in parallel (in groups)
- Phase 4: 20 tasks can run in parallel (in groups)
- Phase 5: 16 tasks can run in parallel
- **User Stories 1 & 2**: Can run completely in parallel after Foundational phase

**MVP Scope**: Phase 1 + Phase 2 + Phase 3 (User Story 1) = 58 tasks = Password reset functionality
