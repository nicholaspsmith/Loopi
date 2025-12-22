# Tasks: Ollama Model Deployment

**Input**: Design documents from `/specs/009-ollama-model-deployment/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: TDD approach per constitution - tests written before implementation for TypeScript code.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Scripts: `scripts/`
- API routes: `app/api/`
- Tests: `tests/unit/`, `tests/integration/`

---

## Phase 1: Setup

**Purpose**: No setup needed - this feature modifies existing files only

**Note**: This feature requires no new dependencies or project initialization. Proceed directly to user story implementation.

**Checkpoint**: Ready for user story implementation

---

## Phase 2: User Story 1 - Automatic Model Availability on Deployment (Priority: P1) 🎯 MVP

**Goal**: Fix production Ollama error by automatically pulling required models during deployment

**Independent Test**: Run deployment script, verify `docker exec memoryloop-ollama ollama list` shows both models

**Maps to**: FR-001, FR-002, FR-003, FR-004

### Implementation for User Story 1

- [x] T001 [US1] Add Ollama container health check wait loop to scripts/deploy.sh after PostgreSQL check (line 63)
- [x] T002 [US1] Add nomic-embed-text model pull with 5-minute timeout to scripts/deploy.sh
- [x] T003 [US1] Add llama3.2 model pull with 5-minute timeout to scripts/deploy.sh
- [x] T004 [US1] Ensure model pull failures log warnings but don't block deployment in scripts/deploy.sh
- [x] T005 [US1] Test deploy script locally: verify model pull executes and is idempotent

**Checkpoint**: Deployment script now pulls Ollama models automatically. US1 complete - production error fixed.

---

## Phase 3: User Story 2 - Health Check API for External Services (Priority: P2)

**Goal**: Enhance health endpoint to verify Ollama models and Claude API availability

**Independent Test**: Call `GET /api/health` and verify response includes ollama.models array and claude status

**Maps to**: FR-005, FR-006, FR-007, FR-008, FR-010

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T006 [P] [US2] Write unit test: health check returns model list when Ollama healthy in tests/unit/api/health/route.test.ts
- [x] T007 [P] [US2] Write unit test: health check returns unhealthy when models missing in tests/unit/api/health/route.test.ts
- [x] T008 [P] [US2] Write unit test: health check returns Claude status based on ANTHROPIC_API_KEY in tests/unit/api/health/route.test.ts
- [x] T009 [US2] Run tests - verify all FAIL before implementation

### Implementation for User Story 2

- [x] T010 [US2] Enhance Ollama check to fetch /api/tags and extract model names in app/api/health/route.ts
- [x] T011 [US2] Add required models validation (nomic-embed-text, llama3.2) in app/api/health/route.ts
- [x] T012 [US2] Add Claude API key presence check in app/api/health/route.ts
- [x] T013 [US2] Update response format to include models array and claude status in app/api/health/route.ts
- [x] T014 [US2] Run tests - verify all PASS after implementation

**Checkpoint**: Health endpoint now reports model availability and Claude status. US2 complete.

---

## Phase 4: User Story 3 - Startup Validation (Priority: P3) - DEFERRED

**Goal**: Log warnings on startup if external services unavailable

**Status**: Marked as optional in plan.md - defer to future iteration

**Rationale**: FR-009 uses SHOULD (not MUST), and the health endpoint (US2) provides equivalent observability. Application already handles service unavailability gracefully at runtime.

**Checkpoint**: US3 deferred - not blocking for this release

---

## Phase 5: Polish & Verification

**Purpose**: Final validation and documentation

- [x] T015 [P] Verify deploy script model pull completes in <60s when models exist (SC-004)
- [x] T016 [P] Verify health endpoint responds in <2s (SC-002, SC-003, FR-010)
- [x] T017 Run quickstart.md Scenario 1: Fresh deployment pulls models
- [x] T018 Run quickstart.md Scenario 2: Health endpoint reports model status
- [x] T019 Run quickstart.md Scenario 4: Idempotent model pull is fast
- [x] T020 Update quickstart.md manual verification checklist with test results

**Checkpoint**: All verification passed, feature ready for deployment

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No setup needed - skip
- **Phase 2 (US1)**: No dependencies - start immediately (MVP)
- **Phase 3 (US2)**: Independent of US1 - can run in parallel
- **Phase 4 (US3)**: Deferred to future iteration
- **Phase 5 (Polish)**: Depends on US1 and US2 completion

### User Story Dependencies

- **US1 (P1)**: Independent - modifies deploy.sh only
- **US2 (P2)**: Independent - modifies health endpoint only
- **US3 (P3)**: Deferred

### Parallel Opportunities

**Within US2:**

- T006, T007, T008 (unit tests) can run in parallel

**Across Stories:**

- US1 and US2 can be implemented in parallel (different files)

**Within Polish:**

- T015, T016 (verification) can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: User Story 1 (T001-T005)
2. **STOP and VALIDATE**: Deploy to staging, verify Ollama works
3. Production error is FIXED at this point

### Full Feature

1. US1 (deploy script) → Production fix deployed
2. US2 (health endpoint) → Observability improved
3. Polish → Verification complete
4. US3 (startup validation) → Deferred to future iteration

---

## Task Summary

**Total Tasks**: 20

- **Phase 1 (Setup)**: 0 tasks (not needed)
- **Phase 2 (US1)**: 5 tasks
- **Phase 3 (US2)**: 9 tasks (4 tests + 5 implementation)
- **Phase 4 (US3)**: 0 tasks (deferred)
- **Phase 5 (Polish)**: 6 tasks

**Parallel Opportunities**: 6 tasks marked [P]

---

## Notes

- [P] tasks = different files, no dependencies
- [US#] label maps task to specific user story for traceability
- Constitution requires TDD for TypeScript code - tests before implementation
- US1 (deploy script) is pure bash - no unit tests required
- Commit after each task following .claude/rules.md
- Stop at any checkpoint to validate story independently
