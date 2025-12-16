# Tasks: MemoryLoop - Claude-Powered Flashcard Learning Platform

**Input**: Design documents from `/specs/001-claude-flashcard/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests MUST be written before implementation per constitution (TDD). Each user story includes contract tests and integration tests.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- Next.js 15 App Router: `app/`, `components/`, `lib/`, `types/`, `tests/`
- Configuration files at repository root
- LanceDB data storage in `data/lancedb/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure per plan.md

- [ ] T001 Initialize Next.js 15.1.x project with TypeScript 5.7.x and App Router
- [ ] T002 [P] Install core dependencies (React 19, NextAuth.js 5, @anthropic-ai/sdk, vectordb, ts-fsrs, Zod 3.x)
- [ ] T003 [P] Install dev dependencies (Vitest, Playwright, React Testing Library, ESLint, Prettier)
- [ ] T004 [P] Install Tailwind CSS 4.x and configure in tailwind.config.ts
- [ ] T005 Configure Next.js in next.config.ts (React Compiler, App Router, performance optimizations)
- [ ] T006 [P] Configure TypeScript in tsconfig.json with strict mode
- [ ] T007 [P] Configure Vitest in vitest.config.ts for unit tests
- [ ] T008 [P] Configure Playwright in playwright.config.ts for E2E tests
- [ ] T009 Create .env.example with all required environment variables
- [ ] T010 Create directory structure per plan.md (app, components, lib, types, tests)
- [ ] T011 [P] Setup ESLint configuration in .eslintrc.js
- [ ] T012 [P] Setup Prettier configuration in .prettierrc

**Checkpoint**: Basic project structure complete - can now build foundational infrastructure

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Infrastructure

- [ ] T013 Create LanceDB client singleton in lib/db/client.ts (connection management)
- [ ] T014 Create database schema initialization in lib/db/schema.ts (all 5 tables)
- [ ] T015 Create database initialization script npm run db:init
- [ ] T016 [P] Define User entity Zod schema in types/db.ts
- [ ] T017 [P] Define Conversation entity Zod schema in types/db.ts
- [ ] T018 [P] Define Message entity Zod schema in types/db.ts
- [ ] T019 [P] Define Flashcard entity Zod schema in types/db.ts
- [ ] T020 [P] Define ReviewLog entity Zod schema in types/db.ts
- [ ] T021 Create database query utilities in lib/db/queries.ts (shared CRUD operations)

### API Infrastructure

- [ ] T022 Create error handling utilities in lib/errors.ts (structured error responses)
- [ ] T023 Create API response helpers in lib/api/response.ts (consistent JSON responses)
- [ ] T024 Create logging infrastructure in lib/logger.ts (structured logging for dev/prod)

### Validation & Types

- [ ] T025 Create Zod validation helpers in lib/validation/helpers.ts (reusable validators)
- [ ] T026 Create TypeScript type definitions in types/index.ts (export all entity types)

### UI Infrastructure

- [ ] T027 Create root layout in app/layout.tsx (HTML shell, metadata, providers)
- [ ] T028 [P] Create global CSS in app/globals.css (Tailwind imports, base styles)
- [ ] T029 [P] Create loading component in app/loading.tsx (global loading state)
- [ ] T030 [P] Create error component in app/error.tsx (global error boundary)
- [ ] T031 Create route groups in app/(auth)/ and app/(protected)/ (directory structure)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - User Authentication (Priority: P1) 🎯 MVP

**Goal**: Authenticated users can sign up, log in, log out, and access protected routes. Unauthenticated users see login screen.

**Independent Test**: Navigate to app URL → see login screen → sign up with email/password → automatically logged in and redirected to chat → log out → redirected to login screen → log in with credentials → access chat interface.

**Maps to**: FR-001, FR-002, FR-003, FR-022

