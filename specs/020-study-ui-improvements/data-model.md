# Data Model: Study UI Improvements

**Feature**: 020-study-ui-improvements
**Date**: 2026-01-01

## Overview

This feature is primarily UI-focused and does not require database schema changes. It leverages existing entities (skillNodes, flashcards) with their current relationships.

## Existing Entities (No Changes Required)

### SkillNode (lib/db/drizzle-schema.ts:352-375)

```typescript
{
  id: uuid,
  treeId: uuid,           // FK to skillTrees
  parentId: uuid | null,  // FK to self (null for root)
  title: string,
  description: text | null,
  depth: integer,         // 0=Goal, 1=Category, 2=Topic, 3=Subtopic
  path: string,           // Materialized path: "1", "1.2", "1.2.3"
  sortOrder: integer,
  isEnabled: boolean,
  masteryPercentage: integer,  // 0-100
  cardCount: integer,          // Denormalized count of linked flashcards
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**Usage in Feature**:

- `path` used for efficient subtree queries (WHERE path LIKE 'node_path%')
- `cardCount` used for study button card count display
- `masteryPercentage` displayed next to study button

### Flashcard (lib/db/drizzle-schema.ts:78-101)

```typescript
{
  id: uuid,
  userId: uuid,           // FK to users
  conversationId: uuid | null,
  messageId: uuid | null,
  question: string,
  answer: text,
  fsrsState: jsonb,       // FSRS scheduling state
  createdAt: timestamp,
  skillNodeId: uuid | null,  // FK to skillNodes (goal-based learning)
  cardType: string,          // 'flashcard' | 'multiple_choice' | 'scenario'
  cardMetadata: jsonb | null,  // For MC: { distractors: [...] }
  status: string             // 'draft' | 'active'
}
```

**Usage in Feature**:

- `skillNodeId` links cards to nodes for targeted study
- `fsrsState` contains `due` timestamp for ordering
- `cardType` determines UI mode (FlashcardMode vs MultipleChoiceMode)

## Frontend State Models (New)

### HighlightedNodeState

State for tracking which node is highlighted for study.

```typescript
interface HighlightedNodeState {
  nodeId: string | null // Currently highlighted node
  descendantIds: string[] // All descendant node IDs (for visual highlighting)
  totalCardCount: number // Aggregated card count (node + all descendants)
}
```

**Location**: `components/skills/SkillTreeEditor.tsx`

### CardCountSelection

State for the card count selector modal.

```typescript
interface CardCountSelection {
  selectedCount: number | 'all' // 5, 10, 15... or 'all'
  maxCount: number // Total available cards
  isOpen: boolean // Modal visibility
}
```

**Location**: `components/study/NodeStudyModal.tsx`

### MultipleChoiceState

Enhanced state for two-step submit flow.

```typescript
interface MultipleChoiceState {
  selectedOption: string | null // User's current selection
  isSubmitted: boolean // Whether answer has been submitted
  isCorrect: boolean | null // Result after submission
}
```

**Location**: `components/study/MultipleChoiceMode.tsx`

### SessionStats

Tracking for session summary display.

```typescript
interface SessionStats {
  cardsCompleted: number
  totalSelected: number
  correctCount: number
  incorrectCount: number
}

// Derived
interface SessionSummary extends SessionStats {
  accuracy: number // (correctCount / cardsCompleted) * 100
}
```

**Location**: `components/study/StudySessionProvider.tsx` or passed via props

## Query Patterns

### Get Cards for Node + Descendants

```sql
-- Using materialized path for efficient subtree query
SELECT f.*
FROM flashcards f
JOIN skill_nodes n ON f.skill_node_id = n.id
WHERE n.path LIKE $nodePath || '%'
  AND f.status = 'active'
ORDER BY n.path ASC, (f.fsrs_state->>'due')::timestamp ASC
LIMIT $cardCount
```

### Get Descendant Node IDs

```sql
SELECT id
FROM skill_nodes
WHERE path LIKE $nodePath || '%'
  AND id != $nodeId  -- Exclude the node itself if only children needed
ORDER BY path ASC
```

### Calculate Total Card Count

```sql
SELECT SUM(card_count) as total
FROM skill_nodes
WHERE path LIKE $nodePath || '%'
```

## Validation Rules

### Card Count Selection

- Minimum: 5 (or actual count if < 5)
- Maximum: total cards in node + descendants
- Increments: 5 (with "All" as final option)

### Node Highlighting

- Only one node can be highlighted at a time
- Highlighting a node auto-highlights all descendants (visual only)
- Study button disabled if total card count = 0

### Multiple Choice

- Selection required before submit
- No re-selection after submission
- Next button only visible after submission

## State Transitions

### Multiple Choice Flow

```
┌─────────────┐     select      ┌──────────────┐
│   INITIAL   │ ──────────────► │   SELECTED   │
│ (no select) │                 │ (can submit) │
└─────────────┘                 └──────┬───────┘
                                       │ submit
                                       ▼
                                ┌──────────────┐
                                │  SUBMITTED   │
                                │ (show result)│
                                └──────┬───────┘
                                       │ next
                                       ▼
                                ┌──────────────┐
                                │     NEXT     │
                                │  (onRate())  │
                                └──────────────┘
```

### Node Study Flow

```
┌──────────────┐    click node    ┌──────────────┐
│ NO HIGHLIGHT │ ───────────────► │  HIGHLIGHTED │
└──────────────┘                  └──────┬───────┘
       ▲                                 │ click study
       │                                 ▼
       │                          ┌──────────────┐
       │                          │    MODAL     │
       │                          │ (select cnt) │
       │                          └──────┬───────┘
       │                                 │ confirm
       │                                 ▼
       │                          ┌──────────────┐
       │                          │   STUDYING   │
       │                          │  (session)   │
       │                          └──────┬───────┘
       │                                 │ complete
       │                                 ▼
       │                          ┌──────────────┐
       └────────────── done ───── │   SUMMARY    │
                                  └──────────────┘
```
