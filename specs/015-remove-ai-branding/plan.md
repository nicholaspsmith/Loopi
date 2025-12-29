# Implementation Plan: Remove AI Branding and Consolidate to Claude Backend

**Branch**: `015-remove-ai-branding` | **Date**: 2025-12-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/015-remove-ai-branding/spec.md`

## Summary

Remove all AI-related terminology from the user interface and consolidate the backend to use Claude exclusively via server-side API key. This involves removing Ollama completely, eliminating user-facing API key management, and updating UI text to use neutral terminology.

## Technical Context

**Language/Version**: TypeScript 5.7.0, Node.js 20+
**Primary Dependencies**: Next.js 16.0.10, React 19.2.3, @anthropic-ai/sdk 0.71.2
**Storage**: PostgreSQL (drizzle-orm 0.45.1), LanceDB 0.22.3
**Testing**: Vitest 4.0.15, Playwright 1.57.0
**Target Platform**: Web application (Next.js App Router)
**Project Type**: Web application
**Performance Goals**: No regression from current performance
**Constraints**: Must maintain all existing functionality, error messages must not reveal AI provider
**Scale/Scope**: All user-facing pages (~20 pages), 9 Ollama-related files, 5 API routes

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle              | Status      | Notes                                                               |
| ---------------------- | ----------- | ------------------------------------------------------------------- |
| I. Documentation-First | PASS        | Spec complete with user stories, requirements, success criteria     |
| II. Test-First (TDD)   | WILL COMPLY | Tests for AI text removal and API key changes will be written first |
| III. Modularity        | PASS        | Changes are well-isolated: UI layer, AI client layer, Docker layer  |
| IV. Simplicity (YAGNI) | PASS        | Removing complexity (Ollama fallback), not adding                   |
| V. Observability       | PASS        | Error handling will be updated with neutral messages                |
| VI. Atomic Commits     | WILL COMPLY | Changes will be committed by layer (UI, backend, infra)             |

**Gate Result**: PASS - No violations requiring justification

## Project Structure

### Documentation (this feature)

```text
specs/015-remove-ai-branding/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal - mostly deletions)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── error-responses.md
├── checklists/
│   └── requirements.md  # Spec validation checklist
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
# Files to MODIFY (update AI references):
app/
├── (protected)/
│   ├── goals/[goalId]/generate/page.tsx  # Remove AI terminology
│   ├── goals/new/page.tsx                # Remove AI terminology
│   └── settings/page.tsx                 # Remove API key section (if exists)
├── api/
│   ├── chat/conversations/[conversationId]/messages/route.ts
│   ├── flashcards/generate/route.ts
│   ├── goals/[goalId]/generate/route.ts
│   └── health/route.ts                   # Remove Ollama check
├── layout.tsx
└── page.tsx

components/
├── chat/Message.tsx                      # Remove ProviderBadge
└── settings/ProviderBadge.tsx            # DELETE

lib/
├── ai/
│   ├── card-generator.ts                 # Remove Ollama fallback
│   └── skill-tree-generator.ts           # Remove Ollama fallback
├── claude/
│   ├── client.ts                         # Remove Ollama, simplify routing
│   └── flashcard-generator.ts            # Remove Ollama fallback
└── embeddings/
    └── ollama.ts                         # DELETE or replace with Claude embeddings

# Files to DELETE:
components/settings/ProviderBadge.tsx
tests/component/settings/ProviderBadge.test.tsx
tests/integration/claude/ollama-fallback.test.ts (if exists)

# Infrastructure to MODIFY:
docker-compose.prod.yml                   # Remove Ollama service
.env.example                              # Remove OLLAMA_*, make ANTHROPIC_API_KEY required
.github/workflows/deploy.yml              # Add ANTHROPIC_API_KEY secret
```

**Structure Decision**: Web application with Next.js App Router. Changes span UI components, API routes, and library code. No new directories needed - this is a removal/simplification feature.

## Change Impact Analysis

### Files to Modify

| File                                | Change Type | Impact                                    |
| ----------------------------------- | ----------- | ----------------------------------------- |
| `lib/claude/client.ts`              | Major       | Remove Ollama functions, simplify routing |
| `lib/ai/card-generator.ts`          | Minor       | Remove Ollama fallback                    |
| `lib/ai/skill-tree-generator.ts`    | Minor       | Remove Ollama fallback                    |
| `lib/claude/flashcard-generator.ts` | Minor       | Remove Ollama fallback                    |
| `app/api/health/route.ts`           | Minor       | Remove Ollama health check                |
| `components/chat/Message.tsx`       | Minor       | Remove ProviderBadge import/usage         |
| `docker-compose.prod.yml`           | Major       | Remove Ollama service                     |
| `.env.example`                      | Minor       | Update environment variables              |

### Files to Delete

| File                                              | Reason                                 |
| ------------------------------------------------- | -------------------------------------- |
| `lib/embeddings/ollama.ts`                        | Ollama embedding code no longer needed |
| `components/settings/ProviderBadge.tsx`           | Shows AI provider to users             |
| `tests/component/settings/ProviderBadge.test.tsx` | Tests for deleted component            |

### UI Text Changes Required

| Location       | Current Text                           | New Text                          |
| -------------- | -------------------------------------- | --------------------------------- |
| Loading states | "AI is generating..."                  | "Generating..."                   |
| Error messages | "Claude API error"                     | "Service temporarily unavailable" |
| Health status  | "Claude: available, Ollama: available" | (remove or "Service: available")  |

## Error Handling Strategy

All AI-related errors will be mapped to neutral messages:

| Internal Error              | User-Facing Message                                           |
| --------------------------- | ------------------------------------------------------------- |
| Claude authentication_error | "Service configuration error. Please contact support."        |
| Claude quota_exceeded       | "Service temporarily unavailable. Please try again later."    |
| Claude rate_limit_error     | "Please wait a moment and try again."                         |
| Claude network_error        | "Unable to connect to service. Please check your connection." |
| Missing ANTHROPIC_API_KEY   | "Service temporarily unavailable."                            |

## Embedding Strategy

**Decision**: Replace Ollama embeddings with no-embedding fallback initially.

The current Ollama embeddings are used for:

1. Flashcard similarity search in LanceDB
2. Message similarity search in LanceDB

**Options considered**:

1. ~~Use Claude embeddings API~~ - Claude doesn't have an embeddings API
2. ~~Use OpenAI embeddings~~ - Adds another provider dependency
3. **Disable embedding features** - Simplest, can be re-enabled later with different provider
4. ~~Keep Ollama just for embeddings~~ - Defeats purpose of removing Ollama

**Chosen approach**: Option 3 - Disable embedding-based features temporarily. The core flashcard and skill tree generation will work without embeddings. Similarity search can be added back with a different embedding provider later.

## Implementation Phases

### Phase 1: Backend Simplification

1. Remove Ollama code from `lib/claude/client.ts`
2. Remove Ollama embedding code
3. Update error handling to neutral messages (see [contracts/error-responses.md](./contracts/error-responses.md))
4. Update API routes to require server-side API key

### Phase 2: UI Cleanup

1. Delete ProviderBadge component
2. Remove AI terminology from all pages
3. Update loading states and error messages

### Phase 3: Infrastructure Updates

1. Remove Ollama from Docker Compose
2. Update environment variable documentation
3. Add ANTHROPIC_API_KEY to CI/CD secrets

### Phase 4: Testing & Verification

1. Update/remove Ollama-related tests
2. Add tests for neutral error messages
3. Verify all UI pages have no AI references
