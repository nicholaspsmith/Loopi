# Research: Codebase Cleanup

**Feature**: 022-codebase-cleanup
**Date**: 2026-01-02

## Executive Summary

This research identifies the optimal tools and approaches for detecting and removing unused code, dependencies, database entities, tests, and configuration from the memoryloop codebase.

## Tool Selection

### Primary Tool: Knip

**Decision**: Use [Knip](https://knip.dev) as the primary dead code detection tool.

**Rationale**:

- Comprehensive TypeScript/JavaScript analysis using mark-and-sweep algorithm
- Detects unused exports, files, dependencies, types, and class members
- Native Next.js support with understanding of App Router conventions
- Production mode to separate dev-only from production code
- Auto-fix capability for removing unused dependencies
- Proven at scale (helped Vercel delete ~300k lines of unused code)
- Active maintenance and community support

**Alternatives Considered**:
| Tool | Reason Rejected |
|------|-----------------|
| ts-prune | Less comprehensive, only finds unused exports |
| depcheck | Only finds unused dependencies, not exports |
| unimported | Less TypeScript support, fewer features |
| ESLint rules | Only finds unused within files, not across modules |

### Custom Scripts Required

Knip handles most detection but custom scripts are needed for:

1. **Database Entity Detection** - Drizzle ORM schema analysis
2. **Environment Variable Detection** - .env file parsing + code reference search
3. **Interactive Removal CLI** - User prompts for approval

## Technical Approach by Category

### 1. Unused TypeScript/JavaScript Code (FR-001 to FR-003, FR-012)

**Approach**: Knip with Next.js plugin

**Configuration**:

```json
{
  "$schema": "https://unpkg.com/knip@latest/schema.json",
  "entry": ["app/**/*.tsx", "app/**/*.ts"],
  "project": ["**/*.ts", "**/*.tsx"],
  "ignore": ["**/*.test.ts", "**/*.spec.ts", "tests/**"],
  "next": true
}
```

**What Knip Detects**:

- Unused exports (named and default)
- Unused files (never imported)
- Unused types and interfaces
- Unused React components
- Unused class members

### 2. Unused Dependencies (FR-004, FR-011)

**Approach**: Knip dependency analysis + production mode

**Commands**:

- `knip --dependencies` - List all unused dependencies
- `knip --production` - Focus on production dependencies only
- `knip --fix` - Auto-remove unused deps from package.json

**Current State**:

- 17 production dependencies
- 39 devDependencies
- Total: 56 packages to analyze

### 3. Unused Database Entities (FR-005)

**Approach**: Custom script analyzing Drizzle schema

**Algorithm**:

1. Parse `/lib/db/drizzle-schema.ts` to extract table/column definitions
2. Search codebase for references to each table name
3. For each column, search for:
   - Direct column references (e.g., `users.email`)
   - Object property access patterns
   - Drizzle query builder usage
4. Flag tables/columns with zero references

**Known Tables** (from drizzle-schema.ts):

- users, conversations, messages, flashcards, review_logs
- achievements, goals, skill_nodes, skill_trees, decks
- deck_cards, distractors, background_jobs, security_logs
- email_queue, email_verification_tokens, password_reset_tokens, api_keys

### 4. Orphaned Test Files (FR-006)

**Approach**: Knip test file analysis + cross-reference check

**Algorithm**:

1. Use Knip to find test files importing non-existent modules
2. Cross-reference test files with source files:
   - For each `*.test.ts`, check if corresponding source exists
   - For component tests, verify component exists
3. Check vitest/playwright configs for excluded patterns

**Test Locations**:

- `/tests/unit/` (37+ files)
- `/tests/integration/` (18 files)
- `/tests/contract/` (12 files)
- `/tests/component/` (4 files)
- `/tests/e2e/` (21+ spec files)

### 5. Unused Configuration (FR-007)

**Approach**: Custom script for env var analysis

**Algorithm**:

1. Parse `.env.example` and `.env.production.example` for defined vars
2. Search codebase for `process.env.VAR_NAME` patterns
3. Search for env var references in:
   - `/lib/env.ts`
   - Config files (next.config.ts, drizzle.config.ts)
   - Docker files
4. Flag vars with no code references

**Known Env Var Categories**:

- Auth: AUTH_URL, AUTH_SECRET
- Database: DATABASE_URL
- AI: ANTHROPIC_API_KEY, JINA_API_KEY
- Email: SMTP\_\*, RESEND_API_KEY
- System: NODE_ENV, CRON_SECRET

### 6. Interactive Removal (FR-013, FR-014)

**Approach**: Custom CLI tool with inquirer-style prompts

**Features**:

- Display finding with context (file location, last modified, references)
- Risk level indicator (safe/review/dangerous)
- Options: Remove, Skip, Undo last, View details, Quit
- Batch mode for safe removals
- Dry-run mode for preview
- Session persistence for resume capability

## Confidence Scoring

Per FR-008, each finding should have a confidence level:

| Risk Level                     | Criteria                                                         | Action                 |
| ------------------------------ | ---------------------------------------------------------------- | ---------------------- |
| **Safe** (High confidence)     | No references found, not in public API, not dynamically imported | Auto-remove eligible   |
| **Needs Review** (Medium)      | Dynamic imports, string-based references, test-only usage        | Interactive prompt     |
| **Dangerous** (Low confidence) | Public API exports, external service dependencies, DB entities   | Manual review required |

## Implementation Architecture

```
scripts/
└── cleanup/
    ├── analyze.ts          # Main orchestrator
    ├── knip-runner.ts      # Knip integration
    ├── db-analyzer.ts      # Drizzle schema analysis
    ├── env-analyzer.ts     # Environment variable detection
    ├── interactive-cli.ts  # User prompt interface
    ├── report-generator.ts # Report formatting
    └── types.ts            # Shared types
```

## Exclusion Patterns (FR-009)

Default exclusions:

- `**/node_modules/**`
- `.next/**`
- `drizzle/**` (migrations)
- `public/**`
- Files with `// @keep` comment

User-configurable via `knip.config.ts`:

- Public API exports
- Plugin interfaces
- Intentional unused (backwards compatibility)

## Performance Requirements (SC-008)

**Target**: Report generation < 5 minutes

**Optimization Strategy**:

1. Parallel analysis (Knip handles this)
2. Cache TypeScript compilation
3. Incremental analysis where possible
4. Skip binary/media files

## Sources

- [Knip Official Documentation](https://knip.dev)
- [Knip GitHub Repository](https://github.com/webpro-nl/knip)
- [Effective TypeScript - Knip Recommendation](https://effectivetypescript.com/2023/07/29/knip/)
- [Knip Unused Exports Guide](https://knip.dev/typescript/unused-exports)
- [Knip Unused Dependencies Guide](https://knip.dev/typescript/unused-dependencies)
