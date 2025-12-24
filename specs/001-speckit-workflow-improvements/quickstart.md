# Quickstart Guide: Spec-Kit Workflow Improvements

**Branch**: `001-speckit-workflow-improvements` | **Date**: 2025-12-23
**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Overview

This quickstart guide provides step-by-step testing scenarios for all three phases of the spec-kit workflow improvements. Use these scenarios to verify implementation correctness and explore new features.

---

## Prerequisites

### Required Tools

| Tool   | Minimum Version | Check Command        | Install Command (macOS) |
| ------ | --------------- | -------------------- | ----------------------- |
| `bash` | 4.0             | `echo $BASH_VERSION` | Pre-installed           |
| `jq`   | 1.6             | `jq --version`       | `brew install jq`       |
| `perl` | 5.10            | `perl --version`     | Pre-installed           |
| `git`  | 2.0+            | `git --version`      | `brew install git`      |
| `gh`   | 2.0+ (Phase 3)  | `gh --version`       | `brew install gh`       |

### Environment Setup

```bash
# Clone repository (if not already done)
git clone https://github.com/nicholaspsmith/memoryloop.git
cd memoryloop

# Checkout feature branch
git checkout 001-speckit-workflow-improvements

# Verify you're in the correct directory
pwd  # Should end with /memoryloop
```

---

## Phase 1: Package Version Synchronization

**Goal**: Verify that package versions are correctly synced from package.json to CLAUDE.md

### Scenario 1.1: Basic Version Sync

**Purpose**: Test standard package version update

**Steps**:

```bash
# 1. Check current state
cat CLAUDE.md | grep -E "TypeScript|Next.js|React"

# Example output:
# - TypeScript 5.6 (strict mode) + Next.js 15.2 App Router, React 19.1.3

# 2. Update package versions in package.json (simulate upgrade)
# Edit package.json manually or via npm:
npm install typescript@5.7.2 --save-dev

# 3. Run sync script
./.specify/scripts/bash/update-agent-context.sh

# Expected output:
# INFO: === Syncing package versions to CLAUDE.md ===
# INFO: Reading versions from package.json
# INFO: Updated TypeScript to 5.7
# ✓ Updated CLAUDE.md with 1 package version(s)
# ✓ Package version sync completed

# 4. Verify update
cat CLAUDE.md | grep "TypeScript"

# Expected: - TypeScript 5.7 (strict mode) + ...
```

**Success Criteria**:

- ✅ Script exits with code 0
- ✅ CLAUDE.md shows updated version (5.7)
- ✅ Surrounding context preserved ("strict mode" text unchanged)
- ✅ Other package versions unchanged

---

### Scenario 1.2: Parenthetical Version Update

**Purpose**: Test packages with versions in parentheses (e.g., PostgreSQL)

**Steps**:

```bash
# 1. Check current state
cat CLAUDE.md | grep "PostgreSQL"

# Example: - PostgreSQL (via postgres 3.3, drizzle-orm 0.44)

# 2. Update postgres package
npm install postgres@3.4.4

# 3. Run sync script
./.specify/scripts/bash/update-agent-context.sh

# Expected output:
# INFO: Updated postgres to 3.4
# ✓ Updated CLAUDE.md with 1 package version(s)

# 4. Verify update
cat CLAUDE.md | grep "postgres"

# Expected: - PostgreSQL (via postgres 3.4, drizzle-orm 0.44)
```

**Success Criteria**:

- ✅ Only `postgres` version updated (3.3 → 3.4)
- ✅ `drizzle-orm` version unchanged
- ✅ Parenthetical format preserved

---

### Scenario 1.3: No Changes Needed

**Purpose**: Test idempotency (script should not modify file if already current)

**Steps**:

```bash
# 1. Run sync script twice
./.specify/scripts/bash/update-agent-context.sh

# First run output:
# ✓ Updated CLAUDE.md with 14 package version(s)

# 2. Run again immediately (no package.json changes)
./.specify/scripts/bash/update-agent-context.sh

# Second run output:
# INFO: No version updates needed - CLAUDE.md is already current
```

**Success Criteria**:

- ✅ First run updates file
- ✅ Second run detects no changes needed
- ✅ CLAUDE.md file timestamp unchanged on second run
- ✅ No spurious diff output

