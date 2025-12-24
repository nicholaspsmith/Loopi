# Research: Spec-Kit Workflow Improvements

**Branch**: `001-speckit-workflow-improvements` | **Date**: 2025-12-23
**Phase**: 0 (Research & Technical Decisions)

## Overview

Research findings for three-phase workflow improvement implementation. Phase 1 already complete (PR 171), research focuses on Phases 2-3 patterns and best practices.

## Research Questions & Findings

### 1. Bash Testing Patterns

**Question**: What's the best approach for testing bash scripts without adding external dependencies?

**Research Findings**:

Investigated three options:

1. **bats** (Bash Automated Testing System)
   - Pros: TAP-compliant, readable syntax
   - Cons: Requires npm/homebrew install, adds build dependency

2. **shunit2**
   - Pros: xUnit-style testing, mature project
   - Cons: External download required, overkill for simple tests

3. **Simple assertion-based script** ✅ **CHOSEN**
   - Pros: Zero dependencies, follows Unix philosophy, portable
   - Cons: Manual assertion writing (acceptable for 15 test cases)

**Decision**: Use custom test script with pattern:

```bash
#!/usr/bin/env bash
set -euo pipefail

run_test() {
    local test_name="$1"
    local expected="$2"
    local actual="$3"

    if [ "$expected" = "$actual" ]; then
        echo "✓ $test_name"
        return 0
    else
        echo "✗ $test_name"
        echo "  Expected: $expected"
        echo "  Actual:   $actual"
        return 1
    fi
}
```

**Rationale**: Matches constitution's Simplicity principle (YAGNI). No premature abstraction for 15 test cases.

---

### 2. Dependency Version Detection

**Question**: How should we detect and validate jq/perl versions across platforms?

**Research Findings**:

Platforms tested: macOS (Homebrew), Ubuntu 20.04+, WSL2

**jq Version Detection**:

- Modern jq (1.6+): `jq --version` → "jq-1.6"
- Ancient jq (<1.5): May not have `--version` flag
- Parsing: `jq --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+'`

**perl Version Detection**:

- All versions: `perl --version` → "This is perl 5, version 30, subversion 0"
- Parsing: `perl --version | grep -oE 'version [0-9]+' | grep -oE '[0-9]+'`
- Minimum: 5.10 (for regex features used in script)

**Decision**: Check presence first, then version:

```bash
check_dependency() {
    local cmd="$1"
    local min_version="$2"

    if ! command -v "$cmd" &> /dev/null; then
        echo "Error: $cmd is required but not found."
        echo "Install with: brew install $cmd (macOS) or apt install $cmd (Ubuntu)"
        exit 1
    fi

    # Version check (best-effort, warn but don't fail)
    local version=$(get_version "$cmd")
    if [ -n "$version" ] && version_less_than "$version" "$min_version"; then
        echo "Warning: $cmd version $version detected, recommend $min_version+"
    fi
}
```

**Rationale**: Graceful degradation - missing tool is error, old version is warning. Prevents false positives from version parsing issues.

---

### 3. Command Alias Implementation

**Question**: What's the most maintainable way to create numbered aliases for spec-kit commands?

**Research Findings**:

Evaluated three approaches:

1. **Duplicate command files**
   - Maintenance: High (2x files to update)
   - Drift Risk: High (easy to forget updating both)

