---
description: 'Task breakdown for flashcard deck organization feature'
---

# Tasks: Flashcard Deck Organization

**Input**: Design documents from `/specs/012-flashcard-decks/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Contract tests included per constitution TDD requirement (Phase 9)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Next.js 16 App Router**: `app/`, `components/`, `lib/` at repository root
- **Tests**: `tests/contract/`, `tests/integration/`, `tests/e2e/`
- **Database**: `drizzle/` for migrations, `lib/db/` for operations

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependency installation

- [x] T001 Verify Next.js 16 App Router project structure matches plan.md (app/, components/, lib/ directories)
- [x] T002 Install production dependencies: `npm install drizzle-orm @lancedb/lancedb @anthropic-ai/sdk ts-fsrs uuid zod`
- [x] T003 [P] Install dev dependencies: `npm install -D drizzle-kit @types/uuid`
- [x] T004 [P] Configure environment variables in .env.local (DATABASE_URL, LANCEDB_PATH, ANTHROPIC_API_KEY)
- [x] T005 Verify TypeScript strict mode enabled in tsconfig.json per constitution
- [x] T006 Run existing migrations to ensure database up-to-date: `npm run db:migrate`
- [x] T007 Verify LanceDB connection and existing flashcard embeddings available

**Checkpoint**: Development environment ready, all dependencies installed, database accessible

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema and core operations that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T008 [P] Create Drizzle schema for `decks` table in lib/db/drizzle-schema.ts (see data-model.md lines 23-37 for complete schema)
- [x] T009 [P] Create Drizzle schema for `deck_cards` table in lib/db/drizzle-schema.ts (see data-model.md lines 64-73 for complete schema)
- [x] T010 Generate migration 0006_add_decks.sql using drizzle-kit (see data-model.md lines 267-300 for exact SQL)
- [x] T011 Run migration to create decks and deck_cards tables with constraints and indexes
- [x] T012 [P] Create lib/db/operations/decks.ts with CRUD functions (createDeck, getDeck, listDecks, updateDeck, deleteDeck)
- [x] T013 [P] Create lib/db/operations/deck-cards.ts with relationship functions (addCardsToDeck, removeCardsFromDeck, getDeckCards)
- [x] T014 Implement 100-deck limit validation in lib/db/operations/decks.ts createDeck function (see data-model.md lines 182-186)
- [x] T015 Implement 1000-card limit validation in lib/db/operations/deck-cards.ts addCardsToDeck function (see data-model.md lines 187-192)
- [x] T016 Create lib/validation/deck-limits.ts with validation helpers for limit enforcement

**Checkpoint**: Foundation ready - database schema exists, operations available, user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Manual Deck Creation and Study (Priority: P1) 🎯 MVP

**Goal**: Users can manually create decks by selecting existing flashcards and then quiz themselves using only cards from that specific deck

**Independent Test**: Create user account, create flashcards, organize into named deck, initiate quiz session filtered to only that deck's cards

### Implementation for User Story 1

**Deck CRUD API** (contracts/deck-crud.yaml):

- [x] T017 [P] [US1] Implement POST /api/decks route in app/api/decks/route.ts (create deck with 100-deck limit, returns 403 if exceeded per contract lines 66-136)
- [x] T018 [P] [US1] Implement GET /api/decks route in app/api/decks/route.ts (list decks with metadata, supports ?archived and ?sortBy query params per contract lines 16-64)
- [x] T019 [P] [US1] Implement GET /api/decks/[deckId]/route.ts (get deck with card list, returns DeckWithCards schema per contract lines 138-167)
- [x] T020 [P] [US1] Implement DELETE /api/decks/[deckId]/route.ts (delete deck, cascade to deck_cards, returns 204 per contract lines 222-242)
- [x] T021 [P] [US1] Implement POST /api/decks/[deckId]/cards/route.ts (add cards with 1000-card limit, idempotent, returns 403 if exceeded per contract lines 244-315)
- [x] T022 [P] [US1] Implement DELETE /api/decks/[deckId]/cards/route.ts (remove cards, idempotent, returns removed count per contract lines 317-366)

**Deck Management UI**:

- [x] T023 [US1] Create app/decks/page.tsx - Deck list page with usage stats (X/100 decks, Y/1000 cards per deck)
- [x] T024 [P] [US1] Create components/decks/DeckCard.tsx - Deck preview card component with metadata (name, card count, last studied)
- [x] T025 [P] [US1] Create components/decks/DeckList.tsx - Deck list container component using DeckCard
- [x] T026 [US1] Create app/decks/new/page.tsx - Create deck form with name validation (1-200 characters per data-model.md line 32)
- [x] T027 [US1] Add empty state handling in app/decks/new/page.tsx - Show "Create flashcards first" message if user has 0 flashcards (addresses spec.md line 105)
- [x] T028 [US1] Create app/decks/[deckId]/page.tsx - Deck detail page with full card list
- [x] T029 [P] [US1] Create components/decks/DeckEditor.tsx - Add/remove cards interface component
- [x] T030 [US1] Implement limit violation error UI in components/decks/DeckEditor.tsx - Show actionable error messages for 100-deck and 1000-card limits (per FR-034, FR-035)

**Deck-Filtered Study Sessions** (contracts/deck-study-session.yaml):

- [x] T031 [US1] Create lib/fsrs/deck-scheduler.ts - Filter FSRS queue by deck membership using query-level filtering (WHERE flashcard_id IN (SELECT flashcard_id FROM deck_cards WHERE deck_id = ?) per research.md)
- [x] T032 [US1] Implement deck-specific FSRS override logic in lib/fsrs/deck-scheduler.ts with precedence: session > deck > global (per research.md and FR-029)
- [x] T033 [US1] Implement POST /api/study/deck-session route in app/api/study/deck-session/route.ts (returns DeckSessionResponse with appliedSettings per contract lines 17-133)
- [x] T034 [US1] Update app/study/[sessionId]/page.tsx to support deck session context (display deck name, show deck-specific limits)
- [x] T035 [P] [US1] Create components/study/DeckSessionControls.tsx - Deck session UI showing deck name and applied settings
- [x] T036 [US1] Ensure global FSRS state updates correctly during deck sessions (FR-011: rating a card in deck session updates global flashcard state)

**Checkpoint**: At this point, User Story 1 should be fully functional - users can create decks, add cards, and study from specific decks with FSRS scheduling

---

## Phase 4: User Story 4 - Deck-Filtered Study Sessions (Priority: P1)

**Goal**: Users can select a specific deck and start a quiz session that only includes cards from that deck, with FSRS scheduling applied within the deck context

**Independent Test**: Create multiple decks with different cards, start study session for one deck, verify FSRS scheduling only presents due cards from that deck

**Note**: Core implementation completed in Phase 3 (T031-T036). This phase adds remaining edge cases and polish.

### Implementation for User Story 4

- [x] T037 [US4] Handle empty deck study session in app/api/study/deck-session/route.ts - Return 400 error if deck has 0 cards (per quickstart.md lines 438-455)
- [x] T038 [US4] Handle no due cards scenario in app/api/study/deck-session/route.ts - Return 200 with empty dueCards array and nextDueCard info (per quickstart.md lines 457-487)
- [x] T039 [US4] Add deck session completion UI in app/study/[sessionId]/page.tsx - Show completion statistics specific to the deck studied
- [x] T040 [US4] Verify FSRS presents cards in correct order (new, learning, review, relearning) during deck sessions per acceptance scenario 4

**Checkpoint**: Deck-filtered study sessions handle all edge cases (empty deck, no due cards, completion stats)

---

## Phase 5: User Story 2 - Deck Management and Editing (Priority: P2)

**Goal**: Users can edit existing decks by adding or removing cards, renaming decks, and deleting decks they no longer need

**Independent Test**: Create a deck, perform edit operations (rename, add cards, remove cards, delete deck), verify changes persist correctly

### Implementation for User Story 2

**Deck Editing API**:

- [x] T041 [US2] Implement PATCH /api/decks/[deckId]/route.ts (update name, settings, archived - partial updates supported per contract lines 169-220)
- [x] T042 [P] [US2] Add deck rename validation in PATCH endpoint (name 1-200 characters, non-empty per data-model.md line 32)
- [x] T043 [P] [US2] Add deck archiving (soft delete) support in PATCH endpoint (archived boolean field per data-model.md line 35)

**Deck Editing UI**:

- [x] T044 [US2] Implement deck rename functionality in components/decks/DeckEditor.tsx (inline edit with validation)
- [x] T045 [P] [US2] Add bulk card selection UI in components/decks/DeckEditor.tsx - Checkbox selection for multi-card add/remove
- [x] T046 [P] [US2] Create components/decks/DeckSettings.tsx - FSRS override form (new_cards_per_day_override, cards_per_session_override)
- [ ] T047 [US2] Implement deck archiving UI in app/decks/[deckId]/page.tsx - Archive/unarchive button with confirmation
- [x] T048 [US2] Add deck usage stats display in app/decks/[deckId]/page.tsx (card count, last studied, created date)
- [x] T049 [US2] Implement delete deck functionality in app/decks/[deckId]/page.tsx with confirmation dialog (preserves flashcards per FR-005)

**Live Session Updates** (FR-030, FR-031):

- [x] T050 [US2] Implement deck change detection for active sessions in lib/fsrs/deck-scheduler.ts (polling-based, 5-second intervals per research.md)
- [x] T051 [US2] Create session update mechanism in app/api/study/deck-session/changes/route.ts - Detect added/removed cards during active session
- [x] T052 [US2] Handle added cards in components/study/DeckStudyInterface.tsx - Inject into session queue if FSRS-due
- [x] T053 [US2] Handle removed cards in components/study/DeckStudyInterface.tsx - Skip if not yet reviewed, allow completion if in-progress
- [x] T054 [US2] Add session synchronization UI feedback in components/study/DeckStudyInterface.tsx - Show when deck changes detected

**Checkpoint**: Users can fully edit decks (rename, add/remove cards, archive, delete) and active sessions update live when deck changes

---

## Phase 6: User Story 3 - AI-Powered Deck Creation (Priority: P3)

**Goal**: Users can request the system to automatically create a deck based on a topic or idea using LLM analysis and vector similarity search

**Independent Test**: Create user account with 20+ flashcards across different topics, request AI-generated deck for specific topic, verify system returns semantically relevant cards

### Implementation for User Story 3

**AI Deck Generation Service** (research.md hybrid pipeline):

- [ ] T055 [P] [US3] Create lib/ai/deck-generation.ts - Hybrid vector + LLM service skeleton with two-stage pipeline structure
- [ ] T056 [US3] Implement Stage 1: Vector Search in lib/ai/deck-generation.ts - Generate Nomic embed-text embedding for topic, query LanceDB for top 30-50 candidates (vectorSearchLimit parameter, default 40 per contract)
- [ ] T057 [US3] Implement Stage 2: LLM Re-ranking in lib/ai/deck-generation.ts - Pass candidates to Claude API for semantic filtering (returns 5-15 most relevant per minCards/maxCards params)
- [ ] T058 [US3] Add performance tracking in lib/ai/deck-generation.ts - Track vectorSearchTimeMs and llmFilteringTimeMs (target <10s total per SC-006)
- [ ] T059 [US3] Implement error handling for insufficient cards in lib/ai/deck-generation.ts - Return 200 with warnings array if <minCards found (per contract lines 106-120)
- [ ] T060 [US3] Implement error handling for LanceDB unavailable in lib/ai/deck-generation.ts - Return 503 with fallback: "manual" (per contract lines 148-152)
- [ ] T061 [US3] Implement error handling for Claude API unavailable in lib/ai/deck-generation.ts - Return 503 with fallback: "vector-only" + partial results (per contract lines 153-158)

**AI Deck Generation API**:

- [ ] T062 [US3] Implement POST /api/decks-ai route in app/api/decks-ai/route.ts (per contracts/deck-ai-generation.yaml lines 17-161)
- [ ] T063 [P] [US3] Add request validation in POST /api/decks-ai - Topic 3-500 chars, minCards <= maxCards, vectorSearchLimit 10-100 (per contract lines 46-72)
- [ ] T064 [P] [US3] Add response schema validation in POST /api/decks-ai - FlashcardSuggestion[] with relevanceScore, relevanceReason, vectorSimilarity (per contract lines 172-210)

**AI Generation UI**:

- [ ] T065 [US3] Create components/decks/AIGenerationDialog.tsx - Topic input form with validation (3-500 characters)
- [ ] T066 [US3] Add AI suggestions review UI in components/decks/AIGenerationDialog.tsx - Display suggestions with relevanceScore and relevanceReason (per quickstart.md Scenario 2)
- [ ] T067 [US3] Implement card accept/reject flow in components/decks/AIGenerationDialog.tsx - Checkbox selection before deck creation
- [ ] T068 [US3] Add loading state with progress indicator in components/decks/AIGenerationDialog.tsx - Show "Searching cards..." and "Analyzing relevance..." stages
- [ ] T069 [US3] Handle AI generation errors in components/decks/AIGenerationDialog.tsx - Display fallback options (create manual deck) when LanceDB/Claude unavailable
- [ ] T070 [US3] Integrate AI generation button in app/decks/page.tsx - "Create AI Deck" button opens AIGenerationDialog

**Checkpoint**: Users can create AI-generated decks from topic descriptions, review and accept/reject suggestions, with graceful error handling

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Testing, validation, and improvements that affect multiple user stories

### Contract Tests (TDD - Constitution Requirement)

- [ ] T071 [P] Create tests/contract/deck-crud.test.ts - Test all 7 endpoints (POST /api/decks, GET /api/decks, GET /api/decks/{id}, PATCH /api/decks/{id}, DELETE /api/decks/{id}, POST /api/decks/{id}/cards, DELETE /api/decks/{id}/cards) match contracts/deck-crud.yaml schema exactly
- [ ] T072 [P] Create tests/contract/deck-ai-generation.test.ts - Test POST /api/decks-ai with valid/invalid inputs, verify FlashcardSuggestion schema, test error responses (400, 503) per contracts/deck-ai-generation.yaml
- [ ] T073 [P] Create tests/contract/deck-study-session.test.ts - Test POST /api/study/deck-session, verify DeckSessionResponse schema, test with/without overrides per contracts/deck-study-session.yaml

### Integration Tests

- [ ] T074 [P] Create tests/integration/deck-management.test.ts - End-to-end deck creation with limit enforcement (100 decks, 1000 cards per deck)
- [ ] T075 [P] Create tests/integration/deck-filtered-fsrs.test.ts - Verify FSRS scheduling correctness within deck sessions (global state updates, deck overrides apply)
- [ ] T076 [P] Create tests/integration/live-session-updates.test.ts - Test concurrent deck editing during active sessions (added cards appear, removed cards skipped)
- [ ] T077 [P] Create tests/integration/ai-deck-generation.test.ts - Test AI generation pipeline (vector search → LLM re-ranking) with mocked services

### E2E Tests (Playwright)

- [ ] T078 [P] Create tests/e2e/manual-deck-creation.spec.ts - User Story 1 end-to-end (create deck, add cards, start study session, verify only deck cards shown)
- [ ] T079 [P] Create tests/e2e/deck-editing.spec.ts - User Story 2 end-to-end (rename, add/remove cards, archive, delete deck)
- [ ] T080 [P] Create tests/e2e/ai-deck-generation.spec.ts - User Story 3 end-to-end (request AI deck, review suggestions, accept/reject, verify deck created)
- [ ] T081 [P] Create tests/e2e/deck-study-sessions.spec.ts - User Story 4 end-to-end (study from deck, verify FSRS scheduling, test deck-specific settings)

### Performance & Validation

- [ ] T082 Validate deck UI loads 50+ decks in <2s (SC-007) - Test with seeded data
- [ ] T083 Validate AI deck generation completes in <10s for 100+ candidates (SC-006) - Performance test with LanceDB
- [ ] T084 Validate live deck updates appear in session queue within 5s (SC-011) - Test polling mechanism
- [ ] T085 [P] Run quickstart.md validation - Execute all 4 scenarios (manual deck, AI generation, deck-filtered study, live updates) and verify expected behavior
- [ ] T086 [P] Add observability logging - Structured logging for deck operations (create, update, delete), AI pipeline stages, FSRS filtering, session updates per constitution principle V

### Code Quality

- [ ] T087 [P] Run ESLint and fix any violations: `npm run lint`
- [ ] T088 [P] Run TypeScript type checking: `npm run typecheck`
- [ ] T089 [P] Run Prettier formatting: `npm run format`
- [ ] T090 Verify all API endpoints return proper error codes (400, 403, 404, 503) per contracts
- [ ] T091 Review code for security vulnerabilities (SQL injection, XSS, authentication bypass)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 4 (P1): Shares implementation with User Story 1 (deck-filtered FSRS)
  - User Story 2 (P2): Can start after Foundational - Extends User Story 1 (editing existing decks)
  - User Story 3 (P3): Can start after Foundational - Independent AI generation feature
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - Manual Deck Creation**: FOUNDATIONAL - Required by US2 and US4
- **User Story 4 (P1) - Deck-Filtered Study**: Shares core implementation with US1 (T031-T036)
- **User Story 2 (P2) - Deck Editing**: Extends US1 - Can start after Foundational (independent)
- **User Story 3 (P3) - AI Deck Generation**: Independent - Can start after Foundational

### Within Each User Story

- API endpoints (T017-T022) can run in parallel within US1
- UI components marked [P] can run in parallel
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1 (Setup)**: T003, T004 can run in parallel
- **Phase 2 (Foundational)**: T008+T009 parallel, T012+T013 parallel
- **Phase 3 (US1 API)**: T017, T018, T019, T020, T021, T022 can all run in parallel (different route files)
- **Phase 3 (US1 UI)**: T024, T025 parallel after T023; T027, T029, T030 parallel after T026
- **Phase 5 (US2)**: T042, T043 parallel; T045, T046 parallel
- **Phase 6 (US3)**: T055-T061 sequential (pipeline stages depend on each other)
- **Phase 7 (Tests)**: All contract tests (T071-T073) parallel, all integration tests (T074-T077) parallel, all E2E tests (T078-T081) parallel

---

## Parallel Example: User Story 1 (Manual Deck Creation)

```bash
# Launch all API endpoints for User Story 1 together:
Task: "Implement POST /api/decks route in app/api/decks/route.ts"
Task: "Implement GET /api/decks route in app/api/decks/route.ts"
Task: "Implement GET /api/decks/[deckId]/route.ts"
Task: "Implement DELETE /api/decks/[deckId]/route.ts"
Task: "Implement POST /api/decks/[deckId]/cards/route.ts"
Task: "Implement DELETE /api/decks/[deckId]/cards/route.ts"

