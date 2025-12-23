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

- TypeScript 5.7 (strict mode) + @lancedb/lancedb 0.22, Node.js 20+, Vitest (testing framework) (001-lancedb-schema-fixes)
- LanceDB (file-based vector database for embeddings only) (001-lancedb-schema-fixes)

- TypeScript 5.7 (strict mode) + Next.js 16.0.10 App Router, React 19.2.3, Tailwind CSS 4.0.0, canvas-confetti (for celebration animation) (010-ui-polish)
- N/A (presentation layer only, no data persistence) (010-ui-polish)

- TypeScript 5.x with React 18 (Next.js 16) + React, Tailwind CSS (003-flashcard-rating-labels)
- N/A (UI-only change, no data model changes) (003-flashcard-rating-labels)

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
- 001-lancedb-schema-fixes: Fixed LanceDB schema initialization reliability, eliminated code duplication, added atomic rollback

## Feature Implementation Notes (T065)

### 001-lancedb-schema-fixes: LanceDB Schema Initialization Fixes

**Status**: ✅ Complete (All phases 1-8, User Stories 1-4)

**Summary**: Fixed critical reliability and code quality issues in LanceDB schema initialization identified in Issue #188's code review of PR #186.

**Key Improvements**:

- **Code Deduplication**: Eliminated 56 lines of duplicated schema code from lib/db/client.ts using dynamic imports
- **Atomic Rollback**: Partial table creation is now rolled back automatically on initialization failures
- **Fail-Fast Error Handling**: Errors propagate immediately instead of being swallowed
- **30-Second Timeout**: Schema initialization times out after 30 seconds to prevent hung operations
- **Safe Connection Reset**: resetDbConnection() is now async and waits for in-progress connections
- **Consistent Logging**: All logs use [LanceDB] prefix with structured JSON format

**User Stories Implemented**:

1. Application Startup Reliability (P1) - Fail-fast, rollback, timeout enforcement
2. Code Maintainability (P2) - Single source of truth for schema logic
3. Accurate Test Documentation (P2) - Fixed misleading test descriptions
4. Safe Connection Reset (P3) - Async reset with concurrency safety

**Testing**:

- 18 unit tests in client-auto-init.test.ts
- 49 total tests passing across lib/db/
- Verified all 10 success criteria (SC-001 through SC-010)

**Files Modified**:

- lib/db/client.ts - Refactored to use dynamic import, added timeout, fail-fast
- lib/db/schema.ts - Added atomic rollback with createdTables tracking
- lib/db/utils/timeout.ts - Created TimeoutError class and withTimeout utility
- tests/unit/lib/db/client-auto-init.test.ts - Added 7 new test scenarios
- tests/db-setup.ts - Updated to use async resetDbConnection

**Addresses**: Issue #188 (6 findings: 4 critical + 1 medium + 1 low)

---

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

---

### 010-ui-polish: UI Polish & Enhanced Interactions

**Status**: ✅ Complete (Phases 1-9)

**Key Components**:

- **Loading States**: LoadingSpinner component with accessibility (100ms feedback)
- **Dark Mode Contrast**: WCAG AA compliant colors (4.5:1 text, 3:1 UI)
- **Page Transitions**: 300ms fade animations with ease-out timing
- **Card Flip Animation**: 600ms 3D Y-axis flip with 2D fallback
- **Navigation Arrows**: Bi-directional navigation with first↔last wrapping
- **Slide Animations**: Directional slide-out animations (left/right)
- **Confetti Animation**: Celebratory confetti on quiz completion
- **Motion Preferences**: Comprehensive prefers-reduced-motion support

**User Stories Implemented**:

1. Loading States - Spinners on all pages (chat, quiz, settings)
2. Dark Mode Contrast - Fixed contrast issues across all pages
3. Page Transitions - Smooth 300ms fade between pages
4. Card Flip Animation - 3D flip with browser fallback
5. Card Stack Effect - Removed per user request
6. Navigation Arrows - Forward/backward with wrapping + slide animations
7. Confetti Animation - Triggers on quiz completion with auto-cleanup

**Accessibility**:

- Global prefers-reduced-motion support (disables all animations)
- WCAG AA contrast compliance in dark mode
- Semantic HTML with ARIA labels
- Keyboard navigation support
- Screen reader friendly

**Files Created**:

- `components/ui/LoadingSpinner.tsx` - Reusable loading spinner
- `components/ui/PageTransition.tsx` - Page transition wrapper
- `lib/animations/confetti.ts` - Confetti animation wrapper
- `lib/utils/feature-detection.ts` - Browser feature detection

**Files Modified**:

- `app/globals.css` - Animation keyframes and prefers-reduced-motion
- `components/quiz/QuizCard.tsx` - 3D flip animation
- `components/quiz/QuizInterface.tsx` - Navigation arrows + confetti
- `components/quiz/QuizProgress.tsx` - Progress text formatting
- `app/(protected)/settings/page.tsx` - Dark mode contrast fixes

**Performance**:

- All animations maintain 60fps
- Page transitions complete within 300ms
- Card flip completes within 600ms
- Loading feedback appears within 100ms
- Feature detection results are cached
- Graceful degradation for unsupported browsers
