# RAG API Contract

**Feature**: RAG Integration for Enhanced Chat Responses
**Created**: 2025-12-18
**Branch**: 005-rag-integration

## Overview

This document defines the programmatic interface for RAG (Retrieval-Augmented Generation) functionality. RAG is implemented as internal library functions, not HTTP endpoints, as it integrates directly into the existing chat API.

## Internal API Functions

### buildRAGContext()

**Purpose**: Build RAG context from semantically similar past messages.

**Module**: `lib/claude/rag.ts`

**Signature**:
```typescript
export async function buildRAGContext(
  userMessage: string,
  userId: string,
  options?: {
    enabled?: boolean
    maxMessages?: number
    maxTokens?: number
  }
): Promise<RAGContext>
```

**Parameters**:

| Name | Type | Required | Default | Description | Constraints |
|------|------|----------|---------|-------------|-------------|
| `userMessage` | string | Yes | - | Current user message to find similar context for | Min: 1 char, Max: 10,000 chars |
| `userId` | string | Yes | - | User ID to scope search (privacy boundary) | Valid UUID |
| `options.enabled` | boolean | No | true | Whether to enable RAG context retrieval | - |
| `options.maxMessages` | number | No | 5 | Maximum similar messages to retrieve | Min: 1, Max: 10 |
| `options.maxTokens` | number | No | 2000 | Maximum token budget for RAG context | Min: 100, Max: 4000 |

**Return Value**:
```typescript
interface RAGContext {
  context: string          // Formatted context string for system prompt
  sourceMessages: Message[] // Similar messages used as context
  enabled: boolean         // Whether RAG was enabled
}
```

**Success Cases**:

| Scenario | Return Value |
|----------|--------------|
| Similar messages found | `{ context: "Relevant context from...", sourceMessages: [msg1, msg2], enabled: true }` |
| No similar messages | `{ context: "", sourceMessages: [], enabled: true }` |
| RAG disabled (greeting) | `{ context: "", sourceMessages: [], enabled: false }` |

**Error Cases**:

| Error | Behavior | Return Value |
|-------|----------|--------------|
| LanceDB unavailable | Log error, gracefully degrade | `{ context: "", sourceMessages: [], enabled: false }` |
| Embedding generation fails | Log error, gracefully degrade | `{ context: "", sourceMessages: [], enabled: false }` |
| Vector search timeout | Log error, gracefully degrade | `{ context: "", sourceMessages: [], enabled: false }` |
| Invalid userId | Throw error | N/A - caller handles |

**Example Usage**:
```typescript
import { buildRAGContext, shouldUseRAG } from '@/lib/claude/rag'

// In chat API route
const useRAG = shouldUseRAG(userMessage)
const ragContext = await buildRAGContext(userMessage, userId, {
  enabled: useRAG,
  maxMessages: 5,
  maxTokens: 2000,
})

// Augment system prompt with RAG context
const systemPrompt = ragContext.context
  ? `${baseSystemPrompt}\n\n${ragContext.context}`
  : baseSystemPrompt
```

**Performance SLA**:
- Response time: <500ms for 10k messages (SC-002)
- Memory: <50MB per request
- CPU: Non-blocking async operation

**Logging**:
```typescript
{
  "event": "rag_context_built",
  "userId": "user-123",
  "similarMessagesFound": 3,
  "contextLength": 1847,
  "contextTokens": 461,
  "executionTimeMs": 287
}
```

---

### shouldUseRAG()

**Purpose**: Determine if RAG should be enabled for a given message based on heuristics.

**Module**: `lib/claude/rag.ts`

**Signature**:
```typescript
export function shouldUseRAG(userMessage: string): boolean
```

**Parameters**:

| Name | Type | Required | Description | Constraints |
|------|------|----------|-------------|-------------|
| `userMessage` | string | Yes | User message to evaluate | Min: 0 chars |

**Return Value**: `boolean` - `true` if RAG should be enabled, `false` otherwise

**Decision Logic**:

| Condition | Result | Rationale |
|-----------|--------|-----------|
| Message < 10 characters | `false` | Too short to be substantive (FR-005) |
| Message is greeting ("hi", "hello", "hey", etc.) | `false` | Greetings don't benefit from context (FR-005) |
| Message ≥ 10 characters and not greeting | `true` | Substantive question likely benefits from context |

**Example Usage**:
```typescript
import { shouldUseRAG } from '@/lib/claude/rag'

shouldUseRAG("hi")                           // → false
shouldUseRAG("hello")                        // → false
shouldUseRAG("What is LanceDB?")             // → true
shouldUseRAG("How does vector search work?") // → true
```

**Performance**: O(1) - simple string checks, <1ms

**Testing Requirements**:
- Unit test all greeting patterns (FR-005, SC-005)
- Unit test length boundary (10 chars)
- Verify 100% skip rate for greetings (SC-005)

---

## Modified HTTP Endpoints

### POST /api/chat/conversations/:conversationId/messages

**Purpose**: Send message and receive streaming Claude response (EXISTING endpoint, modified to include RAG).

**Changes for RAG Integration**:
1. Before calling Claude API, build RAG context using `buildRAGContext()`
2. Augment system prompt with RAG context string
3. No changes to request/response format (transparent to client)

**Request** (unchanged):
```typescript
POST /api/chat/conversations/abc-123/messages
Content-Type: application/json

{
  "content": "How does semantic search work?"
}
```

