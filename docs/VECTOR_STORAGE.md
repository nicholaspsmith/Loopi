# Vector Storage Architecture

## Overview

MemoryLoop uses a **hybrid database architecture** optimized for both transactional operations and vector search:

- **PostgreSQL**: Message metadata (CRUD operations, relationships)
- **LanceDB**: Message content + embeddings (semantic search)

## Why This Architecture?

### LanceDB for Vectors
- ✅ **Columnar storage** - Optimized for vector data compression
- ✅ **Fast ANN search** - Purpose-built for vector similarity
- ✅ **Zero cost** - Local file-based storage
- ✅ **No network latency** - Direct disk I/O

### PostgreSQL for Metadata
- ✅ **ACID transactions** - Safe concurrent operations
- ✅ **Foreign keys** - Referential integrity
- ✅ **Fast CRUD** - Optimized for transactional workloads

## Message Storage Pattern

### Write Flow
```typescript
// 1. User sends message
POST /api/chat/conversations/[id]/messages

// 2. Save to PostgreSQL immediately (blocking)
await createMessage({
  conversationId,
  userId,
  role,
  content,
  aiProvider,
  apiKeyId
}) // Returns in ~5-10ms

// 3. Sync to LanceDB asynchronously (non-blocking)
syncMessageToLanceDB({
  id,
  conversationId,
  userId,
  role,
  content,
  createdAt,
  hasFlashcards
}) // Generates embedding, saves to LanceDB (1-2s, async)
```

### Read Flow (CRUD)
```typescript
// Fetch messages for chat display - PostgreSQL only
const messages = await getMessagesByConversationId(conversationId)
// Fast: ~5-10ms, no embedding data returned
```

### Read Flow (Semantic Search - Future)
```typescript
// Find similar messages - LanceDB only
const similar = await searchSimilarMessages(queryText, userId)
// Returns messages ranked by semantic similarity
```

## Data Synchronization

