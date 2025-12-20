# Tasks: Claude API Integration with User API Keys

**Input**: Design documents from `/specs/004-claude-api/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api-key.yaml

**Tests**: Following TDD principle (Principle II), each user story includes test tasks that MUST be written FIRST and FAIL before implementation begins.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Next.js App Router structure:

- `app/(protected)/` - Protected routes
- `app/api/` - API route handlers
- `components/` - React components
- `lib/` - Business logic and services
- `tests/` - Test suites (contract, integration, component, e2e)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and environment configuration

- [x] T001 Enable pgcrypto extension in PostgreSQL database
- [x] T002 [P] Generate and configure API_KEY_ENCRYPTION_SECRET environment variable in .env.local
- [x] T003 [P] Verify @anthropic-ai/sdk package is installed (already in package.json v0.71.2)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create database migration to add api_keys table with pgcrypto encryption in drizzle/migrations/
- [x] T005 Update Drizzle schema to add apiKeys table in lib/db/drizzle-schema.ts
- [x] T006 Update Drizzle schema to add aiProvider and apiKeyId fields to messages table in lib/db/drizzle-schema.ts
- [x] T007 Run database migration to apply schema changes
- [x] T008 [P] Create encryption service module in lib/encryption/api-key.ts
- [x] T009 [P] Create API key validation utilities in lib/validation/api-key.ts
- [x] T010 [P] Create types for API keys in lib/types/api-key.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Enter and Save API Key (Priority: P1) 🎯 MVP CORE

**Goal**: Enable users to securely enter, save, and view their Claude API key through a dedicated settings page

**Independent Test**: Navigate to /settings, enter a valid Claude API key (sk-ant-...), save it, and verify it displays masked (sk-ant-...xyz123). Refresh page and confirm key is still visible as masked. Delete key and confirm it's removed.

### Tests for User Story 1 (TDD - Write these FIRST, ensure they FAIL)

- [x] T011 [P] [US1] Contract test for GET /api/settings/api-key in tests/contract/settings/api-key.test.ts
- [x] T012 [P] [US1] Contract test for POST /api/settings/api-key in tests/contract/settings/api-key.test.ts
- [x] T013 [P] [US1] Contract test for DELETE /api/settings/api-key in tests/contract/settings/api-key.test.ts
- [x] T014 [P] [US1] Component test for ApiKeyForm in tests/component/settings/ApiKeyForm.test.tsx
- [x] T015 [P] [US1] Component test for ApiKeyDisplay in tests/component/settings/ApiKeyDisplay.test.tsx

### Implementation for User Story 1

- [x] T016 [P] [US1] Create database operations for API keys (CRUD) in lib/db/operations/api-keys.ts
- [x] T017 [US1] Implement GET /api/settings/api-key route handler in app/api/settings/api-key/route.ts
- [x] T018 [US1] Implement POST /api/settings/api-key route handler in app/api/settings/api-key/route.ts
- [x] T019 [US1] Implement DELETE /api/settings/api-key route handler in app/api/settings/api-key/route.ts
- [x] T020 [P] [US1] Create ApiKeyForm component in components/settings/ApiKeyForm.tsx
- [x] T021 [P] [US1] Create ApiKeyDisplay component in components/settings/ApiKeyDisplay.tsx
- [x] T022 [US1] Create settings page at app/(protected)/settings/page.tsx
- [x] T023 [US1] Add navigation link to settings page in components/nav/Navigation.tsx

**Checkpoint**: At this point, User Story 1 should be fully functional - users can enter, save, view, and delete their API keys

---

## Phase 4: User Story 2 - Use Claude API with Personal Key (Priority: P1) 🎯 MVP CORE

**Goal**: Route chat and flashcard generation requests through Claude API when user has a saved API key

**Independent Test**: With an API key saved from User Story 1, start a new chat conversation, send a message, and receive a response from Claude API. Check message in database has aiProvider='claude'. Generate flashcards and verify they also use Claude API. Check logs confirm user's API key was used (not system key).

### Tests for User Story 2 (TDD - Write these FIRST, ensure they FAIL)

- [x] T024 [P] [US2] Integration test for Claude client with user API keys in tests/integration/claude/user-keys.test.ts
- [x] T025 [P] [US2] Integration test for flashcard generation with user API keys in tests/integration/claude/flashcard-user-keys.test.ts
- [x] T026 [P] [US2] Component test for ProviderBadge in tests/component/settings/ProviderBadge.test.tsx

### Implementation for User Story 2

- [x] T027 [US2] Update Claude client to support per-request API key initialization in lib/claude/client.ts
- [x] T028 [US2] Add createAnthropicClient function in lib/claude/client.ts
- [x] T029 [US2] Add streamClaudeAPI function for Anthropic SDK streaming in lib/claude/client.ts
- [x] T030 [US2] Add getChatCompletion function with user API key support in lib/claude/client.ts
- [x] T031 [US2] Update chat API route to fetch and use user API key in app/api/chat/conversations/[id]/messages/route.ts
- [x] T032 [US2] Update flashcard generator to accept user API key parameter in lib/claude/flashcard-generator.ts
- [x] T033 [US2] Update flashcard generation API to use user API key in app/api/flashcards/generate/route.ts
- [x] T034 [US2] Update message creation to include aiProvider and apiKeyId in lib/db/operations/messages.ts
- [x] T035 [P] [US2] Create ProviderBadge component in components/settings/ProviderBadge.tsx
- [x] T036 [US2] Update Message component to display ProviderBadge in components/chat/Message.tsx

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - users can configure their API key and it's used for all AI requests with provider attribution

---

## Phase 5: User Story 3 - API Key Validation and Feedback (Priority: P2)

**Goal**: Provide real-time validation feedback when users enter API keys

**Independent Test**: Enter various API key formats in settings (valid: sk-ant-api03-..., invalid: wrongformat, malformed: sk-ant-123). Click "Validate" button and observe instant feedback. Valid keys show green checkmark, invalid keys show specific error messages (format error, authentication failed, etc.).

### Tests for User Story 3 (TDD - Write these FIRST, ensure they FAIL)

- [x] T037 [P] [US3] Contract test for POST /api/settings/api-key/validate in tests/contract/settings/api-key-validate.test.ts
- [x] T038 [P] [US3] Unit test for validation logic in tests/unit/lib/claude/validation.test.ts

### Implementation for User Story 3

- [x] T039 [US3] Create validation module with validateClaudeApiKey function in lib/claude/validation.ts
- [x] T040 [US3] Implement POST /api/settings/api-key/validate route handler in app/api/settings/api-key/validate/route.ts
- [x] T041 [US3] Update ApiKeyForm component to add validation button and feedback UI in components/settings/ApiKeyForm.tsx
- [x] T042 [US3] Add validation state management to ApiKeyForm (loading, success, error states) in components/settings/ApiKeyForm.tsx
- [x] T042a [US3] Performance test for SC-004: Verify API key validation feedback within 3 seconds in tests/integration/settings/api-key-validation-performance.test.ts

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently - validation enhances the key entry experience

---

## Phase 6: User Story 4 - Fallback to Ollama (Priority: P2)

**Goal**: Ensure users without API keys can still use the application with Ollama fallback

**Independent Test**: Without saving an API key, send a chat message and generate flashcards. Both should work using Ollama. Check that messages show "Ollama" provider badge. Navigate to settings and see a call-to-action prompting user to add their Claude API key.

### Tests for User Story 4 (TDD - Write these FIRST, ensure they FAIL)

- [x] T043 [P] [US4] Integration test for Ollama fallback behavior in tests/integration/claude/ollama-fallback.test.ts
- [x] T044 [P] [US4] Component test for fallback notice display in tests/component/chat/FallbackNotice.test.tsx

### Implementation for User Story 4

- [x] T045 [US4] Verify streamChatCompletion falls back to Ollama when userApiKey is null in lib/claude/client.ts
- [x] T046 [US4] Verify getChatCompletion falls back to Ollama when userApiKey is null in lib/claude/client.ts
- [x] T047 [P] [US4] Create FallbackNotice component in components/chat/FallbackNotice.tsx
- [x] T048 [US4] Update chat interface to show FallbackNotice when using Ollama in app/(protected)/chat/page.tsx
- [x] T049 [US4] Update settings page to show API key CTA for users without keys in app/(protected)/settings/page.tsx

**Checkpoint**: At this point, all P1 and P2 stories should work - users can use the app with or without their own API keys

---

## Phase 7: User Story 5 - Update or Remove API Key (Priority: P3)

**Goal**: Allow users to update their existing API key or remove it entirely

**Independent Test**: With an existing API key saved, update it to a new valid key and verify subsequent chat messages use the new key. Remove the key via delete button, confirm deletion dialog appears, confirm deletion, and verify subsequent requests fall back to Ollama.

### Tests for User Story 5 (TDD - Write these FIRST, ensure they FAIL)

- [x] T050 [P] [US5] E2E test for API key update flow in tests/e2e/settings/api-key-update.spec.ts
- [x] T051 [P] [US5] E2E test for API key deletion flow in tests/e2e/settings/api-key-delete.spec.ts

### Implementation for User Story 5

- [x] T052 [US5] Verify POST /api/settings/api-key handles updates (upsert behavior) in app/api/settings/api-key/route.ts
- [x] T053 [US5] Add confirmation dialog for API key deletion in components/settings/ApiKeyForm.tsx
- [x] T054 [US5] Update ApiKeyForm to handle update vs create UI states in components/settings/ApiKeyForm.tsx
- [x] T055 [US5] Add user feedback for successful update/delete operations in components/settings/ApiKeyForm.tsx

**Checkpoint**: All user stories should now be independently functional - complete feature delivered

---

## Phase 8: Edge Cases & Error Handling

**Purpose**: Handle failure scenarios and edge cases

- [x] T056 [P] [FR-010] [FR-015] Implement error handling for API key authentication failures (display modal, trigger re-validation per FR-015) in lib/claude/client.ts
- [x] T057 [P] [FR-010] Implement error handling for quota exceeded errors in lib/claude/client.ts
- [x] T058 [P] [FR-010] Implement error handling for rate limit errors in lib/claude/client.ts
- [x] T059 [FR-015] Add API key invalidation logic (mark isValid=false) in lib/db/operations/api-keys.ts (already existed!)
- [x] T060 [P] [FR-010] [FR-015] Handle API key revocation mid-conversation in app/api/chat/conversations/[id]/messages/route.ts
- [x] T061 [P] [FR-010] Add error boundaries for settings page in app/(protected)/settings/error.tsx

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T062 [P] Add structured logging for API key operations in lib/db/operations/api-keys.ts
- [x] T063 [P] Add structured logging for provider routing in lib/claude/client.ts
- [x] T064 [P] Add structured logging for validation attempts in lib/claude/validation.ts
- [x] T065 [P] Update CLAUDE.md with feature implementation notes
- [x] T066 [P] Add dark mode styling for settings components in components/settings/\*.tsx (already existed!)
- [x] T067 [P] Add loading skeletons for settings page in components/settings/ (loading states already implemented!)
- [x] T068 [P] Add accessibility labels (aria-\*) to settings forms in components/settings/ApiKeyForm.tsx
- [x] T068a [P] [FR-012] [SC-005] Security audit: Verify API keys are NOT exposed in client-side code, logs, or error messages (PASSED - no exposures found)
- [x] T069 Run full test suite and verify all tests pass (npm test && npm run test:e2e) - 420/420 unit/integration tests passing!
- [x] T070 Validate against quickstart.md verification checklist in specs/004-claude-api/quickstart.md
- [x] T071 Update navigation to highlight active settings page in components/nav/Navigation.tsx (already existed!)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - MVP Core Component 1
- **User Story 2 (Phase 4)**: Depends on Foundational AND User Story 1 - MVP Core Component 2
- **User Story 3-5 (Phases 5-7)**: Depend on Foundational, can start after US1 completes
- **Edge Cases (Phase 8)**: Depends on US1-5 implementation
- **Polish (Phase 9)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependencies on other stories - Can start after Foundational
- **User Story 2 (P1)**: **Depends on User Story 1** - Needs API key storage to function
- **User Story 3 (P2)**: Can start after Foundational - Enhances User Story 1
- **User Story 4 (P2)**: Can start after Foundational - Verifies fallback behavior
- **User Story 5 (P3)**: **Depends on User Story 1** - Extends API key management

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD - Principle II)
- Database operations before API routes
- API routes before UI components
- Core implementation before edge case handling
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1 (Setup)**: All 3 tasks marked [P] can run in parallel
- **Phase 2 (Foundational)**: Tasks T008, T009, T010 marked [P] can run in parallel
- **User Story 1 Tests**: Tasks T011-T015 (all marked [P]) can run in parallel
- **User Story 1 Implementation**: Tasks T016 (db ops) and T020-T021 (components) can run in parallel
- **User Story 2 Tests**: Tasks T024-T026 (all marked [P]) can run in parallel
- **User Story 2 Implementation**: Tasks T035 (ProviderBadge) can run in parallel with T027-T030
- **User Story 3-5**: Once US1 completes, US3, US4, US5 can be worked on in parallel by different developers
- **Phase 9 (Polish)**: Most polish tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Phase: Write all tests for User Story 1 together (TDD Red phase):
Task: "Contract test for GET /api/settings/api-key in tests/contract/settings/api-key.test.ts"
Task: "Contract test for POST /api/settings/api-key in tests/contract/settings/api-key.test.ts"
Task: "Contract test for DELETE /api/settings/api-key in tests/contract/settings/api-key.test.ts"
Task: "Component test for ApiKeyForm in tests/component/settings/ApiKeyForm.test.tsx"
Task: "Component test for ApiKeyDisplay in tests/component/settings/ApiKeyDisplay.test.tsx"

# Phase: Implement components in parallel (TDD Green phase):
Task: "Create database operations for API keys (CRUD) in lib/db/operations/api-keys.ts"
AND (in parallel, different files):
Task: "Create ApiKeyForm component in components/settings/ApiKeyForm.tsx"
Task: "Create ApiKeyDisplay component in components/settings/ApiKeyDisplay.tsx"
```