---

### Scenario 1.4: Missing Dependency (jq)

**Purpose**: Test error handling when required tool is missing

**Steps**:

```bash
# 1. Temporarily hide jq from PATH
alias jq='/nonexistent/path/jq'

# 2. Run sync script
./.specify/scripts/bash/update-agent-context.sh

# Expected output:
# ERROR: jq is required but not found.
# Install with: brew install jq (macOS) or apt install jq (Ubuntu)

# Exit code: 1

# 3. Restore jq
unalias jq
```

**Success Criteria**:

- ✅ Script exits with code 1
- ✅ Clear error message displayed
- ✅ Installation instructions provided
- ✅ CLAUDE.md file unchanged

---

## Phase 2: Script Enhancements

**Goal**: Test full semver support, validation, and enhanced error handling

### Scenario 2.1: Full Semver Preservation

**Purpose**: Verify patch versions and pre-release tags are preserved

**Steps**:

```bash
# 1. Edit package.json to include pre-release version
# Change: "@lancedb/lancedb": "^0.22.1"
# To:     "@lancedb/lancedb": "^0.22.1-beta.2"

# 2. Run sync script
./.specify/scripts/bash/update-agent-context.sh

# 3. Verify full version in CLAUDE.md
cat CLAUDE.md | grep "LanceDB"

# Expected: - LanceDB 0.22.1-beta.2 (file-based vector database)
```

**Success Criteria**:

- ✅ Full semver preserved: `0.22.1-beta.2` (not truncated to `0.22`)
- ✅ Pre-release tag included: `-beta.2`
- ✅ npm prefix stripped: `^` removed

---

### Scenario 2.2: Validation Mode (Drift Detection)

**Purpose**: Test --validate flag for detecting version mismatches

**Steps**:

```bash
# 1. Manually edit CLAUDE.md to create drift
# Change: - Next.js 16.0 App Router
# To:     - Next.js 15.2 App Router

# 2. Run validation (package.json still has 16.0.10)
./.specify/scripts/bash/update-agent-context.sh --validate

# Expected output:
# INFO: === Validating package versions ===
# Package version mismatches detected:
#
#   Package: Next.js
#     package.json: 16.0
#     CLAUDE.md:    15.2
#
# Found 1 mismatch. Run without --validate to sync.

# Exit code: 4

# 3. Run sync to fix
./.specify/scripts/bash/update-agent-context.sh

# 4. Verify no drift remains
./.specify/scripts/bash/update-agent-context.sh --validate

# Expected output:
# INFO: === Validating package versions ===
# ✓ All package versions match
```

**Success Criteria**:

- ✅ Validation detects mismatch
- ✅ Exit code 4 on validation failure
- ✅ Clear diff displayed (package.json vs CLAUDE.md)
- ✅ Sync command fixes drift
- ✅ Subsequent validation passes

---

### Scenario 2.3: Dependency Version Warning

**Purpose**: Test graceful handling of old tool versions

**Steps**:

```bash
# 1. (Simulate old jq version - requires manual setup or Docker)
# For testing purposes, assume jq 1.5 is installed

# 2. Run sync script
./.specify/scripts/bash/update-agent-context.sh

# Expected output:
# WARNING: jq version 1.5 detected, recommend 1.6+
# INFO: Reading versions from package.json
# ✓ Updated CLAUDE.md with 14 package version(s)

# Exit code: 0 (warning only, not fatal)
```

**Success Criteria**:

- ✅ Warning displayed about old version
- ✅ Script continues execution (non-blocking)
- ✅ Sync completes successfully
- ✅ Exit code 0 (success despite warning)

---

### Scenario 2.4: Help Documentation

**Purpose**: Test --help flag and inline documentation

**Steps**:

```bash
# 1. Display help
./.specify/scripts/bash/update-agent-context.sh --help

# Expected output:
# Usage: ./update-agent-context.sh [OPTIONS]
#
# Sync package versions from package.json to CLAUDE.md Technology Stack
#
# Options:
#   --validate    Validate versions without updating
#   --help        Display this help message
#
# Tracked Packages:
#   TypeScript, Next.js, React, Tailwind CSS, LanceDB, ...
#
# Adding New Packages:
#   Edit the script and add a line to update_claude_md():
#     update_version "$temp_file" "Display Name" "package-name"
#
# For more details, see: specs/001-speckit-workflow-improvements/contracts/

# Exit code: 0
```

