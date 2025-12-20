# Quickstart Guide: MemoryLoop Development Setup

**Feature**: Claude-Powered Flashcard Learning Platform
**Date**: 2025-12-14
**Branch**: `001-claude-flashcard`

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Environment Configuration](#environment-configuration)
4. [Database Initialization](#database-initialization)
5. [Running the Application](#running-the-application)
6. [Testing](#testing)
7. [Development Workflows](#development-workflows)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js**: v20.x or later (LTS recommended)
- **npm**: v10.x or later (included with Node.js)
- **Git**: For version control

### API Keys & Local Services

- **Ollama**: For local embeddings and LLM ([Installation guide](https://ollama.ai/download))
- **Anthropic API Key**: For Claude interactions ([Get key](https://console.anthropic.com/))

### Recommended Tools

- **VS Code** with extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript and JavaScript Language Features

---

## Initial Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/memoryloop.git
cd memoryloop
```

### 2. Checkout Feature Branch

```bash
git checkout 001-claude-flashcard
```

### 3. Install Dependencies

```bash
npm install
```

**Expected Installation Time**: 2-3 minutes

**Core Dependencies Installed**:

- Next.js 15.1.x (App Router)
- React 19.x
- NextAuth.js 5.x (Auth.js)
- @anthropic-ai/sdk (Claude API)
- vectordb (LanceDB Node.js client)
- ts-fsrs (spaced repetition scheduler)
- Tailwind CSS 4.x
- Zod 3.x (schema validation)

**Dev Dependencies**:

- TypeScript 5.7.x
- Vitest (unit testing)
- Playwright (E2E testing)
- React Testing Library (component testing)

---

## Environment Configuration

### 1. Create Environment File

Copy the example environment file:

```bash
cp .env.example .env.local
```

### 2. Configure Environment Variables

Edit `.env.local` with your API keys and configuration:

```bash
# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Database
LANCEDB_PATH=./data/lancedb

# Authentication (NextAuth.js 5)
AUTH_SECRET=your-random-secret-here-generate-with-openssl-rand-base64-32
AUTH_URL=http://localhost:3000

# Ollama API (for embeddings and local LLM)
OLLAMA_BASE_URL=http://localhost:11434

# Anthropic API (for Claude)
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Logging
LOG_LEVEL=debug
```

### 3. Generate Auth Secret

```bash
openssl rand -base64 32
```

Copy the output and paste it as `AUTH_SECRET` in `.env.local`.

---

## Database Initialization

### 1. Create Database Directory

```bash
mkdir -p data/lancedb
```

### 2. Initialize Schema

Run the schema initialization script:

```bash
npm run db:init
```

This command:

- Creates LanceDB tables (`users`, `conversations`, `messages`, `flashcards`, `review_logs`)
- Sets up vector indexes for embeddings
- Validates schema integrity

**Expected Output**:

```
✅ Database schema initialized successfully
✅ Init rows cleaned up
Schema version: 1
Tables created:
  - users
  - conversations
  - messages
  - flashcards
  - review_logs
```

### 3. Verify Database

```bash
npm run db:verify
```

Checks that all tables exist and have correct schema.

---

## Running the Application

### Development Server

Start the Next.js development server:

```bash
npm run dev
```

**Server URL**: http://localhost:3000

**Expected Startup Time**: 3-5 seconds

**Console Output**:

```
  ▲ Next.js 15.1.0
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Ready in 3.2s
```

### First-Time Access

1. **Navigate to**: http://localhost:3000
2. **Expected**: Login screen (unauthenticated users - FR-002)
3. **Create Account**: Click "Sign Up" and register with email/password
4. **Redirect**: After signup, automatically redirected to chat interface (FR-003)

### Verify Features

**Chat Tab (FR-005, FR-006, FR-007)**:

- Send message to Claude: "What is spaced repetition?"
- Verify response appears in conversation history
- Check that context is maintained in follow-up messages

**Flashcard Generation (FR-008, FR-009)**:

- Click "Generate Flashcards" button on Claude's response
- Verify flashcards are created (should see confirmation)
- Check that button shows "Flashcards Generated" afterward (FR-017)

**Quiz Tab (FR-011, FR-012, FR-013, FR-014)**:

- Switch to Quiz tab
- Verify flashcard question is shown (answer hidden)
- Click "Show Answer" to reveal answer
- Rate flashcard (Again/Hard/Good/Easy)
- Verify next card appears

---

## Testing

### Unit Tests (Vitest)

Run all unit tests:

```bash
npm test
```

Run tests in watch mode (recommended during development):

```bash
npm run test:watch
```

Run tests with coverage report:

```bash
npm run test:coverage
```

**Test Coverage Target**: 80% minimum

### Component Tests (React Testing Library)

Test individual components:

```bash
npm run test:components
```

**Example Component Test Locations**:

- `tests/unit/components/auth/LoginForm.test.tsx`
- `tests/unit/components/chat/MessageList.test.tsx`
- `tests/unit/components/quiz/QuizCard.test.tsx`

### Integration Tests (Playwright)

Run end-to-end tests:

```bash
npm run test:e2e
```

Run tests in UI mode (interactive debugging):

```bash
npm run test:e2e:ui
```

**Example Integration Test Scenarios**:

- `tests/integration/auth-flow.spec.ts` - User authentication journey
- `tests/integration/chat-to-flashcard.spec.ts` - Complete chat → flashcard → quiz flow
- `tests/integration/quiz-session.spec.ts` - Full quiz session with FSRS scheduling

### Contract Tests (API Endpoints)

Test API contracts against OpenAPI specs:

```bash
npm run test:contracts
```

Validates that API endpoints match the contracts defined in `specs/001-claude-flashcard/contracts/*.yaml`.

---

## Development Workflows

### Common Tasks

#### 1. Create New Database Migration

```bash
npm run db:migration:create -- --name add_feature_x
```

Edit the generated migration file in `migrations/`.

#### 2. Run Database Migrations

```bash
npm run db:migrate
```

#### 3. Reset Database (Development Only)

**Warning**: Deletes all data!

```bash
npm run db:reset
```

#### 4. Seed Development Data

```bash
npm run db:seed
```

Creates:

- Test user account (email: `dev@memoryloop.com`, password: `DevPassword123!`)
- Sample conversation with Claude
- Pre-generated flashcards
- Review history for testing FSRS scheduling

#### 5. Lint Code

```bash
npm run lint
```

Fix auto-fixable issues:

```bash
npm run lint:fix
```

#### 6. Format Code

```bash
npm run format
```

#### 7. Type Check

```bash
npm run type-check
```

Runs TypeScript compiler without emitting files (catches type errors).

---

## Development Workflows by User Story

### User Story 1: Authentication (P1)

**Development Order**:

1. **Set up NextAuth.js 5**:
   - File: `auth.ts` (root config)
   - File: `app/api/auth/[...nextauth]/route.ts`
   - File: `lib/auth/config.ts`

2. **Create login page**:
   - File: `app/(auth)/login/page.tsx`
   - File: `components/auth/LoginForm.tsx`

3. **Create signup page**:
   - File: `app/(auth)/signup/page.tsx`
   - File: `components/auth/SignupForm.tsx`

4. **Add middleware for protected routes**:
   - File: `middleware.ts`

**Test**:

```bash
npm run test:integration -- auth-flow
```

---

### User Story 2: Claude Chat (P2)

**Development Order**:

1. **Chat API routes**:
   - File: `app/api/chat/conversations/route.ts`
   - File: `app/api/chat/conversations/[conversationId]/messages/route.ts`

2. **Claude SDK wrapper**:
   - File: `lib/claude/client.ts`
   - File: `lib/claude/prompts.ts`

3. **Chat UI components**:
   - File: `app/(protected)/chat/page.tsx`
   - File: `components/chat/ChatInterface.tsx`
   - File: `components/chat/MessageList.tsx`
   - File: `components/chat/MessageInput.tsx`

**Test**:

```bash
npm run test:integration -- chat-flow
```

---

### User Story 3: Flashcard Generation (P3)

**Development Order**:

1. **Flashcard generation API**:
   - File: `app/api/flashcards/generate/route.ts`
   - File: `lib/claude/flashcard-generator.ts`

2. **Flashcard UI components**:
   - File: `components/chat/GenerateFlashcardsButton.tsx`
   - File: `components/flashcards/FlashcardPreview.tsx`

3. **Ollama embeddings integration**:
   - File: `lib/embeddings/ollama.ts`

**Test**:

```bash
npm run test:integration -- flashcard-generation
```

---

### User Story 4: Quiz with FSRS (P4)

**Development Order**:

1. **FSRS scheduler wrapper**:
   - File: `lib/fsrs/scheduler.ts`
   - File: `lib/fsrs/utils.ts`

2. **Quiz API routes**:
   - File: `app/api/quiz/due/route.ts`
   - File: `app/api/quiz/rate/route.ts`
   - File: `app/api/quiz/stats/route.ts`

3. **Quiz UI components**:
   - File: `app/(protected)/quiz/page.tsx`
   - File: `components/quiz/QuizCard.tsx`
   - File: `components/quiz/QuizProgress.tsx`
   - File: `components/quiz/QuizStats.tsx`

**Test**:

```bash
npm run test:integration -- quiz-session
```

---

## Troubleshooting

### Common Issues

#### 1. LanceDB Connection Error

**Error**: `Error: ENOENT: no such file or directory, open './data/lancedb'`

**Solution**:

```bash
mkdir -p data/lancedb
npm run db:init
```

---

#### 2. NextAuth Session Cookie Issues

**Error**: `[auth][error] SessionTokenError: Read more at https://errors.authjs.dev#sessiontokenerror`

**Solution**:

- Verify `AUTH_SECRET` is set in `.env.local`
- Ensure `AUTH_URL` matches your app URL
- Clear browser cookies and try again

---

#### 3. Ollama Connection Issues

**Error**: Cannot connect to Ollama

**Solution**:

- Ensure Ollama is installed and running: `ollama serve`
- Pull required models: `ollama pull nomic-embed-text` and `ollama pull llama3.2`
- Check OLLAMA_BASE_URL in environment variables
- Verify Ollama is accessible at http://localhost:11434

---

#### 4. Anthropic API Errors

**Error**: `401 Unauthorized` or `403 Forbidden`

**Solution**:

- Verify `ANTHROPIC_API_KEY` in `.env.local`
- Check API key permissions at https://console.anthropic.com/
- Ensure billing is set up

---

#### 5. Type Errors After Dependency Updates

**Error**: TypeScript compilation failures

**Solution**:

```bash
rm -rf node_modules package-lock.json
npm install
npm run type-check
```

---

#### 6. Test Failures in CI/CD

**Error**: Tests pass locally but fail in GitHub Actions

**Solution**:

- Check Node.js version match (`.nvmrc` and `.github/workflows/test.yml`)
- Verify all environment variables are set in GitHub Secrets
- Run tests in CI mode locally:
  ```bash
  CI=true npm test
  ```

---

## Project Structure Reference

```
memoryloop/
├── app/                      # Next.js 15 App Router
│   ├── api/                  # API routes
│   │   ├── auth/             # NextAuth.js 5 routes
│   │   ├── chat/             # Claude conversation endpoints
│   │   ├── flashcards/       # Flashcard CRUD endpoints
│   │   └── quiz/             # Quiz session endpoints (FSRS)
│   ├── (auth)/               # Public auth pages
│   │   ├── login/
│   │   └── signup/
│   ├── (protected)/          # Protected routes
│   │   ├── chat/
│   │   └── quiz/
│   ├── layout.tsx
│   └── page.tsx
│
├── components/               # React components
│   ├── auth/
│   ├── chat/
│   ├── flashcards/
│   └── quiz/
│
├── lib/                      # Shared utilities
│   ├── db/                   # LanceDB client and queries
│   ├── claude/               # Anthropic SDK wrapper
│   ├── auth/                 # NextAuth 5 configuration
│   ├── fsrs/                 # FSRS scheduler wrapper
│   ├── embeddings/           # Ollama embeddings
│   └── validation/           # Zod schemas
│
├── types/                    # TypeScript type definitions
│
├── tests/
│   ├── contract/             # API contract tests
│   ├── integration/          # E2E tests (Playwright)
│   └── unit/                 # Component and utility tests
│
├── public/                   # Static assets
│
├── specs/                    # Feature specifications
│   └── 001-claude-flashcard/
│       ├── spec.md
│       ├── plan.md
│       ├── data-model.md
│       ├── quickstart.md     # This file
│       └── contracts/        # OpenAPI specs
│
├── data/                     # Local data (gitignored)
│   └── lancedb/              # LanceDB storage
│
├── migrations/               # Database migrations
│
├── .env.local                # Environment variables (gitignored)
├── .env.example              # Environment template
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── auth.ts                   # NextAuth 5 configuration
└── package.json
```

---

## Next Steps

1. **Complete Setup**: Ensure all prerequisites are installed and environment variables are configured
2. **Initialize Database**: Run `npm run db:init` to set up LanceDB schema
3. **Start Development**: Run `npm run dev` and access http://localhost:3000
4. **Run Tests**: Execute `npm test` to verify everything works
5. **Begin Implementation**: Follow user story development order (P1 → P2 → P3 → P4)

---

## Additional Resources

- **Next.js 15 Documentation**: https://nextjs.org/docs
- **NextAuth.js 5 (Auth.js)**: https://authjs.dev/
- **LanceDB Documentation**: https://lancedb.github.io/lancedb/
- **Anthropic Claude API**: https://docs.anthropic.com/
- **ts-fsrs Library**: https://github.com/open-spaced-repetition/ts-fsrs
- **Ollama**: https://ollama.ai/
- **Nomic Embed Text**: https://ollama.ai/library/nomic-embed-text

---

## Support

- **GitHub Issues**: https://github.com/yourusername/memoryloop/issues
- **Discussions**: https://github.com/yourusername/memoryloop/discussions
- **Email**: support@memoryloop.com

---

**Last Updated**: 2025-12-14
**Version**: 1.0.0
**Feature Branch**: `001-claude-flashcard`
