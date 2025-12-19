# Data Model: RAG Integration

**Feature**: RAG Integration for Enhanced Chat Responses
**Created**: 2025-12-18
**Branch**: 005-rag-integration

## Overview

This document defines the data structures used in the RAG (Retrieval-Augmented Generation) integration. RAG enhances chat responses by retrieving semantically similar past messages and including them as context for Claude API calls.

## Entities

### RAGContext

**Purpose**: Structured output from RAG context builder containing retrieved messages and formatted context string.

**Type Definition**: lib/claude/rag.ts

```typescript
export interface RAGContext {
  context: string          // Formatted context string for Claude system prompt
  sourceMessages: Message[] // Array of semantically similar messages used as context
  enabled: boolean         // Whether RAG was enabled for this query
}
```

**Fields**:

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `context` | string | Yes | Formatted context prepended to system prompt. Empty string if RAG disabled or no results. | Max ~8000 chars (2000 tokens × 4 chars/token) |
| `sourceMessages` | Message[] | Yes | Similar messages retrieved from LanceDB. Empty array if no results. | Max 5 messages (FR-003) |
| `enabled` | boolean | Yes | Indicates whether RAG was attempted. False if disabled or failed. | - |

**Lifecycle**:
1. **Created**: By `buildRAGContext()` function for each chat message
2. **Used**: Chat API uses `context` field to augment system prompt
3. **Logged**: Source message count and context length logged for observability
4. **Destroyed**: Ephemeral - not persisted, exists only during chat request

**Related Entities**: Message (from types/db.ts)

---

### RAGOptions

**Purpose**: Configuration options for RAG context builder.

**Type Definition**: lib/claude/rag.ts (inline interface parameter)

```typescript
interface RAGOptions {
  enabled?: boolean      // Whether to enable RAG context retrieval
  maxMessages?: number   // Maximum messages to retrieve
  maxTokens?: number     // Maximum token budget for context
}
```

**Fields**:

| Field | Type | Required | Default | Description | Validation |
|-------|------|----------|---------|-------------|------------|
| `enabled` | boolean | No | true | Enable/disable RAG context retrieval | - |
| `maxMessages` | number | No | 5 | Maximum similar messages to retrieve | Min: 1, Max: 10 |
| `maxTokens` | number | No | 2000 | Maximum token budget for RAG context | Min: 100, Max: 4000 |

**Usage**:
```typescript
const ragContext = await buildRAGContext(userMessage, userId, {
  enabled: shouldUseRAG(userMessage),
  maxMessages: 5,
  maxTokens: 2000,
})
```

---

### Message (Extended)

**Purpose**: Existing message entity with embedding field used for RAG vector search.

**Type Definition**: types/db.ts

```typescript
export interface Message {
  id: string
  conversationId: string
  userId: string
  role: 'user' | 'assistant'
  content: string
  embedding: number[] | null  // 768-dimensional vector (Ollama nomic-embed-text)
  createdAt: number
  hasFlashcards: boolean
}
```

**RAG-Relevant Fields**:

| Field | Type | Description | RAG Usage |
|-------|------|-------------|-----------|
| `embedding` | number[] \| null | 768-dimensional vector embedding of message content | Used for vector similarity search in LanceDB |
| `userId` | string | User who created the message | Privacy boundary - RAG search scoped to current user only |
| `role` | 'user' \| 'assistant' | Message role (user or assistant) | Formatted in RAG context as `[user]` or `[assistant]` |
| `content` | string | Message text content | Included in RAG context string |

**State Transitions**:
- **Created**: `embedding` is `null` initially (FR spec line 93)
- **Embedding Generated**: Background job populates `embedding` asynchronously
- **RAG Searchable**: Message appears in vector search results only after `embedding` is non-null

---

## Data Flows

### RAG Context Retrieval Flow

```
User Message
    ↓
shouldUseRAG(message) → boolean
    ↓ (if true)
buildRAGContext(message, userId, options)
    ↓
searchSimilarMessages(message, userId, maxMessages)  [LanceDB vector search]
    ↓
filterValidMessages(results)  [Filter out null embeddings]
    ↓
formatMessagesAsContext(validMessages, maxTokens)  [Build context string]
    ↓
RAGContext { context, sourceMessages, enabled }
    ↓
Chat API augments system prompt with context
    ↓
Claude API call with enhanced context
```

