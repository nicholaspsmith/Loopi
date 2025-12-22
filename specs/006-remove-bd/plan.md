# Implementation Plan: Remove Beads (bd) Integration

**Branch**: `006-remove-bd` | **Date**: 2025-12-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-remove-bd/spec.md`

## Summary

Remove the beads (bd) task tracking tool from the project, consolidating all task management to use `specs/[feature]/tasks.md` files with markdown checkboxes. This involves uninstalling the bd package, removing the .beads directory, and updating the `speckit.taskstoissues.md` command to reference only GitHub Issues and tasks.md.

## Technical Context

**Language/Version**: TypeScript/Node.js (existing project)
**Primary Dependencies**: N/A (removing a dependency, not adding)
**Storage**: N/A (file system operations only)
**Testing**: Manual verification (grep for references, check package.json)
**Target Platform**: Development tooling (cross-platform)
**Project Type**: Web application (Next.js)
**Performance Goals**: N/A (no runtime impact)
**Constraints**: N/A
**Scale/Scope**: Small cleanup task affecting ~2 files

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle              | Status | Notes                                                   |
| ---------------------- | ------ | ------------------------------------------------------- |
| I. Documentation-First | PASS   | Spec complete with user stories and acceptance criteria |
| II. Test-First (TDD)   | N/A    | No runtime code; verification via grep/inspection       |
| III. Modularity        | PASS   | Isolated change to tooling configuration                |
| IV. Simplicity (YAGNI) | PASS   | Removing complexity, not adding                         |
| V. Observability       | N/A    | No runtime behavior                                     |
| VI. Atomic Commits     | PASS   | Will follow .claude/rules.md                            |

**Gate Status**: PASS - No violations. Proceed to implementation.

## Project Structure

### Documentation (this feature)

```text
specs/006-remove-bd/
├── spec.md              # Feature specification
├── plan.md              # This file
├── checklists/          # Quality checklists
│   └── requirements.md  # Spec quality validation
└── tasks.md             # Task tracking (to be created)
```

### Files to Modify

```text
.claude/commands/
└── speckit.taskstoissues.md  # Update to remove bd references

package.json                   # Remove bd dependency (if present)
package-lock.json              # Updated after npm install

.beads/                        # Directory to delete (if exists)
```

**Structure Decision**: No new directories or code files. This is a cleanup operation modifying existing configuration files.

## Complexity Tracking

> No complexity violations. This feature reduces complexity.

## Phase 0: Research

This feature requires no research. It is a straightforward removal of:

1. A npm package (bd/beads) from dependencies
2. A configuration directory (.beads)
3. References in a command file (speckit.taskstoissues.md)

**Research Status**: COMPLETE (no unknowns)

## Phase 1: Design

### Changes Required

#### 1. Check and Remove bd Package

```bash
# Check if bd exists in package.json
grep -E "\"bd\"|\"beads\"" package.json

# If found, remove it
npm uninstall bd  # or beads, depending on package name
```

#### 2. Remove .beads Directory

```bash
# Check if directory exists
ls -la .beads/

# If exists, remove it
rm -rf .beads/
```

#### 3. Update speckit.taskstoissues.md

The command file needs to be rewritten to:

- Remove all bd/beads CLI references
- Keep GitHub Issues integration
- Reference tasks.md for task tracking
- Simplify the two-tier system to: GitHub Issues (high-level) + tasks.md (detailed)

### Updated Command Structure

The new `speckit.taskstoissues.md` should:

1. Read tasks from `specs/[feature]/tasks.md`
2. Group tasks into high-level GitHub Issues (by phase/user story)
3. Each GitHub Issue contains a checklist mirroring tasks.md
4. No bd commands, no .beads references

## Verification Checklist

After implementation, verify:

- [ ] `grep -r "bd" .claude/commands/` returns no matches (except this plan reference)
- [ ] `grep -r "beads" .claude/commands/` returns no matches
- [ ] `ls .beads` returns "No such file or directory"
- [ ] `grep -E "\"bd\"|\"beads\"" package.json` returns no matches
- [ ] `speckit.taskstoissues.md` references only GitHub Issues and tasks.md
