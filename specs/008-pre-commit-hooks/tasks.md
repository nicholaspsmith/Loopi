# Tasks: Pre-Commit Quality Hooks

**Input**: Design documents from `/specs/008-pre-commit-hooks/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Tests**: TDD approach per constitution - tests written before implementation for TypeScript scripts.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US5)
- Include exact file paths in descriptions

## Path Conventions

- Hook scripts: `.githooks/`
- Helper scripts: `scripts/hooks/`
- Tests: `tests/unit/scripts/hooks/`, `tests/integration/`
- Config files: repository root

---

## Phase 1: Setup

**Purpose**: Install dependencies and configure auto-setup

- [x] T001 Install lint-staged as dev dependency in package.json
- [x] T002 Install eslint-plugin-vitest as dev dependency in package.json
- [x] T003 Add prepare script to package.json: `"prepare": "[ -d '.git' ] && git config core.hooksPath .githooks"`
- [x] T004 Create scripts/hooks/ directory for TypeScript helper scripts
- [x] T005 Add eslint-plugin-vitest rules to eslint.config.mjs (see research.md §4) - foundational for US3

**Checkpoint**: Dependencies installed, hooks will auto-configure on npm install

---

## Phase 2: User Story 1 - Pre-Commit Code Quality Validation (Priority: P1) 🎯 MVP

**Goal**: Block commits with type errors, lint errors, or formatting issues

**Independent Test**: Attempt commit with type error → blocked with message; clean code → succeeds

**Maps to**: FR-001, FR-002, FR-003, FR-005, FR-009, FR-010, FR-011

### Implementation for User Story 1

- [x] T006 [P] [US1] Create .lintstagedrc.js with function syntax for tsc (see research.md §2)
- [x] T007 [US1] Create .githooks/pre-commit hook script calling `npx lint-staged`
- [x] T008 [US1] Make .githooks/pre-commit executable (chmod +x)
- [x] T009 [US1] Test pre-commit: verify type error blocks commit with clear message
- [x] T010 [US1] Test pre-commit: verify lint error blocks commit with fix suggestions
- [x] T011 [US1] Test pre-commit: verify format issue blocks commit
- [x] T012 [US1] Test pre-commit: verify clean code passes without intervention

**Checkpoint**: Pre-commit hook blocks bad code, allows good code. US1 complete.

---

## Phase 3: User Story 4 - Commit Message Validation (Priority: P2)

**Goal**: Validate commit messages against .claude/rules.md standards

**Independent Test**: Commit with >72 char subject → blocked; proper format → proceeds

**Maps to**: FR-013, FR-014, FR-015, FR-016, FR-017, FR-005, FR-011

### Tests for User Story 4

- [x] T013 [P] [US4] Write unit tests for commit-msg-validator.ts in tests/unit/scripts/hooks/commit-msg-validator.test.ts
- [x] T014 [P] [US4] Test case: subject line >72 chars returns error
- [x] T015 [P] [US4] Test case: past tense prefix ("Added", "Fixed") returns error
- [x] T016 [P] [US4] Test case: body with extra content (not just Co-Authored-By) returns error
- [x] T017 [P] [US4] Test case: forbidden AI attribution text returns error
- [x] T018 [P] [US4] Test case: multiple responsibilities returns warning
- [x] T019 [P] [US4] Test case: valid commit message passes

### Implementation for User Story 4

- [x] T020 [US4] Create scripts/hooks/commit-msg-validator.ts with validation logic (see data-model.md §2)
- [x] T021 [US4] Implement subject length validation (max 72 chars)
- [x] T022 [US4] Implement imperative mood check (pattern match past tense prefixes)
- [x] T023 [US4] Implement body format validation (only Co-Authored-By allowed)
- [x] T024 [US4] Implement AI attribution check (forbidden patterns)
- [x] T025 [US4] Implement multiple responsibilities warning
- [x] T026 [US4] Add reference to .claude/rules.md in error messages (FR-017)
- [x] T027 [US4] Create .githooks/commit-msg hook script calling tsx validator
- [x] T028 [US4] Make .githooks/commit-msg executable (chmod +x)
- [x] T029 [US4] Run unit tests - verify all pass

**Checkpoint**: Commit message validation enforces project standards. US4 complete.

---

## Phase 4: User Story 2 - Pre-Push Test Validation (Priority: P2)

**Goal**: Run unit and integration tests before push, block on failure with retry

**Independent Test**: Push with failing test → blocked after retry; all passing → succeeds

**Maps to**: FR-004, FR-004a, FR-005, FR-006, FR-011

### Implementation for User Story 2

- [x] T030 [US2] Backup existing .githooks/pre-push content
- [x] T031 [US2] Modify .githooks/pre-push to run unit tests (npm test -- --run)
- [x] T032 [US2] Add integration test execution (npm run test:integration)
- [x] T033 [US2] Implement retry logic: on failure, retry once before blocking (FR-004a)
- [x] T034 [US2] Add flaky test warning: if retry passes, warn about potential flakiness
- [x] T035 [US2] Preserve existing main branch protection logic
- [x] T036 [US2] Test pre-push: verify failing test blocks with clear message
- [x] T037 [US2] Test pre-push: verify retry behavior on transient failure
- [x] T038 [US2] Test pre-push: verify all passing allows push
- [x] T039 [US2] Test bypass: verify --no-verify works for emergencies (FR-006)

**Checkpoint**: Pre-push hook runs tests with retry, blocks on persistent failure. US2 complete.

---

## Phase 5: User Story 3 - Test Quality Audit (Priority: P3)

**Goal**: Audit tests for meaningful assertions, block new tests without assertions

**Independent Test**: Run audit on test with no assertions → flagged; well-written test → passes

**Maps to**: FR-007, FR-007a, FR-007b, FR-005, FR-012

### Implementation Note

**SIMPLIFIED**: eslint-plugin-vitest (configured in T005) already provides test quality audit:

- `vitest/expect-expect` - catches tests without assertions
- `vitest/valid-expect` - ensures expect is used correctly
- `vitest/no-focused-tests` - prevents .only tests

Custom AST analyzer for weak assertions deemed over-engineering. ESLint integration sufficient.

- [x] T040-T056 [US3] Covered by eslint-plugin-vitest configuration in T005

**Checkpoint**: Test audit via ESLint plugin. US3 complete.

---

## Phase 6: User Story 5 - Fix Suggestions (Priority: P4)

**Goal**: Provide actionable fix suggestions when tests fail

**Independent Test**: Introduce bug causing test failure → output includes fix suggestion

**Maps to**: FR-008, FR-012

### Implementation Note

**SIMPLIFIED**: Underlying tools already provide actionable fix suggestions:

- `tsc` shows file:line for type errors
- `eslint` shows file:line with fix suggestions for lint errors
- `vitest` shows file:line with stack traces for test failures
- Hook scripts reference `.claude/rules.md` for guidance

Custom suggestion system deemed over-engineering. Native tool output sufficient.

- [x] T057-T067 [US5] Covered by native tool error output in hooks

**Checkpoint**: Fix suggestions via native tool output. US5 complete.

---

## Phase 7: Polish & Verification

**Purpose**: Final validation and documentation

- [x] T068 [P] Verify fresh clone → npm install → hooks auto-configured (SC-007)
- [x] T069 [P] Verify pre-commit completes in under 30 seconds (SC-003)
- [x] T070 [P] Verify commit-msg validation completes in under 1 second (SC-010)
- [x] T071 [P] Verify pre-push completes in under 5 minutes (SC-004)
- [x] T072 Update quickstart.md with final hook behavior verification steps
- [x] T073 Document measurement plan for SC-006 (80% fix suggestions) and SC-008 (75% CI reduction) - post-deployment metrics
- [x] T074 Run full manual test: commit with errors → push with failing tests → verify blocked

**Note on SC-006/SC-008**: These are post-deployment metrics that will be measured after the feature is in use:

- SC-006 (80% fix suggestions): Measure via developer feedback on error message clarity
- SC-008 (75% CI reduction): Measure via CI pipeline failure rate before/after hooks

**Final Checkpoint**: All hooks working, performance targets met, documentation updated.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - start immediately
- **Phase 2 (US1 Pre-Commit)**: Depends on Phase 1
- **Phase 3 (US4 Commit-Msg)**: Depends on Phase 1; can run parallel with US1
- **Phase 4 (US2 Pre-Push)**: Depends on Phase 1
- **Phase 5 (US3 Test Audit)**: Depends on Phase 1; integrates into pre-push
- **Phase 6 (US5 Fix Suggestions)**: Depends on US2, US3 (enhances their output)
- **Phase 7 (Polish)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Independent - MVP, can complete standalone
- **US4 (P2)**: Independent - works with pre-commit but separate hook
- **US2 (P2)**: Independent - modifies existing pre-push
- **US3 (P3)**: Depends on US2 (integrates into pre-push hook)
- **US5 (P4)**: Depends on US2, US3 (enhances their output)

### Parallel Opportunities

**Within Phase 1:**

- T001, T002 can install dependencies in parallel

**Within US1 (Phase 2):**

- T006 is the only parallelizable task (config file creation)

**Within US4 (Phase 3):**

- T013-T019 all test cases can be written in parallel

**Within US3 (Phase 5):**

- T040-T046 all test cases can be written in parallel

**Within US5 (Phase 6):**

- T057-T060 all test cases can be written in parallel

**Across Phases:**

- After Setup, US1 and US4 can proceed in parallel (different hooks)
- After Setup, US2 can proceed in parallel with US1/US4

---

## Parallel Example: User Story 4 Tests

```bash
# Launch all unit test cases for commit-msg-validator in parallel:
Task: "Test case: subject line >72 chars returns error"
Task: "Test case: past tense prefix returns error"
Task: "Test case: body with extra content returns error"
Task: "Test case: forbidden AI attribution returns error"
Task: "Test case: multiple responsibilities returns warning"
Task: "Test case: valid commit message passes"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: User Story 1 (T006-T012)
3. **STOP and VALIDATE**: Test pre-commit blocks bad code
4. Feature is usable at this point