**Success Criteria**:

- ✅ Help text displayed
- ✅ Usage syntax clear
- ✅ Tracked packages listed
- ✅ Instructions for adding packages included
- ✅ Exit code 0

---

### Scenario 2.5: Automated Testing

**Purpose**: Run bash test suite to verify edge cases

**Steps**:

```bash
# 1. Navigate to test directory
cd tests/bash

# 2. Run test script
./test-version-extraction.sh

# Expected output:
# ✓ Test 1: Valid package.json extraction
# ✓ Test 2: npm prefix stripping (^, ~, >=)
# ✓ Test 3: Full semver preservation
# ✓ Test 4: Pre-release tag handling
# ✓ Test 5: Missing package graceful skip
# ✓ Test 6: Invalid JSON error handling
# ✓ Test 7: Missing jq dependency error
# ✓ Test 8: Idempotency (no changes needed)
# ✓ Test 9: Parenthetical version update
# ✓ Test 10: Special characters in display name
#
# All 10 tests passed!

# Exit code: 0 (all tests pass)
```

**Success Criteria**:

- ✅ All test cases pass
- ✅ Mock files used (no modification to real package.json/CLAUDE.md)
- ✅ Edge cases covered (invalid JSON, missing deps, etc.)
- ✅ Exit code 0 on success, non-zero on failure

---

## Phase 3: Workflow UX Improvements

**Goal**: Test numbered aliases, workflow modes, GitHub automation, and branch visibility

### Scenario 3.1: Numbered Command Aliases

**Purpose**: Verify numbered aliases work identically to original commands

**Steps**:

```bash
# 1. Create new feature using original command
/speckit.specify "Test numbered aliases"

# Expected: Creates branch 005-test-numbered-aliases, specs/005-test-numbered-aliases/

# 2. Switch to new branch
git checkout 005-test-numbered-aliases

# 3. Use numbered alias for planning
/3.plan

# Expected: Identical behavior to /speckit.plan

# 4. Verify symlink structure
ls -la .claude/commands/ | grep "3.plan"

# Expected: 3.plan.md -> speckit.plan.md (symlink)
```

**Success Criteria**:

- ✅ `/3.plan` produces identical output to `/speckit.plan`
- ✅ Numbered alias is a symlink (not a copy)
- ✅ Original command still functional
- ✅ Both forms accept same arguments

---

### Scenario 3.2: Automatic Workflow Mode

**Purpose**: Test automatic mode (no prompts between commands)

**Steps**:

```bash
# 1. Start new feature
/2.specify "Test automatic mode"

# Prompt appears:
# Run in (A)utomatic or (U)ser-Guided mode?
# Options:
#   A - Automatic: Proceed through all steps without prompting
#   U - User-Guided: Show available next steps after each phase
#
# Default: Automatic (press Enter to accept)

# 2. Select Automatic (press A or Enter)
[User presses A]

# 3. Specification completes
# Expected output:
# ✓ Specification created: specs/006-test-automatic-mode/spec.md
# ✓ All quality checks passed
#
# Next step: /3.plan - Create implementation plan

# 4. Invoke planning
/3.plan

# Expected: No mode prompt (inherited from session)
# Plan executes immediately
```

**Success Criteria**:

- ✅ Mode prompted once at session start
- ✅ Mode persists across commands in session
- ✅ No intermediate prompts between commands
- ✅ Handoffs suggested (not blocking)

---

### Scenario 3.3: User-Guided Workflow Mode

**Purpose**: Test user-guided mode (pause after each command)

**Steps**:

```bash
# 1. Start new feature
/2.specify "Test user-guided mode"

# Prompt appears:
# Run in (A)utomatic or (U)ser-Guided mode?

# 2. Select User-Guided (press U)
[User presses U]

# 3. Specification completes
# Expected output:
# ✓ Specification created: specs/007-test-user-guided-mode/spec.md
# ✓ All quality checks passed
#
# Available next steps:
#
#   A. /2.1.clarify - Resolve ambiguities in the specification
#      Use if: Spec has [NEEDS CLARIFICATION] markers or vague requirements
#
#   B. /3.plan - Create implementation plan
#      Use if: Spec is clear and ready for design phase
#
#   C. Exit - Review specification manually first
#
# What would you like to do next?

# 4. User reviews options and invokes command manually
/3.plan

# Expected: Mode inherited, handoffs displayed again after plan completes
```

