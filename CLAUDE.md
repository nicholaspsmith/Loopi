# Claude Code Instructions for loopi

This project uses speckit for feature specification and task tracking.

## MANDATORY: Tool Priority Checklist

**STOP. Before ANY action, check this list. This is non-negotiable.**

| Action           | WRONG                | RIGHT                                            |
| ---------------- | -------------------- | ------------------------------------------------ |
| Git commit/push  | `Bash: git commit`   | Spawn **git-agent** (HOOK ENFORCED)              |
| Before push      | Push directly        | Spawn **review-agent** first (HOOK ENFORCED)     |
| Writing tests    | Write tests yourself | Spawn **test-agent** (HOOK ENFORCED)             |
| UI components    | Write React code     | Spawn **ui-agent** (HOOK ENFORCED)               |
| Database changes | Write migrations     | Spawn **db-agent** (HOOK ENFORCED)               |
| Code navigation  | `Read` entire files  | Use **Serena** (`find_symbol`)                   |
| Finding code     | Grep/Glob directly   | Spawn **Explore** agent or use **lance-context** |

**Git workflow is ALWAYS: git-agent (commit) → review-agent → git-agent (push)**

Never bypass this. If you find yourself typing `git commit` or `git push` in Bash, STOP and use the agents.

### Hook Enforcement

Rules are enforced by hooks in `.claude/hooks/`. If a hook blocks you, spawn the appropriate agent.

**file-agent-guardian.sh** (Write/Edit):

| Pattern                               | Required Agent   |
| ------------------------------------- | ---------------- |
| `tests/**`, `*.test.ts`               | **test-agent**   |
| `components/**`, `app/**/*.tsx`       | **ui-agent**     |
| `drizzle/**`, `lib/db/**`, `*.sql`    | **db-agent**     |
| `Dockerfile*`, `.github/workflows/**` | **deploy-agent** |
| `specs/**/*.md` (except tasks.md)     | **spec-agent**   |

**bash-guardian.sh** (Bash):

| Command Pattern           | Required Action                                  |
| ------------------------- | ------------------------------------------------ |
| `git commit`              | Spawn **git-agent**                              |
| `git push`                | Spawn **review-agent** first, then **git-agent** |
| `git rebase`, `git merge` | Spawn **git-agent**                              |
| `git reset --hard`        | Spawn **git-agent** (dangerous operation)        |

**navigation-guardian.sh** (Grep/Read):

| Pattern                                   | Suggested Tool                                       |
| ----------------------------------------- | ---------------------------------------------------- |
| Grep for `class X`, `function Y`, `def Z` | **Serena** `find_symbol`                             |
| Read source file (`.ts`, `.py`, etc.)     | **Serena** `get_symbols_overview`                    |
| Open-ended exploration                    | **Explore** agent or **lance-context** `search_code` |

## Feature-Specific Context

When working on a feature branch (e.g., `003-flashcard-rating-labels`), check for a matching
specs directory at `specs/[branch-name]/`. If it exists, read these files for feature context:

- `specs/[branch-name]/spec.md` - Feature specification and requirements
- `specs/[branch-name]/plan.md` - Implementation plan and technical decisions
- `specs/[branch-name]/tasks.md` - Task breakdown and progress tracking

This feature-specific context supplements the project-wide information below.

## Context Management

This project uses a context-aware development system to maintain efficiency across sessions.

### Specialized Subagents (MUST USE for delegated work)

**IMPORTANT**: Spawn specialized agents via the Task tool for their domains. Do NOT do their work yourself.

| Agent            | Trigger Keywords                                     | Use For                            |
| ---------------- | ---------------------------------------------------- | ---------------------------------- |
| **test-agent**   | tests, coverage, E2E, unit, vitest, playwright, spec | Writing/fixing any tests           |
| **ui-agent**     | component, form, page, button, layout, styling, UI   | React component work               |
| **db-agent**     | schema, migration, table, column, drizzle, postgres  | Database changes                   |
| **git-agent**    | commit, push, PR, rebase, merge, branch              | Git operations                     |
| **review-agent** | review, check code, before push                      | Code review (REQUIRED before push) |
| **deploy-agent** | deploy, docker, CI, production, nginx                | Infrastructure                     |
| **spec-agent**   | specify, plan, feature, requirement                  | Feature planning                   |

**How to spawn an agent:**

```
Task tool with subagent_type="test-agent" (or other agent name)
prompt="Write E2E tests for goal creation in tests/e2e/goal-creation.spec.ts"
```

**Agent definitions**: See `.claude/agents/*.md` for full capabilities of each agent.

### Agent Coordination: Commit & Push Workflow

When a user asks to "commit and push" changes, follow this orchestrated workflow:

1. **Spawn git-agent** to create commits (it will NOT push automatically)
2. **Spawn review-agent** to review the commits
3. **Check review verdict:**
   - If `REVIEW_PASSED`: Spawn git-agent again to push
   - If `REVIEW_FAILED`: Report blockers to user, do NOT push

