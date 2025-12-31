# Implementation Plan: Auto-Generation & Guided Study Flow

**Branch**: `019-auto-gen-guided-study` | **Date**: 2025-12-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/019-auto-gen-guided-study/spec.md`

## Summary

Streamline the learning experience by automatically generating flashcards when skill trees are created (5 cards per node for free tier) and implementing a guided sequential study flow with depth-first traversal. Users click "Study Now" to enter guided mode that walks through the skill tree, tracking completion via FSRS state (node complete when all cards reach review state).

## Technical Context

**Language/Version**: TypeScript 5.7.0, Node.js 20+
**Primary Dependencies**: Next.js 16.0.10, React 19.2.3, ts-fsrs 5.2.3, @anthropic-ai/sdk 0.71.2, drizzle-orm 0.45.1
**Storage**: PostgreSQL (users, flashcards, skill_nodes, learning_goals), LanceDB (embeddings)
**Testing**: Vitest 4.0.15, Playwright 1.57.0, Testing Library
**Target Platform**: Web application (Next.js App Router)
**Project Type**: Web application (full-stack monorepo)
**Performance Goals**: Study session start <30s after goal creation, smooth node-to-node transitions
**Constraints**: Free tier limited to 5 cards per node, depth-first traversal order
**Scale/Scope**: Single user goals, ~10-50 nodes per skill tree

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle              | Status  | Evidence                                                                                             |
| ---------------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| I. Documentation-First | PASS    | Spec complete with 2 user stories, 6 functional requirements, acceptance criteria                    |
| II. Test-First (TDD)   | PENDING | Tests will be written before implementation per task ordering                                        |
| III. Modularity        | PASS    | User stories are independent: auto-gen can work without guided study, guided study requires auto-gen |
| IV. Simplicity (YAGNI) | PASS    | No premium tier implementation (deferred), minimal new entities, reuses existing job system          |
| V. Observability       | PASS    | Logging points defined in Core Implementation phases                                                 |
| VI. Atomic Commits     | PENDING | Will follow .claude/rules.md during implementation                                                   |

**Gate Result**: PASS - No violations requiring justification

## Project Structure

### Documentation (this feature)

```text
specs/019-auto-gen-guided-study/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output (complete)
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── auto-generation.md
│   └── guided-study.md
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
app/
├── (protected)/
│   └── goals/[goalId]/
│       ├── page.tsx           # Goal page (modify: add Study Now button)
│       └── study/page.tsx     # Study page (modify: guided flow support)
├── api/
│   ├── goals/[goalId]/
│   │   └── skill-tree/
│   │       └── progress/route.ts  # NEW: Node completion status
│   └── study/
│       ├── session/route.ts   # Modify: guided mode support
│       └── next-node/route.ts # NEW: Get next incomplete node

components/
├── goals/
│   ├── StudyNowButton.tsx     # NEW: Green play button
│   └── GoalCard.tsx           # Existing
├── study/
│   └── GuidedStudyFlow.tsx    # NEW: Sequential node progression UI

lib/
├── jobs/handlers/
│   ├── skill-tree-job.ts      # Modify: queue flashcard jobs after tree creation
│   └── flashcard-job.ts       # Modify: accept node-based generation
├── study/
│   ├── guided-flow.ts         # NEW: Depth-first traversal logic
│   └── node-completion.ts     # NEW: FSRS review state check
└── db/operations/
    └── skill-nodes.ts         # Modify: add incrementNodeCardCount

tests/
├── unit/
│   ├── study/guided-flow.test.ts
│   └── study/node-completion.test.ts
├── integration/
│   └── auto-generation.test.ts
└── e2e/
    └── guided-study.spec.ts