### Tests for User Story 1 (TDD - Write FIRST) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T032 [P] [US1] Contract test for POST /api/auth/signin in tests/contract/auth.test.ts
- [x] T033 [P] [US1] Contract test for POST /api/auth/signup in tests/contract/auth.test.ts
- [x] T034 [P] [US1] Contract test for POST /api/auth/signout in tests/contract/auth.test.ts
- [x] T035 [P] [US1] Contract test for GET /api/auth/session in tests/contract/auth.test.ts
- [x] T036 [US1] Integration test for authentication flow in tests/integration/auth-flow.spec.ts
- [x] T037 [P] [US1] Component test for LoginForm in tests/unit/components/auth/LoginForm.test.tsx
- [x] T038 [P] [US1] Component test for SignupForm in tests/unit/components/auth/SignupForm.test.tsx

### Implementation for User Story 1

- [x] T039 [US1] Configure NextAuth.js 5 in auth.ts (database session strategy, Credentials provider)
- [x] T040 [US1] Create NextAuth.js API route handler in app/api/auth/[...nextauth]/route.ts
- [x] T041 [US1] Create authentication helper functions in lib/auth/helpers.ts (password hashing, session validation)
- [ ] T042 [US1] Create middleware in middleware.ts (protect routes, redirect logic per FR-002, FR-003) - **Note**: Auth protection currently handled in app/(protected)/layout.tsx
- [x] T043 [P] [US1] Create LoginForm component in components/auth/LoginForm.tsx
- [x] T044 [P] [US1] Create SignupForm component in components/auth/SignupForm.tsx
- [x] T045 [US1] Create login page in app/(auth)/login/page.tsx
- [x] T046 [P] [US1] Create signup page in app/(auth)/signup/page.tsx
- [x] T047 [US1] Create user database operations in lib/db/operations/users.ts (createUser, getUserByEmail)
- [ ] T048 [US1] Add session expiration handling per FR-022 in middleware.ts - **Note**: Currently handled in app/(protected)/layout.tsx
- [x] T049 [US1] Create protected layout in app/(protected)/layout.tsx (auth guard, redirect to login)
- [x] T050 [US1] Create home redirect in app/page.tsx (redirect authenticated users to /chat per FR-003)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Users can sign up, log in, log out, and access control works.

---

## Phase 4: User Story 2 - Claude Chat Interaction (Priority: P2)

**Goal**: Authenticated users can have conversations with Claude, send messages, receive responses, and see complete conversation history in chronological order.

**Independent Test**: Log in → access chat tab → send message "What is spaced repetition?" → receive Claude response → send follow-up "Can you elaborate?" → Claude responds with context from previous message → scroll to see all messages in chronological order → reload page → conversation history persists (FR-023).

**Maps to**: FR-004, FR-005, FR-006, FR-007, FR-023

### Tests for User Story 2 (TDD - Write FIRST) ⚠️

- [x] T051 [P] [US2] Contract test for GET /api/chat/conversations in tests/contract/chat.test.ts
- [x] T052 [P] [US2] Contract test for POST /api/chat/conversations in tests/contract/chat.test.ts
- [x] T053 [P] [US2] Contract test for GET /api/chat/conversations/{id}/messages in tests/contract/chat.test.ts
- [x] T054 [P] [US2] Contract test for POST /api/chat/conversations/{id}/messages in tests/contract/chat.test.ts
- [x] T055 [US2] Integration test for chat conversation flow in tests/integration/chat-flow.spec.ts
- [x] T056 [P] [US2] Component test for ChatInterface in tests/unit/components/chat/ChatInterface.test.tsx
- [x] T057 [P] [US2] Component test for MessageList in tests/unit/components/chat/MessageList.test.tsx
- [x] T058 [P] [US2] Component test for MessageInput in tests/unit/components/chat/MessageInput.test.tsx
- [x] T059 [P] [US2] Unit test for Claude client in tests/unit/lib/claude/client.test.ts

### Implementation for User Story 2

