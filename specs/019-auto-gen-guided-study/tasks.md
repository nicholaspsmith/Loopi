# Tasks: Auto-Generation & Guided Study Flow

**Input**: Design documents from `/specs/019-auto-gen-guided-study/`
**Prerequisites**: plan.md (required), spec.md (required), data-model.md, contracts/

**Tests**: Included per Constitution requirement (TDD approach).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new setup required - feature extends existing infrastructure

This feature uses existing:

- Background job system (from 018-background-flashcard-generation)
- FSRS state management
- PostgreSQL database with existing schema

**Checkpoint**: ✅ No setup tasks needed - proceed to User Story 1

---

## Phase 2: User Story 1 - Automatic Card Generation (Priority: P1) 🎯 MVP

**Goal**: When skill tree is generated, automatically queue flashcard generation for each node (5 cards per node for free tier)

**Independent Test**: Create a new learning goal, verify skill tree generates, confirm cards are automatically created for each node without user intervention

**Functional Requirements**: FR-001, FR-002

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T001 [P] [US1] Unit test for node-based flashcard job payload handling in `tests/unit/jobs/flashcard-job.test.ts`
- [x] T002 [P] [US1] Unit test for skill-tree-job queuing flashcard jobs in `tests/unit/jobs/skill-tree-job.test.ts`
- [x] T003 [P] [US1] Unit test for incrementNodeCardCount in `tests/unit/db/skill-nodes.test.ts`
- [ ] T004 [US1] Integration test for auto-generation flow in `tests/integration/auto-generation.test.ts`

### Implementation for User Story 1

- [x] T005 [P] [US1] Add incrementNodeCardCount function to `lib/db/operations/skill-nodes.ts` per contract
- [x] T006 [US1] Modify flashcard-job.ts to accept nodeId payload and generate cards for node in `lib/jobs/handlers/flashcard-job.ts`
- [x] T007 [US1] Modify skill-tree-job.ts to queue flashcard generation jobs after tree creation in `lib/jobs/handlers/skill-tree-job.ts`
- [x] T008 [US1] Add logging for flashcard job queuing (info level) in `lib/jobs/handlers/skill-tree-job.ts`
- [x] T009 [US1] Add logging for card count generated per node in `lib/jobs/handlers/flashcard-job.ts`
- [ ] T010 [US1] Verify integration test passes in `tests/integration/auto-generation.test.ts`

**Checkpoint**: At this point, creating a goal should automatically generate cards for all skill tree nodes. User Story 1 is independently testable.

---

## Phase 3: User Story 2 - Guided Study Backend (Priority: P1)

**Goal**: Implement backend APIs for guided sequential study flow with depth-first traversal

**Independent Test**: Call `/api/study/next-node` to get first incomplete node, verify depth-first ordering

**Functional Requirements**: FR-004, FR-005

### Tests for User Story 2 Backend

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T011 [P] [US2] Unit test for node completion check (FSRS state >= 2) in `tests/unit/study/node-completion.test.ts`
- [x] T012 [P] [US2] Unit test for depth-first traversal logic in `tests/unit/study/guided-flow.test.ts`
- [ ] T013 [P] [US2] Contract test for GET /api/study/next-node endpoint in `tests/integration/study/next-node.test.ts`
- [ ] T014 [P] [US2] Contract test for GET /api/goals/[goalId]/skill-tree/progress in `tests/integration/study/progress.test.ts`

### Implementation for User Story 2 Backend

- [x] T015 [US2] Create node-completion.ts with isNodeComplete function in `lib/study/node-completion.ts`
- [x] T016 [US2] Create guided-flow.ts with getNextIncompleteNode and depth-first ordering in `lib/study/guided-flow.ts`
- [x] T017 [US2] Create /api/study/next-node endpoint in `app/api/study/next-node/route.ts`
- [x] T018 [P] [US2] Create /api/goals/[goalId]/skill-tree/progress endpoint in `app/api/goals/[goalId]/skill-tree/progress/route.ts`
- [x] T019 [US2] Modify /api/study/session to support guided mode in `app/api/study/session/route.ts`
- [x] T020 [US2] Add logging for next-node requests (debug level) in `app/api/study/next-node/route.ts`
- [x] T021 [US2] Add logging for node completion events (info level) in `lib/study/node-completion.ts`

**Checkpoint**: Backend APIs should return correct next node in depth-first order and track completion status.

---

## Phase 4: User Story 2 - Guided Study Frontend (Priority: P1)

**Goal**: Implement UI components for guided study flow including Study Now button and progression UI

**Independent Test**: Click Study Now button, complete cards, verify Continue/Return options appear and work correctly

**Functional Requirements**: FR-003, FR-006

