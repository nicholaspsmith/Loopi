# Implementation Plan: Multi-Choice Study Mode with AI-Generated Distractors

**Branch**: `017-multi-choice-distractors` | **Date**: 2025-12-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/017-multi-choice-distractors/spec.md`

## Summary

Enhance the existing multiple choice study mode to generate distractors dynamically at study time using Claude API, implement time-based FSRS rating for correct answers (Hard for slow, Good for fast), and add graceful fallback to flip-reveal mode when distractor generation fails.

**Key Changes from Current Implementation:**

1. **Dynamic Distractors**: Currently stored at card creation time → Generate fresh per session
2. **Time-Based Rating**: Currently binary (1 or 3) → Add rating 2 for slow correct answers
3. **Fallback Mode**: Currently requires distractors → Graceful fallback to flip-reveal

## Technical Context

**Language/Version**: TypeScript 5.7.0 / Node.js 20+
**Primary Dependencies**: Next.js 16.0.10, React 19.2.3, ts-fsrs 5.2.3, @anthropic-ai/sdk 0.71.2
**Storage**: PostgreSQL (drizzle-orm 0.45.1) for flashcards/sessions; LanceDB for embeddings
**Testing**: Vitest 4.0.15 (unit), Playwright 1.57.0 (E2E)
**Target Platform**: Web application (Next.js App Router)
**Project Type**: Web application (full-stack Next.js)
**Performance Goals**: Distractor generation < 2 seconds, 90%+ distractor relevance
**Constraints**: AI API latency (~1-2s per request), must not block study flow
**Scale/Scope**: Single-user study sessions, ~20 cards per session typical

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle              | Status  | Evidence                                                                       |
| ---------------------- | ------- | ------------------------------------------------------------------------------ |
| I. Documentation-First | PASS    | Spec complete with 3 user stories, 13 FRs, 6 success criteria                  |
| II. Test-First (TDD)   | PASS    | Test Strategy section defines unit/integration/E2E tests before implementation |
| III. Modularity        | PASS    | Feature isolated to distractor service + component updates                     |
| IV. Simplicity (YAGNI) | PASS    | No new database tables; reuses existing patterns                               |
| V. Observability       | PASS    | Logging strategy defined with INFO/WARN/DEBUG levels                           |
| VI. Atomic Commits     | PENDING | Will follow .claude/rules.md during implementation                             |

**Initial Gate**: PASS - Proceed to Phase 0
**Post-Design Gate**: PASS - All principles satisfied or documented

## Project Structure

### Documentation (this feature)

```text
specs/017-multi-choice-distractors/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── distractor-api.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
lib/
├── ai/
│   ├── card-generator.ts          # Existing - card generation orchestration
│   └── distractor-generator.ts    # NEW - on-demand distractor generation
├── claude/
│   └── client.ts                  # Existing - Claude API client
├── fsrs/
│   ├── scheduler.ts               # Existing - FSRS scheduling
│   └── utils.ts                   # Existing - rating utilities

components/study/
├── MultipleChoiceMode.tsx         # MODIFY - add time tracking, fallback
├── StudySessionProvider.tsx       # MODIFY - integrate dynamic distractors
├── FlashcardMode.tsx              # Existing - fallback mode
└── MixedMode.tsx                  # MODIFY - improved fallback routing

app/api/study/
├── session/route.ts               # MODIFY - dynamic distractor generation
├── rate/route.ts                  # MODIFY - time-based rating logic
└── distractors/route.ts           # NEW - on-demand distractor endpoint

tests/
├── unit/
│   └── lib/ai/distractor-generator.test.ts  # NEW
├── integration/
│   └── study/multi-choice-rating.test.ts    # NEW
└── e2e/
    └── study/multi-choice-session.spec.ts   # NEW
