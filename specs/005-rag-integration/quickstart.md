# RAG Integration Quickstart

**Feature**: RAG Integration for Enhanced Chat Responses
**Created**: 2025-12-18
**Branch**: 005-rag-integration

## What is RAG Integration?

RAG (Retrieval-Augmented Generation) enhances chat responses by searching your past conversation history for semantically similar messages and including them as context for Claude. This allows Claude to "remember" and reference information from previous conversations, not just the current chat session.

**User Value**:
- Claude can reference topics you discussed hours or days ago
- No need to repeat information across conversations
- More contextually aware and personalized responses
- Transparent operation with visual indicator

## Prerequisites

Before implementing RAG, ensure you have:

1. **Existing Infrastructure**:
   - ✅ LanceDB with message embeddings table
   - ✅ Ollama embedding service (nomic-embed-text model)
   - ✅ PostgreSQL with messages table
   - ✅ Next.js chat API with Claude integration

2. **Environment Variables**:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   DATABASE_URL=postgresql://...
   OLLAMA_BASE_URL=http://localhost:11434  # Ollama embedding service
   ```

3. **Dependencies Installed**:
   ```bash
   npm install @anthropic-ai/sdk @lancedb/lancedb
   ```

## Implementation Overview

RAG integration involves **3 main components**:

1. **RAG Context Builder** (`lib/claude/rag.ts`) - Core logic
2. **Chat API Integration** - Augment system prompts with RAG context
3. **UI Indicator** - Show users that RAG is enabled

**Estimated Effort**: 2-4 hours (implementation already exists, focus on tests + logging)

---

## Step-by-Step Implementation

### Step 1: Verify RAG Module Exists

**File**: `lib/claude/rag.ts`

Check that the module exports these functions:

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

export function shouldUseRAG(userMessage: string): boolean
```

**Test it**:
```bash
npx tsx scripts/test-rag.ts
```

Expected output:
```
Testing RAG for user: user-123

--- Testing shouldUseRAG() ---
Should NOT use RAG:
  "hi" -> false
  "hello" -> false

Should use RAG:
  "What is LanceDB?" -> true
  "How does vector search work?" -> true

--- Testing buildRAGContext() ---
Query: "What is LanceDB?"
  RAG enabled: true
  Source messages: 3
  Context length: 1847 chars
  First source message: "LanceDB is a developer-friendly..."
```

---

### Step 2: Integrate RAG into Chat API

**File**: `app/api/chat/conversations/[conversationId]/messages/route.ts`

Add RAG context retrieval before calling Claude API:

```typescript
import { buildRAGContext, shouldUseRAG } from '@/lib/claude/rag'

export async function POST(request: Request, context: RouteContext) {
  // ... existing code to parse request, validate user, etc.

  // NEW: Build RAG context from similar past conversations
  const useRAG = shouldUseRAG(data.content)
  const ragContext = await buildRAGContext(data.content, userId, {
    enabled: useRAG,
    maxMessages: 5,
    maxTokens: 2000,
  })

  // NEW: Augment system prompt with RAG context
  const baseSystemPrompt = "You are a helpful AI assistant..."
  const systemPrompt = ragContext.context
    ? `${baseSystemPrompt}\n\n${ragContext.context}`
    : baseSystemPrompt

  // Existing: Call Claude API with enhanced prompt
  const stream = await streamClaudeResponse({
    systemPrompt,  // Now includes RAG context if available
    messages: conversationHistory,
    // ... other options
  })

  // ... rest of streaming response handling
}
```

**Test it**:
```bash
# Start dev server
npm run dev

# Send a test message via chat UI or API client
curl -X POST http://localhost:3000/api/chat/conversations/abc-123/messages \
  -H "Content-Type: application/json" \
  -d '{"content": "How does LanceDB work?"}'
```

Check server logs for RAG context retrieval:
```json
{
  "event": "rag_context_built",
  "userId": "user-123",
  "similarMessagesFound": 3,
  "contextLength": 1847,
  "ragEnabled": true
}
```

---

### Step 3: Add UI Indicator

**File**: `components/chat/ChatInterface.tsx`

Add a visual indicator banner to show users RAG is enabled:

```tsx
export default function ChatInterface({ userId }: ChatInterfaceProps) {
  // ... existing state and handlers

  return (
    <div className="flex flex-col h-full">
      {/* RAG enabled indicator */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
        <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span>RAG enabled - responses enhanced with your conversation history</span>
        </div>
      </div>

      {/* Existing message list and input */}
      <MessageList messages={messages} />
      <MessageInput onSend={sendMessage} />
    </div>
  )
}
```

**Test it**: Navigate to `/chat` and verify the blue RAG indicator banner appears at the top.

---

## Testing

### Manual Testing Checklist

- [ ] **Greeting Skip Test**: Send "hi" → RAG should NOT activate (check logs for `ragEnabled: false`)
- [ ] **Context Retrieval Test**:
  1. Send message about LanceDB
  2. Wait for response
  3. In new conversation, ask "How do I use it?"
  4. Verify response references LanceDB (demonstrates context awareness)
- [ ] **No Embeddings Test**: Fresh user with no message history → Chat should work normally
- [ ] **UI Indicator Test**: Navigate to `/chat` → Blue "RAG enabled" banner should appear

### Automated Testing

Run existing test script:
```bash
npx tsx scripts/test-rag.ts
```

Expected: All tests pass, showing RAG functions work correctly.

---

## Configuration

### RAG Parameters (Optional Tuning)

Edit `app/api/chat/conversations/[conversationId]/messages/route.ts`:

```typescript
const ragContext = await buildRAGContext(data.content, userId, {
  enabled: useRAG,
  maxMessages: 5,     // Increase to retrieve more context (1-10)
  maxTokens: 2000,    // Increase to allow longer context (100-4000)
})
```