### Tests for User Story 2 Frontend

- [x] T022 [P] [US2] Component test for StudyNowButton rendering in `tests/unit/components/goals/StudyNowButton.test.tsx`
- [x] T023 [P] [US2] Component test for GuidedStudyFlow state transitions in `tests/unit/components/study/GuidedStudyFlow.test.tsx`

### Implementation for User Story 2 Frontend

- [x] T024 [P] [US2] Create StudyNowButton.tsx (green button with play icon) in `components/goals/StudyNowButton.tsx`
- [x] T025 [P] [US2] Create GuidedStudyFlow.tsx with Continue/Return options in `components/study/GuidedStudyFlow.tsx`
- [x] T026 [US2] Integrate StudyNowButton into goal page in `app/(protected)/goals/[goalId]/page.tsx`
- [x] T027 [US2] Integrate GuidedStudyFlow into study page in `app/(protected)/goals/[goalId]/study/page.tsx`
- [x] T028 [US2] Handle tree complete state with congratulations message in `components/study/GuidedStudyFlow.tsx`

**Checkpoint**: User Story 2 is complete - users can click Study Now and progress through nodes sequentially.

---

## Phase 5: E2E Testing

**Purpose**: Validate complete user journeys per quickstart.md

- [x] T029 [US1] E2E test: auto-generation creates cards for all nodes in `tests/e2e/auto-generation.spec.ts`
- [x] T030 [US2] E2E test: guided study flow with node progression in `tests/e2e/guided-study.spec.ts`
- [x] T031 [US2] E2E test: tree completion shows congratulations in `tests/e2e/guided-study.spec.ts`
- [x] T032 E2E test: resume study from next incomplete node in `tests/e2e/guided-study.spec.ts`

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements and validation

- [x] T033 [P] Verify all logging points are implemented per plan.md
- [x] T034 [P] Run quickstart.md validation steps manually
- [x] T035 Code review for error handling in edge cases (node deleted, tree fails)
- [x] T036 Update goal page to remove any conflicting study buttons

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: None needed - existing infrastructure
- **Phase 2 (US1)**: Can start immediately - foundation for guided study
- **Phase 3 (US2 Backend)**: Depends on Phase 2 (cards must exist to test guided flow)
- **Phase 4 (US2 Frontend)**: Depends on Phase 3 (APIs must exist for frontend)
- **Phase 5 (E2E)**: Depends on Phases 2, 3, 4
- **Phase 6 (Polish)**: Depends on all previous phases

### User Story Dependencies

```
User Story 1 (Auto-Generation)
        ↓
        ↓ Cards must exist for guided study
        ↓
User Story 2 (Guided Study)
        ↓
        ↓ Backend before Frontend
        ↓
    ┌───┴───┐
    ↓       ↓
Backend  Frontend
    ↓       ↓
    └───┬───┘
        ↓
   E2E Testing
```

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- lib/ modules before API routes
- API routes before frontend components
- Integration before E2E tests

### Parallel Opportunities

**Phase 2 (US1)**:

- T001, T002, T003 (tests) can run in parallel
- T005 (db operation) can run in parallel with tests

**Phase 3 (US2 Backend)**:

- T011, T012, T013, T014 (tests) can run in parallel
- T017, T018 (endpoints) can run in parallel after T016

**Phase 4 (US2 Frontend)**:

- T022, T023 (tests) can run in parallel
- T024, T025 (components) can run in parallel

---

## Parallel Example: User Story 1 Tests

```bash
# Launch all US1 tests together:
Task: "Unit test for node-based flashcard job payload handling in tests/unit/jobs/flashcard-job.test.ts"
Task: "Unit test for skill-tree-job queuing flashcard jobs in tests/unit/jobs/skill-tree-job.test.ts"
Task: "Unit test for incrementNodeCardCount in tests/unit/db/skill-nodes.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: User Story 1 (Auto-Generation)
2. **STOP and VALIDATE**: Verify cards auto-generate on goal creation
3. Deploy/demo if ready - users can see cards generated automatically

### Full Feature Delivery

1. Complete Phase 2: User Story 1 (Auto-Generation) → Validate
2. Complete Phase 3: User Story 2 Backend → Validate APIs
3. Complete Phase 4: User Story 2 Frontend → Validate full flow
4. Complete Phase 5: E2E Testing → Confidence for release
5. Complete Phase 6: Polish → Ready for production

---

## Notes

- [P] tasks = different files, no dependencies
- [US1]/[US2] label maps task to specific user story
- User Story 1 is independently completable and testable
- User Story 2 depends on User Story 1 (needs cards to exist)
- Verify tests fail before implementing
- Commit after each task adhering to .claude/rules.md
- Stop at any checkpoint to validate independently
