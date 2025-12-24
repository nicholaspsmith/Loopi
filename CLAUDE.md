# Claude Code Instructions for memoryloop

This project uses speckit for feature specification and task tracking.

## Feature-Specific Context

When working on a feature branch (e.g., `003-flashcard-rating-labels`), check for a matching
specs directory at `specs/[branch-name]/`. If it exists, read these files for feature context:

- `specs/[branch-name]/spec.md` - Feature specification and requirements
- `specs/[branch-name]/plan.md` - Implementation plan and technical decisions
- `specs/[branch-name]/tasks.md` - Task breakdown and progress tracking

This feature-specific context supplements the project-wide information below.

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

- PostgreSQL (via postgres 3.4.7, drizzle-orm 0.45.1)
- LanceDB 0.22.3 (vector database)
- pgvector 0.2.1 (vector embeddings)

### AI/ML

- Anthropic Claude SDK 0.71.2
- Ollama (nomic-embed-text for local embeddings)
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

**IMPORTANT**: The versions listed below are the exact versions used in this project. If your knowledge is based on a different version of any technology, you MUST reference the documentation links provided to ensure version-specific accuracy. Use the WebFetch tool when needed.

- @anthropic-ai/sdk 0.71.2 ([docs](https://docs.anthropic.com/en/api/client-sdks))
- @lancedb/lancedb 0.22.3 ([docs](https://lancedb.github.io/lancedb))
- bcryptjs 3.0.3 ([docs](https://www.npmjs.com/package/bcryptjs/v/3.0.3))
- canvas-confetti 1.9.4 ([docs](https://www.npmjs.com/package/canvas-confetti/v/1.9.4))
- dotenv 17.2.3 ([docs](https://www.npmjs.com/package/dotenv/v/17.2.3))
- drizzle-kit 0.31.8 ([docs](https://www.npmjs.com/package/drizzle-kit/v/0.31.8))
- drizzle-orm 0.45.1 ([docs](https://orm.drizzle.team/docs/overview))
- next 16.0.10 ([docs](https://nextjs.org/docs))
- next-auth 5.0.0-beta.30 ([docs](https://next-auth.js.org))
- pgvector 0.2.1 ([docs](https://www.npmjs.com/package/pgvector/v/0.2.1))
- postgres 3.4.7 ([docs](https://www.npmjs.com/package/postgres/v/3.4.7))
- react 19.2.3 ([docs](https://react.dev))
- react-dom 19.2.3 ([docs](https://react.dev/reference/react-dom))
- react-markdown 10.1.0 ([docs](https://www.npmjs.com/package/react-markdown/v/10.1.0))
- remark-gfm 4.0.1 ([docs](https://www.npmjs.com/package/remark-gfm/v/4.0.1))
- ts-fsrs 5.2.3 ([docs](https://www.npmjs.com/package/ts-fsrs/v/5.2.3))
- uuid 13.0.0 ([docs](https://www.npmjs.com/package/uuid/v/13.0.0))
- zod 4.2.0 ([docs](https://www.npmjs.com/package/zod/v/4.2.0))

## Recent Changes

- 010-ui-polish: Added TypeScript 5.7 (strict mode) + Next.js 16.0.10 App Router
- 009-ollama-model-deployment: Added TypeScript 5.7 / Node.js (Next.js 16), Bash + Next.js
- 003-flashcard-rating-labels: Added TypeScript 5.x with React 18 (Next.js 16) + React