- [x] T060 [US2] Create Anthropic SDK client wrapper in lib/claude/client.ts (singleton, conversation context)
- [x] T061 [P] [US2] Create Claude prompts in lib/claude/prompts.ts (system prompts, formatting)
- [x] T062 [US2] Create conversation database operations in lib/db/operations/conversations.ts (create, get, list)
- [x] T063 [US2] Create message database operations in lib/db/operations/messages.ts (create, get, list chronologically)
- [x] T064 [US2] Create GET /api/chat/conversations route in app/api/chat/conversations/route.ts
- [x] T065 [US2] Create POST /api/chat/conversations route in app/api/chat/conversations/route.ts
- [x] T066 [US2] Create GET /api/chat/conversations/[conversationId]/messages route in app/api/chat/conversations/[conversationId]/messages/route.ts
- [x] T067 [US2] Create POST /api/chat/conversations/[conversationId]/messages route in app/api/chat/conversations/[conversationId]/messages/route.ts (Claude API integration)
- [x] T068 [P] [US2] Create MessageList component in components/chat/MessageList.tsx (chronological display per FR-007)
- [x] T069 [P] [US2] Create MessageInput component in components/chat/MessageInput.tsx (send message UI)
- [x] T070 [P] [US2] Create Message component in components/chat/Message.tsx (single message display, role-based styling)
- [x] T071 [US2] Create ChatInterface component in components/chat/ChatInterface.tsx (orchestrate messages, input, conversation context)
- [x] T072 [US2] Create chat page in app/(protected)/chat/page.tsx (2-tab layout per FR-004, chat tab active)
- [x] T073 [US2] Add conversation context management in lib/claude/context.ts (maintain context per FR-006)
- [x] T074 [US2] Add conversation history persistence per FR-023 (verify messages persist across sessions)
- [x] T075 [US2] Create Ollama embeddings client in lib/embeddings/ollama.ts (for message embeddings)
- [x] T076 [US2] Add embedding generation to message creation (async, graceful degradation)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Users can authenticate and have persistent conversations with Claude.

---

## Phase 5: User Story 3 - Flashcard Generation from Chat (Priority: P3)

**Goal**: Users can click "Generate Flashcards" button on Claude responses to automatically create question-answer flashcard pairs. System prevents duplicates and provides feedback during generation.

**Independent Test**: Log in → send message to Claude → receive response → click "Generate Flashcards" button → see loading feedback → flashcards created → confirmation shows count → button changes to "Flashcards Generated" (duplicate prevention per FR-017) → click again → see "already generated" message.

**Maps to**: FR-008, FR-009, FR-010, FR-016, FR-017, FR-018, FR-019, FR-024

### Tests for User Story 3 (TDD - Write FIRST) ⚠️

- [x] T077 [P] [US3] Contract test for POST /api/flashcards/generate in tests/contract/flashcards.test.ts
- [x] T078 [P] [US3] Contract test for GET /api/flashcards in tests/contract/flashcards.test.ts
- [x] T079 [P] [US3] Contract test for GET /api/flashcards/{id} in tests/contract/flashcards.test.ts
- [x] T080 [P] [US3] Contract test for DELETE /api/flashcards/{id} in tests/contract/flashcards.test.ts
- [x] T081 [US3] Integration test for flashcard generation flow in tests/integration/flashcard-generation.spec.ts
- [x] T082 [P] [US3] Component test for GenerateFlashcardsButton in tests/unit/components/chat/GenerateFlashcardsButton.test.tsx
- [x] T083 [P] [US3] Component test for FlashcardPreview in tests/unit/components/flashcards/FlashcardPreview.test.tsx
- [x] T084 [P] [US3] Unit test for flashcard generator in tests/unit/lib/claude/flashcard-generator.test.ts

### Implementation for User Story 3