**Recommendations**:
- **maxMessages**: 5 is optimal for most use cases (SC-002 target: <500ms)
- **maxTokens**: 2000 leaves room for conversation history (Claude has 200k context window)

### Disable RAG (Emergency)

To disable RAG without code changes:

```typescript
const ragContext = await buildRAGContext(data.content, userId, {
  enabled: false,  // Force disable
  maxMessages: 5,
  maxTokens: 2000,
})
```

Or modify `shouldUseRAG()` to always return `false`:
```typescript
export function shouldUseRAG(userMessage: string): boolean {
  return false  // Emergency kill switch
}
```

---

## Troubleshooting

### Issue: "No similar messages found"

**Symptoms**: Logs show `similarMessagesFound: 0` even though user has message history

**Causes**:
1. Embeddings are `null` (not yet generated)
2. LanceDB table not initialized
3. Vector search timing out

**Solutions**:
```bash
# 1. Check if embeddings exist
npx tsx scripts/view-lancedb.ts

# Expected: Each message should have 768-dimensional embedding array
# If null: Embeddings are still being generated asynchronously

# 2. Initialize LanceDB schema
npm run db:init

# 3. Check Ollama service is running
curl http://localhost:11434/api/embeddings -d '{"model":"nomic-embed-text","input":"test"}'
```

---

### Issue: RAG search is slow (>500ms)

**Symptoms**: `executionTimeMs > 500` in logs

**Causes**:
1. No vector index created (exhaustive search)
2. Large dataset (>10k messages) without IVF_PQ index

**Solutions**:
```typescript
// Create vector index for faster search
// File: lib/db/schema.ts or migration script

import * as lancedb from "@lancedb/lancedb";

async function createMessageIndex(table: lancedb.Table) {
  await table.createIndex("embedding", {
    config: lancedb.Index.ivfPq({
      distanceType: "cosine",
      numPartitions: 256,
      numSubVectors: 96
    })
  });
}
```

See research.md section 1 for full indexing implementation.

---

### Issue: Chat breaks when LanceDB is down

**Symptoms**: Chat API returns 500 error when LanceDB unavailable

**Expected Behavior**: Chat should gracefully degrade (continue without RAG context)

**Verification**:
```typescript
// Check buildRAGContext() error handling
// File: lib/claude/rag.ts

try {
  const similarMessages = await searchSimilarMessages(...)
  // ... build context
} catch (error) {
  console.error('[RAG] Failed to build context:', error)
  // Gracefully degrade - return empty context
  return {
    context: '',
    sourceMessages: [],
    enabled: false,  // RAG failed
  }
}
```

**Test**: Stop LanceDB service and send chat message → Should work (logs show `ragEnabled: false`)

---

## Next Steps

After RAG is working:

1. **Add Structured Logging** (research.md section 3):
   - Install Pino: `npm install pino pino-pretty`
   - Replace `console.log()` with structured JSON logs
   - Track RAG metrics (latency, similar message count, failures)

2. **Write Tests** (see contracts/rag-api.md):
   - Unit tests for `shouldUseRAG()` and `buildRAGContext()`
   - Integration test for end-to-end RAG flow
   - Contract tests for error handling

3. **Optimize Performance** (research.md section 1):
   - Create IVF_PQ index for faster vector search
   - Implement column selection in LanceDB queries
   - Monitor and tune `nprobes` parameter

4. **Monitor in Production**:
   - Track RAG retrieval latency (`executionTimeMs`)
   - Alert if failure rate >5%
   - Verify 90% context awareness (SC-001)

---

## Key Files Reference

| File | Purpose | Status |
|------|---------|--------|
| `lib/claude/rag.ts` | RAG context builder (core logic) | ✅ Exists, needs tests |
| `lib/db/operations/messages-lancedb.ts` | Vector search implementation | ✅ Exists |
| `app/api/chat/conversations/[id]/messages/route.ts` | Chat API with RAG integration | ✅ Integrated |
| `components/chat/ChatInterface.tsx` | UI with RAG indicator | ✅ Has indicator |
| `scripts/test-rag.ts` | Manual RAG testing script | ✅ Exists |
| `tests/unit/lib/claude/rag.test.ts` | RAG unit tests | ❌ TODO |
| `tests/integration/rag-chat-flow.test.ts` | End-to-end RAG test | ❌ TODO |

---

## Success Criteria Verification

Use this checklist to verify RAG meets all success criteria from spec.md:

- [ ] **SC-001**: Users asking follow-up questions receive context-aware responses (90% of cases)
  - Test: Ask about topic in conversation 1, reference it in conversation 2

- [ ] **SC-002**: RAG retrieval completes within 500ms for 10k messages
  - Check: `executionTimeMs` in logs should be <500ms

- [ ] **SC-003**: Chat works 100% of time even when RAG fails
  - Test: Stop LanceDB, verify chat still works

- [ ] **SC-004**: Users see RAG indicator within 1 second of viewing chat
  - Test: Navigate to `/chat`, blue banner should appear immediately

- [ ] **SC-005**: System skips RAG for greetings 100% of time
  - Test: Send "hi", verify logs show `ragEnabled: false`

- [ ] **SC-006**: RAG context stays within 2000 token limit 100% of time
  - Check: `contextTokens` in logs should be ≤2000

---

## Support & References

- **Feature Specification**: [spec.md](./spec.md)
- **Research Findings**: [research.md](./research.md)
- **Data Model**: [data-model.md](./data-model.md)
- **API Contracts**: [contracts/rag-api.md](./contracts/rag-api.md)
- **Implementation Plan**: [plan.md](./plan.md)

**Questions?** See troubleshooting section above or check server logs for RAG-related errors.
