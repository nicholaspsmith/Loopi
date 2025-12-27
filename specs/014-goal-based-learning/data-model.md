# Data Model: Memoryloop v2 - Goal-Based Learning Platform

**Date**: 2025-12-27
**Input**: [spec.md](./spec.md), [research.md](./research.md)

## Overview

This document defines the database schema extensions for the goal-based learning platform. The design adds 6 new tables while preserving existing auth, flashcard, and FSRS infrastructure.

## Entity Relationship Diagram

```
┌─────────────────┐
│      users      │
│  (existing)     │
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────┐      1:1       ┌─────────────────┐
│  learningGoals  │───────────────▶│   skillTrees    │
└────────┬────────┘                └────────┬────────┘
         │                                  │ 1:N (self-ref)
         │                                  ▼
         │                         ┌─────────────────┐
         │                         │   skillNodes    │
         │                         └────────┬────────┘
         │                                  │ 1:N
         │                                  ▼
         │                         ┌─────────────────┐
         │                         │   flashcards    │◄──(existing)
         │                         │ + skillNodeId   │
         │                         └─────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│  achievements   │
└─────────────────┘

┌─────────────────┐
│ topicAnalytics  │  (aggregate, no FK to users)
└─────────────────┘
```

## New Tables

### 1. Learning Goals (`learningGoals`)

Represents a user's declared learning objective.

```typescript
// lib/db/drizzle-schema.ts

export const learningGoals = pgTable('learning_goals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  // 'active' | 'paused' | 'completed' | 'archived'
  masteryPercentage: integer('mastery_percentage').notNull().default(0),
  totalTimeSeconds: integer('total_time_seconds').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  archivedAt: timestamp('archived_at'),
})

// Indexes
// - (userId, status) for dashboard queries
// - (userId, createdAt) for listing
```

**Field Notes**:

- `masteryPercentage`: Denormalized from skill tree for fast dashboard display (0-100)
- `totalTimeSeconds`: Accumulated study time for progress metrics
- `status`: Controls visibility and study availability

---

### 2. Skill Trees (`skillTrees`)

The hierarchical breakdown of a learning goal. One tree per goal.

```typescript
export const skillTrees = pgTable('skill_trees', {
  id: uuid('id').primaryKey().defaultRandom(),
  goalId: uuid('goal_id')
    .notNull()
    .unique()
    .references(() => learningGoals.id, { onDelete: 'cascade' }),
  generatedBy: varchar('generated_by', { length: 20 }).notNull().default('ai'),
  // 'ai' | 'curated'
  curatedSourceId: varchar('curated_source_id', { length: 100 }),
  // For future curated trees: 'aws-saa-c03', 'comptia-a-plus', etc.
  nodeCount: integer('node_count').notNull().default(0),
  maxDepth: integer('max_depth').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  regeneratedAt: timestamp('regenerated_at'),
})

// Indexes
// - (goalId) unique for 1:1 relationship
```

**Field Notes**:

- `generatedBy`: Tracks origin for analytics (AI vs curated)
- `curatedSourceId`: Future use for linking to curated tree definitions
- `nodeCount`, `maxDepth`: Denormalized for quick tree stats

---

### 3. Skill Nodes (`skillNodes`)

Individual nodes in the skill tree with mastery tracking.

```typescript
export const skillNodes = pgTable('skill_nodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  treeId: uuid('tree_id')
    .notNull()
    .references(() => skillTrees.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id').references(() => skillNodes.id, { onDelete: 'cascade' }),
  // null for root nodes (depth 0)
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  depth: integer('depth').notNull(),
  // 0 = Goal (root), 1 = Category, 2 = Topic, 3 = Subtopic
  path: varchar('path', { length: 100 }).notNull(),
  // Materialized path: "1", "1.2", "1.2.3" for efficient subtree queries
  sortOrder: integer('sort_order').notNull().default(0),
  // Ordering among siblings
  isEnabled: boolean('is_enabled').notNull().default(true),
  // User can disable nodes to exclude from study
  masteryPercentage: integer('mastery_percentage').notNull().default(0),
  // 0-100, calculated from linked cards or child nodes
  cardCount: integer('card_count').notNull().default(0),
  // Denormalized count of linked flashcards
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Indexes
// - (treeId, parentId) for child node queries
// - (treeId, path) for subtree queries with LIKE
// - (treeId, depth) for level-based queries
```

