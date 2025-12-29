# Research: Remove AI Branding

**Feature**: 015-remove-ai-branding
**Date**: 2025-12-29

## Research Questions Resolved

### Q1: How is Ollama currently used in the codebase?

**Decision**: Ollama is used for two distinct purposes that require different handling.

**Findings**:

1. **Chat completion fallback** - When no ANTHROPIC_API_KEY is set, chat falls back to Ollama
2. **Embeddings generation** - `lib/embeddings/ollama.ts` generates embeddings for LanceDB vector search

**Rationale**: These are separate concerns. Chat completion can be Claude-only. Embeddings need a replacement strategy.

**Alternatives considered**:

- Keep Ollama for embeddings only - Rejected (adds operational complexity)
- Use Claude for embeddings - Not available (Claude has no embeddings API)
- Disable embedding features - Chosen (simplest, can add different provider later)

---

### Q2: What UI components reference AI providers?

**Decision**: Remove ProviderBadge and update all loading/error text.

**Findings**:

1. `components/settings/ProviderBadge.tsx` - Shows "Claude" or "Ollama" badge
2. `components/chat/Message.tsx` - Uses ProviderBadge to show which AI responded
3. Various loading states mention "AI" in text

**Rationale**: Clean removal of all AI references creates polished user experience.

**Alternatives considered**:

- Keep provider info hidden behind admin view - Rejected (adds complexity)
- Replace with generic "assistant" badge - Rejected (still exposes concept of separate AI)

---

### Q3: How should error messages be neutralized?

**Decision**: Map all AI-specific errors to generic user-friendly messages.

**Findings**:
Current error types from `lib/claude/client.ts`:

- `authentication_error` - API key invalid
- `quota_exceeded` - Usage limits hit
- `rate_limit_error` - Too many requests
- `network_error` - Connection failed

**Rationale**: Users shouldn't know about API keys or rate limits - these are implementation details.

**Error Mapping**:
| Internal Error | User Message |
|----------------|--------------|
| authentication_error | "Service configuration error. Please contact support." |
| quota_exceeded | "Service temporarily unavailable. Please try again later." |
| rate_limit_error | "Please wait a moment and try again." |
| network_error | "Unable to connect. Please check your connection." |
| Missing API key | "Service temporarily unavailable." |

---

### Q4: What environment variables need to change?

**Decision**: Remove OLLAMA\_\* variables, make ANTHROPIC_API_KEY required.

**Current variables**:

- `OLLAMA_BASE_URL` - Remove
- `OLLAMA_MODEL` - Remove
- `ANTHROPIC_API_KEY` - Keep (now required)

**New configuration**:

```env
# Required - Claude API key for content generation
ANTHROPIC_API_KEY=sk-ant-api03-...
```

---

### Q5: What is the embedding strategy without Ollama?

**Decision**: Disable embedding-based features, make LanceDB sync gracefully handle missing embeddings.

**Current usage**:

- `lib/db/operations/flashcards-lancedb.ts` - Syncs flashcard embeddings
- `lib/db/operations/messages-lancedb.ts` - Syncs message embeddings
- Vector similarity search for related content

**Implementation**:

1. Make `generateEmbedding()` return null/empty array
2. LanceDB sync continues but with empty vectors
3. Similarity search returns empty results (graceful degradation)
4. Core functionality (flashcard generation, skill trees) unaffected

**Future path**: Can add Voyage AI, Cohere, or other embedding provider later.

---

## Files Requiring Changes

### Delete

- `lib/embeddings/ollama.ts`
- `components/settings/ProviderBadge.tsx`
- `tests/component/settings/ProviderBadge.test.tsx`

### Major Changes

- `lib/claude/client.ts` - Remove Ollama functions and fallback logic
- `docker-compose.prod.yml` - Remove Ollama service

### Minor Changes

- `lib/ai/card-generator.ts` - Remove Ollama fallback
- `lib/ai/skill-tree-generator.ts` - Remove Ollama fallback
- `lib/claude/flashcard-generator.ts` - Remove Ollama fallback
- `app/api/health/route.ts` - Remove Ollama health check
- `components/chat/Message.tsx` - Remove ProviderBadge
- `lib/db/operations/flashcards-lancedb.ts` - Handle missing embeddings
- `lib/db/operations/messages-lancedb.ts` - Handle missing embeddings
- `.env.example` - Update documentation

### UI Text Audit Required

- All pages in `app/(protected)/` for AI-related text
- All loading states
- All error boundaries

## Dependencies

No new dependencies required. This feature removes dependencies:

- Ollama service no longer needed in Docker
- No Ollama client code needed

## Risks and Mitigations

| Risk                           | Mitigation                                   |
| ------------------------------ | -------------------------------------------- |
| Embedding search stops working | Graceful degradation - returns empty results |
| Missing API key at runtime     | Clear error message, health check warns      |
| Cached UI shows old AI text    | Standard deployment cache invalidation       |