This ensures all code is reviewed before reaching the remote repository.

### Scoped Ledgers

**Feature Ledger** (`specs/[feature]/ledger.md`):

- Tracks progress on a specific feature
- Persists decisions and technical context
- Update after significant milestones

**Session Log** (`.claude/sessions/YYYY-MM-DD.md`):

- Daily session activities
- Rotates after 7 days
- Use for handoff notes between sessions

### MCP Tools

#### Serena (ALWAYS USE for code navigation)

Serena provides token-efficient symbolic code navigation. **Prefer Serena over reading entire files.**

**When to use Serena:**

- Before reading a file: Use `get_symbols_overview` to see structure first
- Finding specific functions/classes: Use `find_symbol` with `include_body=True`
- Tracing dependencies: Use `find_referencing_symbols` to find all usages
- Editing code: Use `replace_symbol_body` for precise symbol replacement
- Adding code: Use `insert_before_symbol` or `insert_after_symbol`

**Serena workflow example:**

```
1. get_symbols_overview(file) → see all functions/classes
2. find_symbol(name_path="ClassName/methodName", include_body=True) → read just that method
3. find_referencing_symbols(symbol) → find all callers before refactoring
4. replace_symbol_body() → update the symbol precisely
```

**Do NOT:**

- Read entire files when you only need one function
- Use grep/Read to find symbols when `find_symbol` is faster
- Skip `find_referencing_symbols` before renaming/refactoring

#### lance-context (Semantic code search)

- `mcp__lance-context__index_codebase` - Index codebase for semantic search
- `mcp__lance-context__search_code` - Natural language code search
- `mcp__lance-context__get_index_status` - Check index status

Use for open-ended questions like "where is error handling done?" or "find authentication logic".

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

## Technology Stack

### Core

- TypeScript 5.7.0
- Node.js 20+
- Next.js 16.0.10
- React 19.2.3

### Styling

- Tailwind CSS 4.0.0

### Database

- PostgreSQL (via postgres 3.4.7, drizzle-orm 0.45.1) - users, conversations, messages, API keys
- LanceDB 0.22.3 - vector embeddings for semantic search (flashcards, goals, review logs)

### AI/ML

- Anthropic Claude SDK 0.71.2
- Jina Embeddings API (jina-embeddings-v3 for semantic search)
- ts-fsrs 5.2.3 (spaced repetition)

### Authentication

- NextAuth 5.0.0-beta.30

### Testing

- Vitest 4.0.15
- Playwright 1.57.0
- Testing Library (React, Jest-DOM)

### Development Tools

- ESLint 9.0.0
- Prettier 3.7.4
- lint-staged 16.2.7

### Deployment

- Docker, Docker Compose
- Nginx, Certbot
- GitHub Actions

## Active Technologies

- @anthropic-ai/sdk 0.71.2 ([docs](https://docs.anthropic.com/en/api/client-sdks))
- @lancedb/lancedb 0.22.3 ([docs](https://lancedb.github.io/lancedb))
- @sentry/nextjs 10.32.1 ([docs](https://www.npmjs.com/package/@sentry/nextjs/v/10.32.1))
- @types/nodemailer 7.0.4 ([docs](https://www.npmjs.com/package/@types/nodemailer/v/7.0.4))
- bcryptjs 3.0.3 ([docs](https://www.npmjs.com/package/bcryptjs/v/3.0.3))
- canvas-confetti 1.9.4 ([docs](https://www.npmjs.com/package/canvas-confetti/v/1.9.4))
- dotenv 17.2.3 ([docs](https://www.npmjs.com/package/dotenv/v/17.2.3))
- drizzle-orm 0.45.1 ([docs](https://orm.drizzle.team/docs/overview))
- next 16.0.10 ([docs](https://nextjs.org/docs))
- next-auth 5.0.0-beta.30 ([docs](https://next-auth.js.org))
- nodemailer 7.0.12 ([docs](https://www.npmjs.com/package/nodemailer/v/7.0.12))
- postgres 3.4.7 ([docs](https://www.npmjs.com/package/postgres/v/3.4.7))
- react 19.2.3 ([docs](https://react.dev))
- react-dom 19.2.3 ([docs](https://react.dev/reference/react-dom))
- resend 6.6.0 ([docs](https://www.npmjs.com/package/resend/v/6.6.0))
- ts-fsrs 5.2.3 ([docs](https://www.npmjs.com/package/ts-fsrs/v/5.2.3))
- uuid 13.0.0 ([docs](https://www.npmjs.com/package/uuid/v/13.0.0))
- zod 4.2.1 ([docs](https://www.npmjs.com/package/zod/v/4.2.1))

## Recent Changes

- 023-dedupe: Duplicate detection for goals and flashcards using Jina embeddings + LanceDB similarity search
- 010-ui-polish: Added TypeScript 5.7 (strict mode) + Next.js 16.0.10 App Router
- 009-ollama-model-deployment: Added TypeScript 5.7 / Node.js (Next.js 16), Bash + Next.js