**Field Notes**:

- `path`: Enables efficient subtree queries: `WHERE path LIKE '1.2.%'`
- `isEnabled`: Allows users to customize their learning path
- `masteryPercentage`: Calculated from cards (leaf) or children (parent)

---

### 4. Flashcards Extension

Modify existing `flashcards` table to add skill node linking.

```typescript
// Add to existing flashcards table
export const flashcards = pgTable('flashcards', {
  // ... existing fields ...

  // NEW: Link to skill tree node for mastery tracking
  skillNodeId: uuid('skill_node_id').references(() => skillNodes.id, { onDelete: 'set null' }),

  // NEW: Card format type
  cardType: varchar('card_type', { length: 20 }).notNull().default('flashcard'),
  // 'flashcard' | 'multiple_choice' | 'scenario'

  // NEW: Additional data for different card types (distractors, etc.)
  cardMetadata: jsonb('card_metadata'),
  // For MC: { distractors: ["wrong1", "wrong2", "wrong3"] }
  // For scenario: { context: "...", options: [...] }
})

// Index
// - (skillNodeId) for mastery calculation
// - (userId, skillNodeId) for user's cards per node
```

**Migration Note**: Existing cards will have `skillNodeId = null` and `cardType = 'flashcard'`.

---

### 5. User Achievements (`userAchievements`)

Tracks unlocked achievements per user.

```typescript
export const userAchievements = pgTable('user_achievements', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  achievementKey: varchar('achievement_key', { length: 50 }).notNull(),
  // 'first_10_cards', 'goal_50_percent', 'perfect_session', etc.
  unlockedAt: timestamp('unlocked_at').notNull().defaultNow(),
  metadata: jsonb('metadata'),
  // Context about the unlock: { goalId, cardCount, sessionId, etc. }
})

// Indexes
// - (userId, achievementKey) unique to prevent duplicates
// - (userId, unlockedAt) for recent achievements
```

**Achievement Keys** (defined in application code):
| Key | Condition |
|-----|-----------|
| `first_10_cards` | Master 10 cards total |
| `first_50_cards` | Master 50 cards total |
| `first_100_cards` | Master 100 cards total |
| `goal_25_percent` | Reach 25% mastery on any goal |
| `goal_50_percent` | Reach 50% mastery on any goal |
| `goal_75_percent` | Reach 75% mastery on any goal |
| `goal_complete` | Reach 100% mastery on any goal |
| `perfect_session` | All ratings >= 3 in a session (min 10 cards) |
| `speed_demon` | Score 90%+ in timed challenge |
| `week_warrior` | Study 7 days in any 7-day window |

---

### 6. User Titles (`userTitles`)

Tracks current title/rank for each user.

```typescript
export const userTitles = pgTable('user_titles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  currentTitle: varchar('current_title', { length: 50 }).notNull().default('Novice'),
  totalCardsMastered: integer('total_cards_mastered').notNull().default(0),
  totalGoalsCompleted: integer('total_goals_completed').notNull().default(0),
  titleHistory: jsonb('title_history').notNull().default('[]'),
  // [{ title: "Apprentice", earnedAt: "2025-01-15T..." }, ...]
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// Index
// - (userId) unique for 1:1 relationship
```

**Title Ladder** (defined in application code):
| Title | Requirement |
|-------|-------------|
| Novice | Default |
| Apprentice | 25 cards mastered |
| Practitioner | 100 cards mastered |
| Specialist | 250 cards mastered |
| Expert | 500 cards mastered |
| Master | 1000 cards mastered OR 5 goals completed |

---

### 7. Topic Analytics (`topicAnalytics`)

Aggregate tracking of topic popularity across all users.

