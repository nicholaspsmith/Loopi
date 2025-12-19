# MemoryLoop Architecture

## Database Architecture: Hybrid System

MemoryLoop uses a **hybrid database architecture** with PostgreSQL and LanceDB working together, each optimized for their specific use cases.

---

## PostgreSQL + pgvector

**Purpose:** Core application data with strong consistency requirements

### Tables
- **users** - User accounts and authentication
- **conversations** - Chat conversations
- **messages** - Chat message metadata (content, role, timestamps)
- **api_keys** - Encrypted Claude API keys (using pgcrypto)

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
- `lib/db/operations/conversations.ts`
- `lib/db/operations/messages.ts`
- `lib/db/operations/api-keys.ts`

---

## LanceDB

**Purpose:** Vector storage and semantic search for messages and flashcards

### Tables
- **messages** - Full message copies with vector embeddings (768-dim)
- **flashcards** - User flashcards with question embeddings (768-dim)
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

### Chat Flow (Both Databases)
```
User sends message
  → POST /api/chat/conversations/[id]/messages
  → createMessage() → PostgreSQL.messages (immediate)
  → syncMessageToLanceDB() → LanceDB.messages (async, with embedding)
  → Stream Claude/Ollama response
  → createMessage() → PostgreSQL.messages (immediate)
  → syncMessageToLanceDB() → LanceDB.messages (async, with embedding)
```

### Flashcard Generation Flow (Both Databases)
```
User clicks "Generate Flashcards"
  → POST /api/flashcards/generate
  → getMessageById() → PostgreSQL.messages (fetch message content)
  → generateFlashcardsFromContent() → Claude/Ollama API
  → createFlashcard() → LanceDB.flashcards (save with embedding)
  → markMessageWithFlashcards() → PostgreSQL.messages (update flag)
  → updateMessageHasFlashcardsInLanceDB() → LanceDB.messages (async sync)
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
- ✅ PostgreSQL for mission-critical auth/chat data
- ✅ LanceDB for high-volume learning data
- ✅ Best performance characteristics for each domain
- ✅ Zero cost for flashcards/reviews (bulk of data volume)
- ⚠️ Two databases to maintain
- ⚠️ More complex architecture

**Decision:** Hybrid is the best fit for MemoryLoop's use case.

---

## Cross-Database References

### Foreign Key Pattern
Since flashcards reference messages, we maintain referential integrity through application logic:

```typescript
// When creating flashcard
export async function createFlashcard(data: {
  messageId: string  // References PostgreSQL.messages.id
  // ...
}) {
  // 1. Verify message exists in PostgreSQL
  const message = await getMessageById(data.messageId)
  if (!message) {
    throw new Error('Message not found')
  }

  // 2. Create flashcard in LanceDB
  const flashcard = await lanceDbCreate('flashcards', {
    messageId: data.messageId,  // Store reference
    // ...
  })

  return flashcard
}
```

### Joining Data Across Databases
When we need to join flashcards with message data:

```typescript
// Get flashcards with their source messages
export async function getFlashcardsWithMessages(userId: string) {
  // 1. Get flashcards from LanceDB
  const flashcards = await getFlashcardsByUserId(userId)

  // 2. Get unique message IDs
  const messageIds = [...new Set(flashcards.map(f => f.messageId))]

  // 3. Fetch messages from PostgreSQL
  const messages = await getMessagesByIds(messageIds)

  // 4. Join in application layer
  return flashcards.map(flashcard => ({
    ...flashcard,
    message: messages.find(m => m.id === flashcard.messageId)
  }))
}
```

---

## Testing Strategy

### PostgreSQL Tests
- User authentication
- API key encryption/decryption
- Conversation management
- Message CRUD operations

### LanceDB Tests
- Flashcard generation
- FSRS scheduling
- Vector search
- Review log tracking

### Integration Tests
Tests that span both databases:
- Flashcard generation (reads from PostgreSQL, writes to LanceDB)
- Context building for RAG (queries both databases)

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
- 100 users × 100 messages = 10K messages → PostgreSQL (acceptable)
- 100 users × 500 flashcards = 50K flashcards → LanceDB (free!)
- 100 users × 5000 reviews = 500K reviews → LanceDB (free!)

**Why this matters:**
- Flashcards + reviews = 90% of data volume
- Keeping them in LanceDB means free tier can handle 10-100x more users

**Scaling limits:**
- PostgreSQL: Supabase free tier = 500MB (plenty for chat history)
- LanceDB: Disk space only (cheap)

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
- **PostgreSQL:** Low-volume, high-value data (users, API keys, conversations)
- **LanceDB:** High-volume, ML-optimized data (flashcards, reviews)

This gives us the best of both worlds while keeping costs near zero.

---

## API Endpoints by Database

### PostgreSQL Endpoints
- `POST /api/auth/signup` - Create user
- `POST /api/auth/[...nextauth]` - Authenticate user
- `GET/POST /api/chat/conversations` - Manage conversations
- `GET/POST /api/chat/conversations/[id]/messages` - Chat messages
- `GET/POST/DELETE /api/settings/api-key` - API key management
- `POST /api/settings/api-key/validate` - Validate API key

### LanceDB Endpoints
- `GET /api/flashcards` - List user flashcards
- `GET/DELETE /api/flashcards/[id]` - Flashcard CRUD
- `POST /api/flashcards/generate` - Generate from message
- `GET /api/quiz/due` - Get due flashcards (FSRS)
- `POST /api/quiz/rate` - Rate flashcard review
- `GET /api/quiz/stats` - User quiz statistics
- `GET /api/quiz/history` - Review history

### Hybrid Endpoints (Query Both)
- `POST /api/flashcards/generate` - Reads PostgreSQL (message), writes LanceDB (flashcards)
- Context building for RAG - Reads both for semantic search

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
├── queries.ts             # Generic LanceDB query helpers
└── operations/
    ├── users.ts           # PostgreSQL
    ├── conversations.ts   # PostgreSQL
    ├── messages.ts        # PostgreSQL
    ├── api-keys.ts        # PostgreSQL
    ├── flashcards.ts      # LanceDB
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
