# Implementation Plan: Flashcard Deck Organization

**Branch**: `012-flashcard-decks` | **Date**: 2025-12-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-flashcard-decks/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable users to organize flashcards into named collections (decks) for focused study sessions. Implements manual deck creation/management (P1), deck-filtered FSRS study sessions with optional per-deck settings overrides (P1), deck editing capabilities (P2), and AI-powered deck creation using hybrid LanceDB vector search + Claude LLM semantic re-ranking (P3). System enforces hard limits (1000 cards/deck, 100 decks/user) and supports live updates during active study sessions.

## Technical Context

**Language/Version**: TypeScript 5.7.0, Node.js 20+
**Primary Dependencies**: Next.js 16.0.10, React 19.2.3, Drizzle ORM 0.45.1, @lancedb/lancedb 0.22.3, @anthropic-ai/sdk 0.71.2, ts-fsrs 5.2.3
**Storage**: PostgreSQL (postgres 3.4.7) for deck/relationship data, LanceDB 0.22.3 for vector embeddings
**Testing**: Vitest 4.0.15 (unit/integration), Playwright 1.57.0 (E2E)
**Target Platform**: Next.js 16 App Router web application (server + client components)
**Project Type**: Web application (Next.js full-stack)
**Performance Goals**: AI deck generation <10s for 100+ cards, deck UI <2s load for 50+ decks, live session updates <5s
**Constraints**: Hard limits (1000 cards/deck, 100 decks/user), vector search + LLM re-ranking within 10s timeout
**Scale/Scope**: Support 100 decks × 1000 cards = 100k deck-card relationships per user, concurrent study sessions with live updates

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### I. Documentation-First Development

✅ **PASS** - Feature spec complete with:
- 4 prioritized user stories (P1/P2/P3) with independent test criteria
- 35 functional requirements (FR-001 through FR-035)
- 13 success criteria with measurable outcomes
- 5 clarification sessions resolved all ambiguities

### II. Test-First Development (TDD)

✅ **PASS** - Plan includes:
- Contract tests for deck CRUD operations
- Contract tests for AI generation API
- Integration tests for deck-filtered FSRS sessions
- Integration tests for live session updates
- E2E tests for each user story
- Tests will be written before implementation (enforced in tasks.md)

### III. Modularity & Composability

✅ **PASS** - Design uses independent modules:
- Deck data layer (PostgreSQL operations)
- AI deck generation service (LanceDB + Claude API)
- Deck-filtered FSRS scheduler (extends existing FSRS)
- Deck management UI components
- Each user story independently testable and deployable

### IV. Simplicity (YAGNI)

⚠️ **JUSTIFIED COMPLEXITY**:
- **Live session updates**: Required by spec (FR-030, FR-031) for concurrent editing scenarios
- **Deck-specific FSRS overrides**: Required by spec (FR-028, FR-029) for advanced users
- **Hybrid AI approach**: Required by clarification session (vector search + LLM re-ranking)

All complexity directly maps to explicit requirements. No speculative features.

### V. Observability & Debugging

✅ **PASS** - Plan includes:
- Structured logging for deck operations (create, update, delete)
- AI generation pipeline logging (vector search results, LLM filtering)
- Performance metrics for AI generation latency
- Error context for limit violations and AI failures
- Session state logging for live update debugging

### VI. Atomic Commits & Version Control Discipline

✅ **PASS** - Implementation will follow:
- Atomic commits per task from tasks.md
- Commit messages per .claude/rules.md
- One logical change per commit
- Co-Authored-By: Claude tags allowed

**Gate Status**: ✅ ALL GATES PASS - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/012-flashcard-decks/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0: Technical decisions
├── data-model.md        # Phase 1: Entity relationships
├── quickstart.md        # Phase 1: Integration scenarios
├── contracts/           # Phase 1: API contracts
│   ├── deck-crud.yaml
│   ├── deck-ai-generation.yaml
│   └── deck-study-session.yaml
└── tasks.md             # Phase 2: /speckit.tasks output (not created yet)
```

### Source Code (repository root)

```text
# Next.js App Router structure
app/
├── api/
│   ├── decks/                    # Deck CRUD endpoints
│   │   ├── route.ts              # GET (list), POST (create)
│   │   └── [deckId]/
│   │       ├── route.ts          # GET, PATCH, DELETE
│   │       ├── cards/
│   │       │   └── route.ts      # POST (add), DELETE (remove)
│   │       └── settings/
│   │           └── route.ts      # PATCH (deck-specific FSRS overrides)
│   ├── decks-ai/                 # AI deck generation
│   │   └── route.ts              # POST (generate suggestions)
│   └── study/
│       └── deck-session/
│           └── route.ts          # POST (start deck-filtered session)
├── decks/                        # Deck management UI
│   ├── page.tsx                  # Deck list page
│   ├── [deckId]/
│   │   ├── page.tsx              # Deck detail/edit page
│   │   └── study/
│   │       └── page.tsx          # Deck study session page
│   └── new/
│       └── page.tsx              # Create deck page
└── study/
    └── [sessionId]/
        └── page.tsx              # Modified to support deck filtering

