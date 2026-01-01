# Implementation Plan: Study UI Improvements

**Branch**: `020-study-ui-improvements` | **Date**: 2026-01-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/020-study-ui-improvements/spec.md`

## Summary

Implement three UI improvements for the study experience: (1) targeted node study with card count selection, (2) fix spacebar card flip with 3D animation, and (3) explicit multiple choice submit button. Uses existing skill tree selection infrastructure, extends with child highlighting and study button.

## Technical Context

**Language/Version**: TypeScript 5.7.0, React 19.2.3
**Primary Dependencies**: Next.js 16.0.10, Tailwind CSS 4.0.0, ts-fsrs 5.2.3
**Storage**: PostgreSQL via drizzle-orm 0.45.1 (skillNodes, flashcards tables)
**Testing**: Vitest 4.0.15 (unit/integration), Playwright 1.57.0 (E2E)
**Target Platform**: Web (Next.js App Router)
**Project Type**: Web application (Next.js full-stack)
**Performance Goals**: Card flip responds within 100ms (SC-001)
**Constraints**: Must work with existing FSRS scheduling, maintain existing study session flow
**Scale/Scope**: Single-user study sessions, max ~1000 cards per node tree

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle              | Status  | Notes                                                             |
| ---------------------- | ------- | ----------------------------------------------------------------- |
| I. Documentation-First | PASS    | Spec complete with clarifications before planning                 |
| II. Test-First (TDD)   | PASS    | E2E tests (Playwright) precede implementation for each user story |
| III. Modularity        | PASS    | Changes isolated to 4 components, no cross-cutting concerns       |
| IV. Simplicity (YAGNI) | PASS    | No abstractions beyond requirements                               |
| V. Observability       | PASS    | Existing logging sufficient for UI changes                        |
| VI. Atomic Commits     | PENDING | Will follow .claude/rules.md during implementation                |

**Gate Result**: PASS - No violations requiring justification

## Project Structure

### Documentation (this feature)

```text
specs/020-study-ui-improvements/
├── plan.md              # This file
├── research.md          # Phase 0 output (already exists)
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (no new APIs needed)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# Files to modify
components/
├── skills/
│   └── SkillTreeEditor.tsx      # Add node highlighting + study button
├── study/
│   ├── FlashcardMode.tsx        # Fix spacebar + 3D flip animation
│   ├── MultipleChoiceMode.tsx   # Add explicit submit button
│   └── NodeStudyModal.tsx       # NEW: Card count selector modal
│   └── StudySummary.tsx         # NEW: Session completion summary

# Test files
tests/
├── unit/
│   └── components/study/        # Unit tests for study components
├── integration/
│   └── study/                   # Study flow integration tests
└── e2e/
    └── study-ui.spec.ts         # E2E tests for all 3 user stories
```

**Structure Decision**: Web application with Next.js App Router. All changes are frontend component modifications except for one potential API extension to fetch cards by node ID with children.

## Design Decisions

### 1. Node Highlighting Strategy

**Decision**: Extend existing `selectedNodeId` state in SkillTreeEditor to support "highlighted" mode with child selection.

**Rationale**:

- SkillTreeEditor already tracks selectedNodeId
- skillNodes table has `path` column (materialized path) for efficient subtree queries
- Add `highlightedNodeId` state separate from `selectedNodeId` to distinguish editing vs studying

**Implementation**:

- When node is highlighted, recursively collect all descendant node IDs
- Pass highlighted IDs to SkillTree component for visual highlighting
- Show study button only when a node is highlighted

### 2. Card Count Selector

**Decision**: Modal with slider showing increments of 5, plus "All (N)" option.

**Rationale**:

- Clarification confirmed "All (N)" as final option
- Slider is intuitive for range selection
- Modal prevents accidental study start

**Implementation**:

- New NodeStudyModal component
- Slider from 5 to (N rounded to nearest 5)
- Final option always "All (N)" where N = exact total

### 3. Spacebar Flip Fix

**Decision**: Document-level keydown listener with focus guard.

**Rationale**:

- Current onClick handler doesn't capture keyboard events
- Must prevent spacebar when user is in a text input
- Use useEffect cleanup to avoid memory leaks

**Implementation**:

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'
    if (e.code === 'Space' && !isInput && !isFlipped) {
      e.preventDefault()
      handleFlip()
    }
  }
  document.addEventListener('keydown', handleKeyDown)
  return () => document.removeEventListener('keydown', handleKeyDown)
}, [isFlipped])
```

