# Quickstart: Remove AI Branding Implementation

**Feature**: 015-remove-ai-branding
**Date**: 2025-12-29

## Prerequisites

1. **Environment Setup**

   ```bash
   # Ensure ANTHROPIC_API_KEY is set
   export ANTHROPIC_API_KEY=sk-ant-api03-...

   # Remove Ollama variables (if set)
   unset OLLAMA_BASE_URL
   unset OLLAMA_MODEL
   ```

2. **Branch Setup**
   ```bash
   git checkout 015-remove-ai-branding
   npm install
   ```

## Implementation Order

### Step 1: Backend - Remove Ollama from Claude Client

**File**: `lib/claude/client.ts`

1. Remove constants:
   - `OLLAMA_BASE_URL`
   - `OLLAMA_MODEL`

2. Remove functions:
   - `streamOllamaChat()`
   - Any Ollama-specific error handling

3. Simplify `streamChatCompletion()`:
   - Remove fallback to Ollama
   - Always use Claude with server-side API key
   - Throw error if no API key configured

4. Update error messages to neutral text (see contracts/error-responses.md)

### Step 2: Backend - Update AI Generators

**Files**:

- `lib/ai/card-generator.ts`
- `lib/ai/skill-tree-generator.ts`
- `lib/claude/flashcard-generator.ts`

For each file:

1. Remove Ollama fallback logic
2. Use `process.env.ANTHROPIC_API_KEY` directly
3. Update error handling to neutral messages

### Step 3: Backend - Handle Embeddings

**File**: `lib/embeddings/ollama.ts`

Option A (Delete):

```bash
rm lib/embeddings/ollama.ts
```

Option B (Stub - recommended for safer migration):

```typescript
// Return empty embeddings - graceful degradation
export async function generateEmbedding(text: string): Promise<number[] | null> {
  return null
}

export async function generateEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
  return texts.map(() => null)
}
```

Update imports in:

- `lib/db/operations/flashcards-lancedb.ts`
- `lib/db/operations/messages-lancedb.ts`

### Step 4: Backend - Update Health Check

**File**: `app/api/health/route.ts`

1. Remove Ollama health check
2. Rename `claude` to `contentGeneration` in response
3. Check only for `ANTHROPIC_API_KEY` presence

### Step 5: UI - Remove ProviderBadge

```bash
# Delete component
rm components/settings/ProviderBadge.tsx
rm tests/component/settings/ProviderBadge.test.tsx
```

**File**: `components/chat/Message.tsx`

1. Remove ProviderBadge import
2. Remove ProviderBadge usage from JSX

### Step 6: UI - Audit All Pages for AI Text

Run this grep to find AI references:

```bash
grep -rn "AI\|Claude\|Anthropic\|Ollama\|LLM" app/ components/ --include="*.tsx"
```

Update each occurrence with neutral text.

### Step 7: Infrastructure - Update Docker

**File**: `docker-compose.prod.yml`

1. Remove entire `ollama` service block
2. Remove `ollama` from `app.depends_on`
3. Remove `OLLAMA_BASE_URL` from `app.environment`
4. Add `ANTHROPIC_API_KEY` to `app.environment`:
   ```yaml
   environment:
     - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
   ```

### Step 8: Infrastructure - Update .env.example

Remove:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

Add/update:

```env
# Required - API key for content generation
ANTHROPIC_API_KEY=
```

### Step 9: Update CI/CD

**File**: `.github/workflows/deploy.yml`

Ensure `ANTHROPIC_API_KEY` is passed as a secret:

```yaml
env:
  ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

## Testing

### Unit Tests

```bash
npm run test:unit
```

### Integration Tests

```bash
npm run test:integration
```

### Manual Verification

1. **Check all pages for AI text**:
   - Visit each page in the app
   - Inspect all visible text
   - Check loading states
   - Trigger error states

2. **Verify content generation**:
   - Create a flashcard
   - Generate a skill tree
   - Send a chat message

3. **Verify error handling**:
   - Remove ANTHROPIC_API_KEY and test error messages
   - Verify no AI provider names appear in errors

## Rollback

If issues arise:

```bash
git checkout main -- lib/claude/client.ts
git checkout main -- docker-compose.prod.yml
# Re-add Ollama service and variables
```

## Definition of Done

- [ ] No grep results for AI/Claude/Ollama/LLM in UI code
- [ ] All tests pass
- [ ] Health check returns neutral field names
- [ ] Error messages are neutral
- [ ] Docker builds and runs without Ollama
- [ ] Content generation works with server-side API key
