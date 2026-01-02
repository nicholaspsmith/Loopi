# Implementation Plan: Custom Cards & Goal Management

**Branch**: `021-custom-cards-archive` | **Date**: 2025-12-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/021-custom-cards-archive/spec.md`

## Summary

Enable users to create custom flashcards within skill tree nodes and add multi-select goal management to the goals page. Custom cards use the same FSRS system as auto-generated cards, initialized in "New" state. Users can select multiple goals and perform bulk archive or delete operations. Hard limits enforce maximum 6 active goals, 6 archived goals, and 12 total goals per user.

## Technical Context

**Language/Version**: TypeScript 5.7.0, Node.js 20+
**Primary Dependencies**: Next.js 16.0.10, React 19.2.3, drizzle-orm 0.45.1, zod 4.2.1, ts-fsrs 5.2.3
**Storage**: PostgreSQL (users, goals, flashcards), LanceDB (vector embeddings)
**Testing**: Vitest 4.0.15 (unit/integration), Playwright 1.57.0 (E2E)
**Target Platform**: Web application (Next.js App Router)
**Project Type**: Web application with SSR
**Performance Goals**: Custom card creation < 500ms, bulk operations < 2s for 12 goals
**Constraints**: All operations require authentication, goal ownership verification, goal limits
**Scale/Scope**: Single-user operations, max 12 goals per user

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Pre-Design Check

| Principle              | Status | Evidence                                                                             |
| ---------------------- | ------ | ------------------------------------------------------------------------------------ |
| I. Documentation-First | PASS   | Spec complete with 3 user stories, acceptance criteria, functional requirements      |
| II. Test-First (TDD)   | PASS   | Contract tests defined in contracts/, test tasks will precede implementation         |
| III. Modularity        | PASS   | Three independent user stories with separate components and APIs                     |
| IV. Simplicity (YAGNI) | PASS   | Minimal feature set - restore limited to single goal, hard limits keep scope bounded |
| V. Observability       | PASS   | Error responses specified with actionable messages                                   |
| VI. Atomic Commits     | PASS   | Implementation will follow .claude/rules.md commit discipline                        |

**Gate Result**: PASS - Proceed to Phase 0

### Post-Design Check (Phase 1 Complete)

| Principle              | Status | Evidence                                          |
| ---------------------- | ------ | ------------------------------------------------- |
| I. Documentation-First | PASS   | data-model.md, quickstart.md, contracts/ complete |
| II. Test-First (TDD)   | PASS   | Contract test specs in all contract files         |
| III. Modularity        | PASS   | No schema changes needed - reuses existing tables |
| IV. Simplicity (YAGNI) | PASS   | Reuses existing DB operations, adds limit checks  |
| V. Observability       | PASS   | Structured error responses with limit info        |
| VI. Atomic Commits     | PASS   | Tasks will be organized for atomic commits        |

**Gate Result**: PASS - Proceed to Task Generation

## Project Structure

### Documentation (this feature)

```text
specs/021-custom-cards-archive/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output (complete)
├── data-model.md        # Phase 1 output (complete)
├── quickstart.md        # Phase 1 output (complete)
├── contracts/           # Phase 1 output (complete)
│   ├── custom-cards.md  # API contract for custom card creation
│   ├── bulk-archive.md  # API contract for bulk goal archive
│   ├── bulk-delete.md   # API contract for bulk goal delete
│   └── restore.md       # API contract for goal restore
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
# Next.js App Router structure
app/
├── (protected)/
│   └── goals/
│       └── page.tsx           # MODIFY: Add multi-select, action bar, limit display
├── api/
│   ├── flashcards/
│   │   └── custom/
│   │       └── route.ts       # NEW: Custom card creation endpoint
│   └── goals/
│       ├── route.ts           # MODIFY: Add limit check on creation
│       ├── archive/
│       │   └── route.ts       # NEW: Bulk archive endpoint
│       ├── delete/
│       │   └── route.ts       # NEW: Bulk delete endpoint
│       └── restore/
│           └── route.ts       # NEW: Single goal restore endpoint

components/
├── goals/
│   ├── CustomCardForm.tsx     # NEW: Custom card creation form
│   ├── CustomCardModal.tsx    # NEW: Modal wrapper for form
│   ├── GoalCard.tsx           # MODIFY: Add checkbox for selection
│   ├── GoalActionBar.tsx      # NEW: Floating action bar for bulk ops
│   ├── GoalLimitIndicator.tsx # NEW: Shows "4/6 active goals"
│   └── ConfirmDialog.tsx      # NEW: Archive/delete confirmation modal
├── ui/
│   └── ...                    # Existing UI primitives

lib/
├── constants/
│   └── goals.ts               # NEW: GOAL_LIMITS constants
├── db/operations/
│   ├── flashcards.ts          # Existing: createGoalFlashcard
│   └── goals.ts               # ADD: bulkArchiveGoals, bulkDeleteGoals, getGoalCounts, restoreGoal

tests/
├── contract/
│   ├── custom-card.test.ts    # Contract tests for custom card API
│   ├── bulk-archive.test.ts   # Contract tests for archive API
│   ├── bulk-delete.test.ts    # Contract tests for delete API
│   └── restore.test.ts        # Contract tests for restore API
├── integration/
│   └── goal-limits.test.ts    # Integration tests for limit enforcement
└── e2e/
    ├── custom-card.spec.ts    # E2E for custom card creation
    └── goal-management.spec.ts # E2E for multi-select, archive, delete
```

**Structure Decision**: Goals page gets multi-select capability directly (no settings page). Floating action bar pattern for bulk operations. Constants file for goal limits.

## Complexity Tracking

No constitution violations requiring justification.

## Phase Summary

### Phase 0: Research (Complete)

- Custom card creation approach documented
- Multi-select UI pattern decided (floating action bar)
- Goal limits decided: 6 active, 6 archived, 12 total
- Bulk delete with cascade documented

### Phase 1: Design (Complete)

- data-model.md: No schema changes - reuses existing tables, adds limit validation
- contracts/custom-cards.md: POST /api/flashcards/custom endpoint
- contracts/bulk-archive.md: POST /api/goals/archive endpoint with limit checks
- contracts/bulk-delete.md: POST /api/goals/delete endpoint
- quickstart.md: Development setup and testing guide

### Phase 2: Tasks (Next - /speckit.tasks)

- Generate task breakdown organized by user story
- Test tasks precede implementation tasks (TDD)
- Priority order: P1 (limits) -> P2 (custom cards, multi-select)