**Server-Side RAG Integration**:
```typescript
// app/api/chat/conversations/[conversationId]/messages/route.ts

// 1. Build RAG context
const useRAG = shouldUseRAG(data.content)
const ragContext = await buildRAGContext(data.content, userId, {
  enabled: useRAG,
  maxMessages: 5,
  maxTokens: 2000,
})

// 2. Augment system prompt
const baseSystemPrompt = "You are a helpful AI assistant..."
const systemPrompt = ragContext.context
  ? `${baseSystemPrompt}\n\n${ragContext.context}`
  : baseSystemPrompt

// 3. Call Claude API with enhanced prompt
const stream = await streamClaudeResponse({
  systemPrompt,
  messages: conversationHistory,
  // ... other options
})
```

**Response** (unchanged - SSE streaming):
```
data: {"type":"chunk","text":"Semantic"}
data: {"type":"chunk","text":" search"}
data: {"type":"chunk","text":" works by..."}
data: {"type":"complete","messageId":"msg-456"}
```

**RAG Transparency**: No changes to client API contract. RAG operates invisibly server-side.

**Error Handling**: If RAG fails, chat continues with standard prompt (graceful degradation per FR-009).

---

## Integration Points

### Chat API Flow with RAG

```
Client                    Chat API                    RAG Module              LanceDB
  |                          |                            |                      |
  |--POST /messages-------->|                            |                      |
  |                          |--buildRAGContext()------->|                      |
  |                          |                            |--vector search----->|
  |                          |                            |<--similar msgs------|
  |                          |<--RAGContext---------------|                      |
  |                          |                            |                      |
  |                          |--Claude API (w/ context)-->                       |
  |<--SSE stream-------------|                                                   |
```

### UI Indicator (No API Changes)

**Component**: `components/chat/ChatInterface.tsx`

**Indicator Implementation**:
```tsx
{/* RAG enabled indicator */}
<div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-blue-50">
  <div className="flex items-center gap-2 text-xs text-blue-700">
    <svg>...</svg>
    <span>RAG enabled - responses enhanced with your conversation history</span>
  </div>
</div>
```

**Behavior**: Static indicator (always visible). Future enhancement could query `/api/chat/rag-status` to show dynamic state.

---

## Contract Tests

### Test Coverage Requirements

**Unit Tests** (`tests/unit/lib/claude/rag.test.ts`):

1. **shouldUseRAG()**:
   - ✅ Returns `false` for greetings (hi, hello, hey)
   - ✅ Returns `false` for messages < 10 chars
   - ✅ Returns `true` for substantive questions
   - ✅ 100% skip rate for greetings (SC-005)

2. **buildRAGContext()**:
   - ✅ Returns empty context when RAG disabled
   - ✅ Returns empty context when no similar messages
   - ✅ Limits results to maxMessages (default 5)
   - ✅ Enforces maxTokens limit (default 2000)
   - ✅ Filters messages with null embeddings
   - ✅ Gracefully degrades on LanceDB errors
   - ✅ Completes within 500ms (SC-002)

**Integration Tests** (`tests/integration/rag-chat-flow.test.ts`):

1. **End-to-End RAG Flow**:
   - ✅ User asks question about previous topic
   - ✅ Similar messages retrieved from LanceDB
   - ✅ Context prepended to system prompt
   - ✅ Claude response references past context
   - ✅ Demonstrates 90% context awareness (SC-001)

2. **Graceful Degradation**:
   - ✅ Chat works when LanceDB unavailable (SC-003)
   - ✅ Chat works when embeddings are null
   - ✅ Error logged but user not interrupted

---

## Observability

### Metrics to Track

| Metric | Source | Target | Alert Threshold |
|--------|--------|--------|-----------------|
| RAG retrieval latency | `executionTimeMs` log field | <500ms | >1000ms |
| Similar messages found | `similarMessagesFound` log field | 1-5 | 0 (no embeddings) |
| RAG enabled rate | `ragEnabled` log field | 70-90% | <50% (too many greetings) |
| Context token usage | `contextTokens` log field | 500-2000 | >2000 (overflow) |
| RAG failure rate | `event: rag_search_failed` | <1% | >5% |

### Structured Logging Contract

**Log Format**: JSON (Pino)

**Required Fields**:
```typescript
{
  event: "rag_context_built" | "rag_search_failed" | "rag_disabled"
  userId: string
  conversationId: string
  similarMessagesFound: number
  contextLength: number
  contextTokens: number
  ragEnabled: boolean
  executionTimeMs: number
  error?: string  // Only present for failures
}
```

**Consumer**: Application monitoring (Datadog, CloudWatch, etc.)

---

## Backward Compatibility

**No Breaking Changes**: RAG integration is additive only.

- ✅ Existing chat API endpoints unchanged (no new request/response fields)
- ✅ Clients require no updates
- ✅ Chat functionality remains 100% available if RAG fails
- ✅ No database schema changes (embeddings already exist)

**Deployment Strategy**: Can deploy without feature flag. RAG automatically enabled for all users (Assumption in spec.md line 112).

---

## Security & Privacy

### Privacy Boundaries

| Requirement | Implementation | Test |
|-------------|----------------|------|
| User data isolation (FR-011) | `.where(\`user_id = '${userId}'\`)` filter | Verify cross-user search returns empty |
| No cross-user context | RAG search scoped to current user | Integration test with multiple users |

### Input Validation

| Input | Validation | Error Response |
|-------|------------|----------------|
| `userId` | Must be valid UUID | Throw error (caller handles) |
| `userMessage` | Max 10,000 chars | Truncate before embedding generation |
| `options.maxMessages` | Min: 1, Max: 10 | Clamp to valid range |
| `options.maxTokens` | Min: 100, Max: 4000 | Clamp to valid range |

---

## References

- **Feature Spec**: specs/005-rag-integration/spec.md
- **Data Model**: specs/005-rag-integration/data-model.md
- **Research**: specs/005-rag-integration/research.md
- **Implementation**: lib/claude/rag.ts, app/api/chat/conversations/[conversationId]/messages/route.ts