- [x] T085 [US3] Create flashcard generation prompts in lib/claude/flashcard-generator.ts (Claude prompts for Q&A extraction)
- [x] T086 [US3] Create flashcard database operations in lib/db/operations/flashcards.ts (create, get, list, delete)
- [x] T087 [US3] Create FSRS scheduler wrapper in lib/fsrs/scheduler.ts (initialize new cards with ts-fsrs)
- [x] T088 [US3] Create POST /api/flashcards/generate route in app/api/flashcards/generate/route.ts (Claude API call, FSRS init)
- [x] T089 [US3] Create GET /api/flashcards route in app/api/flashcards/route.ts (list user flashcards chronologically per FR-024)
- [x] T090 [US3] Create GET /api/flashcards/[flashcardId] route in app/api/flashcards/[flashcardId]/route.ts
- [x] T091 [US3] Create DELETE /api/flashcards/[flashcardId] route in app/api/flashcards/[flashcardId]/route.ts
- [x] T092 [P] [US3] Create GenerateFlashcardsButton component in components/chat/GenerateFlashcardsButton.tsx (button UI, loading state per FR-018, duplicate check per FR-017)
- [x] T093 [P] [US3] Create FlashcardPreview component in components/flashcards/FlashcardPreview.tsx (show generated flashcards)
- [x] T094 [US3] Update Message component to include GenerateFlashcardsButton for assistant messages (FR-008)
- [x] T095 [US3] Add insufficient content handling per FR-019 (validate response has educational content)
- [x] T096 [US3] Add flashcard generation feedback per FR-018 (loading spinner, progress, completion message with count)
- [x] T097 [US3] Update message hasFlashcards flag after generation (prevent duplicates per FR-017)
- [x] T098 [US3] Add question embedding generation for flashcards (async, graceful degradation)

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently. Users can authenticate, chat with Claude, and generate flashcards.

---

## Phase 6: User Story 4 - Flashcard Quiz Practice (Priority: P4)

**Goal**: Users can review flashcards in quiz tab using FSRS spaced repetition. Cards shown one at a time with question visible, answer hidden until revealed. After rating (Again/Hard/Good/Easy), FSRS updates next review date.

**Independent Test**: Log in → click Quiz tab → see flashcard with question only → click "Show Answer" → answer revealed → click rating button (Good) → next card appears → see progress "Card 2 of 10" (FR-020) → complete all cards → see completion message (FR-021) → reload → due cards updated based on FSRS schedule.

**Maps to**: FR-011, FR-012, FR-013, FR-014, FR-015, FR-020, FR-021

### Tests for User Story 4 (TDD - Write FIRST) ⚠️

- [x] T099 [P] [US4] Contract test for GET /api/quiz/due in tests/contract/quiz.test.ts
- [x] T100 [P] [US4] Contract test for POST /api/quiz/rate in tests/contract/quiz.test.ts
- [x] T101 [P] [US4] Contract test for GET /api/quiz/stats in tests/contract/quiz.test.ts
- [x] T102 [P] [US4] Contract test for GET /api/quiz/history in tests/contract/quiz.test.ts
- [x] T103 [US4] Integration test for quiz session flow in tests/integration/quiz-session.test.ts
- [x] T104 [P] [US4] Component test for QuizCard in tests/unit/components/quiz/QuizCard.test.tsx
- [x] T105 [P] [US4] Component test for QuizProgress in tests/unit/components/quiz/QuizProgress.test.tsx
- [x] T106 [P] [US4] Component test for QuizStats in tests/unit/components/quiz/QuizStats.test.tsx
- [x] T107 [P] [US4] Unit test for FSRS scheduler in tests/unit/lib/fsrs/scheduler.test.ts

### Implementation for User Story 4