**Success Criteria**:

- ✅ Mode prompted once at session start
- ✅ Pause after each command with handoff options
- ✅ "Use if" guidance provided for each option
- ✅ User controls workflow pace (manual invocation)

---

### Scenario 3.4: Non-Interactive Mode (CI/Batch)

**Purpose**: Test automatic default for non-interactive terminals

**Steps**:

```bash
# 1. Run command in non-interactive mode (pipe)
echo "/2.specify 'Test CI mode'" | claude-code

# Expected: No mode prompt, defaults to Automatic
# Specification created without user input

# 2. Verify behavior in script
cat > test-ci-mode.sh <<'EOF'
#!/bin/bash
set -e

# Simulate CI environment (non-interactive)
if [ -t 0 ]; then
    echo "ERROR: This test requires non-interactive mode"
    exit 1
fi

# Invoke spec-kit command
/2.specify "CI test feature"

# Expected: Auto-selects Automatic mode, no prompts
EOF

chmod +x test-ci-mode.sh
cat test-ci-mode.sh | bash

# 3. Verify mode was set to Automatic (check logs or output)
```

**Success Criteria**:

- ✅ Non-interactive terminal detected (`-t 0` check)
- ✅ Mode defaults to Automatic (no prompt)
- ✅ Workflow completes without user interaction
- ✅ Exit code 0 on success

---

### Scenario 3.5: GitHub Issue Auto-Creation

**Purpose**: Test automatic issue creation after `/speckit.tasks`

**Prerequisites**:

```bash
# Ensure GitHub CLI is authenticated
gh auth status

# If not authenticated:
gh auth login
```

**Steps**:

```bash
# 1. Create feature through full workflow
/2.specify "Test GitHub issue creation"
/3.plan
/4.tasks

# After /4.tasks completes:
# Expected output:
# ✓ Generated task breakdown: specs/008-test-github-issue/tasks.md
# ✓ GitHub issue created: #42
#    https://github.com/nicholaspsmith/memoryloop/issues/42
#
# Next step: /5.implement - Execute implementation tasks

# 2. Verify issue on GitHub
gh issue view 42

# Expected output:
# [008] Test GitHub Issue Creation
#
# ## Tasks
#
# - [ ] Task 1: Description
# - [ ] Task 2: Description
# ...
#
# ## Specification
# [View spec.md](specs/008-test-github-issue/spec.md)
#
# ---
# *Auto-generated from /speckit.tasks command*

# 3. Verify issue link clickable in browser
open https://github.com/nicholaspsmith/memoryloop/issues/42
```

**Success Criteria**:

- ✅ Issue created automatically after `/4.tasks`
- ✅ Issue title format: `[NNN] Feature Name`
- ✅ Issue body contains task checklist
- ✅ Issue includes links to spec.md and plan.md
- ✅ Issue number displayed in output

---

### Scenario 3.6: GitHub Issue Retry Logic

**Purpose**: Test exponential backoff on rate limit errors

**Setup** (requires rate limit simulation):

```bash
# Simulate rate limit by rapid-fire issue creation
for i in {1..10}; do
    /4.tasks  # Invoke on different features
done

# After ~5 requests, expect rate limit (403)
```

**Expected Behavior**:

```text
✓ Generated task breakdown: specs/009-feature/tasks.md
WARNING: Rate limit hit, retrying in 1s...
WARNING: Rate limit hit, retrying in 2s...
✓ GitHub issue created: #43 (after retry)
```

**Success Criteria**:

- ✅ First attempt fails with 403
- ✅ Retry after 1s delay
- ✅ Second retry after 2s delay (exponential backoff)
- ✅ Issue created on successful retry
- ✅ Max 3 attempts before fallback

---

### Scenario 3.7: GitHub Issue Manual Fallback

