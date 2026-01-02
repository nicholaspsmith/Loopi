# Implementation Plan: Codebase Cleanup

**Branch**: `022-codebase-cleanup` | **Date**: 2026-01-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/022-codebase-cleanup/spec.md`

## Summary

Implement a comprehensive codebase cleanup system using Knip for dead code detection combined with custom scripts for Drizzle ORM database entity analysis, environment variable detection, and an interactive CLI for assisted removal. The system will identify unused exports, dependencies, database entities, orphaned tests, and configuration entries, then guide developers through safe removal with undo capabilities.

## Technical Context

**Language/Version**: TypeScript 5.7.0, Node.js 20+
**Primary Dependencies**: Knip (new), Drizzle ORM 0.45.1 (existing), inquirer (new for CLI)
**Storage**: N/A (analysis tool, no persistence needed)
**Testing**: Vitest 4.0.15 (existing)
**Target Platform**: CLI tool, runs locally on developer machines
**Project Type**: Single project (CLI scripts)
**Performance Goals**: Report generation < 5 minutes for entire codebase
**Constraints**: Must not modify production code without explicit approval; safe rollback required
**Scale/Scope**: ~56 dependencies, 15+ database tables, 100+ test files, 20+ env vars

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle              | Pre-Design | Post-Design | Notes                                         |
| ---------------------- | ---------- | ----------- | --------------------------------------------- |
| I. Documentation-First | ✅ PASS    | ✅ PASS     | Spec complete with 15 FRs, 8 success criteria |
| II. Test-First (TDD)   | ✅ READY   | ✅ PASS     | Tests planned before implementation           |
| III. Modularity        | ✅ PASS    | ✅ PASS     | Separate analyzers for each detection type    |
| IV. Simplicity (YAGNI) | ✅ PASS    | ✅ PASS     | Using proven tool (Knip), minimal custom code |
| V. Observability       | ✅ PASS    | ✅ PASS     | Structured reports, risk levels, context      |
| VI. Atomic Commits     | ✅ READY   | ✅ PASS     | Each removal atomic, follows .claude/rules.md |

**Gate Status**: ✅ PASSED - Ready for implementation

## Project Structure

### Documentation (this feature)

```text
specs/022-codebase-cleanup/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Tool research and decisions
├── quickstart.md        # Developer usage guide
└── tasks.md             # Task breakdown (Phase 2)
```

### Source Code (repository root)

```text
scripts/
└── cleanup/
    ├── analyze.ts           # Main orchestrator - runs all analyzers
    ├── knip-runner.ts       # Knip wrapper with custom configuration
    ├── db-analyzer.ts       # Drizzle schema analysis for unused tables/columns
    ├── env-analyzer.ts      # Environment variable reference detection
    ├── interactive-cli.ts   # Interactive prompts for assisted removal
    ├── report-generator.ts  # Consolidated report output (JSON + human-readable)
    └── types.ts             # Shared TypeScript types

# Configuration
knip.config.ts               # Knip configuration for this project

# Test coverage
tests/unit/scripts/cleanup/
├── knip-runner.test.ts
├── db-analyzer.test.ts
├── env-analyzer.test.ts
├── interactive-cli.test.ts
└── report-generator.test.ts
```

**Structure Decision**: CLI scripts in `/scripts/cleanup/` following existing script organization pattern. No new directories outside established patterns.

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           analyze.ts                                 │
│                        (Main Orchestrator)                           │
└─────────────────────────────────────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         │                          │                          │
         ▼                          ▼                          ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  knip-runner.ts │    │  db-analyzer.ts │    │ env-analyzer.ts │
│                 │    │                 │    │                 │
│ • Unused exports│    │ • Parse schema  │    │ • Parse .env    │
│ • Unused deps   │    │ • Find table    │    │ • Search code   │
│ • Unused files  │    │   references    │    │   references    │
│ • Unused types  │    │ • Find column   │    │ • Flag unused   │
└─────────────────┘    │   references    │    └─────────────────┘
         │             └─────────────────┘              │
         │                      │                       │
         └──────────────────────┼───────────────────────┘
                                │
                                ▼
                  ┌─────────────────────────┐
                  │   report-generator.ts   │
                  │                         │
                  │ • Consolidate findings  │
                  │ • Assign risk levels    │
                  │ • Generate JSON report  │
                  │ • Generate CLI output   │
                  └─────────────────────────┘
                                │
                                ▼
                  ┌─────────────────────────┐
                  │   interactive-cli.ts    │
                  │                         │
                  │ • Display findings      │
                  │ • Prompt for action     │
                  │ • Execute removals      │
                  │ • Track undo history    │
                  └─────────────────────────┘
```

### Data Flow

1. **Analysis Phase** (parallel execution):
   - `knip-runner.ts` → Runs Knip, parses JSON output
   - `db-analyzer.ts` → Parses Drizzle schema, searches for references
   - `env-analyzer.ts` → Parses .env files, searches for process.env usage

2. **Report Phase**:
   - All findings consolidated into typed structure
   - Risk level assigned per finding
   - Output as JSON (machine) + formatted (human)

3. **Interactive Phase**:
   - Findings presented by category (production first)
   - User prompted for each finding: Remove / Skip / Undo / Details / Quit
   - Removals executed with atomic commits

### Finding Types

```typescript
interface Finding {
  id: string
  category: 'export' | 'dependency' | 'file' | 'type' | 'database' | 'config' | 'test'
  name: string
  location: string // file:line or package name
  context: string // surrounding code or usage info
  riskLevel: 'safe' | 'review' | 'dangerous'
  confidence: number // 0-100
  isDevOnly: boolean
  lastModified?: Date
  references: string[] // any detected references (for review items)
}

interface Report {
  generatedAt: Date
  summary: {
    totalFindings: number
    byCategory: Record<string, number>
    byRiskLevel: Record<string, number>
    devOnlyCount: number
    productionCount: number
  }
  findings: Finding[]
}
```