# Launch UI components in parallel after routes complete:
Task: "Create components/decks/DeckCard.tsx"
Task: "Create components/decks/DeckList.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 4 Only)

1. Complete Phase 1: Setup (T001-T007)
2. Complete Phase 2: Foundational (T008-T016) - **CRITICAL** - blocks all stories
3. Complete Phase 3: User Story 1 (T017-T036) - Manual deck creation + deck-filtered study
4. Complete Phase 4: User Story 4 edge cases (T037-T040)
5. **STOP and VALIDATE**: Test User Stories 1+4 independently
6. Deploy/demo if ready - **MVP COMPLETE** 🎯

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 + 4 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (Deck Editing) → Test independently → Deploy/Demo
4. Add User Story 3 (AI Generation) → Test independently → Deploy/Demo
5. Complete Phase 7 (Testing & Polish) → Production ready
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T016)
2. Once Foundational is done:
   - Developer A: User Story 1 API (T017-T022) + FSRS (T031-T036)
   - Developer B: User Story 1 UI (T023-T030)
   - Developer C: User Story 2 (T041-T054) - starts after US1 API complete
3. Stories complete and integrate independently
4. Developer C or D: User Story 3 (T055-T070) - can start anytime after Foundational
5. All developers: Phase 7 testing (T071-T091) - after stories complete

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Contract tests validate API schemas match OpenAPI specs exactly (TDD per constitution)
- Commit after each task or logical group adhering to .claude/rules.md
- Stop at any checkpoint to validate story independently
- **FSRS global state**: Cards maintain global FSRS state even when studied in decks (FR-011)
- **Hard limits**: 100 decks/user, 1000 cards/deck - enforced at application layer (FR-032, FR-033)
- **Live updates**: Polling-based (5s intervals) for deck changes during active sessions (research.md)
- **AI pipeline**: Vector search (LanceDB) → LLM re-ranking (Claude) for topic-based deck generation
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
