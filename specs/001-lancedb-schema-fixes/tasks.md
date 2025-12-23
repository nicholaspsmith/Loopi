# Tasks: LanceDB Schema Initialization Fixes

**Input**: Design documents from `/specs/001-lancedb-schema-fixes/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Test tasks included per constitution's TDD requirement

**Organization**: Tasks grouped by user story to enable independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: Repository root with `lib/`, `tests/` directories
- Based on Next.js 16 project structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Utility functions needed across all user stories

- [x] T001 [P] Create TimeoutError class in lib/db/utils/timeout.ts
- [x] T002 [P] Create withTimeout utility function in lib/db/utils/timeout.ts
- [x] T003 [P] Export timeout utilities from lib/db/utils/timeout.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core schema module enhancements that MUST be complete before client.ts refactoring

**⚠️ CRITICAL**: User Story 1 depends on these changes to schema.ts

- [x] T004 Add rollback logic to lib/db/schema.ts (track createdTables array)
- [x] T005 Implement dropTable cleanup loop in lib/db/schema.ts catch block
- [x] T006 Add structured logging with [LanceDB] prefix to lib/db/schema.ts
- [x] T007 Update error message formatting in lib/db/schema.ts to include rollback context

**Checkpoint**: schema.ts now has rollback capability - client.ts can safely delegate to it

---

## Phase 3: User Story 1 - Application Startup Reliability (Priority: P1) 🎯 MVP

**Goal**: Eliminate code duplication, implement fail-fast error handling, add atomic rollback, and enforce 30-second timeout

**Independent Test**: Start application with no LanceDB tables - verify either (a) all tables created successfully, or (b) application fails with clear error and no partial tables remain

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T008 [P] [US1] Write test for dynamic import delegation in tests/unit/lib/db/client-auto-init.test.ts (verify initializeSchema called from schema.ts)
- [x] T009 [P] [US1] Write test for rollback on partial failure in tests/unit/lib/db/client-auto-init.test.ts (mock createTable to fail on 3rd call)
- [x] T010 [P] [US1] Write test for timeout behavior in tests/unit/lib/db/client-auto-init.test.ts (mock slow initialization)
- [x] T011 [P] [US1] Write test for error propagation in tests/unit/lib/db/client-auto-init.test.ts (verify errors throw, not swallowed)
- [x] T012 [P] [US1] Write test for no cleanup when no tables created in tests/unit/lib/db/client-auto-init.test.ts (verify dropTable not called)

### Implementation for User Story 1

- [x] T013 [US1] Remove duplicated schema initialization code (lines 38-95) from lib/db/client.ts
- [x] T014 [US1] Add dynamic import of initializeSchema in lib/db/client.ts (await import('./schema'))
- [x] T015 [US1] Wrap schema initialization with withTimeout (30 seconds) in lib/db/client.ts
- [x] T016 [US1] Remove try-catch error swallowing in lib/db/client.ts (let errors propagate)
- [x] T017 [US1] Add connection state reset on timeout in lib/db/client.ts (.catch block)
- [x] T018 [US1] Update structured logging with [LanceDB] prefix in lib/db/client.ts

**Checkpoint**: User Story 1 complete - code duplication eliminated, fail-fast implemented, rollback working, timeout enforced

**Validation**:

- Run tests: `npm test -- tests/unit/lib/db/client-auto-init.test.ts`
- Verify SC-001: No duplicated schema logic in client.ts (grep validation)
- Verify SC-002: Errors propagate (no error swallowing)
- Verify SC-009: Rollback works (test rollback scenario)
- Verify SC-010: Timeout enforced (test timeout scenario)

---

## Phase 4: User Story 2 - Code Maintainability (Priority: P2)

**Goal**: Ensure single source of truth for schema logic, making future changes easier and less error-prone

**Independent Test**: Verify schema initialization logic exists in only one module (lib/db/schema.ts) via grep/code inspection

### Tests for User Story 2

- [x] T019 [P] [US2] Write test to verify no createTable calls in lib/db/client.ts in tests/unit/lib/db/client-auto-init.test.ts
- [x] T020 [P] [US2] Write test to verify dynamic import succeeds in tests/unit/lib/db/client-auto-init.test.ts

### Implementation for User Story 2

- [x] T021 [US2] Verify grep shows 0 occurrences of "createTable" in lib/db/client.ts
- [x] T022 [US2] Verify grep shows 2 occurrences of "createTable" in lib/db/schema.ts (messages, flashcards)
- [x] T023 [US2] Update documentation in lib/db/client.ts to reference schema.ts as single source of truth

**Checkpoint**: User Story 2 complete - single source of truth verified

**Validation**:

- Run: `grep -c "createTable" lib/db/client.ts` (expect: 0)
- Run: `grep -c "createTable" lib/db/schema.ts` (expect: 2)
- Verify SC-001: Code duplication eliminated

---

## Phase 5: User Story 3 - Accurate Test Documentation (Priority: P2)

**Goal**: Fix misleading test descriptions to match actual implementation

**Independent Test**: Review test file and verify all test descriptions accurately describe what each test validates

### Implementation for User Story 3

- [x] T024 [US3] Fix test description at line 143 in tests/unit/lib/db/client-auto-init.test.ts (change to "should delegate to schema.ts via dynamic import")
- [x] T025 [US3] Review and update all test descriptions in tests/unit/lib/db/client-auto-init.test.ts for accuracy
- [x] T026 [US3] Add test assertions to verify delegation actually occurs in tests/unit/lib/db/client-auto-init.test.ts

**Checkpoint**: User Story 3 complete - test documentation accurate

**Validation**:

- Read tests/unit/lib/db/client-auto-init.test.ts and verify descriptions match implementations
- Verify SC-004: All test descriptions accurate (100%)

---

## Phase 6: User Story 4 - Safe Connection Reset (Priority: P3)

**Goal**: Make resetDbConnection() async and safe for concurrent calls

**Independent Test**: Call resetDbConnection() during connection establishment and verify it waits for completion

### Tests for User Story 4

- [x] T027 [P] [US4] Write test for concurrent resetDbConnection calls in tests/unit/lib/db/client-auto-init.test.ts
- [x] T028 [P] [US4] Write test for reset during connection in progress in tests/unit/lib/db/client-auto-init.test.ts

### Implementation for User Story 4

- [x] T029 [US4] Change resetDbConnection signature to async in lib/db/client.ts
- [x] T030 [US4] Add await for connectionPromise before resetting in lib/db/client.ts
- [x] T031 [US4] Update all callers of resetDbConnection to await it in tests/unit/lib/db/client-auto-init.test.ts

**Checkpoint**: User Story 4 complete - safe reset implemented

**Validation**:

- Run tests: `npm test -- tests/unit/lib/db/client-auto-init.test.ts -t "reset"`
- Verify SC-005: Concurrent reset calls handled safely

---

## Phase 7: User Story 5 - Consistent Logging (Priority: P3)

**Goal**: Standardize all LanceDB logging with [LanceDB] prefix and structured JSON format

**Independent Test**: Trigger schema initialization and verify all logs use [LanceDB] prefix and structured format

### Tests for User Story 5

- [ ] T032 [P] [US5] Write test to verify log format in tests/unit/lib/db/client-auto-init.test.ts (spy on console.log/error)

### Implementation for User Story 5

- [ ] T033 [P] [US5] Update success logs with [LanceDB] prefix in lib/db/client.ts
- [ ] T034 [P] [US5] Update error logs with structured JSON format in lib/db/client.ts
- [ ] T035 [P] [US5] Verify logging consistency with lib/db/operations/messages-lancedb.ts pattern

**Checkpoint**: User Story 5 complete - logging standardized

**Validation**:

- Run application and check logs for [LanceDB] prefix
- Verify SC-006: 100% logging consistency

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation

- [x] T036 Run full test suite: `npm test -- tests/unit/lib/db/`
- [x] T037 Run quickstart.md validation scenarios (9 test scenarios)
- [x] T038 Verify all success criteria (SC-001 through SC-010)
- [x] T039 Update CLAUDE.md with completion of 001-lancedb-schema-fixes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS User Story 1
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Can start after US1 T013-T014 complete (no duplication exists)
- **User Story 3 (Phase 5)**: Can start after US1 tests written (new tests provide examples)
- **User Story 4 (Phase 6)**: Independent of other stories (different function)
- **User Story 5 (Phase 7)**: Can start after US1 T018 (logging patterns established)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Depends on Foundational (schema.ts rollback) - Core refactoring
- **User Story 2 (P2)**: Depends on US1 implementation - Verifies deduplication
- **User Story 3 (P2)**: Depends on US1 tests - Updates test descriptions
- **User Story 4 (P3)**: Independent - Can run in parallel with US2/US3
- **User Story 5 (P3)**: Depends on US1 logging - Standardizes format

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Foundational changes before client.ts refactoring
- Error handling before logging updates
- Implementation complete before moving to next priority

### Parallel Opportunities

**Phase 1 Setup**: All 3 tasks can run in parallel

- T001, T002, T003 (different exports in same file)

**Phase 2 Foundational**: T006 can run parallel with T004-T005

- T004, T005, T007 (sequential - modify same catch block)
- T006 (parallel - different log statements)

**User Story 1 Tests**: All 5 test tasks can run in parallel

- T008, T009, T010, T011, T012 (different test scenarios)

**User Story 1 Implementation**:

- T013, T014, T015, T016, T017 (sequential - modify same function)
- T018 (parallel - different log statements)

**User Story 4 Tests**:

- T027, T028 (parallel - different test scenarios)

**User Story 5 Implementation**:

- T033, T034, T035 (can all run in parallel - different log statements)

**Multiple User Stories**: After US1 completes:

- US2 (T019-T023)
- US4 (T027-T031)
- Can run in parallel (different files/functions)

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Write test for dynamic import delegation in tests/unit/lib/db/client-auto-init.test.ts"
Task: "Write test for rollback on partial failure in tests/unit/lib/db/client-auto-init.test.ts"
Task: "Write test for timeout behavior in tests/unit/lib/db/client-auto-init.test.ts"
Task: "Write test for error propagation in tests/unit/lib/db/client-auto-init.test.ts"
Task: "Write test for no cleanup when no tables created in tests/unit/lib/db/client-auto-init.test.ts"

# Wait for tests to FAIL, then implement in sequence:
Task: "Remove duplicated schema initialization code from lib/db/client.ts"
Task: "Add dynamic import of initializeSchema in lib/db/client.ts"
Task: "Wrap schema initialization with withTimeout in lib/db/client.ts"
...
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (timeout utilities)
2. Complete Phase 2: Foundational (schema.ts rollback)
3. Complete Phase 3: User Story 1 (core refactoring)
4. **STOP and VALIDATE**: Run quickstart.md Test 1-5
5. Verify Issue 188 critical issues resolved

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (rollback capability)
2. Add User Story 1 → Test independently → Address 4 critical + 1 medium issue
3. Add User Story 2 → Test independently → Address maintainability (1 medium issue)
4. Add User Story 3 → Test independently → Address test documentation
5. Add User Story 4 → Test independently → Address reset safety
6. Add User Story 5 → Test independently → Address logging consistency
7. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T007)
2. Once Foundational is done:
   - Developer A: User Story 1 (critical path)
3. Once US1 complete:
   - Developer A: User Story 2 (verification)
   - Developer B: User Story 4 (independent)
   - Developer C: User Story 5 (independent)
4. Developer A or B: User Story 3 (after new tests written)

---

## Notes

- [P] tasks = different files or independent changes, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (TDD)
- Commit after each task or logical group adhering to .claude/rules.md
- Stop at any checkpoint to validate story independently
- Total: 39 tasks (3 setup + 4 foundational + 32 user story + 4 polish)

---

## Validation Checklist

After all tasks complete, verify:

- [ ] SC-001: Code duplication eliminated (grep validation: 0 createTable in client.ts)
- [ ] SC-002: Errors propagate (0 error swallowing instances)
- [ ] SC-003: Application fails fast with clear errors
- [ ] SC-004: All test descriptions accurate (100%)
- [ ] SC-005: resetDbConnection() handles concurrency safely
- [ ] SC-006: All logs use [LanceDB] prefix (100% consistency)
- [ ] SC-007: Backward compatibility maintained (100%)
- [ ] SC-008: Issue 188 findings addressed (6 issues resolved)
- [ ] SC-009: Atomic rollback behavior verified in tests
- [ ] SC-010: 30-second timeout enforced
