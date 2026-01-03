# Tasks: Duplicate Detection for Goals and Flashcards

**Input**: Design documents from `/specs/023-dedupe/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/dedupe-api.md, research.md

**Tests**: Included per constitution (TDD required)

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths included in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create dedup module structure and shared types

- [x] T001 Create dedup module directory structure at lib/dedup/
- [x] T002 [P] Create dedup types in lib/dedup/types.ts (DuplicateCheckResult, SimilarItem, BatchFilterResult)
- [x] T003 [P] Create dedup config in lib/dedup/config.ts (SIMILARITY_THRESHOLD, MIN_CONTENT_LENGTH, etc.)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Extend LanceDB schema to add goals table in lib/db/schema.ts
- [x] T005 Add findSimilarFlashcardsWithThreshold function in lib/db/operations/flashcards-lancedb.ts
- [x] T006 [P] Create goals-lancedb.ts with syncGoalToLanceDB and findSimilarGoals in lib/db/operations/goals-lancedb.ts
- [x] T007 Create backfill script for existing goals in scripts/backfill-goal-embeddings.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Flashcard Duplicate Detection (Priority: P1) 🎯 MVP

**Goal**: Warn users when creating flashcards similar to existing ones

**Independent Test**: Create a flashcard, then attempt to create a similar one - should see warning modal

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T008 [P] [US1] Unit test for checkFlashcardDuplicate in tests/unit/lib/dedup/flashcard-duplicate.test.ts
- [x] T009 [P] [US1] Contract test for POST /api/flashcards/check-duplicate in tests/contract/flashcard-duplicate.test.ts
- [x] T010 [P] [US1] Integration test for flashcard dedup flow in tests/integration/lib/dedup/flashcard-duplicate.test.ts

### Implementation for User Story 1

- [x] T011 [US1] Implement checkFlashcardDuplicate function in lib/dedup/similarity-check.ts
- [x] T012 [US1] Create POST /api/flashcards/check-duplicate endpoint in app/api/flashcards/check-duplicate/route.ts
- [x] T013 [P] [US1] Create SimilarItemCard component in components/dedup/SimilarItemCard.tsx
- [x] T014 [US1] Create DuplicateWarningModal component in components/dedup/DuplicateWarningModal.tsx
- [x] T015 [US1] Integrate dedup check into custom flashcard creation form (update existing form component)
- [x] T016 [US1] Add structured logging for flashcard similarity checks in lib/dedup/similarity-check.ts

**Checkpoint**: User Story 1 complete - flashcard dedup works independently

---

## Phase 4: User Story 2 - Goal Duplicate Detection (Priority: P2)

**Goal**: Warn users when creating goals similar to existing ones

**Independent Test**: Create a goal, then attempt to create a similar one - should see warning modal

### Tests for User Story 2

- [x] T017 [P] [US2] Unit test for checkGoalDuplicate in tests/unit/lib/dedup/goal-duplicate.test.ts
- [x] T018 [P] [US2] Contract test for POST /api/goals/check-duplicate in tests/contract/goal-duplicate.test.ts
- [x] T019 [P] [US2] Integration test for goal dedup flow in tests/integration/lib/dedup/goal-duplicate.test.ts

### Implementation for User Story 2

- [x] T020 [US2] Implement checkGoalDuplicate function in lib/dedup/similarity-check.ts (done in T011)
- [x] T021 [US2] Create POST /api/goals/check-duplicate endpoint in app/api/goals/check-duplicate/route.ts
- [x] T022 [US2] Integrate dedup check into goal creation form (update existing goal form component)
- [x] T023 [US2] Hook goal creation to sync embeddings to LanceDB in lib/db/operations/goals.ts
- [x] T024 [US2] Add structured logging for goal similarity checks in lib/dedup/similarity-check.ts (done in T016)

**Checkpoint**: User Story 2 complete - goal dedup works independently

---

## Phase 5: User Story 3 - Bulk AI Generation Deduplication (Priority: P3)

**Goal**: Automatically filter duplicates from AI-generated flashcard batches

**Independent Test**: Trigger AI card generation for topic with existing cards - duplicates should be filtered

### Tests for User Story 3

- [x] T025 [P] [US3] Unit test for filterDuplicatesFromBatch in tests/unit/lib/dedup/batch-filter.test.ts
- [x] T026 [P] [US3] Integration test for AI batch dedup in tests/integration/lib/dedup/batch-filter.test.ts

### Implementation for User Story 3

- [x] T027 [US3] Create batch filter module in lib/dedup/batch-filter.ts
- [x] T028 [US3] Integrate batch filter into card generator in lib/ai/card-generator.ts
- [x] T029 [US3] Update generation UI to show filter summary (X created, Y filtered)
- [x] T030 [US3] Add structured logging for batch dedup operations in lib/dedup/batch-filter.ts

**Checkpoint**: User Story 3 complete - AI batch dedup works independently

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final quality improvements

- [x] T031 [P] E2E test for flashcard dedup warning flow in tests/e2e/dedupe-flashcard.spec.ts
- [x] T032 [P] E2E test for goal dedup warning flow in tests/e2e/dedupe-goal.spec.ts
- [x] T033 Run quickstart.md validation scenarios manually
- [x] T034 Performance test: verify <500ms latency for duplicate checks
- [x] T035 Update CLAUDE.md with dedup feature documentation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can proceed in parallel OR sequentially in priority order
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational - Reuses DuplicateWarningModal from US1
- **User Story 3 (P3)**: Can start after Foundational - Uses similarity-check.ts from US1

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Core service before API endpoint
- API endpoint before UI integration
- Logging last within story

### Parallel Opportunities

**Phase 1 (Setup)**:

```
T002 (types) + T003 (config) can run in parallel
```

**Phase 2 (Foundational)**:

```
T005 (flashcard-lancedb) + T006 (goals-lancedb) can run in parallel after T004
```

**User Story 1**:

```
T008 + T009 + T010 (all tests) can run in parallel
T013 (SimilarItemCard) can run in parallel with T011/T012
```

**User Story 2**:

```
T017 + T018 + T019 (all tests) can run in parallel
```

**User Story 3**:

```
T025 + T026 (all tests) can run in parallel
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test flashcard dedup independently
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Flashcard dedup working → Demo (MVP!)
3. Add User Story 2 → Goal dedup working → Demo
4. Add User Story 3 → AI batch dedup working → Demo
5. Polish phase → Production ready

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (flashcards)
   - Developer B: User Story 2 (goals)
   - Developer C: User Story 3 (batch) - can start tests while A/B work
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group adhering to .claude/rules.md
- Stop at any checkpoint to validate story independently
- Constitution requires TDD - tests first in each story