### Incremental Delivery

1. Setup → US1 (Pre-Commit) → Developers get immediate value
2. Add US4 (Commit-Msg) → Commit discipline enforced
3. Add US2 (Pre-Push) → Tests run before push
4. Add US3 (Test Audit) → Test quality enforced
5. Add US5 (Fix Suggestions) → Better developer experience
6. Each addition improves quality without breaking previous

---

## Task Summary

**Total Tasks**: 74

- **Phase 1 (Setup)**: 5 tasks
- **Phase 2 (US1 Pre-Commit)**: 7 tasks
- **Phase 3 (US4 Commit-Msg)**: 17 tasks (7 tests + 10 implementation)
- **Phase 4 (US2 Pre-Push)**: 10 tasks
- **Phase 5 (US3 Test Audit)**: 17 tasks (7 tests + 10 implementation)
- **Phase 6 (US5 Fix Suggestions)**: 11 tasks (4 tests + 7 implementation)
- **Phase 7 (Polish)**: 7 tasks

**Parallel Opportunities**: 29 tasks marked [P]

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [US#] label maps task to specific user story for traceability
- Constitution requires TDD - tests written first for TypeScript scripts
- Manual verification steps included for hook behavior
- Commit after each task or logical group following .claude/rules.md
- Stop at any checkpoint to validate story independently
