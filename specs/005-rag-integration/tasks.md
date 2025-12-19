---
description: 'Task list for RAG Integration feature implementation'
---

# Tasks: RAG Integration for Enhanced Chat Responses

**Input**: Design documents from `/specs/005-rag-integration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Test tasks are included following TDD (Test-Driven Development) per constitution requirement. Tests MUST be written before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Next.js App Router structure:
- **Libraries**: `lib/` at repository root
- **API Routes**: `app/api/` at repository root
- **Components**: `components/` at repository root
- **Tests**: `tests/unit/`, `tests/integration/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and verify existing infrastructure for RAG integration

- [ ] T001 Verify @lancedb/lancedb@0.22 is installed in package.json
- [ ] T002 Verify Ollama service is running at OLLAMA_BASE_URL (http://localhost:11434)
- [ ] T003 [P] Verify nomic-embed-text model is available in Ollama
- [ ] T004 [P] Install Pino logging library: `npm install pino pino-pretty`
- [ ] T005 Verify LanceDB messages table has embedding column initialized

**Checkpoint**: Dependencies verified and Ollama embedding service is operational

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core logging infrastructure that enables observability across all user stories

**⚠️ CRITICAL**: No user story work can begin until structured logging is in place (FR-010)

- [ ] T006 Create logger configuration file in lib/logger.ts with Pino setup and TypeScript types
- [ ] T007 Add structured logging helper functions (createChildLogger, logRAGEvent) in lib/logger.ts
- [ ] T008 Define RAGLogEntry interface in lib/logger.ts matching data-model.md schema

**Checkpoint**: Structured logging infrastructure ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Automatic Context Retrieval (Priority: P1) 🎯 MVP

**Goal**: Enable Claude to retrieve and use semantically similar past messages as context for enhanced responses

**Independent Test**: Have two separate conversations about the same topic (e.g., "What is LanceDB?" followed hours later by "How do I query it?"), and verify the second response references information from the first conversation.

### Tests for User Story 1 (TDD)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T009 [P] [US1] Create unit test file tests/unit/lib/claude/rag.test.ts
- [ ] T010 [P] [US1] Write test: shouldUseRAG() returns false for greetings ("hi", "hello", "hey") - SC-005
- [ ] T011 [P] [US1] Write test: shouldUseRAG() returns false for messages < 10 chars - FR-005
- [ ] T012 [P] [US1] Write test: shouldUseRAG() returns true for substantive questions (>10 chars) - FR-005
- [ ] T013 [P] [US1] Write test: buildRAGContext() returns empty context when RAG disabled
- [ ] T014 [P] [US1] Write test: buildRAGContext() returns empty context when no similar messages exist - FR-012
- [ ] T015 [P] [US1] Write test: buildRAGContext() limits results to maxMessages (default 5) - FR-003
- [ ] T016 [P] [US1] Write test: buildRAGContext() enforces maxTokens limit (default 2000) - FR-004, SC-006
- [ ] T017 [P] [US1] Write test: buildRAGContext() filters messages with null embeddings
- [ ] T018 [P] [US1] Write test: buildRAGContext() completes within 500ms - SC-002
- [ ] T019 [P] [US1] Create integration test file tests/integration/rag-chat-flow.test.ts
- [ ] T020 [US1] Write integration test: End-to-end RAG flow with mock LanceDB - SC-001

**Run tests**: `npm test tests/unit/lib/claude/rag.test.ts` - **ALL TESTS SHOULD FAIL**

### Implementation for User Story 1

- [ ] T021 [US1] Enhance shouldUseRAG() in lib/claude/rag.ts to pass all greeting and length tests (T010-T012)
- [ ] T022 [US1] Enhance buildRAGContext() in lib/claude/rag.ts to handle disabled RAG case (T013)
- [ ] T023 [US1] Enhance buildRAGContext() in lib/claude/rag.ts to handle no similar messages case (T014)
- [ ] T024 [US1] Enhance buildRAGContext() in lib/claude/rag.ts to enforce maxMessages limit (T015)
- [ ] T025 [US1] Enhance formatMessagesAsContext() in lib/claude/rag.ts to enforce maxTokens limit (T016)
- [ ] T026 [US1] Enhance buildRAGContext() in lib/claude/rag.ts to filter null embeddings (T017)
- [ ] T027 [US1] Add structured logging to buildRAGContext() using lib/logger.ts (executionTimeMs, similarMessagesFound, contextLength) - FR-010
- [ ] T028 [US1] Integrate buildRAGContext() into chat API in app/api/chat/conversations/[conversationId]/messages/route.ts
- [ ] T029 [US1] Update chat API to call shouldUseRAG() before buildRAGContext() in app/api/chat/conversations/[conversationId]/messages/route.ts
- [ ] T030 [US1] Augment system prompt with RAG context in chat API in app/api/chat/conversations/[conversationId]/messages/route.ts - FR-006
- [ ] T031 [US1] Add error handling with graceful degradation (empty context on failure) in lib/claude/rag.ts - FR-009

**Run tests**: `npm test tests/unit/lib/claude/rag.test.ts` - **ALL TESTS SHOULD PASS**

**Run integration test**: `npm test tests/integration/rag-chat-flow.test.ts` - **INTEGRATION TEST SHOULD PASS**

**Checkpoint**: User Story 1 complete - RAG context retrieval is functional and tested. Claude responses now include relevant past conversation context.

---

## Phase 4: User Story 2 - RAG Status Visibility (Priority: P2)

**Goal**: Display a visual indicator informing users that RAG is enabled for transparency

**Independent Test**: Navigate to `/chat` and verify a visual indicator (banner, icon, or label) appears informing users that RAG is active.

### Tests for User Story 2 (TDD)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T032 [P] [US2] Create component test file tests/unit/components/chat/ChatInterface.test.tsx
- [ ] T033 [US2] Write test: RAG indicator banner is visible in chat interface - FR-008, SC-004
- [ ] T034 [US2] Write test: RAG indicator appears within 1 second of page load - SC-004
- [ ] T035 [US2] Write test: RAG indicator shows explanatory text about conversation history

**Run tests**: `npm test tests/unit/components/chat/ChatInterface.test.tsx` - **TESTS SHOULD FAIL**

### Implementation for User Story 2

- [ ] T036 [US2] Verify RAG indicator banner exists in components/chat/ChatInterface.tsx (already implemented per quickstart.md)
- [ ] T037 [US2] Add hover/click tooltip with RAG explanation in components/chat/ChatInterface.tsx
- [ ] T038 [US2] Style RAG indicator for accessibility (ARIA labels, screen reader support) in components/chat/ChatInterface.tsx

**Run tests**: `npm test tests/unit/components/chat/ChatInterface.test.tsx` - **ALL TESTS SHOULD PASS**

**Checkpoint**: User Story 2 complete - Users can see and understand RAG status indicator

---

## Phase 5: User Story 3 - Graceful Degradation (Priority: P2)

**Goal**: Ensure chat continues to function normally even when RAG components fail

**Independent Test**: Simulate RAG failures (disconnected LanceDB, missing embeddings) and verify chat still works with standard (non-RAG) responses.

### Tests for User Story 3 (TDD)

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T039 [P] [US3] Create error handling test file tests/unit/lib/claude/rag-error-handling.test.ts
- [ ] T040 [P] [US3] Write test: buildRAGContext() returns empty context when LanceDB throws error - FR-009
- [ ] T041 [P] [US3] Write test: buildRAGContext() logs error when LanceDB unavailable - FR-010
- [ ] T042 [P] [US3] Write test: buildRAGContext() returns empty context when searchSimilarMessages() times out
- [ ] T043 [P] [US3] Write test: Chat API continues successfully when buildRAGContext() fails - SC-003
- [ ] T044 [US3] Write integration test: Chat works with null embeddings (new user scenario) - FR-012

**Run tests**: `npm test tests/unit/lib/claude/rag-error-handling.test.ts` - **TESTS SHOULD FAIL**

### Implementation for User Story 3

- [ ] T045 [US3] Enhance try-catch error handling in buildRAGContext() in lib/claude/rag.ts to catch all exceptions (T040, T042)
- [ ] T046 [US3] Add structured error logging in buildRAGContext() catch block in lib/claude/rag.ts (T041)
- [ ] T047 [US3] Verify chat API error handling in app/api/chat/conversations/[conversationId]/messages/route.ts continues on RAG failure (T043)
- [ ] T048 [US3] Add timeout handling for searchSimilarMessages() call in lib/claude/rag.ts (research.md: circuit breaker pattern)
- [ ] T049 [US3] Test manually: Stop LanceDB service and verify chat still works

**Run tests**: `npm test tests/unit/lib/claude/rag-error-handling.test.ts` - **ALL TESTS SHOULD PASS**

**Run integration test**: Verify chat continues with RAG disabled when LanceDB unavailable

**Checkpoint**: User Story 3 complete - Chat is resilient to RAG component failures (100% uptime)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Production readiness, optimization, and documentation

### Performance Optimization

- [ ] T050 [P] Research and document IVF_PQ index creation for LanceDB in docs/rag-performance.md (research.md section 1)
- [ ] T051 [P] Add column selection optimization to searchSimilarMessages() in lib/db/operations/messages-lancedb.ts
- [ ] T052 Implement performance monitoring for RAG operations (track executionTimeMs in logs)

### Documentation

- [ ] T053 [P] Update README.md with RAG feature documentation and setup instructions
- [ ] T054 [P] Document RAG troubleshooting steps in docs/troubleshooting.md (from quickstart.md)
- [ ] T055 [P] Add inline code documentation to lib/claude/rag.ts functions

### Final Validation

- [ ] T056 Run full test suite: `npm test` - verify all 211+ tests pass
- [ ] T057 Manual test: Verify SC-001 (90% context awareness) with real conversations
- [ ] T058 Manual test: Verify SC-002 (500ms retrieval) with production-scale data
- [ ] T059 Manual test: Verify SC-005 (100% greeting skip rate)
- [ ] T060 Manual test: Verify SC-006 (2000 token limit enforcement)

**Checkpoint**: RAG Integration is production-ready, all success criteria verified

---

## Dependencies & Execution Strategy

### User Story Dependencies (Parallel Execution)

```
Phase 1: Setup (T001-T005)
    ↓
Phase 2: Foundational Logging (T006-T008)
    ↓
┌──────────────────────────────────────────────┐
│  User stories can execute in parallel after  │
│  Phase 2 completes (independent stories)     │
└──────────────────────────────────────────────┘
    ↓
┌─────────────────┬─────────────────┬─────────────────┐
│   User Story 1  │  User Story 2   │  User Story 3   │
│   (T009-T031)   │  (T032-T038)    │  (T039-T049)    │
│   P1 - CORE     │  P2 - UX        │  P2 - RELIABILITY│
└─────────────────┴─────────────────┴─────────────────┘
    ↓
Phase 6: Polish (T050-T060)
```

### Within Each User Story (Parallelization Opportunities)

**User Story 1**: Test tasks T009-T020 can run in parallel (marked [P])
**User Story 2**: Test tasks T032-T035 can run in parallel (marked [P])
**User Story 3**: Test tasks T039-T044 can run in parallel (marked [P])

### Recommended MVP Scope

**Minimum Viable Product (MVP)**: Phase 1 + Phase 2 + User Story 1 (T001-T031)

This delivers the core RAG functionality:
- ✅ Automatic context retrieval from past conversations
- ✅ Greeting detection and skip logic
- ✅ Token limiting and context formatting
- ✅ Integration with Claude API
- ✅ Structured logging for observability

**Next Increment**: Add User Story 2 (T032-T038) for transparency
**Final Increment**: Add User Story 3 (T039-T049) for production resilience

---

## Implementation Strategy

### 1. Test-Driven Development (TDD)

**CRITICAL**: Follow TDD strictly per constitution requirement

For each user story:
1. Write ALL test tasks first (T009-T020 for US1, etc.)
2. Run tests - **verify they FAIL** (red phase)
3. Implement functionality tasks (T021-T031 for US1, etc.)
4. Run tests - **verify they PASS** (green phase)
5. Refactor with confidence (tests protect behavior)

### 2. Incremental Delivery

Ship each user story as an independent increment:
- **Increment 1 (MVP)**: US1 - Core RAG functionality
- **Increment 2**: US2 - User transparency
- **Increment 3**: US3 - Production resilience

Each increment is fully tested and deployable on its own.

### 3. Parallel Execution Examples

**Phase 2 (Foundational)**:
```bash
# All foundational tasks can run in sequence (quick setup)
T006 → T007 → T008 (15 minutes total)
```

**User Story 1 (Tests)**:
```bash
# All test tasks can be written in parallel by different developers
Developer 1: T009-T012 (shouldUseRAG tests)
Developer 2: T013-T018 (buildRAGContext tests)
Developer 3: T019-T020 (integration tests)
```

**User Story 1 (Implementation)**:
```bash
# Implementation tasks have dependencies (sequential)
T021 → T022 → T023 → T024 → T025 → T026 → T027 → T028 → T029 → T030 → T031
```

### 4. Task Effort Estimates

| Phase | Task Count | Estimated Time |
|-------|------------|----------------|
| Phase 1: Setup | 5 | 30 minutes |
| Phase 2: Foundational | 3 | 1 hour |
| Phase 3: US1 (Tests) | 12 | 3 hours |
| Phase 3: US1 (Impl) | 11 | 4 hours |
| Phase 4: US2 | 7 | 2 hours |
| Phase 5: US3 | 11 | 3 hours |
| Phase 6: Polish | 11 | 4 hours |
| **Total** | **60 tasks** | **~18 hours** |

**Note**: Times assume existing RAG implementation (lib/claude/rag.ts) is already functional per quickstart.md. Tasks focus on test coverage, logging, and production hardening.

---

## Success Criteria Verification

### Checklist for Feature Completion

After all tasks complete, verify each success criterion from spec.md:

- [ ] **SC-001**: Users asking follow-up questions receive context-aware responses (90% of cases)
  - **Test**: T020 integration test + manual verification with real conversations (T057)

- [ ] **SC-002**: RAG retrieval completes within 500ms for 10k messages
  - **Test**: T018 unit test + manual performance test (T058)

- [ ] **SC-003**: Chat works 100% of time even when RAG fails
  - **Test**: T043, T044 tests + manual LanceDB failure simulation (T049)

- [ ] **SC-004**: Users see RAG indicator within 1 second of viewing chat
  - **Test**: T033, T034 component tests

- [ ] **SC-005**: System skips RAG for greetings 100% of time
  - **Test**: T010 unit test + manual verification (T059)

- [ ] **SC-006**: RAG context stays within 2000 token limit 100% of time
  - **Test**: T016 unit test + manual verification (T060)

---

## Task Summary

**Total Tasks**: 66
**Test Tasks**: 26 (39% - TDD compliance)
**Implementation Tasks**: 40 (61%)

**Tasks per User Story**:
- Setup (Phase 1): 5 tasks
- Foundational (Phase 2): 3 tasks
- User Story 1 (P1): 23 tasks (12 tests + 11 implementation)
- User Story 2 (P2): 7 tasks (4 tests + 3 implementation)
- User Story 3 (P2): 11 tasks (6 tests + 5 implementation)
- Polish (Phase 6): 11 tasks

**Parallel Opportunities**: 20 tasks marked [P] can execute in parallel within their phase

**MVP Scope**: 31 tasks (Setup + Foundational + US1)

**Independent Test Criteria**:
- US1: Two-conversation context test (spec.md line 16)
- US2: Visual indicator visibility test (spec.md line 33)
- US3: RAG failure simulation test (spec.md line 48)

---

## References

- **Feature Specification**: [spec.md](./spec.md)
- **Implementation Plan**: [plan.md](./plan.md)
- **Research Findings**: [research.md](./research.md)
- **Data Model**: [data-model.md](./data-model.md)
- **API Contracts**: [contracts/rag-api.md](./contracts/rag-api.md)
- **Quickstart Guide**: [quickstart.md](./quickstart.md)