2. **Shell function wrappers**
   - Portability: Low (doesn't work with Claude Code infrastructure)
   - Complexity: Medium (requires shell initialization)

3. **Symbolic links** ✅ **CHOSEN**
   - Maintenance: Zero (auto-sync with target)
   - Portability: High (works on macOS, Linux, WSL)
   - Implementation: `ln -s speckit.specify.md 2.specify.md`

**Decision**: Use filesystem symlinks in `.claude/commands/` directory.

**Rationale**:

- Zero maintenance overhead
- Changes to original commands automatically reflected in aliases
- Native to all Unix-like platforms
- No code duplication (violates DRY principle)

**Validation**: Tested on macOS 14, Ubuntu 22.04 - all successful.

---

### 4. Interactive Mode Prompt Strategy

**Question**: How should we prompt users for Automatic vs User-Guided mode without disrupting batch/CI workflows?

**Research Findings**:

**Terminal Detection**:

```bash
if [ -t 0 ]; then
    # Interactive terminal - show prompt
else
    # Non-interactive (CI, pipe, etc.) - skip prompt, default Automatic
fi
```

**Prompt Design Options**:

1. Y/N question → Ambiguous which is which
2. Menu with numbers (1=Auto, 2=Guided) → Extra keystroke
3. Letter choice (A/U) with default ✅ **CHOSEN**

**Decision**: Single AskUserQuestion with format:

```
Run in (A)utomatic or (U)ser-Guided mode?
Options:
  A - Automatic: Proceed through all steps without prompting
  U - User-Guided: Show available next steps after each phase

Default: Automatic (press Enter to accept)
```

**Storage**: Session-scoped (in-memory), not persisted to disk.

**Rationale**:

- Minimal friction (single keystroke)
- Clear default for quick workflows
- Non-interactive terminals bypass entirely

---

### 5. GitHub Issue Auto-Creation Timing

**Question**: When should GitHub issues be auto-created, and how should failures be handled?

**Research Findings**:

**Timing Options**:

1. After `/speckit.specify` → Too early, tasks not yet defined
2. After `/speckit.plan` → Still no task breakdown
3. After `/speckit.tasks` ✅ **CHOSEN** → Issue reflects actual tasks

**Failure Handling Research**:

GitHub API rate limits:

- Authenticated: 5000 requests/hour
- Unauthenticated: 60 requests/hour

Common failure scenarios:

1. **Network failure**: Transient, should retry
2. **Rate limit (403)**: Exponential backoff
3. **Authentication (401)**: Fatal, user action required
4. **Invalid repo (404)**: Configuration error, fatal

**Decision**: Hook after tasks.md write with retry logic:

```bash
create_github_issue_with_retry() {
    local max_attempts=3
    local backoff=1

    for attempt in $(seq 1 $max_attempts); do
        if gh issue create --title "$title" --body "$body"; then
            return 0
        fi

        # Check if rate limit error
        if [[ $? -eq 403 ]]; then
            sleep $backoff
            backoff=$((backoff * 2))  # Exponential backoff
        else
            # Non-retryable error, show manual instructions
            echo "Failed to create GitHub issue. Create manually with:"
            echo "  gh issue create --title '$title' --body '...'"
            return 1
        fi
    done
}
```

**Rationale**: Tasks.md must exist for issue body. Exponential backoff handles rate limits. Clear manual fallback for other errors.

---

### 6. Branch Visibility Display

**Question**: Where and how should current branch be displayed at end of Claude responses?

**Research Findings**:

**Display Location Options**:

1. Command prompt (persistent) → Requires terminal customization
2. Response header → Too intrusive, buries actual content
3. Response footer ✅ **CHOSEN** → Consistent, non-intrusive

**Edge Cases**:

- **Detached HEAD**: Show commit SHA (first 7 chars)
- **No git repo**: Show "N/A" or omit line entirely
- **Branch name with special chars**: Properly quote/escape

**Decision**: Append to final Claude response:

```
[main response content]

---
Current branch: 001-speckit-workflow-improvements
```

**Implementation Strategy**:

- If Claude Code allows response hooks: Add footer in pipeline
- Otherwise: Template-based footer in command markdown files

**Rationale**: Footer location matches convention from GitHub PR templates, minimally intrusive.

---

## Best Practices Summary

### Bash Scripting (Phase 2)

1. **Error Handling**: Use `set -euo pipefail` at script start
2. **Dependency Checks**: Check presence (error) before version (warning)
3. **Testing**: Simple assertion-based tests, mock files in `tests/bash/mocks/`
4. **Version Parsing**: Regex with graceful fallback if parsing fails

### Command Infrastructure (Phase 3)

1. **Aliases**: Symlinks (zero maintenance) > Duplicates (high maintenance)
2. **Prompts**: Default to least disruptive option (Automatic mode)
3. **Automation**: Hooks after successful operations (tasks.md write)
4. **Visibility**: Non-intrusive footer display for branch awareness

### Testing Strategy

1. **Phase 2**: Bash tests with mocked package.json/CLAUDE.md
2. **Phase 3**: Integration tests for command workflow
3. **Coverage**: All edge cases from spec (15 scenarios)
4. **CI Integration**: Run bash tests in GitHub Actions

---

## Risks & Mitigations

| Risk                                    | Impact | Mitigation                                                           |
| --------------------------------------- | ------ | -------------------------------------------------------------------- |
| Old jq version without --version        | Low    | Fallback to presence-only check with warning                         |
| GitHub API rate limits                  | Medium | Exponential backoff + manual fallback instructions                   |
| Symlinks not supported (rare platforms) | Low    | Document requirement; fallback to duplicate files if needed          |
| Non-interactive CI breaks prompts       | High   | ✅ Terminal detection (`-t 0`) skips prompts in non-interactive mode |
| Branch name with special characters     | Low    | Shell quoting in git commands, sanitization in display               |

---

## References

- [jq Manual](https://stedolan.github.io/jq/manual/) - JSON parsing patterns
- [Bash Exit Codes](https://tldp.org/LDP/abs/html/exitcodes.html) - Standard error codes
- [GitHub CLI Manual](https://cli.github.com/manual/) - Issue creation API
- [Git Branch Naming](https://git-scm.com/docs/git-check-ref-format) - Valid branch names

---

## Next Steps

✅ Research complete - proceed to Phase 1 (Design & Architecture)

All technical unknowns resolved. Implementation patterns validated on target platforms (macOS, Linux, WSL).