**Purpose**: Test manual instructions when auto-creation fails

**Setup**:

```bash
# Simulate auth failure (logout from gh)
gh auth logout

# Run tasks command
/4.tasks
```

**Expected Output**:

```text
✓ Generated task breakdown: specs/010-feature/tasks.md
ERROR: GitHub authentication failed. Run: gh auth login

Failed to create GitHub issue. Create manually with:
  gh issue create --title '[010] Feature Name' --body '...'

Or create via GitHub web UI:
  Title: [010] Feature Name
  Body: [see tasks.md for checklist]

Next step: /5.implement - Execute implementation tasks
```

**Success Criteria**:

- ✅ Error classified as fatal (401 unauthorized)
- ✅ Clear instructions for manual creation
- ✅ Workflow continues (non-blocking)
- ✅ Exit code 0 (workflow success despite issue failure)

---

### Scenario 3.8: Branch Visibility Display

**Purpose**: Test current branch display in response footer

**Steps**:

```bash
# 1. Run any spec-kit command
/3.plan

# Expected output footer:
# ✓ Plan created: specs/008-test-github-issue/plan.md
#
# Next step: /4.tasks
#
# ---
# Current branch: 008-test-github-issue

# 2. Test detached HEAD state
git checkout HEAD~1  # Detach HEAD

# 3. Run command again
/next

# Expected footer:
# ---
# Current branch: (detached) a3f2b1c

# 4. Return to branch
git checkout 008-test-github-issue
```

**Success Criteria**:

- ✅ Branch name displayed in footer
- ✅ Separator line (`---`) before branch
- ✅ Detached HEAD shows commit SHA
- ✅ Branch name updated per command (not cached)

---

### Scenario 3.9: /next Command

**Purpose**: Test workflow state detection and next step suggestion

**Steps**:

```bash
# 1. Start fresh feature
/2.specify "Test next command"

# 2. Invoke /next command
/next

# Expected output:
# Current branch: 011-test-next-command
# Current phase: Specification
#
# Suggested next step: /3.plan - Create implementation plan
#
# Available commands:
#   /3.plan - Create implementation plan from specification
#   /2.1.clarify - Review and refine specification
#   /2.specify - Update specification

# 3. Complete planning
/3.plan

# 4. Invoke /next again
/next

# Expected output:
# Current branch: 011-test-next-command
# Current phase: Planning
#
# Suggested next step: /4.tasks - Generate task breakdown
#
# Available commands:
#   /4.tasks - Generate task breakdown from implementation plan
#   /3.1.validate - Validate plan completeness before generating tasks

# 5. Complete tasks
/4.tasks

# 6. Invoke /next
/next

# Expected output:
# Current branch: 011-test-next-command
# Current phase: Implementation
#
# Suggested next step: /5.implement (12 tasks remaining)
```

**Success Criteria**:

- ✅ Detects current workflow phase correctly
- ✅ Suggests exactly one "next step"
- ✅ Displays 2-4 alternative commands
- ✅ Shows progress metrics (task count)
- ✅ Updates suggestion as workflow progresses

---

## Integration Testing

### End-to-End Workflow Test

**Purpose**: Test complete feature workflow using all three phases

**Steps**:

```bash
# Phase 1: Create and sync dependencies
npm install @new/package@1.0.0
./.specify/scripts/bash/update-agent-context.sh

# Verify: CLAUDE.md shows new package version

# Phase 2: Validate and test
./.specify/scripts/bash/update-agent-context.sh --validate
cd tests/bash && ./test-version-extraction.sh && cd ../..

# Verify: All tests pass

# Phase 3: Full workflow with automation
/2.specify "End-to-end integration test"  # Select Automatic mode
/3.plan
/4.tasks  # Auto-creates GitHub issue
/next     # Shows next step: /5.implement

# Verify:
gh issue list | grep "integration-test"  # Issue exists
cat specs/*/spec.md | grep "End-to-end"  # Spec created
cat specs/*/plan.md | grep "Phase 2"     # Plan created
cat specs/*/tasks.md | grep "Task 1"     # Tasks created

# Check branch visibility in output
# Expected footer: Current branch: 012-end-to-end-integration-test
```

**Success Criteria**:

