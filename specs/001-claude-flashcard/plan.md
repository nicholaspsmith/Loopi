# Implementation Plan: MemoryLoop - Claude-Powered Flashcard Learning Platform

**Branch**: `001-claude-flashcard` | **Date**: 2025-12-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-claude-flashcard/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

MemoryLoop is a web application that enables users to learn through conversation with Claude and convert those conversations into flashcards for spaced repetition practice. The application provides an authenticated chat interface where users interact with Claude, generate flashcards from responses with a single click, and quiz themselves using those flashcards in a dedicated study interface with FSRS-based spaced repetition scheduling.

**Technical Approach**: Next.js full-stack application with vector database storage (LanceDB) for conversation and flashcard persistence, enabling future semantic search capabilities. Authentication via NextAuth.js, real-time Claude API integration, FSRS algorithm for optimal review scheduling, and modular component architecture supporting independent user story deployment.

## Technical Context

**Language/Version**: TypeScript 5.7.x with Next.js 15.1.x (App Router with React 19)

**Primary Dependencies**:

- Next.js 15.1.x (full-stack framework with App Router)
- React 19.x (UI components with React Compiler)
- NextAuth.js 5.x (authentication with Auth.js)
- @anthropic-ai/sdk latest (Claude API integration)
- vectordb latest (LanceDB Node.js client)
- ts-fsrs latest (FSRS spaced repetition algorithm)
- Tailwind CSS 4.x (styling)
- Zod 3.x (schema validation)

**Storage**: LanceDB (vector database) for user data, conversations, messages, flashcards, and review history with vector embeddings for future semantic search

**Testing**: Vitest latest (unit tests), Playwright latest (integration tests), React Testing Library latest (component tests)

**Target Platform**: Web browsers (Chrome, Firefox, Safari, Edge - modern versions), deployed on Vercel

**Project Type**: Web application (frontend + backend in Next.js)

**Performance Goals**:

- Page load < 2s (initial)
- Chat response rendering < 500ms
- Flashcard generation < 15s for 1000-word responses
- Quiz navigation < 100ms between cards
- FSRS scheduling calculation < 50ms per card

**Constraints**:

- Claude API rate limits (tier-dependent)
- LanceDB query performance for conversation retrieval
- Client-side bundle size < 500KB (initial load)
- Session management for persistent conversations
- FSRS state persistence in LanceDB for review scheduling

**Scale/Scope**:

- Initial: 50 concurrent users
- Conversation history: unlimited messages per user
- Flashcards: thousands per user with FSRS metadata
- Single production deployment at https://memoryloop.nicholaspsmith.com

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Documentation-First Development ✅ PASS

- ✅ Feature spec complete with user scenarios and acceptance criteria
- ✅ Functional requirements defined (FR-001 through FR-024)
- ✅ Success criteria measurable and technology-agnostic
- ✅ All NEEDS CLARIFICATION markers resolved before planning

### II. Test-First Development (TDD) ✅ PASS

- ✅ Acceptance scenarios defined for all user stories (Given/When/Then)
- ✅ Contract tests planned for API endpoints (auth, chat, flashcards)
- ✅ Integration tests planned for complete user journeys
- ✅ Test infrastructure identified (Vitest, Playwright, React Testing Library)
- ⚠️ **Requirement**: Tests MUST be written before implementation in task execution

### III. Modularity & Composability ✅ PASS

- ✅ Four independently testable user stories (P1-P4)
- ✅ Each story deliverable as standalone MVP increment:
  - P1: Authentication works independently
  - P2: Chat works with authenticated users
  - P3: Flashcard generation adds to chat capability
  - P4: Quiz mode consumes generated flashcards with FSRS scheduling
- ✅ Clear entity boundaries (User, Conversation, Message, Flashcard, Review Session, FSRS Review State)
- ✅ Component-based React architecture enables isolated development

### IV. Simplicity (YAGNI) ✅ PASS

- ✅ MVP scope: single chronological flashcard collection (no complex organization)
- ✅ Session-based auth (NextAuth.js 5 standard patterns, no custom auth)
- ✅ Single conversation stream per user (no multi-conversation UI complexity)
- ✅ FSRS library handles scheduling complexity (no custom algorithm)
- ✅ Future enhancements tracked separately (deferred to future specs)
- ✅ No premature abstractions: build features as needed per user story

### V. Observability & Debugging ✅ PASS

- ✅ Structured logging planned (console in dev, structured JSON in prod)
- ✅ Error boundaries for React components
- ✅ API error responses with actionable messages
- ✅ LanceDB queries logged for performance monitoring
- ✅ FSRS scheduling decisions logged for review optimization
- ✅ Client-side state observable via React DevTools

### Constitution Compliance Summary (Initial)

**Status**: ✅ **ALL GATES PASSED** - Ready to proceed to Phase 0 research

No complexity violations requiring justification. All constitutional principles satisfied by MVP scope. FSRS library reduces complexity by providing proven spaced repetition algorithm.

---