### Vector Search Query Flow

```
buildRAGContext()
    ↓
Generate embedding for user message  [Ollama nomic-embed-text]
    ↓
searchSimilarMessages(queryEmbedding, userId, limit)
    ↓
LanceDB.search(embedding)
  .distanceType("cosine")
  .where(`user_id = '${userId}'`)  // Privacy boundary (FR-011)
  .select(["id", "content", "role", "created_at"])
  .limit(maxMessages)
    ↓
Return Message[] ordered by similarity score (descending)
```

---

## Validation Rules

### Message Filtering

**Rule**: Only messages with non-null embeddings can be used in RAG context (lib/claude/rag.ts:60-61)

```typescript
const validMessages = similarMessages.filter(m => m.embedding !== null)
```

**Rationale**: Messages without embeddings cannot be retrieved via vector search. Filtering prevents null reference errors.

### Token Limit Enforcement

**Rule**: Formatted RAG context MUST NOT exceed `maxTokens` limit (default: 2000) (FR-004, SC-006)

```typescript
const maxChars = maxTokens * 4  // Rough token-to-char conversion
if (currentLength + messageText.length > maxChars) {
  break  // Stop adding messages
}
```

**Rationale**: Prevents Claude API context window overflow and ensures conversation history has room.

### User Scoping

**Rule**: Vector search MUST filter results to current user only (FR-011)

```typescript
.where(`user_id = '${userId}'`)  // Privacy boundary
```

**Rationale**: Prevents cross-user data leakage. Each user sees only their own conversation history.

---

## Performance Considerations

### Embedding Generation
- **Timing**: Asynchronous after message creation (non-blocking)
- **Latency**: <100ms per message (Ollama nomic-embed-text)
- **Failure Mode**: Message saved with `null` embedding, excluded from future RAG searches

### Vector Search
- **Target**: <500ms for 10k messages (SC-002)
- **Optimization**: IVF_PQ indexing with cosine similarity (research.md section 1)
- **Column Selection**: Only fetch needed columns (id, content, role, created_at)

### Context Formatting
- **Complexity**: O(n) where n = number of similar messages (max 5)
- **Memory**: ~8KB per RAG context (2000 tokens × 4 bytes/char)
- **Truncation**: Stops adding messages when token limit reached

---

## Error Handling

### Graceful Degradation Scenarios

| Scenario | Behavior | RAGContext Return Value |
|----------|----------|------------------------|
| No embeddings exist for user | Log info, continue without context | `{ context: "", sourceMessages: [], enabled: true }` |
| LanceDB unavailable | Log error, continue without context | `{ context: "", sourceMessages: [], enabled: false }` |
| Embedding generation fails | Log error, continue without context | `{ context: "", sourceMessages: [], enabled: false }` |
| Vector search timeout | Log error, continue without context | `{ context: "", sourceMessages: [], enabled: false }` |
| All similar messages have null embeddings | Log info, continue without context | `{ context: "", sourceMessages: [], enabled: true }` |

**Key Principle**: RAG MUST NEVER break chat functionality (FR-009, SC-003). All errors result in empty context and chat continues normally.

---

## Logging Schema

### Structured Log Fields (JSON)

```typescript
interface RAGLogEntry {
  event: "rag_context_built" | "rag_search_failed" | "rag_disabled"
  userId: string
  conversationId: string
  messageLength: number
  similarMessagesFound: number
  contextLength: number
  contextTokens: number  // Estimated
  ragEnabled: boolean
  executionTimeMs: number
  error?: string
}
```

**Example Log Output**:
```json
{
  "event": "rag_context_built",
  "userId": "user-123",
  "conversationId": "conv-456",
  "messageLength": 45,
  "similarMessagesFound": 3,
  "contextLength": 1847,
  "contextTokens": 461,
  "ragEnabled": true,
  "executionTimeMs": 287
}
```

See research.md section 3 for full logging implementation pattern.

---

## References

- **Feature Spec**: specs/005-rag-integration/spec.md
- **Research**: specs/005-rag-integration/research.md
- **Implementation**: lib/claude/rag.ts, lib/db/operations/messages-lancedb.ts
- **Types**: types/db.ts
