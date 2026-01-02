# Tasks: Custom Cards & Goal Management

**Input**: Design documents from `/specs/021-custom-cards-archive/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: TDD approach - contract tests precede implementation per constitution principles.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: Next.js App Router at repository root
- API routes: `app/api/`
- Components: `components/`
- Database operations: `lib/db/operations/`
- Constants: `lib/constants/`
- Tests: `tests/contract/`, `tests/integration/`, `tests/e2e/`

---

## Phase 1: Setup (Shared Infrastructure) ✅

**Purpose**: Constants and shared utilities needed by all user stories

- [x] T001 Create GOAL_LIMITS constants in lib/constants/goals.ts
- [x] T002 [P] Add GoalCounts interface to lib/db/operations/goals.ts

---

## Phase 2: Foundational (Blocking Prerequisites) ✅

**Purpose**: Database operations that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Implement getGoalCounts() in lib/db/operations/goals.ts
- [x] T004 [P] Implement getGoalsByIds() in lib/db/operations/goals.ts
- [x] T005 [P] Implement getNodeWithGoal() in lib/db/operations/skill-nodes.ts

**Checkpoint**: Foundation ready - user story implementation can now begin ✅

---

## Phase 3: User Story 3 - Goal Limits Enforcement (Priority: P1) ✅

**Goal**: Enforce hard limits on active (6), archived (6), and total (12) goals per user

**Independent Test**: Attempt to create goals beyond limits and verify appropriate error messages

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T006 [P] [US3] Contract test for goal creation limit check in tests/contract/goal-limits.test.ts
- [x] T007 [P] [US3] Integration test for limit enforcement in tests/integration/goal-limits.test.ts

### Implementation for User Story 3

- [x] T008 [US3] Add limit check to goal creation API in app/api/goals/route.ts
- [x] T009 [P] [US3] Create GoalLimitIndicator component in components/goals/GoalLimitIndicator.tsx
- [x] T010 [US3] Add GoalLimitIndicator to goals page in app/(protected)/goals/page.tsx
- [x] T011 [US3] E2E test for goal limit display and enforcement in tests/e2e/goal-limits.spec.ts

**Checkpoint**: Goal limits are enforced across the system; indicator shows "4/6 active goals" ✅

---

## Phase 4: User Story 1 - Custom Card Creation (Priority: P2) ✅

**Goal**: Allow users to create custom flashcards within skill tree nodes

**Independent Test**: Navigate to tree node, create custom card, verify it appears in node's card list

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T012 [P] [US1] Contract test for POST /api/flashcards/custom in tests/contract/custom-card.test.ts

### Implementation for User Story 1

- [x] T013 [US1] Create POST /api/flashcards/custom endpoint in app/api/flashcards/custom/route.ts
- [x] T014 [P] [US1] Create CustomCardForm component in components/goals/CustomCardForm.tsx
- [x] T015 [P] [US1] Create CustomCardModal wrapper in components/goals/CustomCardModal.tsx
- [x] T016 [US1] Add "Add Custom Card" button to SkillTreeEditor toolbar in components/skills/SkillTreeEditor.tsx
- [x] T017 [US1] E2E test for custom card creation flow in tests/e2e/custom-card.spec.ts

**Checkpoint**: Users can create custom flashcards within any node; cards appear in study sessions ✅

---

## Phase 5: User Story 2 - Multi-Select Goal Management (Priority: P2) ✅

**Goal**: Enable bulk archive and delete operations on goals page with multi-select UI

**Independent Test**: Select goals on goals page, click archive/delete, verify confirmation dialog and action completion

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T018 [P] [US2] Contract test for POST /api/goals/archive in tests/contract/bulk-archive.test.ts
- [x] T019 [P] [US2] Contract test for DELETE /api/goals/delete in tests/contract/bulk-delete.test.ts
- [x] T020 [P] [US2] Contract test for POST /api/goals/restore in tests/contract/restore.test.ts

### Implementation for User Story 2

- [x] T021 [US2] Implement bulkArchiveGoals() in lib/db/operations/goals.ts
- [x] T022 [P] [US2] Implement bulkDeleteGoals() in lib/db/operations/goals.ts
- [x] T023 [P] [US2] Implement restoreGoal() in lib/db/operations/goals.ts
- [x] T024 [US2] Create POST /api/goals/archive endpoint in app/api/goals/archive/route.ts
- [x] T025 [US2] Create DELETE /api/goals/delete endpoint in app/api/goals/delete/route.ts
- [x] T026 [US2] Create POST /api/goals/restore endpoint in app/api/goals/restore/route.ts
- [x] T027 [P] [US2] Modify GoalCard to add checkbox and Restore button in components/goals/GoalCard.tsx
- [x] T028 [P] [US2] Create GoalActionBar floating component in components/goals/GoalActionBar.tsx
- [x] T029 [P] [US2] Create ConfirmDialog modal in components/goals/ConfirmDialog.tsx
- [x] T030 [US2] Update goals page with multi-select state management in app/(protected)/goals/page.tsx
- [x] T031 [US2] E2E test for multi-select archive flow in tests/e2e/goal-management.spec.ts
- [x] T032 [US2] E2E test for multi-select delete flow in tests/e2e/goal-management.spec.ts
- [x] T033 [US2] E2E test for goal restore flow in tests/e2e/goal-management.spec.ts

**Checkpoint**: Users can select multiple goals for bulk archive/delete, and restore archived goals

---

## Phase 6: Polish & Cross-Cutting Concerns ✅

**Purpose**: Final validation and cross-story integration

- [x] T034 Run quickstart.md validation scenarios
- [x] T035 [P] Verify cascade delete behavior for goal deletion
- [x] T036 Verify archive/restore limit interactions (US2 + US3 integration)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 3 (Phase 3)**: Depends on Foundational - P1 priority, do first
- **User Story 1 (Phase 4)**: Depends on Foundational - P2 priority
- **User Story 2 (Phase 5)**: Depends on Foundational - P2 priority, benefits from US3 (limits)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 3 (P1 - Limits)**: Independent after Foundational; MUST complete before US2
- **User Story 1 (P2 - Custom Cards)**: Independent after Foundational; no dependencies on other stories
- **User Story 2 (P2 - Multi-Select)**: Requires US3 limits for archive limit validation

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- DB operations before API endpoints
- API endpoints before UI components
- Components before page integration
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 2 (Foundational)**:

- T004 (getGoalsByIds) and T005 (getNodeWithGoal) can run in parallel

**Phase 3 (US3 - Limits)**:

- T006 and T007 (tests) can run in parallel
- T009 (GoalLimitIndicator) can start while T008 (API) is in progress

**Phase 4 (US1 - Custom Cards)**:

- T014 (CustomCardForm) and T015 (CustomCardModal) can run in parallel after T013

**Phase 5 (US2 - Multi-Select + Restore)**:

- T018, T019, T020 (tests) can run in parallel
- T022 and T023 (DB ops) can run in parallel after T021
- T027, T028, T029 (UI components) can run in parallel after API endpoints

---

## Parallel Example: User Story 2 (Multi-Select + Restore)

```bash
# Launch all tests for User Story 2 together:
Task: "Contract test for POST /api/goals/archive in tests/contract/bulk-archive.test.ts"
Task: "Contract test for DELETE /api/goals/delete in tests/contract/bulk-delete.test.ts"
Task: "Contract test for POST /api/goals/restore in tests/contract/restore.test.ts"