### Post-Design Re-Evaluation ✅ COMPLETE

**Date**: 2025-12-14
**Artifacts Reviewed**: data-model.md, contracts/\*.yaml, quickstart.md, research.md

#### I. Documentation-First Development ✅ PASS

- ✅ Complete data model with 5 entities fully documented
- ✅ All 4 API contract specifications (auth, chat, flashcards, quiz) in OpenAPI 3.1.0 format
- ✅ Comprehensive quickstart guide with setup, testing, and development workflows
- ✅ All functional requirements (FR-001 through FR-024) mapped to API endpoints
- ✅ Contract test scenarios defined for every requirement

**Finding**: Design phase produced comprehensive documentation before any implementation. All endpoints, schemas, and workflows fully specified.

#### II. Test-First Development (TDD) ✅ PASS

- ✅ Contract test scenarios embedded in all API specifications
- ✅ Test categories defined: unit (Vitest), component (RTL), integration (Playwright), contract (OpenAPI validation)
- ✅ Quickstart.md includes test-first workflow instructions
- ✅ Each user story has dedicated test sections (P1 → P2 → P3 → P4)
- ⚠️ **Reminder**: Tests MUST be written before implementation code during task execution

**Finding**: Testing infrastructure and strategies fully planned. Contract tests serve as acceptance criteria for API endpoints.

#### III. Modularity & Composability ✅ PASS

- ✅ Clean entity separation: User, Conversation, Message, Flashcard, ReviewLog (5 independent schemas)
- ✅ API organized into 4 logical groups (auth, chat, flashcards, quiz) - each independently testable
- ✅ FSRS scheduling isolated in dedicated lib (`lib/fsrs/scheduler.ts`)
- ✅ Component-based architecture: `components/auth/`, `components/chat/`, `components/flashcards/`, `components/quiz/`
- ✅ User stories remain independently deployable (P1 auth → P2 chat → P3 flashcards → P4 quiz)

**Finding**: Module boundaries are clear and well-defined. Each API contract can be developed and tested independently.

#### IV. Simplicity (YAGNI) ✅ PASS

- ✅ No premature abstractions: straightforward REST endpoints with Next.js App Router
- ✅ FSRS complexity encapsulated in ts-fsrs library (0 custom scheduling code)
- ✅ Single conversation stream per user (no multi-conversation UI in MVP)
- ✅ Chronological flashcard collection (no complex organization in MVP - FR-024)
- ✅ Session-based auth with NextAuth.js 5 defaults (no custom auth provider)
- ✅ LanceDB embedded for development simplicity (migration path to Postgres documented but not implemented)

**Finding**: Design maintains MVP scope. Future enhancements deferred to separate specs.

#### V. Observability & Debugging ✅ PASS

- ✅ Structured error responses in all API contracts (machine-readable codes + human messages)
- ✅ Logging requirements in quickstart.md (`LOG_LEVEL` environment variable)
- ✅ FSRS state fully inspectable (JSON column in database, exposed in API responses)
- ✅ Review logs table provides complete audit trail of user activity
- ✅ Performance targets embedded in contract specs (SC-002 through SC-006)
- ✅ Troubleshooting section in quickstart.md for common issues

**Finding**: Observability built into design. All state transitions (FSRS scheduling, conversation context, flashcard generation) are logged and traceable.

---

### Final Constitution Assessment

**Status**: ✅ **ALL PRINCIPLES PASS POST-DESIGN**

**Summary**: The design artifacts maintain full compliance with all constitutional principles. No complexity violations introduced during design phase. The architecture supports independent testing and deployment of each user story, with clear documentation and test-first workflows defined.

**Justifications Required**: None

**Blocking Issues**: None

**Recommendation**: ✅ **APPROVED TO PROCEED TO PHASE 2 (TASK GENERATION)**

## Project Structure

### Documentation (this feature)

```text
specs/001-claude-flashcard/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── auth.yaml        # Authentication API contracts
│   ├── chat.yaml        # Chat/Claude interaction contracts
│   ├── flashcards.yaml  # Flashcard generation contracts
│   └── quiz.yaml        # Quiz session contracts (includes FSRS endpoints)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
app/                      # Next.js 15 App Router (frontend + backend)
├── api/                  # API routes
│   ├── auth/             # NextAuth.js 5 routes
│   ├── chat/             # Claude conversation endpoints
│   ├── flashcards/       # Flashcard CRUD endpoints
│   └── quiz/             # Quiz session endpoints (FSRS integration)
├── (auth)/               # Route group for auth pages
│   └── login/            # Login page
├── (protected)/          # Route group for authenticated routes
│   ├── chat/             # Chat interface page
│   └── quiz/             # Quiz interface page (FSRS-powered)
└── layout.tsx            # Root layout

components/               # React components
├── auth/                 # Login, auth guards
├── chat/                 # Chat UI, message display
├── flashcards/           # Flashcard generation UI
└── quiz/                 # Quiz UI, flashcard display, FSRS rating

lib/                      # Shared utilities
├── db/                   # LanceDB client and queries
├── claude/               # Anthropic SDK wrapper
├── auth/                 # NextAuth 5 configuration
├── fsrs/                 # FSRS scheduler wrapper and utilities
└── validation/           # Zod schemas

types/                    # TypeScript type definitions

tests/
├── contract/             # API contract tests
├── integration/          # E2E user journey tests (Playwright)
└── unit/                 # Component and utility tests (includes FSRS logic)

public/                   # Static assets

# Root configuration files
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── auth.ts               # NextAuth 5 configuration
└── package.json
```

