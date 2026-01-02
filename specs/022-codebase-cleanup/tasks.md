# Tasks: Codebase Cleanup

**Input**: Design documents from `/specs/022-codebase-cleanup/`
**Prerequisites**: plan.md (required), spec.md (required), research.md

**Tests**: Included per TDD approach specified in plan.md. Tests are written BEFORE implementation.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Path Conventions

- **Scripts**: `scripts/cleanup/` at repository root
- **Tests**: `tests/unit/scripts/cleanup/`
- **Config**: Root directory (`knip.config.ts`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and create project structure

- [x] T001 Install Knip as devDependency: `npm install -D knip`
- [x] T002 Install @inquirer/prompts as devDependency: `npm install -D @inquirer/prompts`
- [x] T003 Create scripts/cleanup/ directory structure
- [x] T004 Create knip.config.ts with Next.js plugin configuration at project root
- [x] T005 Validate Knip runs successfully: `npx knip --reporter json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types and interfaces that ALL analyzers depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Create shared TypeScript types in scripts/cleanup/types.ts (Finding, Report interfaces per plan.md)
- [x] T007 [P] Write unit test for types validation in tests/unit/scripts/cleanup/types.test.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1+2 - Dead Code & Unused Dependencies (Priority: P1) 🎯 MVP

**Goal**: Identify unused TypeScript/JavaScript exports, functions, components, types, AND unused npm dependencies using Knip

**Independent Test**: Run `npm run cleanup:report` and verify unused exports and dependencies are listed with file locations and confidence indicators

**Note**: US1 (Dead Code) and US2 (Dependencies) are combined because Knip handles both in a single analysis run

### Tests for User Story 1+2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T008 [P] [US1] Write unit test for knip-runner.ts in tests/unit/scripts/cleanup/knip-runner.test.ts
- [x] T009 [P] [US2] Write unit test for dependency detection in tests/unit/scripts/cleanup/knip-runner.test.ts

### Implementation for User Story 1+2

- [x] T010 [US1] Implement knip-runner.ts wrapper in scripts/cleanup/knip-runner.ts
- [x] T011 [US1] Add Knip JSON output parsing to scripts/cleanup/knip-runner.ts
- [x] T012 [US1] Map Knip output to Finding interface in scripts/cleanup/knip-runner.ts
- [x] T013 [US2] Add dependency analysis mode (--dependencies) to scripts/cleanup/knip-runner.ts
- [x] T014 [US2] Add production mode separation (--production) to scripts/cleanup/knip-runner.ts
- [x] T015 [US1] Add error handling for Knip execution failures in scripts/cleanup/knip-runner.ts
- [x] T016 [US1] Add dynamic import detection (flag as "needs review") in scripts/cleanup/knip-runner.ts

**Checkpoint**: Dead code and dependency detection working independently

---

## Phase 4: User Story 3 - Unused Database Entities (Priority: P2)

**Goal**: Identify database tables and columns with no references in application code

**Independent Test**: Run db-analyzer and verify it correctly identifies tables/columns from drizzle-schema.ts that have no code references

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T017 [P] [US3] Write unit test for Drizzle schema parsing in tests/unit/scripts/cleanup/db-analyzer.test.ts
- [x] T018 [P] [US3] Write unit test for table reference detection in tests/unit/scripts/cleanup/db-analyzer.test.ts
- [x] T019 [P] [US3] Write unit test for column reference detection in tests/unit/scripts/cleanup/db-analyzer.test.ts

### Implementation for User Story 3

- [x] T020 [US3] Create db-analyzer.ts skeleton in scripts/cleanup/db-analyzer.ts
- [x] T021 [US3] Implement Drizzle schema parsing for lib/db/drizzle-schema.ts in scripts/cleanup/db-analyzer.ts
- [x] T022 [US3] Implement table name extraction from schema in scripts/cleanup/db-analyzer.ts
- [x] T023 [US3] Implement column name extraction from schema in scripts/cleanup/db-analyzer.ts
- [x] T024 [US3] Implement codebase search for table references in scripts/cleanup/db-analyzer.ts
- [x] T025 [US3] Implement codebase search for column references in scripts/cleanup/db-analyzer.ts
- [x] T026 [US3] Map unreferenced entities to Finding interface in scripts/cleanup/db-analyzer.ts
- [x] T027 [US3] Add "dangerous" risk level for database entities in scripts/cleanup/db-analyzer.ts

**Checkpoint**: Database entity detection working independently

---

## Phase 5: User Story 4 - Orphaned Test Files (Priority: P2)

**Goal**: Identify test files that test functionality which no longer exists

**Independent Test**: Run Knip analysis and verify orphaned tests are identified in the output

**Note**: Knip already detects files importing non-existent modules. This phase verifies and enhances that capability.

### Tests for User Story 4

- [x] T028 [P] [US4] Write unit test for orphaned test detection in tests/unit/scripts/cleanup/knip-runner.test.ts

### Implementation for User Story 4

- [x] T029 [US4] Add test file category ('test') to Finding types in scripts/cleanup/types.ts
- [x] T030 [US4] Configure Knip to include test file analysis in knip.config.ts
- [x] T031 [US4] Add orphaned test detection logic to scripts/cleanup/knip-runner.ts
- [x] T032 [US4] Add test file path matching (_.test.ts, _.spec.ts) in scripts/cleanup/knip-runner.ts

**Checkpoint**: Orphaned test detection working independently

---

## Phase 6: User Story 5 - Configuration Cleanup (Priority: P3)

**Goal**: Identify environment variables and configuration entries that are no longer referenced

**Independent Test**: Run env-analyzer and verify unreferenced env vars from .env.example are identified

### Tests for User Story 5

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T033 [P] [US5] Write unit test for .env file parsing in tests/unit/scripts/cleanup/env-analyzer.test.ts
- [x] T034 [P] [US5] Write unit test for process.env reference detection in tests/unit/scripts/cleanup/env-analyzer.test.ts

### Implementation for User Story 5

- [x] T035 [US5] Create env-analyzer.ts skeleton in scripts/cleanup/env-analyzer.ts
- [x] T036 [US5] Implement .env.example parsing in scripts/cleanup/env-analyzer.ts
- [x] T037 [US5] Implement .env.production.example parsing in scripts/cleanup/env-analyzer.ts
- [x] T038 [US5] Implement process.env.VAR_NAME pattern search in scripts/cleanup/env-analyzer.ts
- [x] T039 [US5] Search lib/env.ts for env var references in scripts/cleanup/env-analyzer.ts
- [x] T040 [US5] Search config files (next.config.ts, drizzle.config.ts) for env var references in scripts/cleanup/env-analyzer.ts
- [x] T041 [US5] Map unreferenced env vars to Finding interface in scripts/cleanup/env-analyzer.ts

**Checkpoint**: Environment variable detection working independently

---

## Phase 7: Reporting (Cross-Story Integration)

**Goal**: Consolidate findings from all analyzers into unified report with risk levels

**Purpose**: Integrates US1-US5 findings into single report format

### Tests for Reporting

- [x] T042 [P] Write unit test for finding consolidation in tests/unit/scripts/cleanup/report-generator.test.ts
- [x] T043 [P] Write unit test for risk level assignment in tests/unit/scripts/cleanup/report-generator.test.ts
- [x] T044 [P] Write unit test for JSON output format in tests/unit/scripts/cleanup/report-generator.test.ts
- [x] T045 [P] Write unit test for CLI output format in tests/unit/scripts/cleanup/report-generator.test.ts

### Implementation for Reporting

- [x] T046 Create report-generator.ts skeleton in scripts/cleanup/report-generator.ts
- [x] T047 Implement finding consolidation from all analyzers in scripts/cleanup/report-generator.ts
- [x] T048 Implement risk level assignment logic per category in scripts/cleanup/report-generator.ts
- [x] T049 Implement dev-only vs production categorization (FR-015) in scripts/cleanup/report-generator.ts
- [x] T050 Implement JSON output format in scripts/cleanup/report-generator.ts
- [x] T051 Implement CLI-friendly formatted output with colors in scripts/cleanup/report-generator.ts
- [x] T052 Implement summary statistics (totals by category, risk level) in scripts/cleanup/report-generator.ts

**Checkpoint**: Unified reporting working with all analyzers

---

## Phase 8: Interactive CLI (FR-013, FR-014)

**Goal**: Provide interactive prompts for assisted removal with undo capability

### Tests for Interactive CLI

- [x] T053 [P] Write unit test for prompt display in tests/unit/scripts/cleanup/interactive-cli.test.ts
- [x] T054 [P] Write unit test for removal execution in tests/unit/scripts/cleanup/interactive-cli.test.ts
- [x] T055 [P] Write unit test for undo functionality in tests/unit/scripts/cleanup/interactive-cli.test.ts

### Implementation for Interactive CLI

- [x] T056 Create interactive-cli.ts skeleton in scripts/cleanup/interactive-cli.ts
- [x] T057 Implement finding display with context in scripts/cleanup/interactive-cli.ts
- [x] T058 Implement prompt loop (Remove/Skip/Undo/Details/Quit) in scripts/cleanup/interactive-cli.ts
- [x] T059 Implement removal execution with git integration in scripts/cleanup/interactive-cli.ts
- [x] T060 Implement undo functionality (git restore) in scripts/cleanup/interactive-cli.ts
- [x] T061 Implement session persistence for resume capability in scripts/cleanup/interactive-cli.ts
- [x] T062 Implement batch mode for safe removals in scripts/cleanup/interactive-cli.ts

**Checkpoint**: Interactive CLI fully functional

---

## Phase 9: Integration & Orchestration

**Goal**: Wire all components together into unified analyze.ts orchestrator

### Tests for Integration

- [x] T063 [P] Write integration test for full analysis pipeline in tests/unit/scripts/cleanup/analyze.test.ts

### Implementation for Integration

- [x] T064 Create analyze.ts orchestrator in scripts/cleanup/analyze.ts
- [x] T065 Implement parallel analyzer execution in scripts/cleanup/analyze.ts
- [x] T066 Implement --report-only flag in scripts/cleanup/analyze.ts
- [x] T067 Implement --interactive flag in scripts/cleanup/analyze.ts
- [x] T068 Add npm scripts to package.json (cleanup:analyze, cleanup:report, cleanup:interactive)
- [x] T069 Run full analysis on codebase and verify output

**Checkpoint**: Full cleanup system operational

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, validation, and final touches

- [x] T070 [P] Update specs/022-codebase-cleanup/quickstart.md with real examples from codebase analysis
- [x] T071 [P] Add JSDoc comments to all public functions in scripts/cleanup/\*.ts
- [x] T072 Run full test suite and ensure all tests pass (159 tests pass)
- [x] T073 Verify SC-008: Report generation completes in under 5 minutes (completes in ~1s)
- [x] T074 Verify SC-001: Manual audit of 10 random findings for accuracy
- [x] T075 Document any false positives found in quickstart.md troubleshooting section

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **US1+US2 (Phase 3)**: Depends on Foundational - can start after Phase 2
- **US3 (Phase 4)**: Depends on Foundational - can run parallel to Phase 3
- **US4 (Phase 5)**: Depends on Phase 3 (extends knip-runner.ts)
- **US5 (Phase 6)**: Depends on Foundational - can run parallel to Phase 3/4
- **Reporting (Phase 7)**: Depends on Phases 3, 4, 5, 6 completion
- **Interactive CLI (Phase 8)**: Depends on Phase 7 (needs report data)
- **Integration (Phase 9)**: Depends on Phases 7 and 8
- **Polish (Phase 10)**: Depends on Phase 9 completion

### User Story Dependencies

```
Phase 2 (Foundational)
       │
       ├──────────────┬──────────────┬──────────────┐
       ▼              ▼              ▼              ▼
   Phase 3        Phase 4        Phase 5        Phase 6
  (US1+US2)        (US3)                         (US5)
       │              │              │              │
       ├──────────────┴──────────────┴──────────────┤
       ▼                                            ▼
   Phase 5                                      Phase 7
    (US4)                                     (Reporting)
       │                                            │
       └────────────────────────────────────────────┤
                                                    ▼
                                                Phase 8
                                            (Interactive CLI)
                                                    │
                                                    ▼
                                                Phase 9
                                             (Integration)
                                                    │
                                                    ▼
                                                Phase 10
                                                (Polish)
```

### Parallel Opportunities

**Within Phase 2:**

- T006 and T007 can run in parallel

**After Phase 2 completes:**

- Phase 3 (US1+US2), Phase 4 (US3), and Phase 6 (US5) can all run in parallel

**Within Phase 3:**

- T008 and T009 (tests) can run in parallel before implementation

**Within Phase 4:**

- T017, T018, T019 (tests) can run in parallel before implementation

**Within Phase 6:**

- T033 and T034 (tests) can run in parallel before implementation

**Within Phase 7:**

- T042, T043, T044, T045 (tests) can run in parallel before implementation

**Within Phase 8:**

- T053, T054, T055 (tests) can run in parallel before implementation

---

## Parallel Example: Phase 3+4+6 (After Foundational)

```bash
# These three phases can run in parallel by different developers:

# Developer A: User Story 1+2 (Dead Code & Dependencies)
Task: "Write unit test for knip-runner.ts in tests/unit/scripts/cleanup/knip-runner.test.ts"
Task: "Implement knip-runner.ts wrapper in scripts/cleanup/knip-runner.ts"

# Developer B: User Story 3 (Database Entities)
Task: "Write unit test for Drizzle schema parsing in tests/unit/scripts/cleanup/db-analyzer.test.ts"
Task: "Create db-analyzer.ts skeleton in scripts/cleanup/db-analyzer.ts"

# Developer C: User Story 5 (Configuration)
Task: "Write unit test for .env file parsing in tests/unit/scripts/cleanup/env-analyzer.test.ts"
Task: "Create env-analyzer.ts skeleton in scripts/cleanup/env-analyzer.ts"
```

---

## Implementation Strategy

### MVP First (Phase 1-3 Only)

1. Complete Phase 1: Setup (Knip installed)
2. Complete Phase 2: Foundational (types.ts)
3. Complete Phase 3: User Story 1+2 (knip-runner.ts)
4. **STOP and VALIDATE**: Run `npx tsx scripts/cleanup/knip-runner.ts` and verify dead code/deps detected
5. Deploy/demo MVP - already provides value for dead code cleanup

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1+US2 → Dead code & dependency detection (MVP!)
3. Add US3 → Database entity detection
4. Add US4 → Orphaned test detection
5. Add US5 → Configuration cleanup
6. Add Reporting → Unified reports
7. Add Interactive CLI → Assisted removal
8. Integration → Full orchestration
9. Each phase adds value without breaking previous phases

---

## Summary

| Metric                        | Count    |
| ----------------------------- | -------- |
| **Total Tasks**               | 75       |
| **Phase 1 (Setup)**           | 5        |
| **Phase 2 (Foundational)**    | 2        |
| **Phase 3 (US1+US2)**         | 9        |
| **Phase 4 (US3)**             | 11       |
| **Phase 5 (US4)**             | 5        |
| **Phase 6 (US5)**             | 9        |
| **Phase 7 (Reporting)**       | 11       |
| **Phase 8 (Interactive CLI)** | 10       |
| **Phase 9 (Integration)**     | 7        |
| **Phase 10 (Polish)**         | 6        |
| **Parallelizable Tasks**      | 25       |
| **MVP Scope (Phases 1-3)**    | 16 tasks |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story can be tested independently after its phase completes
- TDD approach: Write tests first, ensure they FAIL before implementation
- Commit after each task or logical group adhering to .claude/rules.md
- Stop at any checkpoint to validate functionality independently
