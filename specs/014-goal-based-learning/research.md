# Research: Memoryloop v2 - Goal-Based Learning Platform

**Date**: 2025-12-27
**Purpose**: Resolve technical unknowns and document design decisions before implementation

## Research Topics

### 1. Skill Tree Data Structure

**Question**: How to efficiently store and query hierarchical skill trees in PostgreSQL?

**Decision**: Adjacency List with Materialized Path

**Rationale**:

- Adjacency list (parentId foreign key) is simple and well-supported by Drizzle ORM
- Add `path` column (e.g., "1.2.3") for efficient subtree queries
- PostgreSQL JSONB not needed - relational model is cleaner for this use case
- Depth limited to 4 levels (Goal → Category → Topic → Subtopic) per spec

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| Nested Sets | Complex updates, overkill for shallow trees |
| Closure Table | Extra join table, unnecessary for 4 levels |
| JSONB document | Harder to query, update individual nodes |
| LanceDB only | Need relational queries, not just vector search |

**Implementation Notes**:

- `parentId` nullable (root nodes have null parent)
- `depth` integer (0-3) for quick level filtering
- `path` varchar for subtree queries: `WHERE path LIKE '1.2.%'`
- Index on `(treeId, parentId)` and `(treeId, path)`

---

### 2. LLM Prompting for Skill Tree Generation

**Question**: How to generate consistent, well-structured skill trees from Ollama?

**Decision**: Structured JSON output with few-shot examples

**Rationale**:

- Ollama models (llama3, mistral) respond well to explicit JSON schemas
- Few-shot examples dramatically improve output consistency
- Validation layer catches malformed responses and retries

**Prompt Template**:

```
You are a curriculum designer. Generate a learning skill tree for the topic: "{topic}"

Output JSON in this exact format:
{
  "nodes": [
    {"title": "Category Name", "depth": 1, "children": [
      {"title": "Topic Name", "depth": 2, "children": [
        {"title": "Subtopic Name", "depth": 3}
      ]}
    ]}
  ]
}

Rules:
- 3-6 top-level categories
- 2-5 topics per category
- 0-3 subtopics per topic (optional)
- Titles should be concise (3-5 words)
- Order from foundational to advanced

Example for "Python Programming":
{
  "nodes": [
    {"title": "Core Syntax", "depth": 1, "children": [
      {"title": "Variables and Types", "depth": 2},
      {"title": "Control Flow", "depth": 2},
      {"title": "Functions", "depth": 2}
    ]},
    {"title": "Data Structures", "depth": 1, "children": [...]}
  ]
}
```

**Validation**:

- Parse JSON, reject if invalid
- Verify depth <= 3
- Verify node count in expected ranges
- Retry up to 3 times on failure

---

### 3. Mastery Calculation Algorithm

**Question**: How to calculate mastery percentage for skill tree nodes?

**Decision**: Weighted average based on FSRS card states

**Rationale**:

- FSRS already tracks card state (New, Learning, Review, Relearning)
- Stability value indicates long-term retention confidence
- Simple formula that's easy to explain to users

**Algorithm**:

```typescript
function calculateMastery(cards: Card[]): number {
  if (cards.length === 0) return 0

  const weights = {
    New: 0,
    Learning: 0.25,
    Relearning: 0.25,
    Review: 1.0, // Fully learned
  }

  const totalWeight = cards.reduce((sum, card) => {
    const state = card.fsrsState.state
    const stabilityBonus = Math.min(card.fsrsState.stability / 30, 0.5)
    return sum + weights[state] + (state === 'Review' ? stabilityBonus : 0)
  }, 0)

  const maxPossible = cards.length * 1.5 // Max weight per card
  return Math.round((totalWeight / maxPossible) * 100)
}
```

**Propagation**:

- Leaf nodes: calculated from linked cards
- Parent nodes: weighted average of children
- Root (Goal): average of all categories

---

### 4. Multiple Choice Distractor Generation