components/
├── decks/
│   ├── DeckList.tsx              # Deck list with usage stats
│   ├── DeckCard.tsx              # Deck preview card
│   ├── DeckEditor.tsx            # Add/remove cards interface
│   ├── DeckSettings.tsx          # FSRS overrides form
│   └── AIGenerationDialog.tsx   # AI deck creation flow
└── study/
    └── DeckSessionControls.tsx  # Deck-specific session UI

lib/
├── db/
│   ├── drizzle-schema.ts         # Add: decks, deck_cards tables
│   └── operations/
│       ├── decks.ts              # CRUD operations
│       └── deck-cards.ts         # Relationship operations
├── ai/
│   └── deck-generation.ts        # Hybrid vector + LLM service
├── fsrs/
│   └── deck-scheduler.ts         # Deck-filtered FSRS logic
└── validation/
    └── deck-limits.ts            # Hard limit enforcement

tests/
├── contract/
│   ├── deck-crud.test.ts
│   ├── deck-ai-generation.test.ts
│   └── deck-study-session.test.ts
├── integration/
│   ├── deck-management.test.ts
│   ├── deck-filtered-fsrs.test.ts
│   └── live-session-updates.test.ts
└── e2e/
    ├── manual-deck-creation.spec.ts      # User Story 1
    ├── deck-editing.spec.ts              # User Story 2
    ├── ai-deck-generation.spec.ts        # User Story 3
    └── deck-study-sessions.spec.ts       # User Story 4