### PostgreSQL Schema
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id),
  user_id UUID REFERENCES users(id),
  role VARCHAR(20),
  content TEXT,
  -- No embedding column
  has_flashcards BOOLEAN,
  ai_provider VARCHAR(20),
  api_key_id UUID REFERENCES api_keys(id),
  created_at TIMESTAMP
);
```

### LanceDB Schema
```typescript
{
  id: string,              // Same as PostgreSQL
  conversationId: string,
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  embedding: number[],     // 768-dim vector from Ollama
  createdAt: number,
  hasFlashcards: boolean
}
```

### Sync Guarantees

**Strong Consistency (PostgreSQL)**
- Messages immediately available after creation
- Foreign key integrity enforced
- Transactional guarantees

**Eventual Consistency (LanceDB)**
- Messages sync within 1-2 seconds
- Embedding generation may fail gracefully
- Search queries may not see very recent messages

**Failure Handling**
- PostgreSQL write failure → Error returned to user
- LanceDB sync failure → Logged, message still usable
- Missing embeddings → Excluded from semantic search

## File Organization

```
lib/db/operations/
├── messages.ts           # PostgreSQL CRUD operations
├── messages-lancedb.ts   # LanceDB sync and search
├── conversations.ts      # PostgreSQL only
├── users.ts             # PostgreSQL only
├── api-keys.ts          # PostgreSQL only
├── flashcards.ts        # LanceDB only
└── review-logs.ts       # LanceDB only
```

## API Endpoints

### Using PostgreSQL Only
- `GET /api/chat/conversations/[id]/messages` - List messages
- `POST /api/chat/conversations/[id]/messages` - Create message
- `GET /api/settings/api-key` - Get API key status

### Using Both Databases
- `POST /api/flashcards/generate` - Reads PostgreSQL, writes LanceDB

### Using LanceDB Only (Future)
- `POST /api/messages/search` - Semantic search (not yet implemented)
- `GET /api/quiz/due` - Get due flashcards
- `POST /api/quiz/rate` - Rate flashcard

## Embedding Generation

### Process
1. Message saved to PostgreSQL
2. Content sent to Ollama `nomic-embed-text` model
3. 768-dimensional embedding returned
4. Embedding stored in LanceDB with message copy

### Timing
- **Synchronous**: Message save to PostgreSQL (~5-10ms)
- **Asynchronous**: Embedding generation (~500-1000ms)
- **Total user-facing latency**: ~5-10ms (embedding happens in background)

### Failure Modes
- **Ollama unavailable**: Message saved, no embedding (graceful degradation)
- **Network error**: Message saved, sync retried on next message
- **Out of memory**: Message saved, embedding skipped

## Future Features

### Semantic Search (Planned)
```typescript
// Search messages by meaning
const results = await searchSimilarMessages(
  "How do I configure authentication?",
  userId,
  limit: 10
)
// Returns top 10 semantically similar messages
```

### RAG Context (Planned)
```typescript
// Build context for Claude from similar past conversations
const context = await buildContextFromSimilarMessages(
  currentMessage,
  userId,
  maxTokens: 4000
)
// Include in Claude API call for better responses
```

### Conversation Discovery (Planned)
```typescript
// Find related conversations
const related = await findRelatedConversations(
  conversationId,
  userId,
  limit: 5
)
// Show "You might also be interested in..." section
```

## Migration Path

### From Current State
All message embeddings are currently:
- ❌ Not stored in PostgreSQL (removed)
- ✅ Generated and stored in LanceDB asynchronously
- ✅ Available for future semantic search

### To Enable Semantic Search
1. Implement search API endpoint
2. Add search UI component
3. No database changes needed - embeddings already exist!

## Performance Characteristics

### Write Performance
- **PostgreSQL**: 5-10ms (user-blocking)
- **LanceDB**: 500-1000ms (background, non-blocking)
- **Total user latency**: 5-10ms ✅

### Read Performance (CRUD)
- **PostgreSQL**: 5-10ms for 100 messages ✅
- **LanceDB**: Not queried for CRUD operations

### Read Performance (Search - Future)
- **LanceDB**: 10-50ms for vector search across 10K messages ✅
- **PostgreSQL**: Would require full-table scans (slow)

## Storage Costs

### PostgreSQL (Supabase Free Tier: 500MB)
```
Message metadata: ~500 bytes per message
10,000 messages = ~5MB ✅ Fits easily in free tier
```

### LanceDB (Local Disk)
```
Message + embedding: ~3KB per message (768 floats + content)
10,000 messages = ~30MB (negligible)
100,000 messages = ~300MB (still cheap)
```

### Cost Comparison
- **PostgreSQL only**: 10K messages use ~800MB (with embeddings) ❌ Exceeds free tier
- **Hybrid**: 10K messages use ~5MB PostgreSQL + 30MB LanceDB ✅ Free forever

## Testing Strategy

### Unit Tests
- PostgreSQL operations: Mock database, test CRUD
- LanceDB operations: Mock embedding generation
- Sync logic: Verify async calls, error handling

### Integration Tests
- Create message → Verify in both databases
- Simulate sync failures → Verify graceful degradation
- Search queries → Verify vector search works

### Current Status
- ✅ All CRUD tests passing (420/420)
- ✅ Embedding generation tested with mocks
- ⏳ Semantic search tests (pending implementation)

## Monitoring & Debugging

### Logs
```
[Messages] Created message abc-123 in PostgreSQL
[LanceDB] Syncing message abc-123 with embedding
[LanceDB] Synced message abc-123 with embedding
```

### Error Logs
```
[LanceDB] Failed to sync message abc-123: Ollama unavailable
[LanceDB] Failed to generate embedding: Network timeout
```

### Health Checks
- PostgreSQL: Connection pool status
- LanceDB: Table exists, embedding count
- Ollama: API /health endpoint

## References

- `lib/db/operations/messages.ts` - PostgreSQL operations
- `lib/db/operations/messages-lancedb.ts` - LanceDB sync/search
- `ARCHITECTURE.md` - Overall system design
- `drizzle/0001_remove_embeddings.sql` - Migration script
