# Implementation Plan: Spec-Kit Workflow Improvements

**Branch**: `001-speckit-workflow-improvements` | **Date**: 2025-12-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-speckit-workflow-improvements/spec.md`

**Note**: This plan covers 3 independent phases that can be implemented and merged separately.

## Summary

Improve developer experience with spec-kit workflow through three phases:

- **Phase 1 (P1)**: Simplify agent context script (799→160 lines), remove multi-agent support, sync package versions automatically
- **Phase 2 (P2)**: Enhance script quality with full semver, dependency validation, documentation, and testing
- **Phase 3 (P3)**: Add workflow UX improvements with numbered aliases, interactive modes, auto GitHub issues, branch visibility, and auto PRs

**Technical Approach**: Bash scripting enhancements (Phases 1-2) + Claude command infrastructure modifications (Phase 3). All phases can be developed, tested, and merged independently.

## Technical Context

**Language/Version**: Bash 4+ (for scripts), TypeScript/Node.js (for Claude command integration in Phase 3)
**Primary Dependencies**:

- **Phase 1-2**: jq (JSON parsing), perl (regex substitution)
- **Phase 3**: GitHub CLI (gh), git, existing Claude Code infrastructure

**Storage**: File-based (CLAUDE.md, package.json, .claude/commands/\*, specs directories)
**Testing**:

- **Phase 1**: Manual verification + existing test suite (478 tests)
- **Phase 2**: Bash test script with mock files
- **Phase 3**: Integration tests for command aliases and automation

**Target Platform**: macOS, Linux (developer environments with Bash)
**Project Type**: Workflow tooling (scripts + command infrastructure)
**Performance Goals**:

- **Phase 1-2**: Script execution <1 second for package version sync
- **Phase 3**: Interactive prompts respond instantly (<100ms)

**Constraints**:

- **Phase 1**: Must preserve existing CLAUDE.md structure and Feature Implementation Notes
- **Phase 2**: Backward compatible with Phase 1 script
- **Phase 3**: Backward compatible (original command names remain functional)

**Scale/Scope**:

- **Phase 1**: 16 tracked packages in CLAUDE.md
- **Phase 2**: Test coverage for 15 edge cases
- **Phase 3**: 10 spec-kit commands + 5 subcommands

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Documentation-First

✅ **PASS** - Complete specification exists with:

- 12 user stories with acceptance scenarios
- 28 functional requirements (7 P1, 8 P2, 13 P3)
- 15 measurable success criteria
- Phased approach documented

### Test-First Development (TDD)

✅ **PASS** - Test strategy defined:

- Phase 1: Tests already passing (PR 171 complete, 478 tests)
- Phase 2: Test tasks precede implementation (US7: Automated Script Testing)
- Phase 3: Integration tests for workflow automation

### Modularity & Composability

✅ **PASS** - Each phase independently testable:

- Phase 1 complete and merged without Phases 2-3
- Phase 2 enhances Phase 1 script without breaking existing functionality
- Phase 3 independent of Phase 2 (can run in parallel)

### Simplicity (YAGNI)

✅ **PASS** - No premature complexity:

- Phase 1: Removes 640 lines (80% reduction) by eliminating unused multi-agent code
- Phase 2: Adds only essential validation and testing
- Phase 3: Optional --validate flag (FR-013: SHOULD not MUST)
- No feature flags or speculative abstractions

### Observability & Debugging

✅ **PASS** - Logging and debugging included:

- FR-011: Platform-specific installation instructions in errors
- FR-012: Inline documentation for package list maintenance
- FR-006: [LanceDB] prefix pattern already established
- Edge cases documented for troubleshooting

### Atomic Commits & Version Control Discipline

✅ **PASS** - Commit discipline defined:

- Phase 1: Already merged with proper atomic commits
- Phase 2: Each enhancement (semver, validation, testing) = separate commits
- Phase 3: Each UX feature = independent commit
- All commits follow .claude/rules.md

**Constitution Compliance**: ✅ ALL GATES PASSED - Ready for Phase 0 research

## Project Structure

### Documentation (this feature)

```text
specs/001-speckit-workflow-improvements/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (bash patterns, testing approaches)
├── data-model.md        # Phase 1 output (entities: scripts, commands, configs)
├── quickstart.md        # Phase 1 output (developer onboarding)
├── contracts/           # Phase 1 output (script interfaces, command schemas)
│   ├── update-agent-context.contract.md
│   └── command-aliases.contract.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created yet)
```

### Source Code (repository root)

```text
# Workflow tooling structure (existing + new files)
.specify/
├── scripts/
│   └── bash/
│       ├── update-agent-context.sh       # Phase 1: Simplified (159 lines)
│       │                                 # Phase 2: Enhanced validation/testing
│       └── test-version-extraction.sh    # Phase 2: New test script
│
├── templates/
│   └── commands/                         # Phase 3: Command infrastructure
│       ├── 1.constitution.md             # Phase 3: Numbered alias
│       ├── 2.specify.md                  # Phase 3: Numbered alias
│       ├── 2.1.clarify.md                # Phase 3: Numbered alias
│       ├── 3.plan.md                     # Phase 3: Numbered alias
│       ├── 4.tasks.md                    # Phase 3: Numbered alias
│       └── 5.implement.md                # Phase 3: Numbered alias
│
└── memory/
    └── constitution.md                   # No changes needed