drizzle/
└── 0006_add_decks.sql            # Migration for decks tables
```

**Structure Decision**: Extends existing Next.js 16 App Router structure. New `/decks` route for deck management UI, new API routes under `/api/decks*` for CRUD and AI generation, integration with existing `/study` flow for deck-filtered sessions. Database operations follow existing Drizzle ORM patterns in `lib/db/operations/`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No unjustified complexity violations. All complexity (live updates, deck-specific overrides, hybrid AI) is explicitly required by functional requirements.

## Phase 0: Research & Technical Decisions

_See [research.md](./research.md) for detailed findings._

### Research Tasks

1. **Hybrid AI Deck Generation Architecture** (FR-013, FR-014)
   - How to structure vector search → LLM re-ranking pipeline?
   - What are LanceDB query patterns for top-K similarity search?
   - How to pass vector results to Claude API for re-ranking?
   - Error handling when LanceDB or Claude API unavailable?

2. **Deck-Filtered FSRS Scheduling** (FR-009, FR-010, FR-011)
   - How to filter FSRS queue by deck membership?
   - How to apply deck-specific overrides (FR-027, FR-028, FR-029)?
   - Does global FSRS state update correctly during deck sessions?
   - How to handle "new cards per day" limit with deck overrides?

3. **Live Session Updates Implementation** (FR-030, FR-031)
   - Server-sent events vs polling for live deck updates?
   - How to detect deck changes and push to active sessions?
   - What happens to session state when cards added/removed mid-session?
   - Race condition handling for concurrent deck edits?

4. **Hard Limit Enforcement** (FR-032, FR-033, FR-034)
   - Where to enforce limits: database constraints, application layer, both?
   - How to handle batch operations approaching limits?
   - What happens to AI generation when result exceeds deck limit?

5. **PostgreSQL Many-to-Many Performance** (DeckCard entity)
   - Indexing strategy for deck_cards join table?
   - Query performance for 1000 cards × 100 decks?
   - How to efficiently count cards per deck?

### Decision Summary

See [research.md](./research.md) for:
- Decision: [what was chosen]
- Rationale: [why chosen]
- Alternatives considered: [what else evaluated]
- Implementation notes: [how to build it]

## Phase 1: Design Artifacts

### Data Model

_See [data-model.md](./data-model.md) for complete entity definitions._

**New Entities**:
- `Deck`: id, user_id, name, created_at, last_studied_at, archived, new_cards_per_day_override, cards_per_session_override
- `DeckCard`: id, deck_id, flashcard_id, added_at

**Entity Relationships**:
- User 1:N Deck (user owns many decks)
- Deck N:M Flashcard (through DeckCard join table)
- Flashcard maintains global FSRS state independent of deck membership

**Constraints**:
- Maximum 100 decks per user (CHECK constraint + application validation)
- Maximum 1000 cards per deck (application validation before insert)
- Cascade delete: Delete deck → delete all deck_cards (preserve flashcards)
- Cascade delete: Delete flashcard → delete all deck_cards (update deck counts)

### API Contracts

_See [contracts/](./contracts/) for OpenAPI specifications._

**Deck CRUD** (`contracts/deck-crud.yaml`):
- `GET /api/decks` - List user's decks with metadata
- `POST /api/decks` - Create new deck (validates 100-deck limit)
- `GET /api/decks/{deckId}` - Get deck details with card list
- `PATCH /api/decks/{deckId}` - Update name, settings, archived status
- `DELETE /api/decks/{deckId}` - Delete deck (preserve flashcards)
- `POST /api/decks/{deckId}/cards` - Add cards to deck (validates 1000-card limit)
- `DELETE /api/decks/{deckId}/cards` - Remove cards from deck

**AI Deck Generation** (`contracts/deck-ai-generation.yaml`):
- `POST /api/decks-ai` - Generate deck suggestions from topic
  - Request: { topic: string, minCards?: number, maxCards?: number }
  - Response: { suggestions: FlashcardSuggestion[], candidateCount: number }
  - Pipeline: Vector search (top 30-50) → LLM re-rank → filtered results

**Deck Study Session** (`contracts/deck-study-session.yaml`):
- `POST /api/study/deck-session` - Start deck-filtered FSRS session
  - Request: { deckId: string, settings?: DeckSessionSettings }
  - Response: { sessionId: string, dueCards: FlashcardWithFSRS[] }
  - Applies deck-specific overrides if configured

### Integration Scenarios

_See [quickstart.md](./quickstart.md) for step-by-step integration examples._

**Scenario 1**: Manual deck creation and study (User Story 1)
**Scenario 2**: AI-powered deck generation (User Story 3)
**Scenario 3**: Deck-filtered study with FSRS (User Story 4)
**Scenario 4**: Live session updates during concurrent editing (FR-030, FR-031)

## Core Implementation Steps

### Phase 1: Setup & Initialization (Foundation)

**Prerequisites**: Node.js 20+, PostgreSQL installed

1. Verify project structure matches plan.md "Source Code" section (Next.js 16 App Router layout)
2. Install dependencies: `npm install drizzle-orm @lancedb/lancedb @anthropic-ai/sdk ts-fsrs uuid zod`
3. Install dev dependencies: `npm install -D drizzle-kit @types/uuid`
4. Configure environment variables in `.env.local`:
   - `DATABASE_URL` - PostgreSQL connection string
   - `LANCEDB_PATH` - LanceDB storage directory
   - `ANTHROPIC_API_KEY` - Claude API key (for AI generation)
5. Verify TypeScript configuration (tsconfig.json) includes strict mode per constitution
6. Run existing migrations to ensure database is up-to-date: `npm run db:migrate`
7. Verify LanceDB connection and existing flashcard embeddings available

**Success Criteria**: Development environment ready, all dependencies installed, database accessible

### Phase 2: Database & Schema (P1 Foundation)

**References**: [data-model.md](./data-model.md) for complete entity definitions, constraints, and migration SQL

1. Create Drizzle schema for `decks` and `deck_cards` tables (see data-model.md entities section for complete field definitions)
2. Generate migration `0006_add_decks.sql` with constraints (see data-model.md migration section for exact SQL)
3. Create database operations: `lib/db/operations/decks.ts`, `lib/db/operations/deck-cards.ts` (implement CRUD per data-model.md business rules)
4. Implement hard limit validation in operations layer (100 decks/user, 1000 cards/deck per data-model.md)
5. Add indexes per data-model.md indexing strategy: deck(user_id), deck(user_id, archived), deck_cards(deck_id), deck_cards(flashcard_id), unique(deck_id, flashcard_id)

### Phase 3: Deck CRUD API (P1 Foundation)

**References**: [contracts/deck-crud.yaml](./contracts/deck-crud.yaml) for complete API specifications

Implement 7 REST endpoints per OpenAPI contract (contracts/deck-crud.yaml):

1. `POST /api/decks` - Create deck with 100-deck limit check (returns 403 if limit exceeded)
2. `GET /api/decks` - List decks with metadata (supports ?archived and ?sortBy query params per contract)
3. `GET /api/decks/{deckId}` - Get deck with full card list (returns DeckWithCards schema)
4. `PATCH /api/decks/{deckId}` - Update name, settings, archived (partial updates supported)
5. `DELETE /api/decks/{deckId}` - Delete deck (cascade to deck_cards, returns 204)
6. `POST /api/decks/{deckId}/cards` - Add cards with 1000-card limit (idempotent, returns 403 if limit exceeded)
7. `DELETE /api/decks/{deckId}/cards` - Remove cards from deck (idempotent, returns removed count)

All endpoints must match request/response schemas in contract exactly (validated by contract tests in Phase 9).

### Phase 4: Deck Management UI (P1 Core)

**References**: [quickstart.md](./quickstart.md) Scenario 1 for manual deck creation flow

1. Create `app/decks/page.tsx` - Deck list with usage stats (X/100 decks, Y/1000 cards)
2. Create `app/decks/new/page.tsx` - Create deck form with name validation
3. Create `app/decks/{deckId}/page.tsx` - Deck detail page with card list
4. Create `components/decks/DeckEditor.tsx` - Add/remove cards interface
5. Create `components/decks/DeckCard.tsx` - Deck preview with metadata
6. Implement limit violation error UI with actionable messages
7. Add empty state handling in `app/decks/new/page.tsx` - If user has 0 flashcards, show message: "Create some flashcards first before organizing them into decks" with link to flashcard creation (addresses edge case from spec.md line 105)

### Phase 5: Deck-Filtered FSRS (P1 Core)

**References**:
- [research.md](./research.md) "Deck-Filtered FSRS Scheduling" section for filtering architecture
- [contracts/deck-study-session.yaml](./contracts/deck-study-session.yaml) for session API contract
- [quickstart.md](./quickstart.md) Scenarios 1, 3, 4 for integration flows

1. Create `lib/fsrs/deck-scheduler.ts` - Filter FSRS queue by deck membership using query-level filtering approach per research.md (WHERE flashcard_id IN (SELECT flashcard_id FROM deck_cards WHERE deck_id = ?))
2. Implement deck-specific override logic (new_cards_per_day, cards_per_session) with precedence: session overrides > deck overrides > global settings (per research.md)
3. Create `POST /api/study/deck-session` endpoint per contracts/deck-study-session.yaml (returns DeckSessionResponse with appliedSettings showing override source)
4. Update `app/study/{sessionId}/page.tsx` - Support deck session context (display deck name, show deck-specific limits)
5. Ensure global FSRS state updates correctly during deck sessions (FR-011: rating a card in deck session updates global flashcard state)
6. Create `components/study/DeckSessionControls.tsx` - Deck session UI showing deck name and applied settings

### Phase 6: Deck Editing (P2)

**References**: [contracts/deck-crud.yaml](./contracts/deck-crud.yaml) PATCH /api/decks/{deckId} for update operations

1. Implement deck rename functionality in `DeckEditor.tsx`
2. Add bulk card selection UI for multi-card add/remove
3. Create `components/decks/DeckSettings.tsx` - FSRS override form
4. Implement deck archiving (soft delete) functionality
5. Add deck usage stats display (card count, last studied, created date)

### Phase 7: AI Deck Generation (P3)

**References**:
- [research.md](./research.md) "Hybrid AI Deck Generation Architecture" section for pipeline design
- [contracts/deck-ai-generation.yaml](./contracts/deck-ai-generation.yaml) for API specification
- [quickstart.md](./quickstart.md) Scenario 2 for complete integration flow

Implement two-stage hybrid AI pipeline per research.md:

1. Create `lib/ai/deck-generation.ts` - Hybrid vector + LLM service implementing research.md pipeline architecture
2. **Stage 1: Vector Search** - Generate Nomic embed-text embedding for topic, query LanceDB for top 30-50 candidates (vectorSearchLimit parameter, default 40 per contract)
3. **Stage 2: LLM Re-ranking** - Pass candidates to Claude API for semantic filtering and re-ranking (returns 5-15 most relevant per minCards/maxCards params in contract)
4. Create `POST /api/decks-ai` endpoint per contracts/deck-ai-generation.yaml (request: topic string, returns FlashcardSuggestion[] with relevanceScore and relevanceReason)
5. Create `components/decks/AIGenerationDialog.tsx` - Topic input + review UI (shows suggestions with accept/reject per quickstart.md Scenario 2)
6. Implement card accept/reject flow for AI suggestions before deck creation
7. Handle edge cases per contract error responses:
   - Insufficient cards: Return 200 with warnings array (contract line 106-120)
   - LanceDB unavailable: Return 503 with fallback: "manual" (contract line 148-152)
   - Claude API unavailable: Return 503 with fallback: "vector-only" + partial results (contract line 153-158)
   - Target <10s processing time per SC-006 (track with metadata.processingTimeMs)

### Phase 8: Live Session Updates (P2)

1. Research decision: Server-sent events vs polling (see research.md)
2. Implement deck change detection for active sessions
3. Create session update push mechanism
4. Handle added cards: Inject into session queue if FSRS-due
5. Handle removed cards: Skip if not yet reviewed, allow completion if in-progress
6. Add session synchronization UI feedback

### Phase 9: Testing & Validation

1. **Contract Tests** (validate against OpenAPI specs in contracts/):
   - deck-crud.yaml: Test all 7 endpoints (POST /api/decks, GET /api/decks, GET /api/decks/{id}, PATCH /api/decks/{id}, DELETE /api/decks/{id}, POST /api/decks/{id}/cards, DELETE /api/decks/{id}/cards)
   - deck-ai-generation.yaml: Test POST /api/decks-ai with valid/invalid inputs, verify FlashcardSuggestion schema, test error responses (400, 503)
   - deck-study-session.yaml: Test POST /api/study/deck-session, verify DeckSessionResponse schema, test with/without overrides
   - All requests/responses must match schema exactly (use contract validation library)

2. **Integration Tests**:
   - Deck creation with limit enforcement
   - Deck-filtered FSRS scheduling correctness
   - Live session updates with concurrent edits
   - AI generation pipeline (vector → LLM)

3. **E2E Tests**:
   - User Story 1: Manual deck creation and study
   - User Story 2: Deck editing (rename, add/remove, delete)
   - User Story 3: AI deck generation flow
   - User Story 4: Deck-filtered study sessions

## Implementation Strategy

### MVP Scope (P1 Only)

Deliver independently testable P1 user stories first:
- Manual deck creation (create, list, view)
- Add/remove cards to decks
- Deck-filtered study sessions with FSRS
- Hard limit enforcement (100 decks, 1000 cards)

**Success Criteria**: Users can organize cards into decks and study from specific decks.

### Incremental Delivery

1. **Phase 1**: P1 foundation (deck CRUD, basic UI) - Independently deployable
2. **Phase 2**: P1 completion (deck-filtered FSRS) - Requires Phase 1
3. **Phase 3**: P2 features (editing, settings) - Requires Phase 1
4. **Phase 4**: P3 features (AI generation) - Requires Phase 1, optional Phase 2
5. **Phase 5**: P2 advanced (live updates) - Requires Phase 1-2

Each phase delivers working, tested functionality.

## Post-Constitution Check (After Phase 1)

_Re-evaluate after data-model.md, contracts/, quickstart.md complete._

**I. Documentation-First**: ✅ PASS - Design artifacts complete
**II. Test-First**: ✅ PASS - Contract tests defined for all APIs
**III. Modularity**: ✅ PASS - Independent services (deck CRUD, AI generation, FSRS filtering)
**IV. Simplicity**: ✅ PASS - All complexity justified by requirements
**V. Observability**: ✅ PASS - Logging strategy defined for all services
**VI. Commit Discipline**: ✅ PASS - Tasks will enforce atomic commits

**Final Gate Status**: ✅ ALL GATES PASS - Ready for `/speckit.tasks`

## Dependencies

### External Services
- **LanceDB**: Vector similarity search (existing, has embeddings for flashcards)
- **Claude API**: LLM re-ranking for AI deck generation (existing)
- **PostgreSQL**: Deck and relationship persistence (existing)

### Internal Dependencies
- **Flashcard entities**: Must have vector embeddings for AI generation to work
- **FSRS scheduler**: Must be extended to support deck filtering
- **Study session system**: Must be modified to accept deck context

### Assumptions
- Vector embeddings exist for all user flashcards (or generated on-demand)
- FSRS global state is correctly isolated per user
- PostgreSQL can handle 100k deck_cards relationships per user without performance degradation
