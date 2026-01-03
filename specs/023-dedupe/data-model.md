# Data Model: Duplicate Detection

**Feature**: 023-dedupe
**Date**: 2026-01-03

## Overview

This feature extends the existing data model with a new LanceDB table for goal embeddings and introduces new types for duplicate detection results.

## Existing Entities (Reference)

### Flashcard (PostgreSQL)

```typescript
// From lib/db/drizzle-schema.ts
flashcards: {
  id: uuid (PK)
  userId: uuid (FK → users)
  question: varchar(1000)
  answer: text
  skillNodeId: uuid (FK → skill_nodes, nullable)
  cardType: varchar (flashcard | multiple_choice | scenario)
  cardMetadata: jsonb
  status: varchar (draft | active)
  fsrsState: jsonb
  createdAt: timestamp
}
```

### Flashcard Embedding (LanceDB)

```typescript
// From lib/db/schema.ts - existing
flashcards: {
  id: string // UUID matching PostgreSQL
  userId: string // For user-scoped queries
  embedding: Float32Array[1024] // Jina embedding
}
```

### Learning Goal (PostgreSQL)

```typescript
// From lib/db/drizzle-schema.ts
learningGoals: {
  id: uuid (PK)
  userId: uuid (FK → users)
  title: varchar(200)
  description: text
  status: varchar (active | completed | archived)
  masteryPercentage: integer
  totalTimeSeconds: integer
  createdAt: timestamp
  updatedAt: timestamp
}
```

## New Entities

### Goal Embedding (LanceDB) - NEW

```typescript
// To be added to lib/db/schema.ts
goals: {
  id: string // UUID matching PostgreSQL learningGoals.id
  userId: string // For user-scoped queries
  embedding: Float32Array[1024] // Jina embedding of title + " " + description
}
```

**Sync Trigger**: Created/updated when goal is created in PostgreSQL

## New Types

### DuplicateCheckResult

```typescript
// lib/dedup/types.ts
interface DuplicateCheckResult {
  isDuplicate: boolean // True if any item exceeds threshold
  similarItems: SimilarItem[] // Top N similar items (max 3)
  topScore: number | null // Highest similarity score (0-1)
  checkSkipped: boolean // True if check was skipped (short content, service error)
  skipReason?: string // Reason for skip if applicable
}

interface SimilarItem {
  id: string // ID of existing item
  score: number // Similarity score (0-1)
  displayText: string // Text to show in warning (question or title)
  type: 'flashcard' | 'goal' // Item type
}
```

### DeduplicationConfig

```typescript
// lib/dedup/config.ts
interface DeduplicationConfig {
  similarityThreshold: number // Default: 0.85
  minContentLength: number // Default: 10
  maxSimilarResults: number // Default: 3
  embeddingTimeoutMs: number // Default: 5000
}
```

### BatchFilterResult

```typescript
// lib/dedup/types.ts
interface BatchFilterResult<T> {
  uniqueItems: T[] // Items that passed dedup filter
  filteredItems: FilteredItem<T>[] // Items removed with reasons
  stats: {
    total: number
    unique: number
    duplicatesRemoved: number
  }
}

interface FilteredItem<T> {
  item: T
  reason: 'duplicate_existing' | 'duplicate_in_batch'
  similarTo: string // ID of item it duplicates
  score: number
}
```

## Entity Relationships

```
┌─────────────────┐         ┌─────────────────┐
│   PostgreSQL    │         │     LanceDB     │
├─────────────────┤         ├─────────────────┤
│   flashcards    │◄────────│   flashcards    │
│   (content)     │   1:1   │   (embedding)   │
└─────────────────┘         └─────────────────┘
         │
         │ FK: userId
         ▼
┌─────────────────┐         ┌─────────────────┐
│     users       │         │     goals       │ NEW
└─────────────────┘         │   (embedding)   │
         ▲                  └─────────────────┘
         │ FK: userId              ▲
         │                         │ 1:1
┌─────────────────┐         ┌──────┴──────────┐
│  learningGoals  │◄────────│  PostgreSQL     │
│   (content)     │         │  learningGoals  │
└─────────────────┘         └─────────────────┘
```

## Validation Rules

### Duplicate Detection

| Field            | Validation                                     |
| ---------------- | ---------------------------------------------- |
| Similarity Score | 0.0 - 1.0, compared against threshold (0.85)   |
| Content Length   | Must be ≥ 10 characters to trigger dedup check |
| User Scope       | Comparisons only within same userId            |

### Embedding Sync

| Event             | LanceDB Action                                  |
| ----------------- | ----------------------------------------------- |
| Flashcard created | Insert embedding (async, non-blocking)          |
| Flashcard deleted | Delete embedding                                |
| Goal created      | Insert embedding (async, non-blocking)          |
| Goal updated      | Update embedding (title or description changed) |
| Goal deleted      | Delete embedding                                |

## Migration Notes

### LanceDB Schema Extension

No migration needed for LanceDB - tables are created dynamically. Update `lib/db/schema.ts`:

```typescript
// Add to initializeLanceDBSchema()
const goalsTable = await db.createTable(
  'goals',
  [{ id: '', userId: '', embedding: new Array(EMBEDDING_DIMENSIONS).fill(0) }],
  { mode: 'overwrite' }
)
```

### Backfill Existing Goals

Existing goals need embeddings generated:

```typescript
// One-time script: scripts/backfill-goal-embeddings.ts
// For each goal in learningGoals:
//   1. Generate embedding from title + " " + description
//   2. Insert into LanceDB goals table
```
