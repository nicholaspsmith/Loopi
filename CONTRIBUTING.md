# Contributing to Loopi

Thank you for your interest in contributing to Loopi! This document provides guidelines for development and contribution.

## Development Setup

### Prerequisites

- Node.js 20 or higher
- npm or yarn
- Git
- Anthropic API key

### Initial Setup

1. Fork the repository
2. Clone your fork:

   ```bash
   git clone https://github.com/YOUR_USERNAME/loopi.git
   cd loopi
   ```

3. Add upstream remote:

   ```bash
   git remote add upstream https://github.com/nicholaspsmith/loopi.git
   ```

4. Install dependencies:

   ```bash
   npm install
   ```

5. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

6. Configure your `.env.local` with your API keys
7. Initialize the database:

   ```bash
   npm run db:init
   ```

## Development Workflow

### Branching Strategy

- `main` - Production-ready code
- Feature branches - `[issue-number]-feature-description`

### Making Changes

1. Create a new branch:

   ```bash
   git checkout -b 123-add-new-feature
   ```

2. Make your changes following our code style

3. Write or update tests for your changes

4. Run tests locally:

   ```bash
   npm test
   npm run test:integration
   ```

5. Run linting and type checking:

   ```bash
   npm run lint
   npm run type-check
   ```

6. Commit your changes following commit conventions (see below)

7. Push to your fork:

   ```bash
   git push origin 123-add-new-feature
   ```

8. Create a Pull Request

## Code Style

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Avoid `any` types - use proper typing
- Use interfaces for object shapes
- Use type aliases for unions and primitives

### React Components

- Use functional components with hooks
- Prefer Server Components (default in Next.js 15)
- Mark Client Components explicitly with `'use client'`
- Keep components focused and single-responsibility
- Extract reusable logic into custom hooks

### File Organization

- Components in `components/[feature]/ComponentName.tsx`
- API routes in `app/api/[endpoint]/route.ts`
- Types in `types/index.ts` or feature-specific type files
- Utilities in `lib/[category]/utility.ts`

### Naming Conventions

- Components: PascalCase (e.g., `MessageList.tsx`)
- Files: camelCase for utilities, PascalCase for components
- Variables: camelCase
- Constants: SCREAMING_SNAKE_CASE
- Types/Interfaces: PascalCase

## Git Commit Conventions

### Commit Message Format

```
Subject line (72 characters max)

Co-Authored-By: Your Name <your.email@example.com>
```

### Rules

1. **Subject line**: 72 characters maximum
2. **One responsibility per commit**: Each commit should do one thing
3. **Imperative mood**: "Add feature" not "Added feature"
4. **No AI attribution**: Don't mention AI tools in commits
5. **Body format**: Only include Co-Authored-By line if applicable

### Examples

**Good:**

```
Add ARIA labels to quiz interface

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Bad:**

```
Added ARIA labels, fixed keyboard navigation, and updated docs

This commit makes several changes to improve accessibility across
the application including ARIA labels and keyboard support.
```

## Testing

### Test Requirements

- All new features must include tests
- Maintain minimum 70% code coverage
- Test critical user paths end-to-end

### Test Types

1. **Unit Tests** (Vitest)
   - Test individual functions and components
   - Location: `tests/unit/`
   - Run: `npm test`

2. **Component Tests** (React Testing Library)
   - Test React component behavior
   - Location: `tests/component/`
   - Run: `npm run test:component`

3. **Integration Tests** (Playwright)
   - Test complete user journeys
   - Location: `tests/integration/`
   - Run: `npm run test:integration`

### Writing Tests

```typescript
// Unit test example
import { describe, it, expect } from 'vitest'
import { calculateNextReview } from '@/lib/fsrs/scheduler'