```

**Structure Decision**: Web application with API routes + React components. No new database tables required - distractors generated on-demand and not persisted.

## Complexity Tracking

> No constitution violations requiring justification. Implementation follows YAGNI by:
>
> - Reusing existing Claude client instead of new AI service
> - Not adding database tables for ephemeral distractors
> - Leveraging existing FSRS rating infrastructure

## Core Implementation Steps

### Step 1: Distractor Generator Service (Blocking)

**Files**: `lib/ai/distractor-generator.ts` (NEW)
**References**: [research.md §1 Distractor Generation Strategy](./research.md), [contracts/distractor-api.md §Distractor Generator Service](./contracts/distractor-api.md)

Create the core distractor generation service:

- `generateDistractors(question, answer, options)` → `DistractorResult`
- Prompt engineering per research.md prompt design
- Validation function `validateDistractors()` per data-model.md
- Error handling with fallback trigger
- 5-second timeout for fail-fast behavior

**Implements**: FR-003, FR-004, FR-009, FR-010

### Step 2: Distractor API Endpoint (Blocking)

**Files**: `app/api/study/distractors/route.ts` (NEW)
**References**: [contracts/distractor-api.md §POST /api/study/distractors](./contracts/distractor-api.md)

Create the on-demand distractor endpoint:

- POST handler with request validation
- Call `generateDistractors()` from Step 1
- Return structured response with `generationTimeMs`
- Error responses with `fallbackRequired: true`

**Implements**: FR-009

### Step 3: MultipleChoiceMode Timer (Parallel with Step 4-6)

**Files**: `components/study/MultipleChoiceMode.tsx` (MODIFY)
**References**: [data-model.md §Card Rating Flow](./data-model.md), [research.md §2 Response Time Thresholds](./research.md)

Add response time tracking:

- `useRef` to capture question display timestamp (FR-013)
- Calculate `responseTimeMs` on answer selection
- Pass time to `onRate` callback
- Time-based rating: ≤10s → Good(3), >10s → Hard(2), incorrect → Again(1)

**Implements**: FR-007, FR-008, FR-013

### Step 4: Study Session Provider Integration (Parallel with Step 3, 5-6)

**Files**: `components/study/StudySessionProvider.tsx` (MODIFY)
**References**: [contracts/distractor-api.md §Study Session Provider](./contracts/distractor-api.md), [contracts/distractor-api.md §Sequence Diagrams](./contracts/distractor-api.md)

Integrate dynamic distractor fetching:

- Add `currentDistractors`, `distractorsLoading`, `distractorsFailed` state
- Fetch distractors on card navigation
- Handle API errors → set `distractorsFailed`
- Pass distractors to `MultipleChoiceMode`

**Implements**: FR-009, FR-011

### Step 5: Fallback Routing (Parallel with Step 3-4, 6)

**Files**: `components/study/MixedMode.tsx` (MODIFY)
**References**: [research.md §4 Fallback Strategy](./research.md)

Improve fallback to flip-reveal:

- Check `distractorsFailed` flag
- Route to `FlashcardMode` when true
- Show toast notification: "Showing as flashcard (distractors unavailable)"
- Standard 1-4 rating in fallback mode

**Implements**: FR-011

### Step 6: Rate Endpoint Time-Based Logic (Parallel with Step 3-5)

**Files**: `app/api/study/rate/route.ts` (MODIFY)
**References**: [contracts/distractor-api.md §POST /api/study/rate](./contracts/distractor-api.md)

Add time-based rating for MC mode:

- Accept `responseTimeMs` and `studyMode` in request
- When `studyMode === 'multiple_choice'`: calculate rating server-side
- Apply threshold: ≤10,000ms → 3, >10,000ms → 2, incorrect → 1

**Implements**: FR-007, FR-008

### Dependency Graph

```
Step 1 (distractor-generator.ts)
    │
    ▼
Step 2 (distractors/route.ts)
    │
    ├──────────────────┬──────────────────┬──────────────────┐
    ▼                  ▼                  ▼                  ▼
Step 3             Step 4             Step 5             Step 6
(MC timer)     (Provider)        (Fallback)         (Rate API)
    │                  │                  │                  │
    └──────────────────┴──────────────────┴──────────────────┘
                              │
                              ▼
                     Integration Tests
                              │
                              ▼
                        E2E Tests
```

**Parallel Work**: Steps 3-6 can be developed in parallel after Steps 1-2 complete.

## Test Strategy

**References**: [quickstart.md §Testing Checklist](./quickstart.md)

### Unit Tests (TDD - Write First)

| Test File                                        | Coverage                                                      |
| ------------------------------------------------ | ------------------------------------------------------------- |
| `tests/unit/lib/ai/distractor-generator.test.ts` | Generation logic, validation, prompt building, error handling |

**Key Test Cases**:

- Returns exactly 3 distractors
- Distractors are distinct from correct answer
- Handles Claude API timeout gracefully
- Validates JSON response format

### Integration Tests

| Test File                                             | Coverage                                    |
| ----------------------------------------------------- | ------------------------------------------- |
| `tests/integration/study/multi-choice-rating.test.ts` | Time-based rating calculation, FSRS updates |

**Key Test Cases**:

- Fast correct (≤10s) → rating 3
- Slow correct (>10s) → rating 2
- Incorrect → rating 1
- FSRS state updates correctly

### E2E Tests

| Test File                                      | Coverage                   |
| ---------------------------------------------- | -------------------------- |
| `tests/e2e/study/multi-choice-session.spec.ts` | Full MC study session flow |

**Key Test Cases**:

- Start MC session, answer questions, complete
- Verify distractors appear shuffled
- Fallback to flashcard on API failure
- Session summary reflects ratings

## Observability

### Logging Strategy

| Event                         | Log Level | Fields                                                 |
| ----------------------------- | --------- | ------------------------------------------------------ |
| Distractor generation start   | INFO      | `flashcardId`, `questionLength`                        |
| Distractor generation success | INFO      | `flashcardId`, `generationTimeMs`                      |
| Distractor generation failure | WARN      | `flashcardId`, `error`, `fallbackTriggered`            |
| Time-based rating applied     | DEBUG     | `flashcardId`, `responseTimeMs`, `rating`, `threshold` |

### Metrics (Future)

- `distractor_generation_duration_ms` - histogram
- `distractor_generation_failures_total` - counter
- `mc_fallback_rate` - gauge (failures / total)