```

**Structure Decision**: Extends existing Next.js App Router structure with new components for guided study flow. Reuses existing background job infrastructure for card generation.

## Core Implementation

### Phase 1: Auto-Generation (User Story 1)

**Prerequisites**: None - this is the foundation

| Step | Component                                        | Contract Reference                                                                             | Blocks          |
| ---- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------- | --------------- |
| 1.1  | Modify flashcard-job.ts to accept nodeId payload | [contracts/auto-generation.md#Modified-Flashcard-Job-Handler](./contracts/auto-generation.md)  | Step 1.2        |
| 1.2  | Modify skill-tree-job.ts to queue flashcard jobs | [contracts/auto-generation.md#Modified-Skill-Tree-Job-Handler](./contracts/auto-generation.md) | Phase 2 testing |
| 1.3  | Add incrementNodeCardCount to skill-nodes.ts     | [contracts/auto-generation.md#New-Node-Card-Count-Update](./contracts/auto-generation.md)      | -               |

**Parallel Work**: Steps 1.1 and 1.3 can be developed in parallel.

**Logging Points**:

- Log when flashcard generation job is queued for each node (info)
- Log card count generated per node (info)
- Log errors if node content is insufficient (warning)

### Phase 2: Guided Study Backend (User Story 2 - Backend)

**Prerequisites**: Phase 1 complete (cards must exist to test guided flow)

| Step | Component                                               | Contract Reference                                                                             | Blocks   |
| ---- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------- |
| 2.1  | Implement node-completion.ts                            | [contracts/guided-study.md#Node-Completion-Logic](./contracts/guided-study.md)                 | Step 2.2 |
| 2.2  | Implement guided-flow.ts                                | [contracts/guided-study.md#Depth-First-Traversal](./contracts/guided-study.md)                 | Step 2.3 |
| 2.3  | Create /api/study/next-node endpoint                    | [contracts/guided-study.md#New-Endpoint-Get-Next-Incomplete-Node](./contracts/guided-study.md) | Phase 3  |
| 2.4  | Create /api/goals/[goalId]/skill-tree/progress endpoint | [contracts/guided-study.md#New-Endpoint-Get-Node-Progress](./contracts/guided-study.md)        | -        |
| 2.5  | Modify /api/study/session for guided mode               | [contracts/guided-study.md#Modified-Study-Session-Endpoint](./contracts/guided-study.md)       | Phase 3  |

**Parallel Work**: Steps 2.3 and 2.4 can be developed in parallel after 2.2.

**Logging Points**:

- Log when next-node is requested with goalId (debug)
- Log when node is marked complete (info)
- Log when tree is fully complete (info)

### Phase 3: Guided Study Frontend (User Story 2 - Frontend)

**Prerequisites**: Phase 2 endpoints functional

| Step | Component                  | Contract Reference                                                        | Blocks    |
| ---- | -------------------------- | ------------------------------------------------------------------------- | --------- |
| 3.1  | Create StudyNowButton.tsx  | [spec.md#FR-003](./spec.md)                                               | Step 3.3  |
| 3.2  | Create GuidedStudyFlow.tsx | [contracts/guided-study.md#UI-State-Machine](./contracts/guided-study.md) | Step 3.3  |
| 3.3  | Integrate into goal page   | -                                                                         | E2E tests |

**Parallel Work**: Steps 3.1 and 3.2 can be developed in parallel.

### Phase 4: E2E Testing

**Prerequisites**: All phases complete

| Step | Component                      | Contract Reference                                    |
| ---- | ------------------------------ | ----------------------------------------------------- |
| 4.1  | E2E test: auto-generation flow | [quickstart.md#Auto-Generation-Test](./quickstart.md) |
| 4.2  | E2E test: guided study flow    | [quickstart.md#Guided-Study-Test](./quickstart.md)    |
| 4.3  | E2E test: tree completion      | [quickstart.md#Tree-Completion-Test](./quickstart.md) |

## Complexity Tracking

No violations requiring justification. Design follows existing patterns:

- Background jobs for flashcard generation (existing pattern from 018-background-flashcard-generation)
- FSRS state checking (existing pattern)
- API routes for study session management (existing pattern)
