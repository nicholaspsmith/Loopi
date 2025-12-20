# Quickstart Guide: Claude API Integration with User API Keys

**Feature**: Claude API Integration
**Branch**: `004-claude-api`
**Prerequisites**: Spec and plan completed, database running

## Overview

This guide walks through implementing the Claude API integration feature, following the prioritized user stories (P1 → P2 → P3) and TDD principles. Each user story is implemented and tested independently before moving to the next.

## Prerequisites

### Environment Setup

1. **PostgreSQL with pgcrypto extension**:
   ```bash
   # Verify pgcrypto is available (should already be on Supabase)
   psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
   ```

2. **Environment variables** (add to `.env.local`):
   ```bash
   # API key encryption (generate secure random string)
   API_KEY_ENCRYPTION_SECRET="<generate-32-byte-base64-string>"

   # Keep existing vars:
   DATABASE_URL="postgresql://..."
   AUTH_SECRET="..."
   OLLAMA_BASE_URL="http://localhost:11434"
   ```

3. **Generate encryption secret**:
   ```bash
   # Use OpenSSL to generate secure random string
   openssl rand -base64 32
   ```

4. **Install dependencies** (if needed):
   ```bash
   npm install @anthropic-ai/sdk  # Already installed: ^0.71.2
   ```

### Database Migration

Run the Drizzle migration to add `api_keys` table and update `messages` table:

```bash
# Generate migration from schema changes
npm run db:generate

# Apply migration to database
npm run db:migrate
```

Verify migration:
```bash
psql $DATABASE_URL -c "\d api_keys"
psql $DATABASE_URL -c "\d messages"
```

## Implementation Order (TDD Workflow)

Follow this order to implement user stories with tests first:

### Phase 1: P1 Stories (Core Functionality)

#### User Story 1: Enter and Save API Key

**Test First** → **Implement** → **Verify**

