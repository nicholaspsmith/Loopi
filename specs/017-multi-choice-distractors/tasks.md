# Tasks: Multi-Choice Study Mode with AI-Generated Distractors

**Input**: Design documents from `/specs/017-multi-choice-distractors/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/distractor-api.md, quickstart.md

**Tests**: TDD approach specified in plan.md - tests included for each phase.

**Organization**: Tasks organized by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **lib/**: Service layer (distractor-generator.ts)
- **app/api/**: Next.js API routes
- **components/study/**: React components
- **tests/**: Unit, integration, and E2E tests

---

## Phase 1: Setup

**Purpose**: No setup required - reuses existing dependencies and infrastructure

> This feature requires no new dependencies or database migrations. Existing Claude client, FSRS scheduler, and study components are reused.

**Checkpoint**: Ready to proceed to foundational phase

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core distractor generation infrastructure that MUST be complete before user story implementation

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational Phase

- [x] T001 [P] Unit test for distractor generator in tests/unit/lib/ai/distractor-generator.test.ts
- [x] T002 [P] Unit test for distractor validation in tests/unit/lib/ai/distractor-generator.test.ts

### Implementation for Foundational Phase

- [x] T003 Create distractor generator service in lib/ai/distractor-generator.ts
- [x] T004 Implement generateDistractors function with Claude API call in lib/ai/distractor-generator.ts
- [x] T005 Implement validateDistractors function per data-model.md in lib/ai/distractor-generator.ts
- [x] T006 Implement buildDistractorPrompt function per research.md in lib/ai/distractor-generator.ts
- [x] T007 Create distractor API endpoint in app/api/study/distractors/route.ts
- [x] T008 Add request validation and error handling in app/api/study/distractors/route.ts
- [x] T009 Add logging for distractor generation per plan.md observability section in lib/ai/distractor-generator.ts

**Checkpoint**: Foundation ready - distractor generation API functional, tests passing

---

## Phase 3: User Story 1 - Study Flashcards in Multiple Choice Mode (Priority: P1) 🎯 MVP

**Goal**: Users can study flashcards in multiple choice format with 4 options (1 correct, 3 distractors) and time-based FSRS rating

**Independent Test**: Start a MC study session, answer questions with varying speeds, verify FSRS scheduling reflects correct/incorrect and fast/slow responses

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T010 [P] [US1] Integration test for time-based rating calculation in tests/integration/study/multi-choice-rating.test.ts
- [x] T011 [P] [US1] Test fast correct (≤10s) returns rating 3 in tests/integration/study/multi-choice-rating.test.ts
- [x] T012 [P] [US1] Test slow correct (>10s) returns rating 2 in tests/integration/study/multi-choice-rating.test.ts
- [x] T013 [P] [US1] Test incorrect returns rating 1 in tests/integration/study/multi-choice-rating.test.ts

### Implementation for User Story 1

- [x] T014 [US1] Add response time tracking with useRef in components/study/MultipleChoiceMode.tsx
- [x] T015 [US1] Update handleSelect to calculate responseTimeMs in components/study/MultipleChoiceMode.tsx
- [x] T016 [US1] Update onRate callback to accept responseTimeMs parameter in components/study/MultipleChoiceMode.tsx
- [x] T017 [US1] Add currentDistractors state to StudySessionProvider in components/study/StudySessionProvider.tsx
- [x] T018 [US1] Add distractorsLoading state to StudySessionProvider in components/study/StudySessionProvider.tsx
- [x] T019 [US1] Implement fetchDistractors function in components/study/StudySessionProvider.tsx
- [x] T020 [US1] Call fetchDistractors on card navigation in components/study/StudySessionProvider.tsx
- [x] T021 [US1] Pass distractors to MultipleChoiceMode component in components/study/StudySessionProvider.tsx
- [x] T022 [US1] Add responseTimeMs and studyMode to rate request in app/api/study/rate/route.ts
- [x] T023 [US1] Implement time-based rating calculation (≤10s=3, >10s=2) in app/api/study/rate/route.ts
- [x] T024 [US1] Add logging for time-based rating per plan.md in app/api/study/rate/route.ts

**Checkpoint**: User Story 1 complete - MC study with time-based rating functional

---

## Phase 4: User Story 2 - Distractor Quality and Variety (Priority: P1)

**Goal**: Generated distractors are contextually relevant, plausible, and vary between sessions

**Independent Test**: Generate distractors for various flashcard topics, verify they are related but incorrect; study same card twice and verify distractors differ

### Tests for User Story 2

- [x] T025 [P] [US2] Test distractors are exactly 3 items in tests/unit/lib/ai/distractor-generator.test.ts
- [x] T026 [P] [US2] Test distractors are distinct from correct answer in tests/unit/lib/ai/distractor-generator.test.ts
- [x] T027 [P] [US2] Test no duplicate distractors in tests/unit/lib/ai/distractor-generator.test.ts
- [x] T028 [P] [US2] Test validation rejects invalid distractor count in tests/unit/lib/ai/distractor-generator.test.ts

### Implementation for User Story 2

- [x] T029 [US2] Refine distractor prompt for plausibility per research.md in lib/ai/distractor-generator.ts
- [x] T030 [US2] Add temperature parameter (0.9) for variety in lib/ai/distractor-generator.ts
- [x] T031 [US2] Add retry logic for quality validation failures in lib/ai/distractor-generator.ts

**Checkpoint**: User Story 2 complete - high-quality, varied distractors generated

---

## Phase 5: User Story 3 - Graceful Fallback When Distractors Cannot Be Generated (Priority: P2)

**Goal**: When distractor generation fails, fall back to flip-reveal mode without blocking the user

**Independent Test**: Simulate distractor API failure, verify card displays in flip-reveal format with toast notification

### Tests for User Story 3

- [x] T032 [P] [US3] Test fallback triggers on API error in tests/integration/study/multi-choice-fallback.test.ts
- [x] T033 [P] [US3] Test fallback triggers on invalid response in tests/integration/study/multi-choice-fallback.test.ts
- [x] T034 [P] [US3] Test FlashcardMode renders on fallback in tests/integration/study/multi-choice-fallback.test.ts

### Implementation for User Story 3

- [x] T035 [US3] Add distractorsFailed state to StudySessionProvider in components/study/StudySessionProvider.tsx
- [x] T036 [US3] Handle API errors in fetchDistractors and set distractorsFailed in components/study/StudySessionProvider.tsx
- [x] T037 [US3] Update MixedMode to check distractorsFailed flag in components/study/MixedMode.tsx
- [x] T038 [US3] Route to FlashcardMode when distractorsFailed is true in components/study/MixedMode.tsx
- [x] T039 [US3] Add toast notification "Showing as flashcard (distractors unavailable)" in components/study/MixedMode.tsx
- [x] T040 [US3] Add logging for fallback events per plan.md in components/study/StudySessionProvider.tsx

**Checkpoint**: User Story 3 complete - graceful fallback functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: E2E tests, final validation, and cleanup

- [x] T041 [P] E2E test for complete MC study session in tests/e2e/study/multi-choice-session.spec.ts
- [x] T042 [P] E2E test for fallback scenario in tests/e2e/study/multi-choice-session.spec.ts
- [x] T043 [P] E2E test for FSRS schedule updates in tests/e2e/study/multi-choice-session.spec.ts
- [x] T044 Run quickstart.md validation checklist
- [x] T045 Verify success criteria SC-001 through SC-006 per spec.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No setup required - skip to Foundational
- **Foundational (Phase 2)**: BLOCKS all user stories - must complete first
- **User Story 1 (Phase 3)**: Depends on Foundational - core MC functionality
- **User Story 2 (Phase 4)**: Depends on Foundational - can parallel with US1
- **User Story 3 (Phase 5)**: Depends on US1 (needs provider integration) - fallback handling
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

```
Phase 2: Foundational (BLOCKING)
       │
       ├───────────────────┐
       ▼                   ▼
