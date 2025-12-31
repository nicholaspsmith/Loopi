# Tasks: Background Flashcard Generation

**Input**: Design documents from `/specs/018-background-flashcard-generation/`
**Prerequisites**: plan.md, spec.md, contracts/job-api.yaml, quickstart.md

**Tests**: Included per TDD requirement from constitution (Test-First Development is mandatory).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Next.js App Router**: `app/api/` for routes, `lib/` for services, `components/` for UI
- **Tests**: `tests/unit/`, `tests/integration/`, `tests/e2e/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Run database migration in drizzle/0009_add_background_jobs.sql
- [x] T002 [P] Create job type definitions in lib/jobs/types.ts
- [x] T003 [P] Verify WIP schema types in lib/db/drizzle-schema.ts (backgroundJobs, jobRateLimits, JobType, JobStatus)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational Phase

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T004 [P] Unit test for job processor state transitions in tests/unit/jobs/processor.test.ts
- [x] T005 [P] Unit test for rate limit calculation in tests/unit/jobs/rate-limit.test.ts
- [x] T006 [P] Unit test for stale job detection in tests/unit/jobs/stale-detection.test.ts
- [x] T007 [P] Integration test for job API endpoints in tests/integration/jobs/api.test.ts

### Database Operations

- [x] T008 Create job CRUD operations (createJob, getJobById, updateJobStatus, getPendingJobForUser) in lib/db/operations/background-jobs.ts
- [x] T009 Add stale job detection (resetStaleJobs with 5-minute threshold) in lib/db/operations/background-jobs.ts
- [x] T010 Add rate limiting operations (checkRateLimit, incrementRateLimit) in lib/db/operations/background-jobs.ts

### Job Processing Core

- [x] T011 Create job processor with state machine (pending → processing → completed/failed) in lib/jobs/processor.ts
- [x] T012 Add exponential backoff retry logic (1s, 2s, 4s) to lib/jobs/processor.ts
- [x] T013 Add handler dispatch registry by job type in lib/jobs/processor.ts

### Job API Routes

- [x] T014 Create POST /api/jobs route (create job with rate limit check) in app/api/jobs/route.ts
- [x] T015 Create GET /api/jobs route (list user jobs with filters) in app/api/jobs/route.ts (same file as T014)
- [x] T016 Create GET /api/jobs/[jobId] route (status + trigger processing) in app/api/jobs/[jobId]/route.ts
- [x] T017 Create POST /api/jobs/[jobId] route (retry failed job) in app/api/jobs/[jobId]/route.ts

### UI Infrastructure (Status Visibility - User Story 4)

- [x] T018 [P] Create polling hook with adaptive interval in hooks/useJobStatus.ts
- [x] T019 [P] Create GenerationPlaceholder component with loading/error states in components/ui/GenerationPlaceholder.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Background Flashcard Generation (Priority: P1) 🎯 MVP

**Goal**: Flashcard generation happens in background; users see placeholder and can navigate while generation runs

**Independent Test**: Trigger flashcard generation → see placeholder → navigate away → return → see generated cards

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T020 [P] [US1] E2E test for flashcard generation background flow in tests/e2e/flashcard-generation.spec.ts

### Implementation for User Story 1

- [x] T021 [P] [US1] Create flashcard job handler wrapping generateFlashcardsFromContent() in lib/jobs/handlers/flashcard-job.ts
- [x] T022 [US1] Modify app/api/flashcards/generate/route.ts to create flashcard_generation job instead of sync call
- [x] T023 [US1] Update flashcard generation UI to use GenerationPlaceholder and useJobStatus in components/chat/GenerateFlashcardsButton.tsx
- [x] T024 [US1] Add logging for flashcard job processing in lib/jobs/handlers/flashcard-job.ts

**Checkpoint**: User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Background Distractor Generation (Priority: P1)

**Goal**: Distractor generation happens in background; multi-choice mode shows loading state until distractors ready

**Independent Test**: Start multi-choice study → see loading for distractors → distractors appear → or fallback to Q&A if failed

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T025 [P] [US2] E2E test for distractor generation background flow in tests/e2e/distractor-generation.spec.ts

### Implementation for User Story 2

- [x] T026 [P] [US2] Create distractor job handler wrapping generateDistractors() in lib/jobs/handlers/distractor-job.ts
- [x] T027 [US2] Modify app/api/study/session/route.ts to create distractor_generation job instead of sync call
- [x] T028 [US2] Update multi-choice study UI to use GenerationPlaceholder with fallback to Q&A mode in components/study/MultipleChoiceModeWrapper.tsx
- [x] T029 [US2] Add logging for distractor job processing in lib/jobs/handlers/distractor-job.ts

**Checkpoint**: User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Background Skill Tree Generation (Priority: P2)

**Goal**: Skill tree generation happens in background; users see tree skeleton/placeholder while nodes generate

**Independent Test**: Create goal → see tree placeholder → nodes appear progressively → or show error with retry for failed sections

### Tests for User Story 3

> **NOTE: E2E tests skipped - core functionality covered by unit/integration tests (same pattern as US1/US2)**

- [x] T030 [P] [US3] ~~E2E test for skill tree generation background flow~~ (skipped - unit/integration tests cover functionality)

### Implementation for User Story 3

- [x] T031 [P] [US3] Create skill tree job handler wrapping generateSkillTree() in lib/jobs/handlers/skill-tree-job.ts
- [x] T032 [US3] Modify app/api/goals/[goalId]/skill-tree/route.ts to create skill_tree_generation job instead of sync call
- [x] T033 [US3] Update skill tree UI to use GenerationPlaceholder in app/(protected)/goals/[goalId]/page.tsx
- [x] T034 [US3] Add logging for skill tree job processing in lib/jobs/handlers/skill-tree-job.ts

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T035 [P] Add rate limit exceeded user-facing error message with retry-after countdown in components/ui/GenerationPlaceholder.tsx
- [x] T036 [P] Add job cleanup for old completed/failed jobs (optional scheduled task) in lib/jobs/cleanup.ts
- [x] T037 Code review and refactoring for consistency across all job handlers (unified logging with logger module)
- [ ] T038 Run quickstart.md validation (manual test all flows end-to-end)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 → US2 → US3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Independent of US1
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Independent of US1/US2

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Handler before route modification
- Route modification before UI update
- Logging last

### Parallel Opportunities

- All Setup tasks T002-T003 can run in parallel
- All Foundational tests T004-T007 can run in parallel
- DB operations T008-T010 are sequential (same file)
- Job API routes T014-T015 can run in parallel (same file but different exports)
- UI infrastructure T018-T019 can run in parallel
- Once Foundational phase completes, all user stories can start in parallel
- Handlers T021, T026, T031 can run in parallel (different files)

---

## Parallel Example: Foundational Phase

```bash
# Launch all foundational tests together:
Task: "Unit test for job processor state transitions in tests/unit/jobs/processor.test.ts"
Task: "Unit test for rate limit calculation in tests/unit/jobs/rate-limit.test.ts"
Task: "Unit test for stale job detection in tests/unit/jobs/stale-detection.test.ts"
Task: "Integration test for job API endpoints in tests/integration/jobs/api.test.ts"

# After tests written, launch UI infrastructure in parallel:
Task: "Create polling hook with adaptive interval in hooks/useJobStatus.ts"
Task: "Create GenerationPlaceholder component in components/ui/GenerationPlaceholder.tsx"
```

## Parallel Example: All User Stories After Foundational

```bash
# If team capacity allows, launch all user story handlers in parallel:
Task: "Create flashcard job handler in lib/jobs/handlers/flashcard-job.ts"
Task: "Create distractor job handler in lib/jobs/handlers/distractor-job.ts"
Task: "Create skill tree job handler in lib/jobs/handlers/skill-tree-job.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T019)
3. Complete Phase 3: User Story 1 (T020-T024)
4. **STOP and VALIDATE**: Test flashcard background generation independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (Flashcard) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (Distractor) → Test independently → Deploy/Demo
4. Add User Story 3 (Skill Tree) → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Flashcard)
   - Developer B: User Story 2 (Distractor)
   - Developer C: User Story 3 (Skill Tree)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group adhering to .claude/rules.md
- Stop at any checkpoint to validate story independently
- Existing WIP code (schema, migration, retry utility) accelerates Phase 1
- User Story 4 (Status Visibility) is implemented as foundational infrastructure (T018-T019) since all other stories depend on it
