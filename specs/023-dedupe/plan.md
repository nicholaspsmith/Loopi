# Implementation Plan: Duplicate Detection for Goals and Flashcards

**Branch**: `023-dedupe` | **Date**: 2026-01-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/023-dedupe/spec.md`

## Summary

Add semantic duplicate detection during flashcard and goal creation using the existing Jina embeddings and LanceDB vector infrastructure. When users create content, the system compares against existing items using embedding similarity (85% threshold). Duplicates trigger a warning UI allowing users to proceed or cancel. AI-generated batches are automatically filtered before saving.

## Technical Context

**Language/Version**: TypeScript 5.7, Node.js 20+
**Primary Dependencies**: Next.js 16.0.10, React 19.2.3, Drizzle ORM 0.45.1, LanceDB 0.22.3, Jina Embeddings API
**Storage**: PostgreSQL (users, flashcards, goals), LanceDB (vector embeddings)
**Testing**: Vitest 4.0.15 (unit/integration), Playwright 1.57.0 (E2E)
**Target Platform**: Web application (browser)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: <500ms duplicate detection latency (SC-001)
**Constraints**: 85% similarity threshold, 10-char minimum, user-scoped only
**Scale/Scope**: Per-user content (typical: <1000 flashcards, <50 goals per user)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle              | Status  | Evidence                                                               |
| ---------------------- | ------- | ---------------------------------------------------------------------- |
| I. Documentation-First | ✅ PASS | Spec complete with user stories, acceptance criteria, FR-001 to FR-011 |
| II. Test-First (TDD)   | ✅ PASS | Tasks will include tests before implementation per constitution        |
| III. Modularity        | ✅ PASS | Dedupe logic isolated in services, UI components reusable              |
| IV. Simplicity (YAGNI) | ✅ PASS | Using existing embedding/LanceDB infrastructure, no new dependencies   |
| V. Observability       | ✅ PASS | Will add structured logging for similarity checks                      |
| VI. Atomic Commits     | ✅ PASS | Will follow .claude/rules.md for commit discipline                     |

**Gate Result**: PASS - Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/023-dedupe/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── dedupe-api.md    # API contract for similarity endpoints
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
lib/
├── dedup/                    # NEW: Deduplication service module
│   ├── similarity-check.ts   # Core similarity checking logic
│   ├── types.ts              # Dedup-specific types
│   └── config.ts             # Threshold and settings
├── db/
│   └── operations/
│       ├── flashcards-lancedb.ts  # EXTEND: Add similarity search with scores
│       └── goals-lancedb.ts       # NEW: Goal embeddings in LanceDB
└── embeddings/
    └── jina.ts               # EXISTING: Embedding generation

app/
├── api/
│   ├── flashcards/
│   │   └── check-duplicate/
│   │       └── route.ts      # NEW: Check flashcard similarity endpoint
│   └── goals/
│       └── check-duplicate/
│           └── route.ts      # NEW: Check goal similarity endpoint
└── (protected)/
    └── [existing pages using dedup]

components/
└── dedup/                    # NEW: Duplicate warning UI
    ├── DuplicateWarningModal.tsx
    └── SimilarItemCard.tsx

tests/
├── unit/
│   └── lib/dedup/
│       └── similarity-check.test.ts
├── integration/
│   └── lib/db/operations/
│       └── goals-lancedb.test.ts
└── e2e/
    └── dedupe-flashcard.spec.ts
```

**Structure Decision**: Extends existing web application structure. New `lib/dedup/` module encapsulates similarity logic. LanceDB operations extended for goals (currently only flashcards have embeddings).

## Core Implementation

### Phase 1: Flashcard Deduplication (P1)

**1.1 Extend LanceDB similarity search**

- File: `lib/db/operations/flashcards-lancedb.ts`
- Add `findSimilarFlashcards(text, userId, threshold, limit)` returning matches with scores
- Existing `searchSimilarFlashcardsWithScores` can be reused/extended

**1.2 Create dedup service**

- File: `lib/dedup/similarity-check.ts`
- `checkFlashcardDuplicate(question: string, userId: string): Promise<DuplicateResult>`
- Returns: `{ isDuplicate: boolean, similarItems: SimilarItem[], topScore: number }`
- Handles embedding generation, similarity search, threshold comparison

**1.3 Add API endpoint**

- File: `app/api/flashcards/check-duplicate/route.ts`
- POST with `{ question: string }` → `{ isDuplicate, similarItems }`
- Called before flashcard creation in UI

**1.4 Create warning UI**

- File: `components/dedup/DuplicateWarningModal.tsx`
- Shows existing similar card with similarity percentage
- "Create Anyway" and "Cancel" buttons
- Integrate into flashcard creation forms

### Phase 2: Goal Deduplication (P2)

**2.1 Add goal embeddings to LanceDB**

- File: `lib/db/operations/goals-lancedb.ts` (NEW)
- `syncGoalToLanceDB(goal)` - generates embedding from title+description
- `findSimilarGoals(text, userId, threshold, limit)`
- Schema: goals table in LanceDB (id, userId, embedding)

**2.2 Extend dedup service for goals**

- File: `lib/dedup/similarity-check.ts`
- `checkGoalDuplicate(title: string, description: string, userId: string)`
- Combines title+description for embedding comparison

**2.3 Add goal API endpoint**

- File: `app/api/goals/check-duplicate/route.ts`
- POST with `{ title, description }` → `{ isDuplicate, similarItems }`

**2.4 Integrate into goal creation UI**

- Update goal creation form to call duplicate check
- Reuse DuplicateWarningModal component

### Phase 3: AI Batch Deduplication (P3)

**3.1 Add batch dedup filter**

- File: `lib/dedup/batch-filter.ts`
- `filterDuplicatesFromBatch(cards: GeneratedCard[], userId: string)`
- Checks each card against existing + previously approved in batch
- Returns: `{ uniqueCards, filteredCount, filterReasons }`

**3.2 Integrate into card generator**

- File: `lib/ai/card-generator.ts`
- Call batch filter after generation, before saving
- Include filter summary in generation response

**3.3 Update generation UI**

- Show "X cards created, Y duplicates filtered" in result

## Implementation Details

### Similarity Check Flow

```
User Input → Generate Embedding (Jina) → Search LanceDB → Filter by Threshold → Return Results
                     ↓
              Cache embedding for creation if user proceeds
```

### Threshold Configuration

```typescript
// lib/dedup/config.ts
export const DEDUP_CONFIG = {
  SIMILARITY_THRESHOLD: 0.85, // 85% similarity = duplicate
  MIN_CONTENT_LENGTH: 10, // Skip dedup for very short content
  MAX_SIMILAR_RESULTS: 3, // Show top 3 similar items in warning
  EMBEDDING_TIMEOUT_MS: 5000, // Timeout for Jina API
}
```

### Error Handling

| Scenario            | Behavior                                              |
| ------------------- | ----------------------------------------------------- |
| Jina API timeout    | Allow creation with warning "Duplicate check skipped" |
| LanceDB unavailable | Allow creation with warning                           |
| Empty embedding     | Skip dedup, proceed with creation                     |
| Content too short   | Skip dedup, proceed with creation                     |

## Complexity Tracking

No constitution violations. Implementation uses existing infrastructure:

- Jina embeddings API (already integrated)
- LanceDB (already initialized with flashcards table)
- Existing similarity search patterns

Only net-new complexity is the goal embeddings table in LanceDB, which mirrors the existing flashcards pattern.
