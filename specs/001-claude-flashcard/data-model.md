# Data Model: MemoryLoop - Claude-Powered Flashcard Learning Platform

**Phase**: 1 (Design & Contracts)
**Date**: 2025-12-14
**Feature**: [spec.md](spec.md)
**Plan**: [plan.md](plan.md)

## Overview

This document defines the entity schemas, database tables, and validation rules for the MemoryLoop application. The data model uses **LanceDB** (vector database) for storage with **Zod** schemas for type-safe validation.

### Storage Technology

- **Database**: LanceDB (embedded vector database)
- **Format**: Apache Arrow IPC files
- **Validation**: Zod 3.x schemas
- **Vector Embeddings**: Ollama nomic-embed-text (768 dimensions)
- **IDs**: UUIDv4 strings
- **Timestamps**: Unix timestamps (milliseconds, number type)

### Key Design Decisions

1. **Separate tables per entity**: Users, Conversations, Messages, Flashcards, ReviewLogs
2. **Vector embeddings stored inline**: Embedding columns alongside content for atomic consistency
3. **FSRS state as JSON column**: Complete Card object stored in flashcards table
4. **Immutable message history**: Messages are append-only (no updates)
5. **Mutable flashcard state**: FSRS scheduling requires updates to flashcard entities

---

## Entity Schemas

### 1. User Entity

Represents an authenticated user with access to the application.

#### LanceDB Table: `users`

```typescript
interface User {
  id: string;           // UUIDv4
  email: string;        // Unique email address
  name: string | null;  // Display name (optional)
  passwordHash: string; // Hashed password (bcrypt)
  createdAt: number;    // Unix timestamp (ms)
  updatedAt: number;    // Unix timestamp (ms)
}
```

#### Zod Validation Schema

```typescript
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().min(3).max(255),
  name: z.string().min(1).max(100).nullable(),
  passwordHash: z.string().min(60).max(60), // bcrypt hash is exactly 60 chars
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export type User = z.infer<typeof UserSchema>;

// Public-facing user (no password hash)
export const PublicUserSchema = UserSchema.omit({ passwordHash: true });
export type PublicUser = z.infer<typeof PublicUserSchema>;
```

#### Indexes

- Primary key: `id`
- Unique index: `email`
- Index: `createdAt` (for user listing sorted by registration date)

#### Relationships

- **Has many**: Conversations
- **Has many**: Flashcards
- **Has many**: ReviewLogs

---

### 2. Conversation Entity

Represents a chat session between a user and Claude.

#### LanceDB Table: `conversations`

```typescript
interface Conversation {
  id: string;           // UUIDv4
  userId: string;       // FK to users.id
  title: string | null; // Auto-generated from first message content
  createdAt: number;    // Unix timestamp (ms)
  updatedAt: number;    // Unix timestamp (ms) - updated when messages added
  messageCount: number; // Cached count of messages
}
```

#### Zod Validation Schema

```typescript
export const ConversationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(200).nullable(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
  messageCount: z.number().int().nonnegative().default(0),
});

export type Conversation = z.infer<typeof ConversationSchema>;
```

#### Indexes