.claude/
├── commands/
│   ├── speckit.*.md                      # Phase 3: Updated with mode prompts
│   └── next.md                           # Phase 3: New /next command
│
└── rules.md                               # No changes needed

CLAUDE.md                                  # Phase 1: Updated structure
                                           # Phase 2: Enhanced version info

specs/
└── [feature-branches]/                    # Phase 3: Auto-create GitHub issues

tests/
└── bash/                                  # Phase 2: New directory
    ├── test-version-extraction.sh
    ├── mocks/
    │   ├── package.json                   # Test fixtures
    │   └── CLAUDE.md
    └── fixtures/                          # Expected outputs
```

**Structure Decision**: Hybrid structure - existing workflow tooling enhanced in place. Phase 1 modifies existing script, Phase 2 adds testing infrastructure, Phase 3 extends command system with backward-compatible aliases.

## Complexity Tracking

No violations - all complexity justified by current requirements:

| Potential Concern                        | Justification                                                                                  | Simplicity Check                              |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Three independent phases                 | User requirement (Issues 171, 184, 172 merged); enables incremental delivery                   | ✅ Each phase delivers standalone value       |
| Numbered + original command names        | Backward compatibility (FR-017); eases transition for existing users                           | ✅ Aliases point to same implementation       |
| Automatic + User-Guided workflow modes   | User requirement (Issue 172); balances automation with learning                                | ✅ Simple mode flag, no state machine         |
| Multiple sync points (jq, perl, gh, git) | Existing dependencies; jq/perl already in use (Phase 1), gh already used in workflow (Phase 3) | ✅ No new external dependencies introduced    |
| Test infrastructure (Phase 2)            | Constitution requirement (TDD); prevents regressions during script enhancement                 | ✅ Minimal bash test harness, mock files only |
| Validation flag --validate (Phase 2)     | Optional (SHOULD not MUST in FR-013); helps maintainers detect drift                           | ✅ Opt-in feature, graceful degradation       |

**Complexity Verdict**: ✅ All complexity necessary and proportional to requirements

---

## Phase 0: Research & Technical Decisions

**Goal**: Resolve unknowns from Technical Context and research best practices

### Research Tasks

All technical context is clear - Phase 1 already implemented (PR 171). Research focuses on Phase 2-3 implementation patterns:

1. **Bash Testing Patterns**
   - **Decision**: Use simple assertion-based test script with exit codes
   - **Rationale**: Lightweight, no external test framework needed; follows Unix philosophy
   - **Alternatives Considered**:
     - bats (Bash Automated Testing System): Rejected - adds dependency
     - shunit2: Rejected - overkill for 15 test cases
   - **Pattern**: `test-version-extraction.sh` with functions per test case, compare actual vs expected output

2. **Dependency Version Detection**
   - **Decision**: Check tool availability with `command -v`, version with `--version` parsing
   - **Rationale**: Standard Unix approach; works across all platforms
   - **Implementation**:
     - jq: `jq --version | grep -oE '[0-9]+\.[0-9]+'` → require 1.6+
     - perl: `perl --version | grep -oE 'v[0-9]+\.[0-9]+'` → require 5.10+
   - **Edge Case**: Old jq versions may not have `--version`; fallback to presence check only

3. **Command Alias Implementation**
   - **Decision**: Symbolic links in `.claude/commands/` pointing to original commands
   - **Rationale**: Zero duplication, automatic sync with original command updates
   - **Alternatives Considered**:
     - Duplicate command files: Rejected - maintenance burden
     - Shell aliases: Rejected - not portable to Claude Code infrastructure
   - **Pattern**: `1.constitution.md` → symlink to `speckit.constitution.md`

4. **Interactive Mode Prompt Strategy**
   - **Decision**: Single AskUserQuestion at command start with 2 options (Automatic/User-Guided)
   - **Rationale**: Minimal friction; clear binary choice
   - **Storage**: Store mode preference in memory for session (not persisted)
   - **Edge Case**: Batch/CI environments → detect non-interactive terminal, default to Automatic

5. **GitHub Issue Auto-Creation Timing**
   - **Decision**: Hook into `/speckit.tasks` command after successful tasks.md write
   - **Rationale**: Ensures issue reflects actual generated tasks; aligns with FR-022
   - **Failure Handling**: If gh command fails, display error with manual issue creation instructions
   - **Retry Strategy**: Exponential backoff (1s, 2s, 4s) for rate limit errors only

6. **Branch Visibility Display**
   - **Decision**: Append "Current branch: <name>" to final message in response formatter
   - **Rationale**: Minimal intrusion; consistent location
   - **Implementation**: Hook into Claude Code response pipeline (if accessible) or template footer
   - **Edge Case**: Detached HEAD state → show commit SHA instead

**Research Output**: See [research.md](./research.md) for detailed findings

---

## Phase 1: Design & Architecture

**Prerequisites**: Phase 0 research complete ✅

### Data Model

See [data-model.md](./data-model.md) for entity details:

**Core Entities**:

1. **Package Version Entry** - Extracted from package.json, synced to CLAUDE.md
2. **Feature Branch** - Git branch with matching spec directory
3. **Spec-Kit Command** - Workflow command with numbered alias
4. **GitHub Issue** - Auto-generated tracking issue
5. **Workflow Mode** - Session-scoped execution mode (Automatic/User-Guided)

**Entity Relationships**:

- Package Version Entry (1) → Technology Stack Section (1) in CLAUDE.md
- Feature Branch (1) → Spec Directory (1) → GitHub Issue (0..1) → PR (0..1)
- Spec-Kit Command (1) → Numbered Alias (1) [bijection]
- Workflow Mode (1) → Command Invocation (N) [session-scoped]

### API Contracts

See [contracts/](./contracts/) for interface specifications:

**Script Interfaces** (Phase 1-2):

- `update-agent-context.sh` - Package version synchronization
  - Input: package.json (JSON), CLAUDE.md (Markdown)
  - Output: Updated CLAUDE.md with synced versions
  - Exit Codes: 0 (success), 1 (missing deps), 2 (invalid JSON)

**Command Interfaces** (Phase 3):

- Numbered aliases (`/1.constitution`, `/2.specify`, etc.)
  - Behavior: Identical to original commands
  - Mode Prompt: Yes/No question for Automatic vs User-Guided
- `/next` command
  - Input: Current workflow state (file existence checks)
  - Output: Recommended next command invocation

### Architecture Decisions

**Phase 1 Architecture** (Already Implemented):

- **Pattern**: Bash script with jq for JSON parsing, perl for regex substitution
- **State**: Stateless - reads files, writes updates, exits
- **Error Handling**: Graceful degradation (skip missing packages), no partial updates

**Phase 2 Architecture** (Script Enhancements):

- **Testing**: Separate test script that mocks package.json/CLAUDE.md
- **Validation**: Optional --validate flag triggers package list diff
- **Versioning**: Full semver preserved (regex: `[0-9]+\.[0-9]+\.[0-9]+(-[a-z0-9.]+)?`)

**Phase 3 Architecture** (Workflow UX):

- **Aliases**: Filesystem symlinks (portable, zero maintenance)
- **Mode Prompt**: Conditional AskUserQuestion (skip if non-interactive terminal)
- **Auto-Issues**: Post-hook after tasks.md write (using GitHub CLI)
- **Branch Display**: Response template footer modification

### Quickstart Guide

See [quickstart.md](./quickstart.md) for step-by-step testing scenarios covering:

- **Phase 1**: Package version sync verification
- **Phase 2**: Script validation and testing
- **Phase 3**: Command alias usage and workflow automation

---

## Phase 2: Task Breakdown

**Note**: This phase is completed by the `/speckit.tasks` command. See [tasks.md](./tasks.md) after running `/speckit.tasks`.

The task breakdown will organize work by user story priority:

- **P1 Tasks** (Phase 1): Already complete - merged from PR 171
- **P2 Tasks** (Phase 2): Script enhancements (US4-US7)
- **P3 Tasks** (Phase 3): Workflow UX improvements (US8-US12)

---

## Agent Context Update

Script already run as part of PR 171 merge. CLAUDE.md updated with:

- Feature-Specific Context section (directs to branch-matching specs/)
- Consolidated Technology Stack (Core, Styling, Database, AI/ML, etc.)
- Feature Implementation Notes preserved

No further agent context updates needed for planning phase.

---

## Implementation Readiness

✅ **Phase 0 (Research)**: Complete - technical decisions documented
✅ **Phase 1 (Design)**: Complete - architecture and contracts defined
⏭️ **Next Step**: Run `/speckit.tasks` to generate task breakdown

**Recommendation**: Proceed to task generation. All design decisions are clear, entity model is defined, and testing strategy is established for all three phases.
