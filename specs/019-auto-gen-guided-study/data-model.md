# Data Model: Auto-Generation & Guided Study Flow

**Feature**: 019-auto-gen-guided-study
**Date**: 2025-12-31

## Entity Changes

### Existing Entities (No Schema Changes Required)

#### Flashcard

Already supports all required fields:

- `skillNodeId` - Links card to tree node (already exists)
- `fsrsState.state` - FSRS state for completion check (0=New, 1=Learning, 2=Review, 3=Relearning)
- `cardType` - Distinguishes card types (use 'flashcard' for auto-generated)

#### Skill Node

Already has required fields:

- `path` - Materialized path for depth-first ordering (e.g., "1.2.3")
- `parentId` - For child node lookup
- `cardCount` - Denormalized count (update on card creation)

#### Learning Goal

Already has required fields:

- `skillTreeId` - Link to skill tree
- `status` - Goal status tracking

### New Computed Views (No Schema Changes)

#### Node Completion Status

Derived from card FSRS states:

```typescript
interface NodeCompletionStatus {
  nodeId: string
  totalCards: number
  completedCards: number // cards with state >= 2
  isComplete: boolean // completedCards === totalCards && totalCards > 0
}
```

#### Guided Study Progress

Derived from node completion across tree:

```typescript
interface GuidedStudyProgress {
  goalId: string
  totalNodes: number
  completedNodes: number
  currentNodeId: string | null // First incomplete node in depth-first order
  isTreeComplete: boolean
}
```

## Data Flow

### 1. Auto-Generation Flow

```
Goal Created
    ↓
Skill Tree Generation Job
    ↓
Tree Nodes Created (10-50 nodes)
    ↓
For Each Node:
    Queue Flashcard Generation Job
        ↓
    Generate 5 Cards (Free Tier Limit)
        ↓
    Link Cards to Node (skillNodeId)
        ↓
    Update Node cardCount
```

### 2. Guided Study Flow

```
User Clicks "Study Now"
    ↓
GET /api/study/next-node?goalId={id}
    ↓
Find First Incomplete Node (depth-first)
    ↓
Return Node + Cards
    ↓
User Studies Cards
    ↓
POST /api/study/rate (updates FSRS state)
    ↓
When All Cards state >= 2:
    Node Marked Complete
        ↓
    Show "Continue" / "Return" Options
```

## Query Patterns

### Get Nodes in Depth-First Order

```sql
SELECT * FROM skill_nodes
WHERE tree_id = $1
ORDER BY path ASC;
```

### Get First Incomplete Node

```sql
WITH node_completion AS (
  SELECT
    sn.id,
    sn.path,
    sn.title,
    COUNT(f.id) as total_cards,
    COUNT(CASE WHEN (f.fsrs_state->>'state')::int >= 2 THEN 1 END) as completed_cards
  FROM skill_nodes sn
  LEFT JOIN flashcards f ON f.skill_node_id = sn.id
  WHERE sn.tree_id = $1
  GROUP BY sn.id, sn.path, sn.title
)
SELECT id, path, title FROM node_completion
WHERE total_cards > 0 AND completed_cards < total_cards
ORDER BY path ASC
LIMIT 1;
```

### Get Tree Progress Summary

```sql
WITH node_status AS (
  SELECT
    sn.id,
    COUNT(f.id) as total_cards,
    COUNT(CASE WHEN (f.fsrs_state->>'state')::int >= 2 THEN 1 END) as completed_cards
  FROM skill_nodes sn
  LEFT JOIN flashcards f ON f.skill_node_id = sn.id
  WHERE sn.tree_id = $1
  GROUP BY sn.id
)
SELECT
  COUNT(*) as total_nodes,
  COUNT(CASE WHEN total_cards > 0 AND completed_cards >= total_cards THEN 1 END) as completed_nodes,
  SUM(total_cards) as total_cards,
  SUM(completed_cards) as completed_cards
FROM node_status;
```

## Validation Rules

### Auto-Generation

- Maximum 5 cards per node for free tier
- Node must exist before card generation
- Generation job must complete atomically (all or nothing)

### Guided Study

- Goal must have a skill tree
- Tree must have at least one node with cards
- Node completion requires all cards to reach state >= 2
