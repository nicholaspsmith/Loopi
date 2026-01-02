# Data Model: Custom Cards & Goal Management

**Feature**: 021-custom-cards-archive
**Date**: 2025-12-31

## Schema Analysis

### Existing Tables (No Changes Required)

All features utilize existing schema - no migrations needed.

#### flashcards Table

| Column       | Type          | Constraints                    | Notes                          |
| ------------ | ------------- | ------------------------------ | ------------------------------ |
| id           | uuid          | PK, default random             |                                |
| userId       | uuid          | FK -> users, NOT NULL, CASCADE |                                |
| skillNodeId  | uuid          | FK -> skill_nodes              | Links card to node             |
| question     | varchar(1000) | NOT NULL                       | 5-1000 chars (validation)      |
| answer       | text          | NOT NULL                       | 5-5000 chars (validation)      |
| cardType     | varchar(20)   | NOT NULL, default 'flashcard'  | 'flashcard'\|'multiple_choice' |
| fsrsState    | jsonb         | NOT NULL                       | FSRS scheduling state          |
| status       | varchar(20)   | NOT NULL, default 'active'     | 'draft'\|'active'              |
| cardMetadata | jsonb         | nullable                       | For MC distractors             |
| createdAt    | timestamp     | NOT NULL, default now()        |                                |

**Custom Card Usage**: Custom cards use `cardType: 'flashcard'`, `status: 'active'`, and `skillNodeId` set to the target node.

#### learning_goals Table

| Column            | Type         | Constraints                    | Notes                     |
| ----------------- | ------------ | ------------------------------ | ------------------------- |
| id                | uuid         | PK, default random             |                           |
| userId            | uuid         | FK -> users, NOT NULL, CASCADE |                           |
| title             | varchar(200) | NOT NULL                       |                           |
| status            | varchar(20)  | NOT NULL, default 'active'     | 'active'\|'archived'\|... |
| archivedAt        | timestamp    | nullable                       | Set when archived         |
| masteryPercentage | integer      | NOT NULL, default 0            |                           |
| createdAt         | timestamp    | NOT NULL, default now()        |                           |

**Archive/Delete Usage**: Bulk archive sets `status: 'archived'` and `archivedAt: now()`. Bulk delete removes row entirely.

### Constants

**File**: `lib/constants/goals.ts`

```typescript
export const GOAL_LIMITS = {
  ACTIVE: 6, // Maximum active goals per user
  ARCHIVED: 6, // Maximum archived goals per user
  TOTAL: 12, // Maximum total goals per user
} as const
```

### Existing Operations (Reused)

| Function                 | File                             | Usage                      |
| ------------------------ | -------------------------------- | -------------------------- |
| `createGoalFlashcard`    | lib/db/operations/flashcards.ts  | Create custom card         |
| `incrementNodeCardCount` | lib/db/operations/skill-nodes.ts | Update node after card add |
| `archiveGoal`            | lib/db/operations/goals.ts       | Archive single goal        |
| `deleteGoal`             | lib/db/operations/goals.ts       | Delete single goal         |
| `getActiveGoals`         | lib/db/operations/goals.ts       | List goals for UI          |

### New Operations Required

| Function           | File                             | Purpose                         |
| ------------------ | -------------------------------- | ------------------------------- |
| `getGoalCounts`    | lib/db/operations/goals.ts       | Get active/archived/total       |
| `bulkArchiveGoals` | lib/db/operations/goals.ts       | Archive multiple goals          |
| `bulkDeleteGoals`  | lib/db/operations/goals.ts       | Delete multiple goals           |
| `getGoalsByIds`    | lib/db/operations/goals.ts       | Fetch goals by ID array         |
| `restoreGoal`      | lib/db/operations/goals.ts       | Restore archived goal to active |
| `getNodeWithGoal`  | lib/db/operations/skill-nodes.ts | Verify node ownership           |

## Validation Rules

### Custom Card Creation

```typescript
const customCardSchema = z.object({
  nodeId: z.string().uuid('Invalid node ID'),
  question: z
    .string()
    .min(5, 'Question must be at least 5 characters')
    .max(1000, 'Question must be at most 1000 characters'),
  answer: z
    .string()
    .min(5, 'Answer must be at least 5 characters')
    .max(5000, 'Answer must be at most 5000 characters'),
})
```

### Bulk Archive

```typescript
const bulkArchiveSchema = z.object({
  goalIds: z
    .array(z.string().uuid())
    .min(1, 'At least one goal must be selected')
    .max(6, 'Maximum 6 goals per request'),
})

// Additional runtime validation:
// - All goals must be owned by user
// - All goals must have status 'active'
// - archived_count + request_count <= GOAL_LIMITS.ARCHIVED
```

### Bulk Delete

```typescript
const bulkDeleteSchema = z.object({
  goalIds: z
    .array(z.string().uuid())
    .min(1, 'At least one goal must be selected')
    .max(12, 'Maximum 12 goals per request'),
})

// Additional runtime validation:
// - All goals must exist
// - All goals must be owned by user
```

### Goal Creation (Existing Endpoint - Add Limit Check)

```typescript
// Add to existing goal creation validation:
const counts = await getGoalCounts(userId)
if (counts.active >= GOAL_LIMITS.ACTIVE) {
  throw new Error('Maximum 6 active goals reached. Archive or delete a goal to create a new one.')
}
if (counts.total >= GOAL_LIMITS.TOTAL) {
  throw new Error('Maximum 12 total goals reached. Delete a goal to continue.')
}
```

### Restore Goal

```typescript
const restoreGoalSchema = z.object({
  goalId: z.string().uuid('Invalid goal ID'),
})

// Additional runtime validation:
// - Goal must exist and be owned by user
// - Goal must have status 'archived'
// - active_count < GOAL_LIMITS.ACTIVE
```

## State Transitions

### Flashcard FSRS State (Initial)

Custom cards are initialized with "New" state (state: 0):

```typescript
{
  state: 0,           // New
  due: now(),         // Immediately due
  stability: 0,
  difficulty: 0,
  elapsedDays: 0,
  scheduledDays: 0,
  reps: 0,
  lapses: 0,
  learningSteps: 0
}
```

### Goal Status Transitions

```
active → archived  (via bulk archive, subject to archived limit)
active → deleted   (via bulk delete)
archived → active  (via restore, subject to active limit)
archived → deleted (via bulk delete)
```

## Relationships

```
User (1) ─────────────┬───────── (N) LearningGoal [max 12 per user]
                      │                   │
                      │                   │       Limits:
                      │              (1)  │       - 6 active
                      │           SkillTree       - 6 archived
                      │                   │
                      │              (N)  │
                      │           SkillNode
                      │                   │
                      └───── (N) Flashcard (N) ─┘
                            (custom cards)
```

Custom flashcards link directly to SkillNode, same as auto-generated cards.
Goal limits are enforced at the application level, not database constraints.

## Cascade Behavior

When a goal is deleted, the following data is automatically removed via database cascades:

```
LearningGoal (DELETE)
  └── SkillTree (ON DELETE CASCADE)
        └── SkillNode (ON DELETE CASCADE)
              ├── Flashcard (ON DELETE CASCADE)
              │     ├── ReviewLog (ON DELETE CASCADE)
              │     └── Distractor (ON DELETE CASCADE)
              └── (LanceDB cleanup via application code)
```

LanceDB embeddings must be cleaned up via application code after deletion.
