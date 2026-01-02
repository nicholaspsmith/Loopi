# Codebase Cleanup - Developer Quickstart

## Overview

The codebase cleanup tools help identify and safely remove unused code, dependencies, database entities, tests, and configuration from the memoryloop project.

## Quick Start

### Generate Report Only

```bash
npm run cleanup:report
```

This generates a report of all findings without making any changes. Output includes:

- JSON report at `cleanup-report.json`
- Summary in terminal

### Interactive Cleanup

```bash
npm run cleanup:interactive
```

Walk through each finding and decide whether to remove, skip, or get more details.

### Full Analysis

```bash
npm run cleanup:analyze
```

Run all analyzers and display consolidated results.

## What Gets Detected

### 1. Unused TypeScript/JavaScript Code

- Exported functions/classes never imported
- Files never imported
- React components never rendered
- Types and interfaces never used

### 2. Unused Dependencies

- npm packages with zero imports
- Separated by production vs dev dependencies

### 3. Unused Database Entities

- Tables with no code references
- Columns never queried or written

### 4. Orphaned Tests

- Test files importing non-existent modules
- Tests for removed functionality

### 5. Unused Configuration

- Environment variables never accessed
- Config keys never read

## Understanding Risk Levels

| Level            | Meaning                                      | Action                         |
| ---------------- | -------------------------------------------- | ------------------------------ |
| **Safe**         | High confidence unused, no references found  | Can remove with confidence     |
| **Needs Review** | Possibly used dynamically or in tests only   | Review context before removing |
| **Dangerous**    | External dependencies, public APIs, has data | Manual review required         |

## Interactive CLI Options

During interactive mode, you can:

- **R** - Remove this item
- **S** - Skip (keep) this item
- **U** - Undo last removal
- **D** - View more details
- **Q** - Quit (saves progress)

## Configuration

### Excluding Files/Patterns

Edit `knip.config.ts` to exclude specific patterns:

```typescript
export default {
  ignore: [
    '**/legacy/**', // Legacy code to keep
    '**/plugin-interfaces/**', // Public plugin APIs
  ],
  ignoreDependencies: [
    'some-optional-package', // Optional peer dependencies
  ],
}
```

### Marking Code to Keep

Add a `// @keep` comment to prevent flagging:

```typescript
// @keep - Used by external plugin system
export function pluginHook() { ... }
```

## Safety Features

1. **Dry Run Default**: Report mode shows what would be removed without changes
2. **Undo Support**: Each removal can be undone in the same session
3. **Git Integration**: All removals create atomic commits for easy rollback
4. **Risk Categorization**: Dangerous items require explicit confirmation

## Troubleshooting

### False Positives

If a used item is flagged:

1. Check for dynamic imports (`import()`)
2. Check for string-based references
3. Add to ignore patterns if intentionally unused

### Analysis Too Slow

If analysis takes >5 minutes:

1. Ensure `node_modules` is excluded
2. Check for large generated files
3. Run analyzers individually to find bottleneck

## Examples

### Example Report Output

```
📊 Cleanup Analysis Report
Generated: 2026-01-02T10:30:00Z

Summary:
├── Total Findings: 47
├── By Category:
│   ├── exports: 23
│   ├── dependencies: 8
│   ├── files: 6
│   ├── database: 3
│   ├── config: 5
│   └── tests: 2
└── By Risk Level:
    ├── safe: 31
    ├── review: 12
    └── dangerous: 4

Production vs Dev:
├── Production: 15
└── Dev-only: 32
```

### Example Finding Detail

```
🔍 Finding: Unused Export
   Name: formatLegacyDate
   Location: lib/utils/date.ts:45
   Risk: Safe
   Confidence: 98%
   Context: Function defined but never imported anywhere

   [R]emove  [S]kip  [D]etails  [U]ndo  [Q]uit
```