**Question**: How to generate plausible wrong answers for multiple choice questions?

**Decision**: Hybrid approach - LLM generation with card-based fallback

**Rationale**:

- LLM can generate contextually relevant distractors
- Fallback to other cards in same skill node if LLM fails
- Caching distractors reduces LLM calls

**Implementation**:

1. When generating MC card, prompt LLM for 3 distractors
2. Store distractors in card metadata (JSONB)
3. If missing, pull answers from other cards in same node
4. If still insufficient, use generic fallbacks ("None of the above", etc.)

**Prompt Addition**:

```
For multiple choice cards, include "distractors": ["wrong1", "wrong2", "wrong3"]
Distractors should be:
- Plausible but clearly incorrect
- Related to the topic
- Similar length to correct answer
```

---

### 5. Study Session State Management

**Question**: How to manage state across study modes (flashcard, MC, timed)?

**Decision**: React Context + URL state for mode, local state for session

**Rationale**:

- Mode selection persists in URL (?mode=timed)
- Session state (current card, score, time) in React state
- No need for server-side session - client handles transitions
- FSRS updates sent on each rating (existing pattern)

**State Shape**:

```typescript
interface StudySession {
  goalId: string
  mode: 'flashcard' | 'multiple-choice' | 'timed' | 'mixed'
  cards: Card[]
  currentIndex: number
  responses: { cardId: string; rating: number; timeMs?: number }[]
  startedAt: Date
  // Timed mode only
  timeRemaining?: number
  score?: number
}
```

---

### 6. Achievement Trigger System

**Question**: How to detect achievement unlock conditions efficiently?

**Decision**: Event-driven checks on study session completion

**Rationale**:

- Most achievements trigger on study events (cards mastered, days studied)
- Check conditions after each session, not on every card
- Cache user stats to avoid repeated queries
- Background job for retroactive achievements (e.g., "studied 7 days")

**Achievement Types**:
| Type | Trigger Point | Check Logic |
|------|---------------|-------------|
| Cards Mastered | Session end | Count cards with state=Review |
| Goal Progress | Session end | Check goal mastery % |
| Study Streak | Daily (cron) | Check consecutive study days |
| Perfect Session | Session end | All ratings >= 3 |
| Speed Demon | Session end | Timed mode, high score |

**Implementation**:

- `checkAchievements(userId, sessionResult)` called after session
- Returns newly unlocked achievements for celebration UI
- Idempotent - won't re-award existing achievements

---

### 7. Topic Normalization for Analytics

**Question**: How to normalize topic names for aggregate analytics?

**Decision**: Lowercase, trim, remove common prefixes, fuzzy matching

**Rationale**:

- "Learn Kubernetes" and "kubernetes" should count as same topic
- Keep it simple for MVP - exact match after normalization
- Fuzzy matching (Levenshtein) as future enhancement

**Normalization Rules**:

```typescript
function normalizeTopic(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/^(learn|study|master|intro to|introduction to)\s+/i, '')
    .replace(/\s+/g, ' ')
}
```

**Examples**:

- "Learn Kubernetes Administration" → "kubernetes administration"
- "PYTHON programming" → "python programming"
- "Intro to Machine Learning" → "machine learning"

---

## Dependencies Best Practices

### Drizzle ORM (0.45.1)

- Use `$inferSelect` and `$inferInsert` for type safety
- Prefer `db.query` for complex joins over raw SQL
- Use transactions for multi-table updates

### ts-fsrs (5.2.3)

- Call `fsrs.repeat()` to get next states for all ratings
- Store full Card state in JSONB, not just due date
- Use `fsrs.get_retrievability()` for retention predictions

### Next.js 16 App Router

- Use Server Components for data fetching
- Client Components only for interactivity
- Route handlers for API (not pages/api)

### Ollama Integration

- Timeout set to 60s for generation
- Retry logic with exponential backoff
- Stream responses for long generations

---

## Open Questions (Resolved)

All technical unknowns have been resolved. Ready for Phase 1 design.
