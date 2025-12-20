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
- Atomic Commits & Version Control Discipline

## Active Technologies

- TypeScript 5.x, Node.js 20.x (Next.js 15) + Next.js 15, Docker, Docker Compose, Nginx, Certbot, GitHub Actions (002-ci-cd-deployment)
- LanceDB (file-based vector database), Backblaze B2 (backups) (002-ci-cd-deployment)

## Recent Changes

- 002-ci-cd-deployment: Added TypeScript 5.x, Node.js 20.x (Next.js 15) + Next.js 15, Docker, Docker Compose, Nginx, Certbot, GitHub Actions