Phase 3: US1 (P1)    Phase 4: US2 (P1)
  MC Study Flow       Distractor Quality
       │                   │
       └───────────────────┘
                │
                ▼
        Phase 5: US3 (P2)
          Fallback Mode
                │
                ▼
        Phase 6: Polish
```

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD)
- Service layer before API routes
- API routes before component integration
- Core implementation before error handling
- Story complete before moving to next priority

### Parallel Opportunities

**Within Foundational (Phase 2)**:

- T001, T002 can run in parallel (both are tests)

**Within User Story 1 (Phase 3)**:

- T010, T011, T012, T013 can run in parallel (all tests)
- T017, T018 can run in parallel (both state additions)

**Across User Stories**:

- US1 and US2 can proceed in parallel after Foundational (both P1)
- US3 depends on US1 provider integration

**Within Polish (Phase 6)**:

- T041, T042, T043 can run in parallel (all E2E tests)

---

## Parallel Example: Foundational Phase

```bash
# Launch tests in parallel:
Task: "Unit test for distractor generator in tests/unit/lib/ai/distractor-generator.test.ts"
Task: "Unit test for distractor validation in tests/unit/lib/ai/distractor-generator.test.ts"

# Then implementation sequentially:
Task: "Create distractor generator service in lib/ai/distractor-generator.ts"
Task: "Implement generateDistractors function..."
```

## Parallel Example: User Story 1

```bash
# Launch all tests for US1 together:
Task: "Integration test for time-based rating in tests/integration/study/multi-choice-rating.test.ts"
Task: "Test fast correct (≤10s) returns rating 3..."
Task: "Test slow correct (>10s) returns rating 2..."
Task: "Test incorrect returns rating 1..."

# Then implementation:
# MultipleChoiceMode changes (T014-T016) can parallel with StudySessionProvider changes (T017-T021)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational (T001-T009)
2. Complete Phase 3: User Story 1 (T010-T024)
3. **STOP and VALIDATE**: Test MC study flow independently
4. Deploy/demo if ready - basic MC mode functional

### Incremental Delivery

1. Foundational → Generator and API ready
2. Add User Story 1 → MC study with time-based rating (MVP!)
3. Add User Story 2 → Quality distractors (enhancement)
4. Add User Story 3 → Fallback handling (resilience)
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (MC flow)
   - Developer B: User Story 2 (distractor quality)
3. US3 can start once US1 provider integration is done

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD)
- Commit after each task or logical group adhering to .claude/rules.md
- Stop at any checkpoint to validate story independently
- Time threshold: 10 seconds (≤10s = Good, >10s = Hard, incorrect = Again)
