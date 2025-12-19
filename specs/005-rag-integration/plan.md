# Implementation Plan: RAG Integration for Enhanced Chat Responses

**Branch**: `005-rag-integration` | **Date**: 2025-12-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-rag-integration/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement RAG (Retrieval-Augmented Generation) to enhance chat responses by searching semantically similar past messages using vector embeddings in LanceDB, building context from those messages, and prepending that context to Claude API calls. The system will automatically determine when to use RAG (skip greetings, enable for substantive questions), retrieve up to 5 similar messages with a 2000 token limit, and display a visual indicator to users that RAG is enabled.

## Technical Context

**Language/Version**: TypeScript 5.7 / Node.js (Next.js 16.0.10)
**Primary Dependencies**: Next.js 16, @anthropic-ai/sdk 0.71, @lancedb/lancedb 0.22, Ollama (nomic-embed-text)
**Storage**: PostgreSQL (drizzle-orm, metadata), LanceDB (vectors/embeddings)
**Testing**: Vitest 4.0.15 (unit/integration), Playwright (e2e)
**Target Platform**: Web application (server-side rendering + client components)
**Project Type**: Web (Next.js App Router with frontend/backend colocation)
**Performance Goals**: <500ms RAG retrieval for 10k messages, <100ms embedding generation
**Constraints**: 2000 token RAG context limit, 768-dim embeddings (Ollama nomic-embed-text), user-scoped search only
**Scale/Scope**: Multi-user chat application with conversation history across multiple sessions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Documentation-First Development ✅
- [x] Feature spec exists with user scenarios (3 user stories: P1 context retrieval, P2 visibility, P2 degradation)
- [x] Acceptance criteria defined in Given/When/Then format
- [x] Functional requirements specified (FR-001 through FR-012)
- [x] Measurable success criteria defined (SC-001 through SC-006)
- [x] Requirements are technology-agnostic (no implementation leaked into spec)
- [x] Clarifications resolved (logging destination specified)

### II. Test-First Development (TDD) ✅
- [x] User stories are independently testable (spec lines 16, 33, 48)
- [ ] Test tasks will precede implementation tasks in tasks.md (to be verified in /speckit.tasks phase)

**Note**: TDD compliance will be fully verified during task generation. Each user story must have contract/integration tests written before implementation.

### III. Modularity & Composability ✅
- [x] Feature is self-contained RAG module (lib/claude/rag.ts)
- [x] Clear interface boundaries (buildRAGContext, shouldUseRAG functions)
- [x] User stories are independently deployable (P1 can ship without P2)
- [x] No tight coupling to existing components (integrates via chat API system prompt)

### IV. Simplicity (YAGNI) ✅
- [x] No over-engineering detected in spec
- [x] Out-of-scope section explicitly limits features (no user controls, no caching, no analytics)
- [x] Simple token approximation (4 chars per token) vs precise counting
- [x] Graceful degradation strategy (return empty context on failure)

**Note**: Initial implementation already exists (lib/claude/rag.ts) following YAGNI principles. Plan will focus on test coverage, logging enhancements, and production readiness.

### V. Observability & Debugging ✅
- [x] Logging specified in FR-010 and clarifications (structured JSON logs)
- [x] Error handling defined in User Story 3 (graceful degradation)
- [x] RAG operations traceable (similar message count, context length, failures)
- [x] Visual indicator for users (FR-008 - RAG enabled banner)

### VI. Atomic Commits & Version Control Discipline ✅
- [x] Implementation will follow .claude/rules.md commit guidelines
- [x] Each task will result in focused, atomic commits
- [x] Commit messages will be imperative, <100 chars, no AI attribution

**GATE STATUS**: ✅ **PASSED** - All constitutional requirements met. Proceeding to Phase 0 research.

---

## Phase 0: Research (Completed)

**Output**: [research.md](./research.md)

**Research Areas Completed**:

1. **Vector Search Optimization**: LanceDB IVF_PQ indexing with cosine similarity for <500ms performance at scale
2. **Context Window Management**: Anthropic `countTokens()` API with 4-char/token fallback, strict 2000 token limit
3. **Structured Logging**: Pino for production (5-10x faster than Winston), structured JSON with TypeScript types
4. **Graceful Degradation**: Circuit breaker pattern, multi-layer error handling, 100% chat uptime guarantee
5. **Testing RAG Systems**: Vitest patterns for unit/integration tests, in-memory LanceDB for testing

**Key Decisions**:
- IVF_PQ indexing for vector search (128x memory reduction, high recall)
- Pino for structured logging (performance + TypeScript safety)
- Top-K retrieval without hard similarity thresholds
- In-memory LanceDB for integration tests

All research findings documented with rationale, alternatives considered, and code examples.

---

## Phase 1: Design & Contracts (Completed)

**Outputs**:
- [data-model.md](./data-model.md) - RAGContext, RAGOptions, Message entities
- [contracts/rag-api.md](./contracts/rag-api.md) - buildRAGContext() and shouldUseRAG() API contracts
- [quickstart.md](./quickstart.md) - Implementation guide and troubleshooting
- CLAUDE.md - Updated with RAG technology stack

