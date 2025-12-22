# Data Model: Pre-Commit Quality Hooks

**Date**: 2025-12-21
**Feature**: 008-pre-commit-hooks

## Overview

This feature is primarily infrastructure/tooling with minimal persistent data. The "data model" consists of configuration files and validation schemas rather than database entities.

---

## Configuration Entities

### 1. Lint-Staged Configuration

**File**: `.lintstagedrc.js`

```typescript
interface LintStagedConfig {
  // Pattern → Command(s) mapping
  [globPattern: string]: string | string[] | ((filenames: string[]) => string | string[])
}
```

**Example**:

```javascript
{
  '*.{ts,tsx}': () => 'tsc --noEmit',
  '*.{ts,tsx,js,jsx}': (filenames) => [
    `eslint --fix ${filenames.join(' ')}`,
    `prettier --write ${filenames.join(' ')}`,
  ],
}
```

---

### 2. Commit Message Schema

**Source of Truth**: `.claude/rules.md`

```typescript
interface CommitMessage {
  subject: string // Max 72 chars, imperative mood
  body?: string // ONLY "Co-Authored-By: Claude <noreply@anthropic.com>"
}

interface CommitValidationResult {
  valid: boolean
  errors: CommitValidationError[]
  warnings: CommitValidationWarning[]
}

interface CommitValidationError {
  rule: 'subject-length' | 'imperative-mood' | 'body-format' | 'ai-attribution'
  message: string
  line: number
}

interface CommitValidationWarning {
  rule: 'multiple-responsibilities'
  message: string
  suggestion: string
}
```

**Validation Rules**:

| Rule                      | Constraint                          | Error Level             |
| ------------------------- | ----------------------------------- | ----------------------- |
| subject-length            | ≤ 72 characters                     | Error (blocks commit)   |
| imperative-mood           | No past tense ("Added", "Fixed")    | Error (blocks commit)   |
| body-format               | Must be exactly Co-Authored-By line | Error (blocks commit)   |
| ai-attribution            | No "Generated with Claude Code"     | Error (blocks commit)   |
| multiple-responsibilities | Single change per commit            | Warning (allows commit) |

---

### 3. Test Audit Report

**Output Structure**:

```typescript
interface TestAuditReport {
  timestamp: string
  totalFiles: number
  totalTests: number
  findings: TestAuditFinding[]
  summary: {
    errors: number // Block (new tests)
    warnings: number // Warn (existing tests)
  }
}

interface TestAuditFinding {
  file: string
  testName: string
  line: number
  issue: TestAuditIssue
  isNewTest: boolean // Determines error vs warning
}

type TestAuditIssue =
  | { type: 'no-assertions' }
  | { type: 'weak-assertion'; assertion: string }
  | { type: 'truthy-only' }
```

**Weak Assertion Patterns**:

```typescript
const WEAK_ASSERTIONS = [
  'toBeTruthy',
  'toBeDefined',
  'toBeFalsy',
  'toBeUndefined',
  'toBeNull',
  'toBeNaN',
] as const

type WeakAssertion = (typeof WEAK_ASSERTIONS)[number]
```

---

### 4. Hook Exit Codes

```typescript
enum HookExitCode {
  SUCCESS = 0,
  VALIDATION_ERROR = 1,
  HOOK_ERROR = 2, // Hook itself failed
}
```

---

## State Transitions

### Commit Flow

```
[Working Directory]
        │
        ▼
   git commit
        │
        ▼
┌───────────────────┐
│   pre-commit      │──── FAIL ───▶ [Blocked] + Error Message
│  (lint-staged)    │
└───────────────────┘
        │ PASS
        ▼
┌───────────────────┐
│   commit-msg      │──── FAIL ───▶ [Blocked] + Error Message
│   (validator)     │
└───────────────────┘
        │ PASS
        ▼
   [Commit Created]
```

### Push Flow

```
   [Local Commits]
        │
        ▼
    git push
        │
        ▼
┌───────────────────┐
│    pre-push       │
│                   │
│  1. Test Audit    │──── FAIL (new) ───▶ [Blocked]
│                   │──── WARN (old) ───▶ Continue
│                   │
│  2. Unit Tests    │──── FAIL ───▶ Retry once
│                   │──── FAIL (2nd) ─▶ [Blocked]
│                   │
│  3. Integration   │──── FAIL ───▶ Retry once
│                   │──── FAIL (2nd) ─▶ [Blocked]
└───────────────────┘
        │ PASS
        ▼
   [Push Completed]
```

---

## Relationships

```
.claude/rules.md
       │
       │ defines
       ▼
CommitMessage Schema
       │
       │ validated by
       ▼
commit-msg-validator.ts ◄──── .githooks/commit-msg
       │
       │ outputs
       ▼
CommitValidationResult


eslint.config.mjs (vitest plugin)
       │
       │ configured by
       ▼
.lintstagedrc.js
       │
       │ invoked by
       ▼
.githooks/pre-commit


tests/**/*.test.ts
       │
       │ analyzed by
       ▼
test-audit.ts
       │
       │ outputs
       ▼
TestAuditReport
```

---

## No Database Entities

This feature does not introduce any database tables or persistent storage. All "state" is:

- **Configuration files** (committed to git)
- **Validation results** (transient, displayed in terminal)
- **Git hook scripts** (committed to git)

---

## Validation Constants

```typescript
// Commit message validation
const SUBJECT_MAX_LENGTH = 72
const PAST_TENSE_PREFIXES = [
  'Added',
  'Fixed',
  'Updated',
  'Created',
  'Implemented',
  'Modified',
  'Changed',
  'Removed',
  'Deleted',
  'Resolved',
]
const THIRD_PERSON_PREFIXES = ['Adds', 'Fixes', 'Updates', 'Creates', 'Implements']
const REQUIRED_COAUTHOR = 'Co-Authored-By: Claude <noreply@anthropic.com>'
const FORBIDDEN_TEXT = ['Generated with', 'Claude Code', '🤖']

// Performance targets (from spec)
const PRE_COMMIT_TIMEOUT_MS = 30_000 // SC-003
const PRE_PUSH_TIMEOUT_MS = 300_000 // SC-004
const COMMIT_MSG_TIMEOUT_MS = 1_000 // SC-010
```