**Structure Decision**: Web application structure with Next.js 15 App Router conventions. The flat `app/` directory structure with route groups `(auth)` and `(protected)` provides clear separation between public and authenticated routes while maintaining Next.js conventions. The `lib/fsrs/` directory encapsulates all FSRS scheduling logic, keeping it modular and testable. This structure supports:

- Independent deployment of user stories (each story maps to specific routes)
- Clear separation between UI components and API logic
- FSRS scheduling isolated in dedicated lib for easy testing and future updates
- Test isolation (contract tests for APIs, integration tests for full journeys)
- Next.js 15 file conventions (Server Components by default, Client Components marked with 'use client')
- Future scalability (can extract API to separate service if needed)

## Complexity Tracking

**No violations** - Constitution check passed without complexity concerns.

---

## Phase 0: Research (To be generated)

Research will address:

- LanceDB integration patterns for Next.js 15 App Router
- NextAuth.js 5 (Auth.js) configuration for session-based auth with App Router
- Anthropic SDK best practices for conversation context management
- Flashcard generation prompting strategies
- ts-fsrs integration patterns and FSRS state persistence in LanceDB
- Vector embedding generation for semantic search readiness
- React 19 features and Server Components patterns

## Phase 1: Design Artifacts ✅ COMPLETE

**Status**: Complete
**Date**: 2025-12-14

### Deliverables

1. **[data-model.md](data-model.md)**: Entity schemas and database design
   - 5 entity schemas with Zod validation (User, Conversation, Message, Flashcard, ReviewLog)
   - LanceDB table structures with vector embeddings (1536 dimensions)
   - FSRS state persistence as JSON column in flashcards table
   - Complete query patterns and indexes
   - Database initialization and migration strategies

2. **[contracts/](contracts/)**: OpenAPI 3.1.0 API specifications
   - **[auth.yaml](contracts/auth.yaml)**: Authentication and session management endpoints
     - Sign in, sign up, sign out, session retrieval
     - NextAuth.js 5 integration patterns
     - Contract tests for FR-001, FR-002, FR-003, FR-022

   - **[chat.yaml](contracts/chat.yaml)**: Chat and conversation management endpoints
     - Conversation CRUD operations
     - Claude message streaming and context management
     - Contract tests for FR-005, FR-006, FR-007, FR-023

   - **[flashcards.yaml](contracts/flashcards.yaml)**: Flashcard generation and management endpoints
     - Generate flashcards from Claude responses
     - Duplicate prevention and content validation
     - Contract tests for FR-008, FR-009, FR-010, FR-017, FR-018, FR-019, FR-024

   - **[quiz.yaml](contracts/quiz.yaml)**: Quiz session and FSRS scheduling endpoints
     - Due card retrieval with FSRS filtering
     - Rating system (Again/Hard/Good/Easy) with state updates
     - Progress tracking and review history
     - Contract tests for FR-011, FR-012, FR-013, FR-014, FR-015, FR-020, FR-021

3. **[quickstart.md](quickstart.md)**: Development setup and testing guide
   - Prerequisites and initial setup (Node.js 20+, API keys)
   - Environment configuration (.env.local template)
   - Database initialization (LanceDB schema setup)
   - Development server and first-time access workflow
   - Testing strategies (unit, component, integration, contract)
   - Development workflows by user story (P1 → P4)
   - Troubleshooting common issues
   - Complete project structure reference

### Key Design Decisions

**Data Model**:

- Vector embeddings stored inline with entities (atomic consistency)
- FSRS state as JSON column (ts-fsrs Card object)
- Immutable message history (append-only)
- Mutable flashcard state (FSRS updates)
- Review logs separate table (analytics and optimization)

**API Design**:

- RESTful endpoints following Next.js 15 App Router conventions
- Session-based authentication with NextAuth.js 5
- OpenAPI 3.1.0 specifications with contract test scenarios
- Error handling with machine-readable codes and human-friendly messages
- Performance targets embedded in contract specs (SC-002 through SC-006)

**FSRS Integration**:

- 4-rating system (Again=1, Hard=2, Good=3, Easy=4)
- State progression (New → Learning → Review or Relearning)
- Due-based filtering for quiz sessions
- Review log persistence for analytics

**Development Workflow**:

- Test-first development (TDD) with contract tests
- Independent user story deployment (P1 → P2 → P3 → P4)
- LanceDB embedded for development, Postgres + pgvector option for Vercel production
- Seed data for testing FSRS scheduling scenarios