- [x] T108 [US4] Create review log database operations in lib/db/operations/review-logs.ts (create, get history)
- [x] T109 [US4] Create FSRS utilities in lib/fsrs/utils.ts (rating helpers, state helpers)
- [x] T110 [US4] Create GET /api/quiz/due route in app/api/quiz/due/route.ts (filter by FSRS due date)
- [x] T111 [US4] Create POST /api/quiz/rate route in app/api/quiz/rate/route.ts (FSRS repeat, update card, create log)
- [x] T112 [US4] Create GET /api/quiz/stats route in app/api/quiz/stats/route.ts (progress tracking per FR-020)
- [x] T113 [US4] Create GET /api/quiz/history route in app/api/quiz/history/route.ts (review log retrieval)
- [x] T114 [P] [US4] Create QuizCard component in components/quiz/QuizCard.tsx (question/answer flip per FR-013, FR-014, 4-button rating)
- [x] T115 [P] [US4] Create QuizProgress component in components/quiz/QuizProgress.tsx (show position "Card X of Y" per FR-020)
- [x] T116 [P] [US4] Create QuizStats component in components/quiz/QuizStats.tsx (display due count, reviewed today, retention rate)
- [x] T117 [P] [US4] Create RatingButtons component in components/quiz/RatingButtons.tsx (Again/Hard/Good/Easy buttons)
- [x] T118 [US4] Create QuizInterface component in components/quiz/QuizInterface.tsx (orchestrate quiz flow per FR-012)
- [x] T119 [US4] Create quiz page in app/(protected)/quiz/page.tsx (quiz tab in 2-tab layout)
- [x] T120 [US4] Add completion notification per FR-021 (modal or message when all cards reviewed)
- [x] T121 [US4] Add empty state for quiz tab per FR-011 acceptance scenario 7 (no flashcards yet)
- [x] T122 [US4] Update flashcard FSRS state after rating (delete + insert pattern for LanceDB)
- [x] T123 [US4] Create review log entry after each rating (audit trail for analytics)

**Checkpoint**: All user stories should now be independently functional. Complete end-to-end flow: authenticate → chat → generate flashcards → quiz with FSRS scheduling.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T124 [P] Add error boundaries to all major components (app/error.tsx, per-route errors)
- [x] T125 [P] Add loading states to all async operations (Suspense boundaries, skeleton screens)
- [x] T126 [P] Add accessibility attributes (ARIA labels, keyboard navigation, screen reader support)
- [x] T127 [P] Add responsive design for mobile (Tailwind breakpoints, mobile-first)
- [x] T138 [P] Documentation: update README.md with setup instructions
- [x] T139 [P] Documentation: create CONTRIBUTING.md with development guidelines

**Note**: Tasks T128-T137, T140-T145 (performance optimization, security hardening, logging, monitoring, testing, and offline support) have been moved to a separate specification: `specs/003-production-polish/spec.md` on branch `003-production-polish`. These production readiness tasks will be implemented after the CI/CD deployment feature (002-ci-cd-deployment).

**Checkpoint**: Core application features complete with documentation. Production polish and deployment covered in separate specifications.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4)
- **Polish (Phase 7)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Depends on US1 for authentication, but independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Depends on US2 for messages, but independently testable
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Depends on US3 for flashcards, but independently testable

**Note**: While US2 depends on US1, US3 on US2, and US4 on US3 for full functionality, each story should have independent test scenarios that validate its core capabilities.

### Within Each User Story

1. Tests MUST be written and FAIL before implementation (TDD)
2. Contract tests before API routes
3. Component tests before components
4. Unit tests before utilities/services
5. Database operations before API routes
6. Components before pages
7. Core implementation before integration
8. Story complete before moving to next priority

### Parallel Opportunities

**Setup (Phase 1)**:

- T002-T004 (dependencies installation)
- T006-T008 (configuration files)
- T011-T012 (linting/formatting)

**Foundational (Phase 2)**:

- T016-T020 (Zod schemas - all entity types)
- T028-T030 (UI infrastructure components)

**User Story 1 Tests**:

- T032-T035 (contract tests)
- T037-T038 (component tests)

**User Story 1 Implementation**:

- T043-T044 (auth forms)
- T045-T046 (auth pages)

**User Story 2 Tests**:

- T051-T054 (contract tests)
- T056-T059 (component and unit tests)

**User Story 2 Implementation**:

- T060-T061 (Claude client and prompts)
- T062-T063 (database operations)
- T068-T070 (chat components)

**User Story 3 Tests**:

- T077-T080 (contract tests)
- T082-T084 (component and unit tests)

