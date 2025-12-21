# Tasks: Remove Beads (bd) Integration

**Input**: Design documents from `/specs/006-remove-bd/`
**Prerequisites**: plan.md, spec.md

**Tests**: Not applicable - this is a cleanup task with manual verification.

**Organization**: Tasks are grouped by user story to enable independent implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Verify current state before making changes

- [x] T001 Check if bd/beads package exists in package.json
- [x] T002 Check if .beads directory exists at project root

---

## Phase 2: User Story 1 - Simplified Task Tracking (Priority: P1) 🎯 MVP

**Goal**: Ensure all task tracking uses tasks.md files with no bd dependencies

**Independent Test**: Search for bd/beads references returns no matches in .claude/commands

### Implementation for User Story 1

- [x] T003 [US1] Rewrite .claude/commands/speckit.taskstoissues.md to remove all bd/beads references and use only GitHub Issues + tasks.md

**Checkpoint**: speckit.taskstoissues.md should reference only GitHub Issues and tasks.md

---

## Phase 3: User Story 2 - Clean Uninstallation (Priority: P2)

**Goal**: Remove all bd library traces from the project

**Independent Test**: No bd package in package.json, no .beads directory exists

### Implementation for User Story 2

- [x] T004 [P] [US2] Remove bd/beads package from package.json (if present) using npm uninstall
- [x] T005 [P] [US2] Remove .beads directory from project root (if exists)

**Checkpoint**: No bd artifacts remain in the project

---

## Phase 4: User Story 3 - Updated Documentation (Priority: P3)

**Goal**: Verify all command documentation is accurate

**Independent Test**: grep for bd/beads in .claude/commands returns no matches

### Implementation for User Story 3

- [x] T006 [US3] Verify no other .claude/commands files reference bd or beads (scan and fix if needed)

**Checkpoint**: All documentation accurately reflects tasks.md-only workflow

---

## Phase 5: Verification

**Purpose**: Confirm all success criteria are met

- [x] T007 Run `grep -r "bd" .claude/commands/` and verify no functional matches
- [x] T008 Run `grep -r "beads" .claude/commands/` and verify no matches
- [x] T009 Verify .beads directory does not exist
- [x] T010 Verify no bd-related packages in package.json

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **User Story 1 (Phase 2)**: Can start after Setup
- **User Story 2 (Phase 3)**: Can start after Setup, parallel with US1
- **User Story 3 (Phase 4)**: Depends on US1 completion (need updated file to verify)
- **Verification (Phase 5)**: Depends on all user stories complete

### Parallel Opportunities

- T004 and T005 can run in parallel (different targets)
- US1 and US2 can run in parallel (independent changes)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: User Story 1 (T003)
3. **STOP and VALIDATE**: Verify speckit.taskstoissues.md is updated
4. Commit changes

### Full Implementation

1. Setup → US1 → US2 → US3 → Verification
2. Each user story is a separate commit following .claude/rules.md

---

## Notes

- This is a cleanup task, not new feature development
- No tests needed - verification is via grep/inspection
- Edge cases (missing .beads, no bd in package.json) are handled gracefully
- Commit after each user story phase