---

## Parallel Example: User Story 2

```bash
# Phase: Write all tests for User Story 2 together (TDD Red phase):
Task: "Integration test for Claude client with user API keys in tests/integration/claude/user-keys.test.ts"
Task: "Integration test for flashcard generation with user API keys in tests/integration/claude/flashcard-user-keys.test.ts"
Task: "Component test for ProviderBadge in tests/component/settings/ProviderBadge.test.tsx"

# Phase: Implement Claude client updates and ProviderBadge in parallel (TDD Green phase):
Task: "Update Claude client to support per-request API key initialization in lib/claude/client.ts"
AND (in parallel, different file):
Task: "Create ProviderBadge component in components/settings/ProviderBadge.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup (3 tasks)
2. Complete Phase 2: Foundational (7 tasks) - **CRITICAL BLOCKING PHASE**
3. Complete Phase 3: User Story 1 (13 tasks)
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Navigate to /settings
   - Enter API key
   - Verify masked display
   - Delete key
5. Complete Phase 4: User Story 2 (13 tasks)
6. **STOP and VALIDATE**: Test User Stories 1 + 2 together
   - Save API key in settings
   - Send chat message
   - Verify Claude API response
   - Check provider badge
7. Deploy/demo MVP

### Incremental Delivery

1. **Foundation** (Phases 1-2): Environment + Database ready
2. **MVP** (Phases 3-4): US1 + US2 → Users can configure and use their API keys
3. **Enhanced UX** (Phase 5): US3 → Validation feedback
4. **Resilience** (Phase 6): US4 → Ollama fallback verified
5. **Management** (Phase 7): US5 → Update/delete operations
6. **Production Ready** (Phases 8-9): Edge cases + Polish

Each increment adds value without breaking previous functionality.

### Parallel Team Strategy

With multiple developers after Foundational phase completes:

**Scenario 1: 2 Developers**

- Developer A: User Story 1 (Phase 3)
- Developer B: User Story 2 (Phase 4) - **BLOCKS on US1 completion**

**Scenario 2: 3+ Developers**

- Developer A: User Story 1 (Phase 3)
- Developer B: User Story 2 (Phase 4) - **BLOCKS on US1 completion**
- Developer C: User Story 3 (Phase 5) - Can start immediately after Foundational
- Developer D: User Story 4 (Phase 6) - Can start immediately after Foundational

**Recommended**: Sequential implementation (US1 → US2 → US3 → US4 → US5) for single developer to maintain context and ensure proper integration.

---

## Task Summary

**Total Tasks**: 71

- Phase 1 (Setup): 3 tasks
- Phase 2 (Foundational): 7 tasks ⚠️ **BLOCKS all user stories**
- Phase 3 (US1 - P1): 13 tasks 🎯 **MVP Core**
- Phase 4 (US2 - P1): 13 tasks 🎯 **MVP Core**
- Phase 5 (US3 - P2): 6 tasks
- Phase 6 (US4 - P2): 5 tasks
- Phase 7 (US5 - P3): 4 tasks
- Phase 8 (Edge Cases): 6 tasks
- Phase 9 (Polish): 10 tasks

**Parallel Opportunities**: 37 tasks marked [P] can run in parallel (52% parallelizable)

**MVP Scope** (Recommended first delivery):

- Phases 1-4 only (36 tasks)
- Delivers User Stories 1 + 2 (complete core value)
- Estimated completion: Foundation + Core stories

**Independent Test Criteria Met**:

- ✅ User Story 1: Settings page CRUD operations testable standalone
- ✅ User Story 2: Chat with Claude API testable standalone (requires US1)
- ✅ User Story 3: Validation feedback testable standalone
- ✅ User Story 4: Ollama fallback testable standalone
- ✅ User Story 5: Update/delete operations testable standalone

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **TDD Required**: Verify all tests FAIL before implementing (Principle II)
- Commit after each task or logical group, adhering to rules in .claude/rules.md (Principle VI - Atomic commits)
- Stop at any checkpoint to validate story independently
- User Story 2 depends on User Story 1 (needs API key storage)
- **Foundation phase (Phase 2) BLOCKS everything** - complete this first
- All file paths use Next.js App Router conventions
- Tests use Vitest for unit/integration, Playwright for E2E