- ✅ All three phases work together seamlessly
- ✅ Package sync completes (Phase 1)
- ✅ Validation passes (Phase 2)
- ✅ Workflow automation works (Phase 3)
- ✅ GitHub issue created automatically
- ✅ Branch visibility displayed throughout

---

## Troubleshooting

### Common Issues

#### Issue: "jq: command not found"

**Solution**:

```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt install jq

# Verify installation
jq --version
```

---

#### Issue: "GitHub authentication required"

**Solution**:

```bash
# Authenticate with GitHub CLI
gh auth login

# Select: GitHub.com
# Auth method: Browser or Token
# Scopes: repo (required for issue creation)

# Verify authentication
gh auth status
```

---

#### Issue: "Version mismatch persists after sync"

**Diagnosis**:

```bash
# Check for manual edits to CLAUDE.md
git diff CLAUDE.md

# Verify package.json has expected version
jq '.dependencies["package-name"]' package.json

# Check display name matches script
grep "Display Name" .specify/scripts/bash/update-agent-context.sh
```

**Solution**:

- Ensure display name in CLAUDE.md matches tracked name in script
- Verify no typos in package name
- Run sync with fresh package.json state

---

#### Issue: "Numbered alias not found"

**Diagnosis**:

```bash
# Check if symlink exists
ls -la .claude/commands/ | grep "2.specify"

# Expected: 2.specify.md -> speckit.specify.md

# Verify target exists
ls -la .claude/commands/speckit.specify.md
```

**Solution**:

```bash
# Recreate symlink
cd .claude/commands
ln -sf speckit.specify.md 2.specify.md
```

---

## Performance Benchmarks

### Phase 1: Package Sync Performance

```bash
# Benchmark script execution time
time ./.specify/scripts/bash/update-agent-context.sh

# Target: < 1 second for 16 packages
# Typical: ~300-500ms
```

### Phase 3: GitHub Issue Creation Performance

```bash
# Benchmark issue creation (including network)
time gh issue create --title "Test" --body "Test"

# Target: < 3 seconds
# Typical: 1-2 seconds (depends on network)
```

---

## Validation Checklist

Use this checklist after implementing and testing each phase:

### Phase 1 Validation

- [ ] Package versions sync correctly from package.json to CLAUDE.md
- [ ] Parenthetical versions update independently
- [ ] Script is idempotent (no changes when versions match)
- [ ] Missing dependency errors are clear and actionable
- [ ] Surrounding context in CLAUDE.md preserved

### Phase 2 Validation

- [ ] Full semver (major.minor.patch) preserved
- [ ] Pre-release tags (e.g., -beta.2) preserved
- [ ] `--validate` flag detects mismatches correctly
- [ ] Old tool versions produce warnings (not errors)
- [ ] `--help` flag displays comprehensive documentation
- [ ] All bash tests pass (10/10)

### Phase 3 Validation

- [ ] Numbered aliases work identically to original commands
- [ ] Automatic workflow mode skips intermediate prompts
- [ ] User-Guided mode pauses with handoff options
- [ ] Non-interactive terminals default to Automatic mode
- [ ] GitHub issues created automatically after `/4.tasks`
- [ ] Retry logic handles rate limits with exponential backoff
- [ ] Manual fallback instructions displayed on fatal errors
- [ ] Branch visibility shown in response footer
- [ ] `/next` command suggests correct next step

---

## Next Steps

After completing quickstart scenarios:

1. **Review Implementation**: Compare actual behavior against contracts in `contracts/` directory
2. **Run Full Test Suite**: Execute all bash tests + integration tests
3. **Submit for Review**: Create PR with test results and performance metrics
4. **Update Documentation**: Reflect any behavioral changes discovered during testing

**Ready for Production**: All validation checkboxes ✅ and performance targets met

---

## Additional Resources

- [Feature Specification](./spec.md) - User stories and requirements
- [Implementation Plan](./plan.md) - Architecture and design decisions
- [Data Model](./data-model.md) - Entity definitions and relationships
- [Script Contract](./contracts/update-agent-context.contract.md) - Phase 1-2 interface
- [Command Contract](./contracts/command-aliases.contract.md) - Phase 3 interface
- [Research Findings](./research.md) - Technical decisions and alternatives
