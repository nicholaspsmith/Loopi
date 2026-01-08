# Loopi Architecture

## Database Architecture: Hybrid System

Loopi uses a **hybrid database architecture** with PostgreSQL and LanceDB working together, each optimized for their specific use cases.

---

## PostgreSQL

**Purpose:** Core application data with strong consistency requirements

### Tables

- **users** - User accounts and authentication
- **learning_goals** - Learning goals with skill trees
- **skill_trees** - Hierarchical skill structures for goals
- **skill_nodes** - Individual skills within a tree
- **flashcards** - Flashcard questions and answers
- **review_logs** - FSRS spaced repetition history

### Why PostgreSQL?

- ✅ **ACID transactions** - Safe concurrent operations
- ✅ **Foreign keys** - Referential integrity enforced at DB level
- ✅ **Proper UPDATE** - No delete+add workarounds needed
- ✅ **Row-level security** - Built-in with Supabase
- ✅ **Encrypted storage** - API keys encrypted with pgcrypto
- ✅ **Fast CRUD operations** - Optimized for transactional workloads

### Client

```typescript
import { getDb } from '@/lib/db/pg-client'
const db = getDb() // Drizzle ORM instance
```

### Schema Definition

- `lib/db/drizzle-schema.ts` - Drizzle ORM schema
- `drizzle/0000_initial.sql` - SQL migration

### Operations

- `lib/db/operations/users.ts`
- `lib/db/operations/goals.ts`
- `lib/db/operations/skill-trees.ts`
- `lib/db/operations/skill-nodes.ts`
- `lib/db/operations/flashcards.ts`
- `lib/db/operations/review-logs.ts`

---

## LanceDB

**Purpose:** Vector storage and semantic search for messages and flashcards

### Tables

- **flashcards** - User flashcards with question embeddings (1024-dim via Jina)
- **goals** - Goal embeddings for duplicate detection
- **review_logs** - FSRS spaced repetition history

### Why LanceDB?

- ✅ **Zero cost** - Local file-based, no hosting fees
- ✅ **Fast vector search** - Optimized for ANN (Approximate Nearest Neighbor)
- ✅ **Columnar storage** - Efficient compression for vector data
- ✅ **No network latency** - Local disk I/O only
- ✅ **FSRS-friendly** - Handles frequent review log writes efficiently
- ✅ **Flexible schema** - Easy to store FSRS state as nested objects

### Client

```typescript
import { getDbConnection } from '@/lib/db/client'
const db = await getDbConnection() // LanceDB instance
```

### Schema Definition

- `lib/db/schema.ts` - LanceDB table initialization

### Operations

- `lib/db/operations/flashcards.ts`
- `lib/db/operations/review-logs.ts`
- `lib/db/queries.ts` - Generic query helpers

---

## Data Flow

### Goal Creation Flow (Both Databases)

```
User creates learning goal
  → POST /api/goals
  → createGoal() → PostgreSQL.learning_goals (immediate)
  → generateGoalEmbedding() → LanceDB.goals (async, with embedding)
  → Claude generates skill tree
  → createSkillTree() → PostgreSQL.skill_trees (save structure)
  → createSkillNodes() → PostgreSQL.skill_nodes (save individual skills)
```

### Flashcard Generation Flow (Both Databases)

```
User clicks "Generate Flashcards" on skill node
  → POST /api/flashcards/generate
  → getSkillNodeById() → PostgreSQL.skill_nodes (fetch skill content)
  → generateFlashcardsFromContent() → Claude API
  → createFlashcard() → PostgreSQL.flashcards (save with embedding)
  → syncFlashcardToLanceDB() → LanceDB.flashcards (async, vector search)
```

### Quiz Flow (LanceDB)

```
User starts quiz
  → GET /api/quiz/due
  → getDueFlashcards() → LanceDB.flashcards (query by FSRS due date)

User rates flashcard
  → POST /api/quiz/rate
  → updateFlashcardReview() → LanceDB.flashcards (update FSRS state)
  → createReviewLog() → LanceDB.review_logs (log the review)
```

