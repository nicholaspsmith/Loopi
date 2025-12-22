# Implementation Plan: Pre-Commit Quality Hooks

**Branch**: `008-pre-commit-hooks` | **Date**: 2025-12-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-pre-commit-hooks/spec.md`

## Summary

Implement comprehensive git hooks for code quality enforcement: pre-commit hooks for type checking, linting, formatting, and commit message validation; pre-push hooks for running unit/integration tests with test quality auditing. Extends existing native `.githooks/` directory with lint-staged for efficient staged-file-only validation (no Husky - see research.md).

## Technical Context

**Language/Version**: TypeScript 5.7, Node.js 20+, Bash (for hook scripts)
**Primary Dependencies**: lint-staged (staged file operations), eslint-plugin-vitest (test quality rules), custom commit-msg-validator.ts
**Storage**: N/A (hooks are stateless)
**Testing**: Vitest (unit), Vitest integration config (integration), Playwright (e2e - CI only)
**Target Platform**: Local development environment (macOS, Linux)
**Project Type**: Web application (Next.js)
**Performance Goals**: Pre-commit < 30 seconds, Pre-push < 5 minutes (per SC-003, SC-004)
**Constraints**: Must work with existing .githooks pattern, zero manual setup after npm install
**Scale/Scope**: Single developer workflow, ~27 existing test files

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle              | Status  | Notes                                                                         |
| ---------------------- | ------- | ----------------------------------------------------------------------------- |
| I. Documentation-First | ✅ PASS | Spec complete with 5 user stories, 17 FRs, 10 SCs                             |
| II. Test-First (TDD)   | ✅ PASS | Tests will be written for hook scripts and commit-msg parser                  |
| III. Modularity        | ✅ PASS | Separate hooks (pre-commit, commit-msg, pre-push), modular validation scripts |
| IV. Simplicity (YAGNI) | ✅ PASS | Using native .githooks + lint-staged vs Husky abstraction                     |
| V. Observability       | ✅ PASS | Clear error messages with actionable output (FR-005)                          |
| VI. Atomic Commits     | ✅ PASS | This feature enforces commit discipline via commit-msg hook                   |

**Gate Result**: ✅ PASS - No violations requiring justification

## Project Structure

### Documentation (this feature)

```text
specs/008-pre-commit-hooks/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (minimal - no APIs)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
.githooks/
├── pre-commit           # NEW: Run lint-staged for type check, lint, format
├── commit-msg           # NEW: Call commit-msg-validator.ts
└── pre-push             # EXISTING + MODIFY: Add test audit, run unit/integration tests

scripts/hooks/
├── test-audit.ts        # NEW: Analyze tests for meaningful assertions
└── commit-msg-validator.ts  # NEW: Validate against .claude/rules.md

.lintstagedrc.js         # NEW: lint-staged configuration (JS for function syntax)
eslint.config.mjs        # MODIFY: Add eslint-plugin-vitest rules
package.json             # MODIFY: Add prepare script, lint-staged dep
```

**Structure Decision**: Extend existing `.githooks/` pattern (no Husky). Add helper scripts under `scripts/hooks/` for complex validation logic. Hook scripts are bash calling TypeScript via tsx. See research.md for rationale.

## Core Implementation

### Phase 1: Setup & Pre-Commit Hook (US1 - P1)

1. **Install dependencies** - Add lint-staged, eslint-plugin-vitest to devDependencies
2. **Configure npm prepare script** - Auto-setup hooks on npm install (see research.md §1)
3. **Create .lintstagedrc.js** - Function syntax for tsc, ESLint, Prettier (see research.md §2)
4. **Create .githooks/pre-commit** - Bash script calling `npx lint-staged`
5. **Test pre-commit behavior** - Verify type errors, lint errors, format issues block commit

### Phase 2: Commit Message Validation (US4 - P2)

6. **Create commit-msg-validator.ts** - Validate subject length, imperative mood, body format (see research.md §3, data-model.md §2)
7. **Create .githooks/commit-msg** - Bash script calling tsx validator
8. **Write unit tests for validator** - Cover all validation rules from .claude/rules.md

### Phase 3: Pre-Push Hook (US2 - P2)

9. **Modify .githooks/pre-push** - Add test execution with retry logic (see data-model.md Push Flow)
10. **Implement test retry** - Retry failed tests once before blocking (FR-004a)
11. **Write integration tests** - Verify push blocked on test failure

### Phase 4: Test Audit (US3 - P3)

12. **Add eslint-plugin-vitest rules** - Configure expect-expect, valid-expect in eslint.config.mjs (see research.md §4)
13. **Create test-audit.ts** - Detect weak assertions, differentiate new vs existing tests (see data-model.md §3)
14. **Integrate into pre-push** - Run audit before tests, block new tests, warn existing
15. **Write tests for audit** - Verify detection of no-assertion and weak-assertion tests

### Phase 5: Fix Suggestions (US5 - P4)

16. **Design suggestion patterns** - Map common errors to fix suggestions (FR-008)
17. **Implement suggestion output** - Group errors by root cause (FR-012)

## Testing Strategy

**TDD Approach**: Write tests before implementation for all TypeScript scripts.

### Unit Tests (tests/unit/scripts/hooks/)

| Test File                    | Covers                                | Key Cases                                                    |
| ---------------------------- | ------------------------------------- | ------------------------------------------------------------ |
| commit-msg-validator.test.ts | scripts/hooks/commit-msg-validator.ts | Subject length, imperative mood, body format, AI attribution |
| test-audit.test.ts           | scripts/hooks/test-audit.ts           | No assertions, weak assertions, new vs existing detection    |

### Integration Tests (tests/integration/)

| Test File               | Covers               | Key Cases                                                  |
| ----------------------- | -------------------- | ---------------------------------------------------------- |
| pre-commit-hook.test.ts | .githooks/pre-commit | Type errors block, lint errors block, clean code passes    |
| commit-msg-hook.test.ts | .githooks/commit-msg | Invalid messages blocked, valid messages pass              |
| pre-push-hook.test.ts   | .githooks/pre-push   | Failing tests block, retry on flaky, passing tests proceed |

### Manual Verification

- Fresh clone → `npm install` → hooks auto-configured
- Attempt commit with type error → blocked with message
- Attempt push with failing test → blocked, retried, then blocked

## Complexity Tracking

> No violations requiring justification. Using native .githooks with lint-staged for simplicity over Husky abstraction. Custom commit validator preferred over commitlint due to non-standard project rules.
