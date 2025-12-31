# API Contract: Guided Study Flow

**Feature**: 019-auto-gen-guided-study
**Date**: 2025-12-31

## Overview

Sequential study through skill tree nodes in depth-first order, tracking completion via FSRS state.

## New Endpoint: Get Next Incomplete Node

```http
GET /api/study/next-node?goalId={goalId}
Authorization: Bearer {token}
```

### Response (Node Available)

```json
{
  "hasNextNode": true,
  "node": {
    "id": "node-123",
    "title": "Introduction to Variables",
    "description": "Learn about variable declaration and assignment",
    "depth": 1,
    "path": "1.2"
  },
  "progress": {
    "totalNodes": 15,
    "completedNodes": 3,
    "percentComplete": 20
  }
}
```

### Response (Tree Complete)

```json
{
  "hasNextNode": false,
  "node": null,
  "progress": {
    "totalNodes": 15,
    "completedNodes": 15,
    "percentComplete": 100
  },
  "message": "Congratulations! You've completed all nodes in this skill tree."
}
```

### Response (No Cards)

```json
{
  "hasNextNode": false,
  "node": null,
  "progress": {
    "totalNodes": 15,
    "completedNodes": 0,
    "percentComplete": 0
  },
  "message": "Cards are still being generated. Please wait a moment."
}
```

### Error Responses

| Status | Condition              |
| ------ | ---------------------- |
| 401    | Not authenticated      |
| 403    | Goal not owned by user |
| 404    | Goal not found         |
| 404    | Goal has no skill tree |

## New Endpoint: Get Node Progress

```http
GET /api/goals/{goalId}/skill-tree/progress
Authorization: Bearer {token}
```

### Response

```json
{
  "nodes": [
    {
      "id": "node-1",
      "path": "1",
      "totalCards": 5,
      "completedCards": 5,
      "isComplete": true
    },
    {
      "id": "node-2",
      "path": "1.1",
      "totalCards": 5,
      "completedCards": 3,
      "isComplete": false
    }
  ],
  "summary": {
    "totalNodes": 15,
    "completedNodes": 1,
    "totalCards": 75,
    "completedCards": 8
  }
}
```

## Modified: Study Session Endpoint

```http
POST /api/study/session
Authorization: Bearer {token}
Content-Type: application/json

{
  "goalId": "goal-123",
  "mode": "flashcard",        // Presentation mode: "flashcard" | "multiple_choice" | "timed" | "mixed" | "node" | "all"
  "isGuided": true,           // NEW: When true, auto-selects next incomplete node
  "nodeId": "node-456",       // Required for mode="node", auto-determined when isGuided=true
  "includeChildren": true,    // For mode="node" only
  "cardLimit": 20             // Optional, default 20
}
```

**Note**: The `mode` parameter controls how cards are presented (flashcard, multiple choice, etc.), while `isGuided` controls whether the system automatically selects the next incomplete node in depth-first order.

### Response

```json
{
  "sessionId": "session-789",
  "mode": "flashcard",
  "isGuided": true,
  "currentNode": {
    "id": "node-456",
    "title": "Variables",
    "path": "1.2"
  },
  "cards": [
    {
      "id": "card-1",
      "question": "What is a variable?",
      "answer": "A named storage location for data",
      "cardType": "flashcard",
      "distractors": null
    }
  ],
  "totalCards": 5,
  "nodeProgress": {
    "completedInNode": 2,
    "totalInNode": 5
  }
}
```

## Node Completion Logic

A node is considered complete when:

```typescript
const isComplete =
  cards.every(
    (card) => card.fsrsState.state >= 2 // Review (2) or Relearning (3)
  ) && cards.length > 0
```

## Depth-First Traversal

Nodes are ordered by their `path` field:

```
1       → First top-level node
1.1     → First child
1.1.1   → First grandchild
1.1.2   → Second grandchild
1.2     → Second child
2       → Second top-level node
```

SQL query:

```sql
SELECT sn.*,
  COUNT(f.id) as total_cards,
  COUNT(CASE WHEN (f.fsrs_state->>'state')::int >= 2 THEN 1 END) as completed_cards
FROM skill_nodes sn
LEFT JOIN flashcards f ON f.skill_node_id = sn.id
WHERE sn.tree_id = $1
GROUP BY sn.id
HAVING COUNT(f.id) > 0
  AND COUNT(CASE WHEN (f.fsrs_state->>'state')::int >= 2 THEN 1 END) < COUNT(f.id)
ORDER BY sn.path ASC
LIMIT 1;
```

## UI State Machine

```
[Goal Page]
    |
    | Click "Study Now"
    v
[Loading] --> GET /api/study/next-node
    |
    +-- hasNextNode: true --> [Study Session]
    |                              |
    |                              | Complete node quiz
    |                              v
    |                         [Completion Modal]
    |                              |
    |                              +-- "Continue" --> GET /api/study/next-node --> [Study Session]
    |                              |
    |                              +-- "Return" --> [Goal Page]
    |
    +-- hasNextNode: false --> [Tree Complete Message]
```

## Testing Contract

```typescript
describe('Guided Study Flow', () => {
  it('returns first incomplete node in depth-first order', async () => {
    // Given nodes at paths: 1, 1.1, 1.2, 2
    // And node 1 is complete, 1.1 is incomplete
    // When GET /api/study/next-node
    // Then returns node 1.1
  })

  it('marks node complete when all cards reach review state', async () => {
    // Given a node with 5 cards
    // When all 5 cards are rated and reach state >= 2
    // Then node isComplete = true
  })

  it('returns tree complete when all nodes done', async () => {
    // Given all nodes have isComplete = true
    // When GET /api/study/next-node
    // Then hasNextNode = false
  })

  it('supports continue flow between nodes', async () => {
    // Given user completed node 1.1
    // When user clicks Continue
    // Then session starts with node 1.2
  })
})
```