1. **Contract tests**: `/tests/contract/settings/api-key.test.ts`
   - Test POST /api/settings/api-key (save key)
   - Test GET /api/settings/api-key (retrieve masked key)
   - Test DELETE /api/settings/api-key (remove key)
   - Expected: All tests FAIL (endpoints don't exist yet)

2. **Component tests**: `/tests/component/settings/ApiKeyForm.test.tsx`
   - Test form validation (format checking)
   - Test submit behavior
   - Test error display
   - Expected: All tests FAIL (component doesn't exist yet)

3. **Implement**:
   - Database operations: `/lib/db/operations/api-keys.ts`
   - Encryption service: `/lib/encryption/api-key.ts`
   - API route: `/app/api/settings/api-key/route.ts`
   - Settings page: `/app/(protected)/settings/page.tsx`
   - Form component: `/components/settings/ApiKeyForm.tsx`
   - Display component: `/components/settings/ApiKeyDisplay.tsx`

4. **Verify**: Run tests
   ```bash
   npm run test -- tests/contract/settings
   npm run test -- tests/component/settings
   ```
   Expected: All tests PASS

5. **E2E test**:
   ```bash
   npm run test:e2e -- tests/e2e/settings/api-key-flow.spec.ts
   ```
   Expected: User can navigate to /settings, enter API key, see masked version

#### User Story 2: Use Claude API with Personal Key

**Test First** → **Implement** → **Verify**

1. **Integration tests**: `/tests/integration/claude/user-keys.test.ts`
   - Test Claude client initialization with user API key
   - Test fallback to Ollama when no key
   - Test message creation with provider tracking
   - Expected: All tests FAIL

2. **Component tests**: `/tests/component/settings/ProviderBadge.test.tsx`
   - Test Claude API badge display
   - Test Ollama badge display
   - Expected: All tests FAIL

3. **Implement**:
   - Update Claude client: `/lib/claude/client.ts`
     - Add `getUserApiKey(userId)` function
     - Add Anthropic client initialization
     - Add provider selection logic
   - Update flashcard generator: `/lib/claude/flashcard-generator.ts`
     - Accept optional API key parameter
     - Route to Claude API or Ollama
   - Add provider badge: `/components/settings/ProviderBadge.tsx`
   - Update Message component to show provider

4. **Verify**: Run tests
   ```bash
   npm run test -- tests/integration/claude
   npm run test -- tests/component/settings/ProviderBadge
   ```
   Expected: All tests PASS

5. **E2E test**: End-to-end chat flow with user API key
   ```bash
   npm run test:e2e -- tests/e2e/chat/claude-api-integration.spec.ts
   ```
   Expected: User with API key can send message, receive Claude response, see "Claude API" badge

### Phase 2: P2 Stories (Enhanced UX)

#### User Story 3: API Key Validation and Feedback

**Test First** → **Implement** → **Verify**

1. **Contract tests**: Add validation endpoint tests
   - Test POST /api/settings/api-key/validate
   - Test validation with invalid key
   - Test validation with valid key
   - Expected: Tests FAIL

2. **Component tests**: Add validation UI tests
   - Test real-time validation trigger
   - Test validation feedback display
   - Expected: Tests FAIL

3. **Implement**:
   - Validation endpoint: `/app/api/settings/api-key/validate/route.ts`
   - Update ApiKeyForm with validation button
   - Add validation feedback UI

4. **Verify**: Run tests
   ```bash
   npm run test -- tests/contract/settings
   npm run test -- tests/component/settings/ApiKeyForm
   ```
   Expected: All tests PASS

#### User Story 4: Fallback to Ollama

**Test First** → **Implement** → **Verify**

1. **Integration tests**: Fallback behavior
   - Test user without API key uses Ollama
   - Test fallback notice display
   - Expected: Tests FAIL

2. **Implement**:
   - Update chat interface to show fallback notice
   - Update quiz interface to show Ollama usage

3. **Verify**: Run tests
   Expected: All tests PASS

### Phase 3: P3 Stories (Maintenance)

#### User Story 5: Update or Remove API Key

**Test First** → **Implement** → **Verify**

1. **Contract tests**: Update/delete operations
   - Test PUT/POST with existing key (update)
   - Test DELETE with confirmation
   - Expected: Tests FAIL

2. **Component tests**: Update/delete UI
   - Test update form
   - Test delete confirmation dialog
   - Expected: Tests FAIL

3. **Implement**:
   - Update API route to handle updates
   - Add delete confirmation dialog
   - Add update flow to settings page

4. **Verify**: Run tests
   Expected: All tests PASS

## Verification Checklist

After implementing each user story:

- [ ] All tests pass for that story
- [ ] Feature works independently (can be tested in isolation)
- [ ] No regressions in existing features
- [ ] Committed with atomic commits following `.claude/rules.md`

After completing all stories:

- [ ] All 211+ tests pass (including existing tests)
- [ ] E2E flow works: signup → settings → add key → chat → see provider badge
- [ ] Error handling works: invalid key → clear error message
- [ ] Security verified: API keys never exposed to client
- [ ] Performance meets criteria: validation < 3s (SC-004)

## Testing Commands

```bash
# Run all tests
npm test

# Run specific test suites
npm run test -- tests/contract/settings     # Contract tests
npm run test -- tests/component/settings    # Component tests
npm run test -- tests/integration/claude    # Integration tests
npm run test:e2e -- tests/e2e/settings      # E2E tests

# Run with coverage
npm run test -- --coverage

# Watch mode during development
npm run test -- --watch
```

## Common Issues & Solutions

### Issue: pgcrypto extension not found

**Solution**:
```bash
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
```

On Supabase, this should already be available. Verify in Supabase dashboard under Database → Extensions.

### Issue: Encryption key not configured

**Error**: "API_KEY_ENCRYPTION_SECRET environment variable not set"

**Solution**:
```bash
# Add to .env.local
echo "API_KEY_ENCRYPTION_SECRET=$(openssl rand -base64 32)" >> .env.local

# Restart Next.js dev server
npm run dev
```

### Issue: Anthropic API key validation fails during development

**Solution**: Use mock validation in development mode or use a valid test API key:
```typescript
// In development, skip real validation
if (process.env.NODE_ENV === 'development' && !process.env.ANTHROPIC_TEST_KEY) {
  return { valid: true, message: 'Skipped validation in development' }
}
```

### Issue: Tests fail due to missing environment variables

**Solution**: Create `.env.test` with test-specific variables:
```bash
DATABASE_URL="postgresql://test:test@localhost:5432/memoryloop_test"
API_KEY_ENCRYPTION_SECRET="test-encryption-key-32-bytes-long"
AUTH_SECRET="test-auth-secret"
```

## Development Workflow

### Recommended Flow

1. **Read spec** (`specs/004-claude-api/spec.md`) to understand requirements
2. **Read data model** (`specs/004-claude-api/data-model.md`) for schema details
3. **Read API contract** (`specs/004-claude-api/contracts/api-key.yaml`) for endpoint specs
4. **Start with User Story 1** (highest priority)
5. **Write failing tests first** (TDD Red phase)
6. **Implement minimal code** to make tests pass (TDD Green phase)
7. **Refactor** if needed (TDD Refactor phase)
8. **Commit atomically** following `.claude/rules.md`
9. **Move to next user story**

### Git Commit Strategy

Follow atomic commit principles:

```bash
# Example commit sequence for User Story 1:

git add lib/db/drizzle-schema.ts drizzle/migrations/*.sql
git commit -m "Add api_keys table schema with pgcrypto encryption"

git add lib/encryption/api-key.ts tests/unit/lib/encryption/api-key.test.ts
git commit -m "Add API key encryption service using pgcrypto"

git add lib/db/operations/api-keys.ts tests/unit/lib/db/operations/api-keys.test.ts
git commit -m "Add API key CRUD operations with encryption"

git add app/api/settings/api-key/route.ts tests/contract/settings/api-key.test.ts
git commit -m "Add API key management endpoints (GET/POST/DELETE)"

git add components/settings/ApiKeyForm.tsx tests/component/settings/ApiKeyForm.test.tsx
git commit -m "Add API key form component with validation"

git add app/(protected)/settings/page.tsx
git commit -m "Add settings page with API key management UI"
```

## Next Steps

After completing implementation:

1. Run `/speckit.implement` to execute tasks automatically, OR
2. Run `/speckit.tasks` to generate detailed task breakdown, then implement manually
3. Verify all success criteria (SC-001 through SC-007) from spec
4. Update documentation with any discoveries
5. Create pull request for review

## Additional Resources

- **Spec**: `specs/004-claude-api/spec.md`
- **Plan**: `specs/004-claude-api/plan.md`
- **Data Model**: `specs/004-claude-api/data-model.md`
- **API Contract**: `specs/004-claude-api/contracts/api-key.yaml`
- **Research**: `specs/004-claude-api/research.md` (technical decisions)
- **Constitution**: `.specify/memory/constitution.md` (development principles)
- **Commit Rules**: `.claude/rules.md` (git commit guidelines)