```typescript
export const topicAnalytics = pgTable('topic_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  normalizedTopic: varchar('normalized_topic', { length: 200 }).notNull().unique(),
  // Lowercase, trimmed, prefixes removed
  originalExamples: jsonb('original_examples').notNull().default('[]'),
  // ["Learn Kubernetes", "kubernetes admin", "K8s"] - first 10 variations
  userCount: integer('user_count').notNull().default(1),
  goalCount: integer('goal_count').notNull().default(1),
  firstSeenAt: timestamp('first_seen_at').notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at').notNull().defaultNow(),
  hasCuratedTree: boolean('has_curated_tree').notNull().default(false),
})

// Indexes
// - (normalizedTopic) unique for upsert
// - (userCount DESC) for popularity ranking
// - (hasCuratedTree) for filtering
```

**Field Notes**:

- `normalizedTopic`: Result of topic normalization (see research.md)
- `originalExamples`: Helps understand user intent when creating curated trees
- `hasCuratedTree`: Updated when curated tree is created for this topic

---

## Study Sessions (Application State Only)

Study sessions are managed in React state (not persisted to database) as per research.md decision. Session results are recorded through:

1. Individual `reviewLogs` entries (existing) - one per card rating
2. Achievement checks triggered after session completion
3. Goal `totalTimeSeconds` incremented on session end

---

## Migration Strategy

### Phase 1: Add New Tables

```sql
-- Run via drizzle-kit generate + migrate
CREATE TABLE learning_goals (...);
CREATE TABLE skill_trees (...);
CREATE TABLE skill_nodes (...);
CREATE TABLE user_achievements (...);
CREATE TABLE user_titles (...);
CREATE TABLE topic_analytics (...);
```

### Phase 2: Extend Flashcards

```sql
ALTER TABLE flashcards
  ADD COLUMN skill_node_id UUID REFERENCES skill_nodes(id) ON DELETE SET NULL,
  ADD COLUMN card_type VARCHAR(20) NOT NULL DEFAULT 'flashcard',
  ADD COLUMN card_metadata JSONB;

CREATE INDEX idx_flashcards_skill_node ON flashcards(skill_node_id);
```

### Phase 3: Deprecate Chat Tables (Post-MVP)

```sql
-- Keep data but stop using
-- conversations, messages tables remain for potential data migration
```

---

## Type Exports

```typescript
// Add to drizzle-schema.ts

export type LearningGoal = typeof learningGoals.$inferSelect
export type NewLearningGoal = typeof learningGoals.$inferInsert

export type SkillTree = typeof skillTrees.$inferSelect
export type NewSkillTree = typeof skillTrees.$inferInsert

export type SkillNode = typeof skillNodes.$inferSelect
export type NewSkillNode = typeof skillNodes.$inferInsert

export type UserAchievement = typeof userAchievements.$inferSelect
export type NewUserAchievement = typeof userAchievements.$inferInsert

export type UserTitle = typeof userTitles.$inferSelect
export type NewUserTitle = typeof userTitles.$inferInsert

export type TopicAnalytic = typeof topicAnalytics.$inferSelect
export type NewTopicAnalytic = typeof topicAnalytics.$inferInsert
```

---

## Drizzle Relations (Optional)

For convenient querying with `db.query`:

```typescript
import { relations } from 'drizzle-orm'

export const learningGoalsRelations = relations(learningGoals, ({ one, many }) => ({
  user: one(users, {
    fields: [learningGoals.userId],
    references: [users.id],
  }),
  skillTree: one(skillTrees),
}))

export const skillTreesRelations = relations(skillTrees, ({ one, many }) => ({
  goal: one(learningGoals, {
    fields: [skillTrees.goalId],
    references: [learningGoals.id],
  }),
  nodes: many(skillNodes),
}))

export const skillNodesRelations = relations(skillNodes, ({ one, many }) => ({
  tree: one(skillTrees, {
    fields: [skillNodes.treeId],
    references: [skillTrees.id],
  }),
  parent: one(skillNodes, {
    fields: [skillNodes.parentId],
    references: [skillNodes.id],
  }),
  children: many(skillNodes),
  flashcards: many(flashcards),
}))
```