describe('FSRS Scheduler', () => {
  it('should calculate next review date correctly', () => {
    const result = calculateNextReview(/* params */)
    expect(result).toBeDefined()
  })
})
```

## Pull Request Process

### Before Submitting

- [ ] Tests pass locally
- [ ] Code is properly typed (no TypeScript errors)
- [ ] Linting passes (`npm run lint`)
- [ ] Changes are documented (JSDoc comments, README updates)
- [ ] Commit messages follow conventions

### PR Description

Include:

1. **What**: Brief description of changes
2. **Why**: Reason for the changes
3. **How**: Technical approach
4. **Testing**: How to test the changes
5. **Screenshots**: For UI changes

### Review Process

1. At least one maintainer must approve
2. All CI checks must pass
3. No merge conflicts with main
4. Branch must be up to date with main

## Code Review Guidelines

### As a Reviewer

- Be respectful and constructive
- Focus on code quality, not personal preferences
- Explain _why_ changes are needed
- Approve when satisfied, request changes if needed

### As an Author

- Address all review comments
- Ask for clarification if needed
- Update PR description if scope changes
- Be responsive to feedback

## Project Structure

```
loopi/
├── app/                   # Next.js App Router
│   ├── (auth)/           # Auth pages (login, signup)
│   ├── (protected)/      # Protected routes (goals, quiz)
│   └── api/              # API routes
├── components/           # React components
├── lib/                  # Shared utilities
├── types/                # TypeScript types
├── tests/                # Test files
├── public/               # Static assets
└── specs/                # Feature specifications
```

## Development Tools

This project includes AI-assisted development tools organized into three categories.

### MCP Servers (Agent Tools)

Model Context Protocol servers run as background processes and provide tools to AI agents (Claude Code).

#### lance-context

Semantic code search using vector embeddings:

| Tool               | Purpose                                                |
| ------------------ | ------------------------------------------------------ |
| `index_codebase`   | Build/rebuild the vector index of code files           |
| `search_code`      | Natural language search (e.g., "authentication logic") |
| `get_index_status` | Check if index exists and file counts                  |
| `clear_index`      | Delete the index to start fresh                        |

#### serena

Symbolic code navigation for precise, structure-aware operations:

| Tool                         | Purpose                                     |
| ---------------------------- | ------------------------------------------- |
| `find_symbol`                | Find functions/classes/methods by name path |
| `get_symbols_overview`       | List all symbols in a file                  |
| `find_referencing_symbols`   | Find where a symbol is used                 |
| `replace_symbol_body`        | Edit a specific function/method             |
| `insert_before/after_symbol` | Add code at specific positions              |

### Slash Commands (Human-Invoked)

Invoke by typing `/command` in Claude Code:

| Command              | Purpose                          |
| -------------------- | -------------------------------- |
| `/speckit.specify`   | Create feature specifications    |
| `/speckit.clarify`   | Resolve spec ambiguities         |
| `/speckit.plan`      | Generate implementation plans    |
| `/speckit.tasks`     | Generate task breakdowns         |
| `/speckit.analyze`   | Cross-artifact consistency check |
| `/speckit.implement` | Execute implementation tasks     |

Numbered aliases exist (`/2.specify`, `/3.plan`, `/4.1.analyze`) for faster autocomplete.

### Specialized Subagents

Defined in `.claude/agents/` - spawned by Claude Code for focused tasks:

| Agent          | When to Use                                  |
| -------------- | -------------------------------------------- |
| `review-agent` | Code review before pushes (gates all pushes) |
| `test-agent`   | Writing/fixing tests (Vitest, Playwright)    |
| `ui-agent`     | React components, styling                    |
| `db-agent`     | Schema, migrations, Drizzle queries          |
| `git-agent`    | Commits, PRs, rebases                        |
| `deploy-agent` | Docker, CI/CD, production                    |
| `spec-agent`   | Feature planning                             |

### Tool Usage Summary

| Tool Type                         | Primary User                                                            |
| --------------------------------- | ----------------------------------------------------------------------- |
| MCP tools (lance-context, serena) | **Agents** - Claude Code uses these to navigate/search code efficiently |
| Slash commands (`/speckit.*`)     | **Humans** - You invoke these to drive workflows                        |
| Subagents                         | **Agents** - Claude Code spawns these for specialized tasks             |

## Documentation

### Code Documentation

- Add JSDoc comments to all exported functions
- Document complex logic with inline comments
- Keep comments up to date with code changes

### Feature Documentation

- Update README.md for user-facing changes
- Update specs/ for new features
- Add API documentation for new endpoints

## Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Open a GitHub Issue
- **Security**: Email security@loopi.com (do not open public issues)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be recognized in:

- GitHub contributors list
- Release notes (for significant contributions)
- Project documentation (for major features)

Thank you for contributing to Loopi!
