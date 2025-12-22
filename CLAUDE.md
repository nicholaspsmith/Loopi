# Claude Code Instructions for memoryloop

This project uses speckit for feature specification and task tracking.

## Task Tracking

Tasks are tracked in markdown files at `specs/[feature-name]/tasks.md` using simple checkboxes:

- `- [ ]` for incomplete tasks
- `- [x]` for completed tasks

## Workflow

When working on features:

1. Review the feature spec at `specs/[feature-name]/spec.md`
2. Check the implementation plan at `specs/[feature-name]/plan.md`
3. Work through tasks in `specs/[feature-name]/tasks.md` in order
4. Mark tasks as complete by changing `[ ]` to `[x]`
5. Commit changes following rules in `.claude/rules.md`

## Available Commands

- `/speckit.constitution` - Update project constitution
- `/speckit.specify` - Create or update feature specifications
- `/speckit.clarify` - Resolve specification ambiguities
- `/speckit.plan` - Create implementation plans
- `/speckit.plan.validate` - Validate plans for completeness and task-readiness
- `/speckit.tasks` - Generate task breakdowns
- `/speckit.implement` - Execute implementation tasks
- `/speckit.analyze` - Cross-artifact consistency check

## Constitution

Follow the project principles defined in `.specify/memory/constitution.md`:

- Documentation-First Development
- Test-First Development (TDD)
- Modularity & Composability
- Simplicity (YAGNI)
- Observability & Debugging
- Atomic Commits & Version Control Discipline. Adhere to .claude/rules.md

## Active Technologies

- TypeScript 5.7, Node.js 20+, Bash (for hook scripts) + Husky (hook management), lint-staged (staged file operations), commitlint (commit message validation) (008-pre-commit-hooks)
- N/A (hooks are stateless) (008-pre-commit-hooks)

- TypeScript 5.x, Node.js 20.x (Next.js 15) + Next.js 15, Docker, Docker Compose, Nginx, Certbot, GitHub Actions (002-ci-cd-deployment)
- LanceDB (file-based vector database), Backblaze B2 (backups) (002-ci-cd-deployment)
- TypeScript 5.7 / Node.js (Next.js 16.0.10) + Next.js 16, @anthropic-ai/sdk 0.71, @lancedb/lancedb 0.22, Ollama (nomic-embed-text) (005-rag-integration)
- PostgreSQL (drizzle-orm, metadata), LanceDB (vectors/embeddings) (005-rag-integration)
- TypeScript 5.7 (strict mode), Next.js 16.0.10 App Router (004-claude-api)
- PostgreSQL on Supabase with pgvector (0.2.1) for vector embeddings (768 dimensions) (004-claude-api)

## Recent Changes

- 002-ci-cd-deployment: Added TypeScript 5.x, Node.js 20.x (Next.js 15) + Next.js 15, Docker, Docker Compose, Nginx, Certbot, GitHub Actions
- 004-claude-api: Added TypeScript 5.7 (strict mode), Next.js 16.0.10 App Router

## Feature Implementation Notes (T065)

### 004-claude-api: User API Key Management

**Status**: ✅ Complete (All phases 1-9)

**Key Components**:

- **API Key Storage**: Encrypted user API keys stored in PostgreSQL (`api_keys` table)
- **Provider Routing**: Automatic routing between Claude API (with user key) and Ollama (fallback)
- **Validation**: Real-time API key validation with format and authentication checks
- **Error Handling**: Classified errors (auth failures, quota, rate limits) with automatic key invalidation
- **Error Boundaries**: Settings page error boundary for graceful error recovery

**User Stories Implemented**:

1. Enter and Save API Key - Secure storage with AES-256-GCM encryption
2. Use Claude API with User Key - Streaming chat with automatic provider routing
3. API Key Validation and Feedback - Real-time validation (format + auth)
4. Fallback to Ollama - Seamless fallback when no API key is present
5. Update or Remove API Key - Full CRUD operations with confirmation dialogs

**Testing**:

- Unit tests: API key operations, client routing, validation
- Integration tests: Ollama fallback, API key validation performance
- E2E tests: API key save/update/delete flows

**Security**:

- API keys encrypted at rest using encryption/api-key.ts
- Keys never exposed in client-side code or logs
- Structured logging tracks operations without exposing sensitive data

**Files Modified/Created**:

- `lib/db/operations/api-keys.ts` - CRUD operations
- `lib/claude/client.ts` - Provider routing with error classification
- `lib/claude/validation.ts` - API key validation
- `lib/encryption/api-key.ts` - Encryption/decryption
- `components/settings/ApiKeyForm.tsx` - User interface
- `app/(protected)/settings/error.tsx` - Error boundary

**Performance**:

- Validation completes within 3 seconds (SC-004)
- Encrypted storage adds minimal overhead
- Structured logging tracks execution times for observability