---

## Why Not Just One Database?

### Option A: PostgreSQL Only

- ❌ Costs scale with flashcard volume
- ❌ Higher latency for quiz operations (network round-trip)
- ❌ Vector search less optimized than LanceDB
- ✅ Single source of truth
- ✅ Better for production deployment

### Option B: LanceDB Only

- ❌ No transactions (unsafe for authentication)
- ❌ No foreign keys (data integrity issues)
- ❌ Risky updates (delete+add pattern)
- ❌ No encryption (API keys stored in plaintext)
- ✅ Zero cost
- ✅ Fast local operations

### Option C: Hybrid (Current)

- ✅ PostgreSQL for mission-critical auth and learning goal data
- ✅ LanceDB for high-volume vector search and review data
- ✅ Best performance characteristics for each domain
- ✅ Zero cost for flashcards/reviews (bulk of data volume)
- ⚠️ Two databases to maintain
- ⚠️ More complex architecture

**Decision:** Hybrid is the best fit for Loopi's use case.

---

## Cross-Database References

### Foreign Key Pattern

Since flashcards reference skill nodes, we maintain referential integrity through application logic:

```typescript
// When creating flashcard
export async function createFlashcard(data: {
  skillNodeId: string // References PostgreSQL.skill_nodes.id
  goalId: string // References PostgreSQL.learning_goals.id
  // ...
}) {
  // 1. Verify skill node exists in PostgreSQL
  const skillNode = await getSkillNodeById(data.skillNodeId)
  if (!skillNode) {
    throw new Error('Skill node not found')
  }

  // 2. Create flashcard in PostgreSQL
  const flashcard = await db.insert(flashcards).values({
    skillNodeId: data.skillNodeId,
    goalId: data.goalId,
    // ...
  })

  return flashcard
}
```

### Joining Data Across Databases

When we need to join flashcards with skill node data:

```typescript
// Get flashcards with their source skill nodes
export async function getFlashcardsWithSkillNodes(userId: string, goalId: string) {
  // 1. Get flashcards from PostgreSQL
  const flashcards = await getFlashcardsByGoalId(goalId)

  // 2. Get unique skill node IDs
  const skillNodeIds = [...new Set(flashcards.map((f) => f.skillNodeId))]

  // 3. Fetch skill nodes from PostgreSQL
  const skillNodes = await getSkillNodesByIds(skillNodeIds)

  // 4. Join in application layer
  return flashcards.map((flashcard) => ({
    ...flashcard,
    skillNode: skillNodes.find((s) => s.id === flashcard.skillNodeId),
  }))
}
```

---

## Testing Strategy

### PostgreSQL Tests

- User authentication
- Learning goal CRUD operations
- Skill tree generation and management
- Flashcard CRUD operations

### LanceDB Tests

- Goal embedding and similarity search
- Flashcard embedding and deduplication
- FSRS scheduling
- Review log tracking

### Integration Tests

Tests that span both databases:

- Goal creation with embedding sync to LanceDB
- Flashcard generation with deduplication checks
- Study flow (PostgreSQL flashcards → LanceDB review logs)

**Setup Pattern:**

```typescript
beforeAll(async () => {
  // Initialize both databases
  const lanceInitialized = await isSchemaInitialized()
  if (!lanceInitialized) {
    await initializeSchema() // LanceDB tables
  }

  // PostgreSQL tables created automatically via Drizzle migrations
})
```

---

## Deployment Considerations

### Local Development

- **PostgreSQL:** Local Supabase (via Docker) or remote Supabase project
- **LanceDB:** `data/lancedb/` directory (gitignored)

### Production