**User Story 3 Implementation**:

- T092-T093 (flashcard components)

**User Story 4 Tests**:

- T099-T102 (contract tests)
- T104-T107 (component and unit tests)

**User Story 4 Implementation**:

- T114-T117 (quiz components)

**Polish (Phase 7)**:

- T124-T135 (error handling, loading, accessibility, performance, security)
- T136-T145 (documentation, testing, deployment)

---

## Parallel Example: User Story 1 (Authentication)

```bash
# Launch all contract tests for User Story 1 together (TDD - write first):
Task T032: "Contract test for POST /api/auth/signin"
Task T033: "Contract test for POST /api/auth/signup"
Task T034: "Contract test for POST /api/auth/signout"
Task T035: "Contract test for GET /api/auth/session"

# After tests written and failing, launch component tests in parallel:
Task T037: "Component test for LoginForm"
Task T038: "Component test for SignupForm"

# After all tests failing, implement auth forms in parallel:
Task T043: "Create LoginForm component"
Task T044: "Create SignupForm component"

# Implement auth pages in parallel:
Task T045: "Create login page"
Task T046: "Create signup page"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T012)
2. Complete Phase 2: Foundational (T013-T031) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 (T032-T050)
   - Write tests first (T032-T038)
   - Ensure tests fail
   - Implement features (T039-T050)
   - Verify tests pass
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo authentication-only MVP if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (Authentication MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Add Chat capability)
4. Add User Story 3 → Test independently → Deploy/Demo (Add Flashcard generation)
5. Add User Story 4 → Test independently → Deploy/Demo (Add Quiz with FSRS)
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T031)
2. Once Foundational is done:
   - **Developer A**: User Story 1 (T032-T050) - Authentication
   - **Developer B**: User Story 2 (T051-T076) - Chat (waits for US1 auth)
   - **Developer C**: User Story 3 (T077-T098) - Flashcards (waits for US2 messages)
   - **Developer D**: User Story 4 (T099-T123) - Quiz (waits for US3 flashcards)
3. Stories complete and integrate sequentially due to dependencies, but can be developed in parallel once dependencies are met

**Recommended**: Sequential delivery (P1 → P2 → P3 → P4) for this project due to functional dependencies between stories.

---

## Task Summary

**Total Tasks**: 146

- **Setup (Phase 1)**: 12 tasks
- **Foundational (Phase 2)**: 19 tasks
- **User Story 1 - Authentication (P1)**: 19 tasks (7 tests + 12 implementation)
- **User Story 2 - Chat (P2)**: 26 tasks (9 tests + 17 implementation)
- **User Story 3 - Flashcards (P3)**: 22 tasks (8 tests + 14 implementation)
- **User Story 4 - Quiz (P4)**: 25 tasks (9 tests + 16 implementation)
- **Polish (Phase 7)**: 23 tasks (includes offline mode and navigation component)

**Parallel Opportunities**: 67 tasks marked [P] can run in parallel within their phases

**Independent Test Criteria**:

- **US1**: Can authenticate, sign up, log in, log out, and access control works
- **US2**: Can have persistent conversations with Claude maintaining context
- **US3**: Can generate flashcards from Claude responses with duplicate prevention
- **US4**: Can quiz flashcards with FSRS scheduling and progress tracking

**Suggested MVP Scope**: Complete through User Story 1 (Authentication only) for initial deployment validation

**CI/CD & Deployment**: Moved to separate specification at `specs/002-ci-cd-deployment/` on branch `002-ci-cd-deployment`

---

## Notes

- [P] tasks = different files, no dependencies within phase
- [Story] label maps task to specific user story for traceability
- Each user story has independent test criteria
- TDD REQUIRED: Write tests first, ensure they fail, then implement
- Commit after each task or logical group following rules in .claude/rules.md for commit messages
- Stop at any checkpoint to validate story independently
- Constitution compliance: Documentation-first ✅, TDD ✅, Modular ✅, Simple ✅, Observable ✅