### 4. 3D Flip Animation

**Decision**: Pure CSS with transform-style: preserve-3d.

**Rationale**:

- No framer-motion in project, avoid adding dependencies
- CSS transforms are performant and well-supported
- Tailwind 4.0 supports arbitrary CSS properties

**Implementation**:

- Add perspective to card container
- Use rotateY(180deg) for flip
- backface-visibility: hidden on both faces

### 5. Multiple Choice Submit Flow

**Decision**: Two-step selection → submission with Next button after feedback.

**Rationale**:

- Clarification confirmed explicit submit required
- Clarification confirmed "Next" button for post-feedback navigation
- Prevents accidental submissions

**State Machine**:

1. Initial: options neutral, Submit disabled
2. Selected: one option highlighted (blue), Submit enabled
3. Submitted: show result (green/red), Submit hidden, Next visible
4. Next clicked: reset state, call onRate

### 6. Card Ordering

**Decision**: Node hierarchy order (parent before children), FSRS due-date within each node.

**Rationale**: Clarification confirmed this ordering provides logical flow while respecting spaced repetition.

**Implementation**:

- Query cards with ORDER BY path, fsrs_state->>'due' ASC
- Frontend receives pre-sorted array

### 7. Session Summary

**Decision**: Summary screen with cards completed, accuracy, and Done button.

**Rationale**: Clarification confirmed this provides session closure.

**Implementation**:

- New StudySummary component
- Track correct/incorrect counts during session
- Show on last card completion

## Implementation Sequence

### Phase 1: Foundation (parallel-safe)

**User Story 2** and **User Story 3** have no dependencies and can be implemented in parallel.

#### Story 2 - Card Flip (Design Decisions 3, 4)

1. Add spacebar keydown listener to FlashcardMode.tsx
2. Refactor card structure for 3D CSS transforms
3. Test in Safari for vendor prefix needs

#### Story 3 - Multiple Choice (Design Decision 5)

1. Separate selection state from submission state
2. Add Submit button (disabled until selection)
3. Add Next button (visible after submission)
4. Remove auto-advance setTimeout

### Phase 2: Node Study (depends on Phase 1 patterns)

**User Story 1** is the most complex, requires session tracking.

#### Story 1 - Node Highlighting & Study (Design Decisions 1, 2, 6, 7)

1. Add highlightedNodeId state to SkillTreeEditor
2. Implement getDescendantIds helper using path matching
3. Add study button to highlighted nodes
4. Create NodeStudyModal with card count selector
5. Create StudySummary component
6. Track session stats via props (confirmed: no provider needed per data-model.md)

## API Contracts

No new API endpoints required. Existing `/api/study/session` already supports targeted node study:

```typescript
// POST /api/study/session - SessionRequestSchema
{
  goalId: string,           // Required
  mode: 'node' | 'all' | ...,
  nodeId?: string,          // Target specific node
  includeChildren?: boolean, // Default: true - includes descendants
  cardLimit?: number        // 1-50, default: 20
}
```

**Existing endpoints used:**

- `GET /api/goals/[goalId]/skill-tree` - Get nodes with card counts
- `POST /api/study/session` - Create study session with node filtering
- `POST /api/study/rate` - Rate card (existing)

## Risk Assessment

| Risk                                     | Likelihood | Impact | Mitigation                                    |
| ---------------------------------------- | ---------- | ------ | --------------------------------------------- |
| CSS 3D transforms not working in Safari  | Low        | Medium | Test in Safari, use vendor prefixes if needed |
| Spacebar conflicts with browser scroll   | Medium     | Low    | preventDefault() in handler                   |
| Card count > 100 causes slider UX issues | Low        | Low    | Use dropdown for large counts                 |