- **PostgreSQL:** Supabase hosted (free tier sufficient for most users)
- **LanceDB:** Server filesystem
  - ⚠️ Ensure `data/lancedb/` is persisted (not ephemeral storage)
  - ⚠️ Single-server only (LanceDB doesn't support distributed storage)

### Scaling Considerations

**User growth patterns:**

- 100 users × 10 goals = 1K goals → PostgreSQL (minimal)
- 100 users × 500 flashcards = 50K flashcards → PostgreSQL + LanceDB vectors
- 100 users × 5000 reviews = 500K reviews → LanceDB (free!)

**Why this matters:**

- Reviews = majority of data volume
- Keeping review logs in LanceDB means free tier can handle 10-100x more users

**Scaling limits:**

- PostgreSQL: Supabase free tier = 500MB (plenty for goals/flashcards)
- LanceDB: Disk space only (cheap, used for vectors and review logs)

---

## Migration History

### Why Hybrid?

The application originally used LanceDB for everything, but encountered issues:

1. **No transactions** - Race conditions in auth flows
2. **No encryption** - Couldn't safely store API keys
3. **Unsafe updates** - Delete+add pattern caused data loss bugs
4. **No foreign keys** - Data integrity issues

### Migration Decision

Rather than fully migrating to PostgreSQL (expensive at scale) or staying with LanceDB (unsafe for auth), we split the data:

- **PostgreSQL:** Transactional data (users, goals, skill trees, flashcards)
- **LanceDB:** Vector storage and high-volume logs (embeddings, review logs)

This gives us the best of both worlds while keeping costs near zero.

---

## API Endpoints by Database

### PostgreSQL Endpoints

- `POST /api/auth/signup` - Create user
- `POST /api/auth/[...nextauth]` - Authenticate user
- `GET/POST /api/goals` - Manage learning goals
- `GET/PUT/DELETE /api/goals/[id]` - Goal CRUD
- `GET/POST /api/goals/[id]/skill-tree` - Skill tree management
- `GET /api/flashcards` - List user flashcards
- `GET/DELETE /api/flashcards/[id]` - Flashcard CRUD
- `POST /api/flashcards/generate` - Generate from skill node

### LanceDB Endpoints

- `GET /api/study/due` - Get due flashcards (FSRS)
- `POST /api/study/rate` - Rate flashcard review
- `GET /api/progress/stats` - User study statistics
- `GET /api/progress/history` - Review history

### Hybrid Endpoints (Query Both)

- `POST /api/goals` - Creates goal in PostgreSQL, syncs embedding to LanceDB
- `POST /api/flashcards/generate` - Creates flashcards with deduplication (checks LanceDB vectors)

---

## Environment Variables

```bash
# PostgreSQL (Supabase)
DATABASE_URL="postgresql://user:pass@host:5432/database"

# LanceDB (file-based, no config needed)
# Data stored in: data/lancedb/
```

---

## File Structure

```
lib/db/
├── client.ts              # LanceDB connection
├── pg-client.ts           # PostgreSQL connection (Drizzle)
├── schema.ts              # LanceDB schema initialization
├── drizzle-schema.ts      # PostgreSQL schema (Drizzle)
├── queries.ts             # Generic query helpers
└── operations/
    ├── users.ts           # PostgreSQL
    ├── goals.ts           # PostgreSQL
    ├── skill-trees.ts     # PostgreSQL
    ├── skill-nodes.ts     # PostgreSQL
    ├── flashcards.ts      # PostgreSQL + LanceDB vectors
    └── review-logs.ts     # LanceDB
```

---

## Future Considerations

### When to Migrate Fully to PostgreSQL

If any of these become true:

1. Need multi-server deployment (LanceDB is single-server)
2. Flashcard volume exceeds disk space on server
3. Need real-time collaboration on flashcards
4. Want managed backups for flashcard data

### When to Move Back to LanceDB

If any of these become true:

1. PostgreSQL costs exceed budget
2. Need offline-first mobile app
3. Want zero-dependency deployment
4. Network latency becomes unacceptable

### Current Status: Hybrid is optimal

For a personal/small-team flashcard app with free-tier hosting requirements, the hybrid approach provides the best cost/performance/safety balance.