### Risk Level Assignment

| Category          | Safe                           | Needs Review            | Dangerous               |
| ----------------- | ------------------------------ | ----------------------- | ----------------------- |
| Unused export     | No references, not in index.ts | Dynamic import possible | Exported from index.ts  |
| Unused dependency | Zero imports found             | Used in scripts only    | Used in production code |
| Unused file       | Never imported                 | Imported in tests only  | Recently modified       |
| Unused type       | Zero references                | Used in .d.ts files     | Exported publicly       |
| Database entity   | Zero code refs, no data        | Has data, no code refs  | Has code refs           |
| Config entry      | Zero code refs                 | Used in tests/scripts   | Used in production      |
| Orphaned test     | Tests non-existent module      | Module moved/renamed    | Test imports exist      |

## Implementation Phases

> **TDD Approach**: For each module below, write unit tests BEFORE implementation. Tests should verify the module's contract based on the interfaces defined in `types.ts`.

### Phase A: Setup & Tooling

1. Install Knip as devDependency
2. Create `knip.config.ts` with Next.js plugin (see [Knip Configuration](./research.md#1-unused-typescriptjavascript-code-fr-001-to-fr-003-fr-012))
3. Validate Knip works on codebase (`npx knip`)

### Phase B: Core Analyzers

> **Parallel Development**: Steps 1-3 below are independent and can be developed in parallel by different developers or in any order.

1. Implement `types.ts` with shared interfaces (Finding, Report - see [Finding Types](#finding-types) above)
2. Implement `knip-runner.ts` wrapper (see [research.md - Unused TypeScript/JavaScript Code](./research.md#1-unused-typescriptjavascript-code-fr-001-to-fr-003-fr-012))
   - Parse Knip JSON output
   - Map to Finding interface
   - Handle Knip errors gracefully
3. Implement `db-analyzer.ts` for Drizzle (see [research.md - Unused Database Entities](./research.md#3-unused-database-entities-fr-005))
   - Parse `/lib/db/drizzle-schema.ts`
   - Search for table/column references
   - Flag unreferenced entities
4. Implement `env-analyzer.ts` for env vars (see [research.md - Unused Configuration](./research.md#5-unused-configuration-fr-007))
   - Parse `.env.example` files
   - Search for `process.env.VAR_NAME` patterns
   - Flag unreferenced variables

### Phase C: Reporting

1. Implement `report-generator.ts` (see [Risk Level Assignment](#risk-level-assignment) above)
2. JSON output format for machine consumption
3. CLI-friendly formatted output with colors
4. Risk level assignment logic per category

### Phase D: Interactive CLI

1. Install @inquirer/prompts
2. Implement `interactive-cli.ts` (see [research.md - Interactive Removal](./research.md#6-interactive-removal-fr-013-fr-014))
3. User prompts: Remove / Skip / Undo / Details / Quit
4. Removal execution with git integration
5. Undo functionality (restore from git)
6. Session persistence for resume capability

### Phase E: Integration & Testing

1. Implement `analyze.ts` orchestrator
2. Write unit tests for all modules (if not done during TDD)
3. Integration test with real codebase
4. Update quickstart.md with real examples

## Exclusion Patterns (FR-009)

Default exclusions (configured in `knip.config.ts`):

- `**/node_modules/**`
- `.next/**`
- `drizzle/**` (migrations)
- `public/**`
- Files with `// @keep` comment

User-configurable overrides:

- Public API exports
- Plugin interfaces
- Intentional backwards-compatibility code

## Edge Case Handling

| Edge Case                                  | Handling Strategy                                           |
| ------------------------------------------ | ----------------------------------------------------------- |
| Database columns used by external services | Flag as "dangerous" risk level; require manual confirmation |
| Circular dependencies                      | Knip handles these; analyzer follows import graph correctly |
| Code kept for backwards compatibility      | Use `// @keep` comment or add to exclusion patterns         |
| Dynamic imports (`import()`)               | Flag as "needs review" with lower confidence score          |
| Dev-only code                              | Separate category in report; lower priority for cleanup     |

## Complexity Tracking

No constitution violations. Using proven tooling (Knip) minimizes custom code complexity.

## Dependencies (New)

| Package           | Version | Purpose                 |
| ----------------- | ------- | ----------------------- |
| knip              | latest  | Dead code detection     |
| @inquirer/prompts | latest  | Interactive CLI prompts |

## npm Scripts

```json
{
  "scripts": {
    "cleanup:analyze": "npx tsx scripts/cleanup/analyze.ts",
    "cleanup:report": "npx tsx scripts/cleanup/analyze.ts --report-only",
    "cleanup:interactive": "npx tsx scripts/cleanup/analyze.ts --interactive"
  }
}
```

## Success Validation

| Criterion                    | How to Verify                      |
| ---------------------------- | ---------------------------------- |
| SC-001 (90% detection)       | Manual audit of 10 random findings |
| SC-002 (<10% false positive) | Build + tests pass after removal   |
| SC-003 (30s decision time)   | Context included in each finding   |
| SC-004 (fewer files/deps)    | Before/after metrics comparison    |
| SC-005 (build times)         | Benchmark before/after             |
| SC-006 (tests pass)          | Full test suite after cleanup      |
| SC-007 (no regressions)      | Manual smoke test of core flows    |
| SC-008 (<5 min analysis)     | Time the analyze command           |
