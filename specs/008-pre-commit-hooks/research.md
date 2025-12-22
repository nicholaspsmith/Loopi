# Research: Pre-Commit Quality Hooks

**Date**: 2025-12-21
**Feature**: 008-pre-commit-hooks

## Research Topics

1. Git Hook Management
2. Lint-Staged Configuration
3. Commit Message Validation
4. Test Quality Audit

---

## 1. Git Hook Management

### Decision

**Enhance native `.githooks/` directory with npm `prepare` script**

### Rationale

- Project already has working `.githooks/` setup with `pre-push` hook
- `git config core.hooksPath .githooks` already configured
- Zero external dependencies (no Husky needed)
- Auto-setup via npm `prepare` script: `"prepare": "[ -d '.git' ] && git config core.hooksPath .githooks"`
- Lint-staged works with any hook mechanism - just call `npx lint-staged` from pre-commit

### Alternatives Considered

| Tool             | Rejected Because                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------- |
| Husky            | Unnecessary abstraction; recent reliability issues in v9; project already has working alternative |
| simple-git-hooks | Only allows ONE command per hook; too limiting for lint-staged + multiple checks                  |
| Lefthook         | Requires binary installation; overkill for single-developer workflow                              |

---

## 2. Lint-Staged Configuration

### Decision

**Use `.lintstagedrc.js` with function syntax for TypeScript**

### Configuration

```javascript
// .lintstagedrc.js
module.exports = {
  // Type check - runs on full project (tsc needs full context)
  '*.{ts,tsx}': () => 'tsc --noEmit',

  // Lint staged files
  '*.{ts,tsx,js,jsx}': (filenames) => [
    `eslint --fix ${filenames.join(' ')}`,
    `prettier --write ${filenames.join(' ')}`,
  ],

  // Format other files
  '*.{json,md}': (filenames) => `prettier --write ${filenames.join(' ')}`,
}
```

### Rationale

- **Function syntax required for tsc**: String syntax causes lint-staged to append file args, breaking tsconfig.json resolution
- **Full project type check**: TypeScript needs full context to catch cross-file dependency errors
- **JavaScript config format**: Enables functions; JSON format cannot express dynamic commands
- **Project already has incremental: true**: TypeScript compilation is already optimized

### Key Gotcha

```javascript
// WRONG - lint-staged appends files, tsc ignores tsconfig.json
'*.ts': 'tsc --noEmit'

// CORRECT - function prevents file appending
'*.{ts,tsx}': () => 'tsc --noEmit'
```

---

## 3. Commit Message Validation

### Decision

**Custom TypeScript validator script (not commitlint)**

### Rationale

Project rules in `.claude/rules.md` are non-standard:

| Rule                                    | commitlint Support                          |
| --------------------------------------- | ------------------------------------------- |
| Max 72 char subject                     | ✅ Yes (configurable)                       |
| Imperative mood ("Add" not "Added")     | ❌ No built-in, custom rule needed          |
| Body = ONLY "Co-Authored-By: Claude..." | ❌ No, commitlint expects conventional body |
| No AI attribution                       | ❌ No built-in                              |

commitlint enforces conventional commits format (feat:, fix:, docs:) which doesn't match project conventions.

### Implementation

Create `scripts/hooks/commit-msg-validator.ts`:

```typescript
// Validation rules:
const SUBJECT_MAX_LENGTH = 72
const PAST_TENSE_PATTERNS = /^(Added|Fixed|Updated|Created|Implemented|Modified|Changed)/i
const REQUIRED_BODY = 'Co-Authored-By: Claude <noreply@anthropic.com>'
const FORBIDDEN_PATTERNS = /Generated with|Claude Code/i
```

### Alternatives Considered

| Approach         | Rejected Because                                               |
| ---------------- | -------------------------------------------------------------- |
| commitlint       | Enforces conventional commits format; custom rules are complex |
| Pure bash script | Regex is error-prone; harder to test; less maintainable        |

---

## 4. Test Quality Audit

### Decision

**Hybrid: ESLint plugin + Custom TypeScript analyzer**

### Components

1. **ESLint with `eslint-plugin-vitest`** - Detects tests with zero assertions
2. **Custom `scripts/hooks/test-audit.ts`** - Detects weak assertions (toBeTruthy, toBeDefined)

### Rationale

- ESLint plugin catches obvious issues (no assertions) using maintained tooling
- Custom analyzer catches semantic issues (weak assertions) specific to project style
- Combined overhead ~250ms - acceptable for pre-push
- Differential checking: block NEW tests, warn on existing (per FR-007a, FR-007b)

### ESLint Plugin Configuration

```javascript
// Add to eslint.config.mjs
import vitestPlugin from 'eslint-plugin-vitest'

export default [
  {
    files: ['tests/**/*.{test,spec}.{ts,tsx}'],
    plugins: { vitest: vitestPlugin },
    rules: {
      'vitest/expect-expect': 'error',
      'vitest/valid-expect': 'error',
      'vitest/no-only-tests': 'error',
    },
  },
]
```

### Weak Assertion Patterns to Detect

```typescript
const WEAK_ASSERTIONS = ['toBeTruthy', 'toBeDefined', 'toBeFalsy', 'toBeUndefined']
```

### Alternatives Considered

| Approach               | Rejected Because                                                        |
| ---------------------- | ----------------------------------------------------------------------- |
| Vitest custom reporter | Only works during test run; adds overhead; can't pre-check before tests |
| ESLint only            | Cannot detect weak assertions without complex custom rules              |
| Custom analyzer only   | Reinvents wheel for basic "no assertion" detection                      |

---

## Summary of Technology Choices

| Area               | Choice                            | Dependencies         |
| ------------------ | --------------------------------- | -------------------- |
| Hook management    | Native .githooks + prepare script | None                 |
| Staged file checks | lint-staged                       | lint-staged          |
| Type checking      | tsc --noEmit (full project)       | None (existing)      |
| Linting            | ESLint + vitest plugin            | eslint-plugin-vitest |
| Formatting         | Prettier                          | None (existing)      |
| Commit message     | Custom TypeScript validator       | None                 |
| Test audit         | ESLint + custom analyzer          | eslint-plugin-vitest |

---

## New Dependencies

```json
{
  "devDependencies": {
    "lint-staged": "^15.x",
    "eslint-plugin-vitest": "^0.5.x"
  }
}
```

---

## Open Questions Resolved

| Question                        | Resolution                             |
| ------------------------------- | -------------------------------------- |
| Husky vs native hooks?          | Native - already working, simpler      |
| commitlint vs custom?           | Custom - project rules non-standard    |
| How to type-check staged files? | Full project check via function syntax |
| How to detect weak assertions?  | Custom TypeScript AST analyzer         |