- Primary key: `id`
- Index: `userId, updatedAt DESC` (for user's conversation list sorted by recent activity)
- Index: `userId, createdAt DESC` (for chronological order)

#### Relationships

- **Belongs to**: User (via `userId`)
- **Has many**: Messages
- **Has many**: Flashcards (indirectly through messages)

#### Business Rules

- `title` is auto-generated from the first 50 characters of the first user message
- `messageCount` is incremented on each message addition
- `updatedAt` is updated whenever a new message is added
- Conversations persist indefinitely across user sessions (FR-023)

---

### 3. Message Entity

Represents a single message in a conversation (from user or Claude).

#### LanceDB Table: `messages`

```typescript
interface Message {
  id: string;                  // UUIDv4
  conversationId: string;      // FK to conversations.id
  userId: string;              // FK to users.id (owner)
  role: 'user' | 'assistant';  // Message sender
  content: string;             // Message text
  embedding: number[] | null;  // Vector embedding (1536 dims) - nullable for graceful degradation
  createdAt: number;           // Unix timestamp (ms)
  hasFlashcards: boolean;      // Flag indicating flashcards were generated from this message
}
```

#### Zod Validation Schema

```typescript
export const MessageRoleSchema = z.enum(['user', 'assistant']);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

export const MessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  userId: z.string().uuid(),
  role: MessageRoleSchema,
  content: z.string().min(1).max(50000), // Max 50k characters
  embedding: z.array(z.number()).length(768).nullable(), // Ollama nomic-embed-text
  createdAt: z.number().int().positive(),
  hasFlashcards: z.boolean().default(false),
});

export type Message = z.infer<typeof MessageSchema>;
```

#### Indexes

- Primary key: `id`
- Index: `conversationId, createdAt ASC` (for chronological message retrieval)
- Index: `userId, createdAt DESC` (for user's recent messages)
- Index: `hasFlashcards, userId` (for finding messages with flashcards)
- Vector index: `embedding` (cosine similarity for semantic search - future enhancement)

#### Relationships

- **Belongs to**: Conversation (via `conversationId`)
- **Belongs to**: User (via `userId`)
- **Has many**: Flashcards (messages with `role: 'assistant'` can generate flashcards)

#### Business Rules

- Messages are **immutable** after creation (append-only)
- Only `assistant` messages can have flashcards generated (`role: 'assistant'`)
- `hasFlashcards` is set to `true` after successful flashcard generation
- `embedding` is generated asynchronously via Ollama API (nullable for graceful degradation)
- Messages maintain conversation context in chronological order

---

### 4. Flashcard Entity

Represents a question-answer pair for study purposes with FSRS scheduling state.

#### LanceDB Table: `flashcards`

```typescript
import { Card as FSRSCard } from 'ts-fsrs';

interface Flashcard {
  id: string;                    // UUIDv4
  userId: string;                // FK to users.id (owner)
  conversationId: string;        // FK to conversations.id (source conversation)
  messageId: string;             // FK to messages.id (source Claude response)
  question: string;              // Flashcard front (question)
  answer: string;                // Flashcard back (answer)
  questionEmbedding: number[] | null; // Vector for semantic search (1536 dims)
  createdAt: number;             // Unix timestamp (ms)

  // FSRS Scheduling State (stored as JSON)
  fsrsState: FSRSCard;           // Complete FSRS Card object
}

// FSRS Card structure (from ts-fsrs library)
interface FSRSCard {
  due: Date;              // Next review date
  stability: number;      // Memory stability (days)
  difficulty: number;     // Item difficulty (0-10)
  elapsed_days: number;   // Days since last review
  scheduled_days: number; // Days until next review
  reps: number;          // Total review count
  lapses: number;        // Number of "Again" ratings
  state: State;          // 0=New, 1=Learning, 2=Review, 3=Relearning
  last_review?: Date;    // Date of last review (optional)
}
```

#### Zod Validation Schema

```typescript
import { State } from 'ts-fsrs';

// FSRS Card schema
export const FSRSCardSchema = z.object({
  due: z.date(),
  stability: z.number().nonnegative(),
  difficulty: z.number().min(0).max(10),
  elapsed_days: z.number().nonnegative(),
  scheduled_days: z.number().nonnegative(),
  reps: z.number().int().nonnegative(),
  lapses: z.number().int().nonnegative(),
  state: z.nativeEnum(State), // 0=New, 1=Learning, 2=Review, 3=Relearning
  last_review: z.date().optional(),
});

export type FSRSCard = z.infer<typeof FSRSCardSchema>;

// Flashcard schema
export const FlashcardSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
  question: z.string().min(1).max(1000),
  answer: z.string().min(1).max(5000),
  questionEmbedding: z.array(z.number()).length(1536).nullable(),
  createdAt: z.number().int().positive(),
  fsrsState: FSRSCardSchema,
});

export type Flashcard = z.infer<typeof FlashcardSchema>;
```

#### Indexes

- Primary key: `id`
- Index: `userId, createdAt ASC` (for chronological flashcard list - FR-024)
- Index: `userId, fsrsState.due ASC` (for due card retrieval in quiz mode)
- Index: `userId, fsrsState.state` (for filtering by FSRS state: New, Learning, Review, Relearning)
- Index: `messageId` (for looking up flashcards by source message)
- Index: `conversationId` (for future enhancement: filter by conversation)
- Vector index: `questionEmbedding` (for semantic similarity search - future enhancement)

#### Relationships

- **Belongs to**: User (via `userId`)
- **Belongs to**: Conversation (via `conversationId`)
- **Belongs to**: Message (via `messageId` - source Claude response)
- **Has many**: ReviewLogs

#### Business Rules

- Flashcards are **mutable** (FSRS state updates after each review)
- `fsrsState` is initialized with `createEmptyCard()` from ts-fsrs on creation
- `fsrsState.due` determines when card is shown in quiz (due-based filtering)
- `fsrsState.state` tracks learning phase (New → Learning → Review or Relearning)
- `questionEmbedding` generated asynchronously (nullable for graceful degradation)
- Flashcards associated with a specific message to prevent duplicate generation (FR-017)
- Presented in chronological order by `createdAt` in MVP (FR-024)

---

### 5. ReviewLog Entity

Represents a historical record of a single flashcard review event (for analytics and optimization).

#### LanceDB Table: `review_logs`

```typescript
import { Rating, State, ReviewLog as FSRSReviewLog } from 'ts-fsrs';

interface ReviewLog {
  id: string;              // UUIDv4
  flashcardId: string;     // FK to flashcards.id
  userId: string;          // FK to users.id
  rating: Rating;          // 1=Again, 2=Hard, 3=Good, 4=Easy
  state: State;            // State before review (0-3)
  due: Date;               // When card was due
  stability: number;       // Stability before review
  difficulty: number;      // Difficulty before review
  elapsed_days: number;    // Days since last review
  last_elapsed_days: number; // Previous elapsed days
  scheduled_days: number;  // Days until next review (interval)
  review: Date;            // Timestamp of review event
}
```

#### Zod Validation Schema

```typescript
import { Rating, State } from 'ts-fsrs';

export const ReviewLogSchema = z.object({
  id: z.string().uuid(),
  flashcardId: z.string().uuid(),
  userId: z.string().uuid(),
  rating: z.nativeEnum(Rating), // 1=Again, 2=Hard, 3=Good, 4=Easy
  state: z.nativeEnum(State),   // 0=New, 1=Learning, 2=Review, 3=Relearning
  due: z.date(),
  stability: z.number().nonnegative(),
  difficulty: z.number().min(0).max(10),
  elapsed_days: z.number().nonnegative(),
  last_elapsed_days: z.number().nonnegative(),
  scheduled_days: z.number().nonnegative(),
  review: z.date(),
});

export type ReviewLog = z.infer<typeof ReviewLogSchema>;
```

#### Indexes

- Primary key: `id`
- Index: `flashcardId, review DESC` (for flashcard review history)
- Index: `userId, review DESC` (for user's review activity timeline)
- Index: `userId, DATE(review)` (for daily review count aggregation)

#### Relationships

- **Belongs to**: Flashcard (via `flashcardId`)
- **Belongs to**: User (via `userId`)

#### Business Rules

- Review logs are **immutable** (append-only historical record)
- Created automatically after each flashcard review rating
- Used for:
  - User progress analytics (retention rate, review counts)
  - Algorithm optimization (training custom FSRS weights)
  - Debugging scheduling issues
  - Data export for users

---

## Database Schema Initialization

### Table Creation (LanceDB)

```typescript
// lib/db/schema.ts
import { getDbConnection } from './client';
import { createEmptyCard } from 'ts-fsrs';

export async function initializeSchema() {
  const db = await getDbConnection();

  // 1. Users table
  await db.createTable('users', [
    {
      id: '00000000-0000-0000-0000-000000000000',
      email: 'init@example.com',
      name: 'Init User',
      passwordHash: '$2b$10$INIT_PLACEHOLDER_HASH_FOR_SCHEMA_CREATION_ONLY',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  ], { mode: 'create' });

  // 2. Conversations table
  await db.createTable('conversations', [
    {
      id: '00000000-0000-0000-0000-000000000000',
      userId: '00000000-0000-0000-0000-000000000000',
      title: 'Init Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
    }
  ], { mode: 'create' });

  // 3. Messages table (with vector column)
  await db.createTable('messages', [
    {
      id: '00000000-0000-0000-0000-000000000000',
      conversationId: '00000000-0000-0000-0000-000000000000',
      userId: '00000000-0000-0000-0000-000000000000',
      role: 'user',
      content: 'Init message for schema creation',
      embedding: new Array(768).fill(0), // Ollama nomic-embed-text
      createdAt: Date.now(),
      hasFlashcards: false,
    }
  ], { mode: 'create' });

  // 4. Flashcards table (with vector column and FSRS state)
  const emptyFSRSCard = createEmptyCard();

  await db.createTable('flashcards', [
    {
      id: '00000000-0000-0000-0000-000000000000',
      userId: '00000000-0000-0000-0000-000000000000',
      conversationId: '00000000-0000-0000-0000-000000000000',
      messageId: '00000000-0000-0000-0000-000000000000',
      question: 'Init question',
      answer: 'Init answer',
      questionEmbedding: new Array(1536).fill(0),
      createdAt: Date.now(),
      fsrsState: emptyFSRSCard, // FSRS Card object stored as JSON
    }
  ], { mode: 'create' });

  // 5. ReviewLogs table
  await db.createTable('review_logs', [
    {
      id: '00000000-0000-0000-0000-000000000000',
      flashcardId: '00000000-0000-0000-0000-000000000000',
      userId: '00000000-0000-0000-0000-000000000000',
      rating: 3, // Rating.Good
      state: 0,  // State.New
      due: new Date(),
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      last_elapsed_days: 0,
      scheduled_days: 0,
      review: new Date(),
    }
  ], { mode: 'create' });

  console.log('✅ Database schema initialized successfully');

  // Cleanup init rows (optional - LanceDB requires at least one row for schema creation)
  await db.openTable('users').then(t => t.delete("id = '00000000-0000-0000-0000-000000000000'"));
  await db.openTable('conversations').then(t => t.delete("id = '00000000-0000-0000-0000-000000000000'"));
  await db.openTable('messages').then(t => t.delete("id = '00000000-0000-0000-0000-000000000000'"));
  await db.openTable('flashcards').then(t => t.delete("id = '00000000-0000-0000-0000-000000000000'"));
  await db.openTable('review_logs').then(t => t.delete("id = '00000000-0000-0000-0000-000000000000'"));

  console.log('✅ Init rows cleaned up');
}
```

---

## Entity Relationships Diagram

```
┌─────────────┐
│    User     │
│  (users)    │
└──────┬──────┘
       │
       │ 1:N
       │
       ├───────────────┬───────────────┬────────────────┐
       │               │               │                │
       ▼               ▼               ▼                ▼
┌─────────────┐  ┌──────────┐  ┌───────────┐  ┌──────────────┐
│Conversation │  │ Message  │  │ Flashcard │  │  ReviewLog   │
│(conversations)│  │(messages)│  │(flashcards)│  │(review_logs) │
└──────┬──────┘  └─────┬────┘  └─────┬─────┘  └──────────────┘
       │               │              │
       │ 1:N           │ 1:N          │
       │               │              │
       └───────────────┴──────────────┘
                      │
                      │ 1:N
                      │
                      ▼
              ┌──────────────┐
              │   Message    │
              │  (assistant) │
              │ [source for  │
              │  flashcards] │
              └──────────────┘
```

**Relationships**:
- User → Conversations (1:N)
- User → Messages (1:N)
- User → Flashcards (1:N)
- User → ReviewLogs (1:N)
- Conversation → Messages (1:N)
- Message → Flashcards (1:N, only assistant messages)
- Flashcard → ReviewLogs (1:N)

---

## Query Patterns

### Common Queries

#### 1. Get user's conversations (sorted by recent activity)

```typescript
async function getUserConversations(userId: string, limit: number = 20) {
  const conversations = await getTable<Conversation>('conversations');

  const results = await conversations
    .filter(`userId = '${userId}'`)
    .limit(limit)
    .execute();

  return results.sort((a, b) => b.updatedAt - a.updatedAt);
}
```

#### 2. Get conversation messages (chronological)

```typescript
async function getConversationMessages(
  conversationId: string,
  userId: string,
  limit: number = 50
) {
  const messages = await getTable<Message>('messages');

  const results = await messages
    .filter(`conversationId = '${conversationId}' AND userId = '${userId}'`)
    .limit(limit)
    .execute();

  return results.sort((a, b) => a.createdAt - b.createdAt);
}
```

#### 3. Get due flashcards for quiz (FSRS-based)

```typescript
async function getDueFlashcards(userId: string, limit: number = 20) {
  const flashcards = await getTable<Flashcard>('flashcards');
  const now = new Date();

  const results = await flashcards
    .filter(`userId = '${userId}' AND fsrsState.due <= ${now.getTime()}`)
    .limit(limit)
    .execute();

  // Sort by due date (oldest first)
  return results.sort((a, b) =>
    new Date(a.fsrsState.due).getTime() - new Date(b.fsrsState.due).getTime()
  );
}
```

#### 4. Get all flashcards for user (chronological - FR-024)

```typescript
async function getUserFlashcards(userId: string, limit: number = 100) {
  const flashcards = await getTable<Flashcard>('flashcards');

  const results = await flashcards
    .filter(`userId = '${userId}'`)
    .limit(limit)
    .execute();

  // Sort by creation date (chronological order for MVP)
  return results.sort((a, b) => a.createdAt - b.createdAt);
}
```

#### 5. Check if flashcards exist for message (prevent duplicates - FR-017)

```typescript
async function hasFlashcardsForMessage(messageId: string): Promise<boolean> {
  const messages = await getTable<Message>('messages');

  const result = await messages
    .filter(`id = '${messageId}'`)
    .limit(1)
    .execute();

  return result.length > 0 && result[0].hasFlashcards;
}
```

#### 6. Get user's review statistics

```typescript
async function getUserReviewStats(userId: string) {
  const now = new Date();
  const todayStart = new Date(now.setHours(0, 0, 0, 0));

  const flashcards = await getTable<Flashcard>('flashcards');
  const reviewLogs = await getTable<ReviewLog>('review_logs');

  // Total flashcards
  const allCards = await flashcards
    .filter(`userId = '${userId}'`)
    .execute();

  // Due today
  const dueToday = allCards.filter(c =>
    new Date(c.fsrsState.due) <= now
  );

  // Reviews today
  const reviewsToday = await reviewLogs
    .filter(`userId = '${userId}' AND review >= ${todayStart.getTime()}`)
    .execute();

  return {
    total: allCards.length,
    dueToday: dueToday.length,
    reviewedToday: reviewsToday.length,
    newCards: allCards.filter(c => c.fsrsState.state === 0).length,      // State.New
    learning: allCards.filter(c => c.fsrsState.state === 1).length,      // State.Learning
    review: allCards.filter(c => c.fsrsState.state === 2).length,        // State.Review
    relearning: allCards.filter(c => c.fsrsState.state === 3).length,    // State.Relearning
  };
}
```

---

## Data Validation Rules

### Input Validation

All API endpoints must validate input data using Zod schemas before database operations:

```typescript
// Example: Create flashcard endpoint
import { FlashcardSchema } from '@/types/db';

export async function POST(req: Request) {
  const body = await req.json();

  // Validate input against schema
  const validation = FlashcardSchema.safeParse(body);

  if (!validation.success) {
    return Response.json(
      { error: 'Invalid flashcard data', details: validation.error },
      { status: 400 }
    );
  }

  // Proceed with validated data
  const flashcard = validation.data;
  // ... insert into database
}
```

### Security Validation

All queries must filter by `userId` for multi-tenancy isolation:

```typescript
// ALWAYS filter by authenticated user ID
const userId = session.user.id; // from authentication

const results = await table
  .filter(`userId = '${userId}'`) // Critical security check
  .execute();
```

### FSRS State Validation

Flashcard FSRS state must be validated before and after scheduling:

```typescript
import { FSRS, Rating, createEmptyCard } from 'ts-fsrs';
import { FSRSCardSchema } from '@/types/db';

// Validate FSRS state from database
const flashcard = await getFlashcard(id);
const validation = FSRSCardSchema.safeParse(flashcard.fsrsState);

if (!validation.success) {
  throw new Error('Corrupted FSRS state');
}

// Use validated state for scheduling
const fsrs = new FSRS();
const outcome = fsrs.repeat(validation.data, new Date())[Rating.Good];

// Validate outcome before persisting
const outcomeValidation = FSRSCardSchema.safeParse(outcome.card);
if (!outcomeValidation.success) {
  throw new Error('Invalid FSRS scheduling result');
}

await updateFlashcard(id, { fsrsState: outcomeValidation.data });
```

---

## Migration and Versioning

### Schema Version Tracking

```typescript
interface SchemaVersion {
  version: number;
  appliedAt: number;
  description: string;
}

// Track schema migrations
const CURRENT_SCHEMA_VERSION = 1;

export async function getSchemaVersion(): Promise<number> {
  // Check if schema_versions table exists
  try {
    const versions = await getTable<SchemaVersion>('schema_versions');
    const results = await versions.execute();

    if (results.length === 0) return 0;

    return Math.max(...results.map(v => v.version));
  } catch (error) {
    // Table doesn't exist, schema not initialized
    return 0;
  }
}

export async function applyMigrations() {
  const currentVersion = await getSchemaVersion();

  if (currentVersion < CURRENT_SCHEMA_VERSION) {
    console.log(`Migrating schema from v${currentVersion} to v${CURRENT_SCHEMA_VERSION}`);

    // Apply migrations
    if (currentVersion === 0) {
      await initializeSchema();
    }

    // Record migration
    const versions = await getTable<SchemaVersion>('schema_versions');
    await versions.add([{
      version: CURRENT_SCHEMA_VERSION,
      appliedAt: Date.now(),
      description: 'Initial schema creation'
    }]);
  }
}
```

---

## Summary

### Entity Count: 5

1. **User** - Authentication and ownership
2. **Conversation** - Chat sessions with Claude
3. **Message** - Individual chat messages (user/assistant)
4. **Flashcard** - Question-answer pairs with FSRS state
5. **ReviewLog** - Historical review events for analytics

### Table Count: 5

- `users`
- `conversations`
- `messages`
- `flashcards`
- `review_logs`

### Key Features

- ✅ Vector embeddings (1536 dims) for future semantic search
- ✅ FSRS scheduling state (JSON column in flashcards)
- ✅ Immutable message history (append-only)
- ✅ Mutable flashcard state (FSRS updates)
- ✅ Multi-tenancy isolation (userId filtering)
- ✅ Type-safe validation (Zod schemas)
- ✅ Chronological flashcard ordering (FR-024)
- ✅ Persistent conversation history (FR-023)

### Next Steps

- Define API contracts in `contracts/` directory (auth, chat, flashcards, quiz)
- Create quickstart.md for development setup
- Update agent context files (AGENTS.md, CLAUDE.md)
- Re-evaluate Constitution Check with complete design artifacts
