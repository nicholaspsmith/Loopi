# Contracts: Pre-Commit Quality Hooks

This feature does not expose HTTP APIs. Git hooks are local command-line tools.

## CLI Contracts

### Pre-Commit Hook

**Trigger**: `git commit`
**Input**: Staged files (via git)
**Output**: Exit code 0 (success) or 1 (failure) with error messages

### Commit-Msg Hook

**Trigger**: `git commit` (after message entered)
**Input**: Commit message file path ($1)
**Output**: Exit code 0 (success) or 1 (failure) with validation errors

### Pre-Push Hook

**Trigger**: `git push`
**Input**: Remote name, URL, refs being pushed
**Output**: Exit code 0 (success) or 1 (failure) with test results

## Script Interfaces

### commit-msg-validator.ts

```typescript
// Input: path to commit message file
// Output: exit code + console output
function validateCommitMessage(messagePath: string): void

// Returns validation result for testing
function parseAndValidate(message: string): CommitValidationResult
```

### test-audit.ts

```typescript
// Input: list of test files to audit
// Output: exit code + console output
function auditTests(testFiles: string[], options: AuditOptions): void

interface AuditOptions {
  blockNewTests: boolean // Exit 1 for new tests with issues
  warnExisting: boolean // Just warn for existing tests
}
```

## npm Scripts (package.json)

```json
{
  "scripts": {
    "lint-staged": "lint-staged",
    "test:audit": "tsx scripts/hooks/test-audit.ts"
  }
}
```
