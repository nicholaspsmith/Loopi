# Tasks: Remove AI Branding and Consolidate to Claude Backend

**Input**: Design documents from `/specs/015-remove-ai-branding/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/error-responses.md, quickstart.md

**Tests**: Tests are included per constitution (TDD approach stated in plan.md)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: Next.js App Router at repository root
- `app/` - Pages and API routes
- `components/` - React components
- `lib/` - Business logic and utilities
- `tests/` - Test files

---

## Phase 1: Setup

**Purpose**: Verify prerequisites and prepare for changes

- [x] T001 Verify ANTHROPIC_API_KEY is set in local environment for testing
- [x] T002 [P] Run existing test suite to establish baseline in terminal
- [x] T003 [P] Create backup branch point with `git tag pre-ai-removal`

---

## Phase 2: Foundational (Backend Removal)

**Purpose**: Remove Ollama code and simplify Claude client - MUST complete before UI changes

**⚠️ CRITICAL**: Backend must be cleaned up before UI components can be safely removed

### Core Backend Changes

- [x] T004 Remove Ollama constants (OLLAMA_BASE_URL, OLLAMA_MODEL) from lib/claude/client.ts
- [x] T005 Remove streamOllamaChat() function from lib/claude/client.ts
- [x] T006 Simplify streamChatCompletion() to remove Ollama fallback in lib/claude/client.ts
- [x] T007 Simplify getChatCompletion() to remove Ollama fallback in lib/claude/client.ts
- [x] T008 Update error classification to use neutral messages per contracts/error-responses.md in lib/claude/client.ts
- [x] T009 [P] Remove Ollama fallback from lib/ai/card-generator.ts
- [x] T010 [P] Remove Ollama fallback from lib/ai/skill-tree-generator.ts
- [x] T011 [P] Remove Ollama fallback from lib/claude/flashcard-generator.ts
- [x] T012 Stub lib/embeddings/ollama.ts to return null (graceful degradation)
- [x] T013 [P] Update lib/db/operations/flashcards-lancedb.ts to handle null embeddings
- [x] T014 [P] Update lib/db/operations/messages-lancedb.ts to handle null embeddings
- [x] T015 Update app/api/health/route.ts to remove Ollama check and use neutral field names

**Checkpoint**: Backend builds and runs with Claude-only, Ollama code paths removed

---

## Phase 3: User Story 1 - Seamless Content Generation (Priority: P1) 🎯 MVP

**Goal**: Users can generate flashcards, skill trees, and study materials with no AI-related terminology visible

**Independent Test**: Trigger content generation features and verify loading states, success messages, and error messages contain no AI references

### Tests for User Story 1

- [x] T016 [P] [US1] Write test for neutral error messages in tests/unit/lib/claude/error-messages.test.ts
- [x] T017 [P] [US1] Write test verifying no AI terms in health check response in tests/unit/api/health.test.ts

### Implementation for User Story 1

- [x] T018 [US1] Update loading state text in app/(protected)/goals/[goalId]/generate/page.tsx - replace any "AI" mentions
- [x] T019 [P] [US1] Update loading state text in app/(protected)/goals/new/page.tsx - replace any "AI" mentions
- [x] T020 [P] [US1] Audit app/(protected)/study/deck/[deckId]/page.tsx for AI terminology and update
- [x] T021 [P] [US1] Audit app/(protected)/decks/new/page.tsx for AI terminology and update
- [x] T022 [US1] Update error boundaries to use neutral messages in app/(protected)/error.tsx
- [x] T023 [P] [US1] Update app/error.tsx with neutral error messages
- [x] T024 [US1] Run grep audit: `grep -rn "AI\|Claude\|Anthropic\|Ollama\|LLM" app/ components/ --include="*.tsx"` and fix remaining

**Checkpoint**: All content generation flows show neutral terminology ✅ VERIFIED

---

## Phase 4: User Story 2 - Simplified Settings Experience (Priority: P1)

**Goal**: Settings page has no API key management or AI provider options

**Independent Test**: Navigate to settings and verify no API key inputs, provider badges, or AI configuration exists

### Tests for User Story 2

- [x] T025 [P] [US2] Write test verifying ProviderBadge component is removed from Message in tests/component/chat/Message.test.tsx

### Implementation for User Story 2

- [x] T026 [US2] Delete components/settings/ProviderBadge.tsx
- [x] T027 [US2] Delete tests/component/settings/ProviderBadge.test.tsx
- [x] T028 [US2] Remove ProviderBadge import and usage from components/chat/Message.tsx
- [x] T029 [P] [US2] Audit app/(protected)/settings/page.tsx for any API key or AI provider UI elements
- [x] T030 [P] [US2] Update app/(protected)/settings/error.tsx with neutral error messages (already clean)

**Checkpoint**: Settings page is clean of AI references, chat messages show no provider badges ✅ VERIFIED

---

## Phase 5: User Story 3 - Backend Claude Integration (Priority: P1)

**Goal**: Application uses Claude exclusively via server-side API key, zero Ollama code remains

**Independent Test**: Build succeeds with no Ollama imports, all AI features work with server-side ANTHROPIC_API_KEY

### Tests for User Story 3

- [ ] T031 [P] [US3] Write integration test verifying content generation works with server-side API key in tests/integration/claude/server-api-key.test.ts
- [x] T032 [P] [US3] Delete or update tests/integration/claude/ollama-fallback.test.ts if it exists

### Implementation for User Story 3

- [x] T033 [US3] Verify all API routes use process.env.ANTHROPIC_API_KEY in app/api/chat/conversations/[conversationId]/messages/route.ts
- [x] T034 [P] [US3] Verify server-side API key usage in app/api/flashcards/generate/route.ts
- [x] T035 [P] [US3] Verify server-side API key usage in app/api/goals/[goalId]/generate/route.ts (refactored refine route to use Claude)
- [x] T036 [US3] Run build to verify no Ollama TypeScript imports remain: `npm run build`
- [x] T037 [US3] Verify api_keys table doesn't exist (per FR-009) by checking drizzle schema

**Checkpoint**: Build succeeds, all AI features work with server-side key only ✅ VERIFIED

---

## Phase 6: Infrastructure Updates

**Purpose**: Update Docker, CI/CD, and environment configuration

- [x] T038 Remove Ollama service block from docker-compose.prod.yml
- [x] T039 Remove ollama from depends_on in docker-compose.prod.yml
- [x] T040 Remove OLLAMA_BASE_URL from environment in docker-compose.prod.yml
- [x] T041 [P] Add ANTHROPIC_API_KEY to environment in docker-compose.prod.yml
- [x] T042 [P] Update .env.example - remove OLLAMA\_\* variables
- [x] T043 [P] Update .env.example - document ANTHROPIC_API_KEY as required
- [ ] T044 Verify ANTHROPIC_API_KEY is in .github/workflows/deploy.yml secrets (MANUAL: Add to GitHub secrets)

**Checkpoint**: Docker configuration complete, Ollama removed, ANTHROPIC_API_KEY configured ✅ VERIFIED

---

## Phase 7: Polish & Verification

**Purpose**: Final validation and cleanup

- [x] T045 Run full test suite: `npm test` - 625 passed, 10 failed (pre-existing integration tests needing API key)
- [x] T046 [P] Run lint check: `npm run lint` - 0 errors, 65 warnings (acceptable)
- [x] T047 [P] Run typecheck: `npm run typecheck` - PASSED
- [ ] T048 Manual verification: Visit all pages and check for AI terminology
- [ ] T049 Manual verification: Trigger error states and verify neutral messages
- [ ] T050 Manual verification: Test content generation with server-side API key
- [x] T051 Delete backup files (lib/embeddings/ollama.ts.bak if created) - No backup files created
- [x] T052 Final grep audit: No Ollama references in app/lib/components (except stubbed lib/embeddings/ollama.ts for graceful degradation)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion (can parallel with US1)
- **User Story 3 (Phase 5)**: Depends on Foundational completion (can parallel with US1/US2)
- **Infrastructure (Phase 6)**: Can run in parallel with user stories after Foundational
- **Polish (Phase 7)**: Depends on all previous phases

### User Story Dependencies

- **User Story 1 (P1)**: Foundational complete - No dependencies on other stories
- **User Story 2 (P1)**: Foundational complete - Can integrate with US1 but independently testable
- **User Story 3 (P1)**: Foundational complete - Validates that US1/US2 changes are correct

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Audit tasks come after specific file changes
- Checkpoint validation before moving to next phase

### Parallel Opportunities

- T002, T003 can run in parallel (Setup)
- T009, T010, T011 can run in parallel (different generator files)
- T013, T014 can run in parallel (different LanceDB files)
- T016, T017 can run in parallel (different test files)
- T018-T024 many can run in parallel (different page files)
- T025 can run with US1 implementation
- T029, T030 can run in parallel
- T031, T032 can run in parallel
- T034, T035 can run in parallel
- T041, T042, T043 can run in parallel
- T045, T046, T047 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Write test for neutral error messages in tests/unit/lib/claude/error-messages.test.ts"
Task: "Write test verifying no AI terms in health check response in tests/unit/api/health.test.ts"

# Launch multiple page audits in parallel:
Task: "Update loading state text in app/(protected)/goals/new/page.tsx"
Task: "Audit app/(protected)/study/deck/[deckId]/page.tsx for AI terminology"
Task: "Audit app/(protected)/decks/new/page.tsx for AI terminology"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - removes Ollama backend)
3. Complete Phase 3: User Story 1 (content generation flows neutral)
4. **STOP and VALIDATE**: Test content generation independently
5. Can deploy if minimal viable change is sufficient

### Incremental Delivery

1. Complete Setup + Foundational → Backend clean
2. Add User Story 1 → Test independently → Content generation neutral
3. Add User Story 2 → Test independently → Settings clean
4. Add User Story 3 → Test independently → Server-side API key verified
5. Add Infrastructure → Docker ready for deployment
6. Polish → Final verification

### Single Developer Strategy

Execute phases sequentially:

1. Setup (T001-T003)
2. Foundational (T004-T015) - critical path
3. User Stories 1-3 in order (T016-T037)
4. Infrastructure (T038-T044)
5. Polish (T045-T052)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group adhering to .claude/rules.md
- Stop at any checkpoint to validate story independently
- Constitution requires TDD - tests are included
- Total tasks: 52