# Launch DB operations together (after bulkArchiveGoals):
Task: "Implement bulkDeleteGoals() in lib/db/operations/goals.ts"
Task: "Implement restoreGoal() in lib/db/operations/goals.ts"

# Launch UI components together (after API endpoints):
Task: "Modify GoalCard to add checkbox and Restore button in components/goals/GoalCard.tsx"
Task: "Create GoalActionBar floating component in components/goals/GoalActionBar.tsx"
Task: "Create ConfirmDialog modal in components/goals/ConfirmDialog.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 3 - Goal Limits Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T005)
3. Complete Phase 3: User Story 3 - Goal Limits (T006-T011)
4. **STOP and VALIDATE**: Test goal limits enforcement independently
5. Deploy/demo if ready - users now have limit protection

### Incremental Delivery

1. Complete Setup + Foundational -> Foundation ready
2. Add User Story 3 (Limits) -> Test independently -> Deploy (MVP!)
3. Add User Story 1 (Custom Cards) -> Test independently -> Deploy
4. Add User Story 2 (Multi-Select) -> Test independently -> Deploy
5. Each story adds value without breaking previous stories

### Recommended Priority Order

1. **P1: Goal Limits (US3)** - Critical for system health, enables archive limits for US2
2. **P2: Custom Cards (US1)** - Independent feature, high user value
3. **P2: Multi-Select (US2)** - Depends on limits, enables bulk operations

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group adhering to .claude/rules.md
- Stop at any checkpoint to validate story independently
- US3 (Limits) is labeled P1 in spec but is User Story 3 - named to match spec ordering
