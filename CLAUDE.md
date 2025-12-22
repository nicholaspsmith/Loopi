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

- TypeScript 5.7
- Node.js 20+
- Next.js 16.0
- React 19.2

### Styling

- Tailwind CSS 4.0

### Database

- PostgreSQL (via postgres 3.4, drizzle-orm 0.45)
- LanceDB 0.22 (vector database)
- pgvector 0.2 (vector embeddings)

### AI/ML

- Anthropic Claude SDK 0.71
- Ollama (nomic-embed-text for local embeddings)
- ts-fsrs 5.2 (spaced repetition)

### Authentication

- NextAuth 5.0.0

### Testing

- Vitest 4.0
- Playwright 1.57
- Testing Library (React, Jest-DOM)

### Development Tools

- ESLint 9.0
- Prettier 3.7
- lint-staged 16.2

### Deployment

- Docker, Docker Compose
- Nginx, Certbot
- GitHub Actions