**Data Model Highlights**:
- `RAGContext`: Core return type with context string, source messages, enabled flag
- `RAGOptions`: Configuration interface for maxMessages (5), maxTokens (2000)
- `Message`: Extended with embedding field for vector search
- Validation rules: user scoping, token limits, null embedding filtering

**API Contract Highlights**:
- `buildRAGContext()`: Async function returning RAGContext, <500ms SLA
- `shouldUseRAG()`: Synchronous heuristic for greeting detection
- Graceful degradation: All errors return empty context, never break chat
- Integration points: Chat API augments system prompt transparently

**Project Structure Decision**: Next.js App Router with collocated API routes, shared libraries, React components, Vitest tests.

---

## Constitution Re-Check (Post-Design)

*Re-evaluated after Phase 1 design completion*

### I. Documentation-First Development ✅
- [x] All design artifacts created before implementation
- [x] data-model.md defines entities with validation rules
- [x] contracts/rag-api.md specifies exact function signatures
- [x] quickstart.md provides implementation guide

### II. Test-First Development (TDD) ✅
- [x] Contract tests defined in contracts/rag-api.md
- [x] Test file structure specified (rag.test.ts, rag-chat-flow.test.ts)
- [x] Test coverage requirements documented (unit + integration)
- [x] Success criteria mapped to testable assertions

**Compliance**: Tasks.md (Phase 2) will define test tasks before implementation tasks per TDD.

### III. Modularity & Composability ✅
- [x] RAG module is self-contained (lib/claude/rag.ts)
- [x] Clear function boundaries (buildRAGContext, shouldUseRAG)
- [x] User stories independently deployable (P1 without P2)
- [x] Integrates via standard system prompt (no tight coupling)

### IV. Simplicity (YAGNI) ✅
- [x] No abstractions introduced beyond requirements
- [x] Simple token approximation (4 chars/token) with API fallback
- [x] Direct function exports (no unnecessary classes/patterns)
- [x] Graceful degradation via simple error handling

**Verified**: Design artifacts confirm YAGNI compliance. No over-engineering detected.

### V. Observability & Debugging ✅
- [x] Structured JSON logging schema defined (RAGLogEntry interface)
- [x] All significant operations logged (search, failures, timing)
- [x] Error messages include actionable context
- [x] Performance metrics tracked (executionTimeMs, similarMessagesFound)

**Implementation**: Pino structured logging with child loggers (research.md section 3).

### VI. Atomic Commits & Version Control Discipline ✅
- [x] Implementation will follow .claude/rules.md
- [x] Tasks.md will define focused, single-responsibility tasks
- [x] Each task maps to atomic commits

**GATE STATUS**: ✅ **PASSED** - Design phase complete, all constitutional requirements satisfied.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
lib/
├── claude/
│   ├── rag.ts                    # RAG context builder (existing, needs tests + logging)
│   ├── client.ts                 # Claude API integration
│   ├── prompts.ts                # System prompt templates
│   └── flashcard-generator.ts   # Flashcard generation
├── db/
│   └── operations/
│       └── messages-lancedb.ts   # Vector search (searchSimilarMessages)
├── embeddings/
│   └── ollama.ts                 # Embedding generation
└── logger.ts                     # Application logging (needs structured JSON enhancement)

app/
└── api/
    └── chat/
        └── conversations/
            └── [conversationId]/
                └── messages/
                    └── route.ts  # Chat API (integrates RAG context)

components/
└── chat/
    └── ChatInterface.tsx         # UI with RAG indicator (existing)

tests/
├── unit/
│   └── lib/
│       └── claude/
│           ├── rag.test.ts       # NEW: RAG unit tests
│           └── client.test.ts    # Existing Claude API tests
└── integration/
    └── rag-chat-flow.test.ts     # NEW: End-to-end RAG integration test
```

**Structure Decision**: Next.js App Router structure with collocated API routes (`app/api/`), shared libraries (`lib/`), React components (`components/`), and Vitest tests (`tests/`). RAG functionality is implemented as a pure function module (`lib/claude/rag.ts`) that integrates into the chat API via system prompt augmentation.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No complexity violations detected.** All constitutional principles are satisfied.

---

## Next Steps

**Phase 2: Task Generation** - Run `/speckit.tasks` to generate tasks.md

The planning phase is complete. All design artifacts have been created:

- ✅ Technical Context filled in
- ✅ Constitution Check passed (pre and post-design)
- ✅ Phase 0: Research completed (research.md)
- ✅ Phase 1: Design & Contracts completed
  - ✅ data-model.md created
  - ✅ contracts/rag-api.md created
  - ✅ quickstart.md created
  - ✅ CLAUDE.md updated with technology stack

**Ready for**: Task generation via `/speckit.tasks` command to break down implementation into atomic, testable tasks organized by user story priority (P1 → P2 → P3).

**Branch**: 005-rag-integration
**Spec**: [spec.md](./spec.md)
**Plan**: This file
