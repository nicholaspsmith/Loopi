---
description: 'Task breakdown for Spec-Kit Workflow Improvements'
---

# Tasks: Spec-Kit Workflow Improvements

**Input**: Design documents from `/specs/001-speckit-workflow-improvements/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests are NOT explicitly requested in the specification, but User Story 7 requires test creation for Phase 2 script enhancements.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. Note: Phase 1 (User Stories 1-3) is already complete per PR 171.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This feature works with bash scripts and command infrastructure:

- Scripts: `.specify/scripts/bash/`
- Commands: `.claude/commands/`
- Tests: `tests/bash/`
- Templates: `.specify/templates/`

---

## Phase 1: User Stories 1-3 (Priority: P1) ✅ COMPLETE

**Status**: ✅ Already implemented and merged via PR 171

User Stories 1-3 cover:

- US1: Agent Context Package Version Syncing
- US2: Feature-Specific Context Discovery
- US3: Multi-Agent Support Removal

**Implementation**: The `.specify/scripts/bash/update-agent-context.sh` script was refactored from 799 lines to ~160 lines, removing multi-agent support and focusing on package version synchronization from package.json to CLAUDE.md.

**No tasks required** - This phase is complete and merged to main.

---

## Phase 2: User Story 4 - Full Semantic Version Preservation (Priority: P2)

**Goal**: Preserve full semantic versions (major.minor.patch) instead of stripping patch versions

**Independent Test**: Install a package with a specific patch version (e.g., @anthropic-ai/sdk@0.71.2), run the script, and verify CLAUDE.md shows "0.71.2" not "0.71".

### Implementation for User Story 4

- [x] T001 [US4] Update get_version() function in `.specify/scripts/bash/update-agent-context.sh` to preserve patch versions
- [x] T002 [US4] Update version extraction regex to capture major.minor.patch in `.specify/scripts/bash/update-agent-context.sh`
- [x] T003 [US4] Update perl substitution pattern to match major.minor.patch format in `.specify/scripts/bash/update-agent-context.sh`
- [x] T004 [US4] Preserve pre-release tags (e.g., -beta.2, -alpha.1) in version extraction in `.specify/scripts/bash/update-agent-context.sh`
- [x] T005 [US4] Test version extraction with various formats (^1.2.3, ~1.2.3, >=1.2.3, 1.2.3-beta.4) and verify full semver preserved

**Checkpoint**: At this point, full semantic versions should be preserved correctly in CLAUDE.md

---

## Phase 3: User Story 5 - Script Dependency Validation (Priority: P2)

**Goal**: Provide clear error messages when required dependencies (jq, perl) are missing

**Independent Test**: Run the script on a system without jq installed and verify that a helpful error message is displayed with installation instructions.

### Implementation for User Story 5

- [x] T006 [P] [US5] Create check_dependency() function in `.specify/scripts/bash/update-agent-context.sh`
- [x] T007 [US5] Add dependency check for jq with installation instructions (brew/apt) in `.specify/scripts/bash/update-agent-context.sh`
- [x] T008 [US5] Add dependency check for perl with installation instructions in `.specify/scripts/bash/update-agent-context.sh`
- [x] T009 [P] [US5] Add version detection for jq (minimum 1.6) with warning for old versions in `.specify/scripts/bash/update-agent-context.sh`
- [x] T010 [P] [US5] Add version detection for perl (minimum 5.10) with warning for old versions in `.specify/scripts/bash/update-agent-context.sh`
- [x] T011 [US5] Update main() to call dependency checks before processing in `.specify/scripts/bash/update-agent-context.sh`
- [ ] T012 [US5] Test error messages by temporarily hiding jq/perl from PATH and verifying helpful output

**Checkpoint**: At this point, missing dependencies should produce clear, actionable error messages

---

## Phase 4: User Story 6 - Package List Documentation and Validation (Priority: P2)

**Goal**: Add inline documentation for the package list and optional validation for unlisted packages

**Independent Test**: Add a new dependency to package.json, run the script with validation enabled, and verify that a warning is displayed if the package is not in the sync list.

### Implementation for User Story 6

- [x] T013 [P] [US6] Add inline comment block documenting tracked package list format in `.specify/scripts/bash/update-agent-context.sh`
- [x] T014 [P] [US6] Add inline instructions for adding new packages to sync list in `.specify/scripts/bash/update-agent-context.sh`
- [x] T015 [US6] Add --validate flag to script option parsing in `.specify/scripts/bash/update-agent-context.sh`
- [x] T016 [US6] Implement validate_package_list() function to compare package.json against tracked packages in `.specify/scripts/bash/update-agent-context.sh`
- [x] T017 [US6] Display warning for packages in package.json but not in sync list when --validate flag used in `.specify/scripts/bash/update-agent-context.sh`
- [x] T018 [US6] Add --help flag with usage documentation to `.specify/scripts/bash/update-agent-context.sh`
- [x] T019 [US6] Test validation mode by adding a new dependency and verifying warning is displayed

**Checkpoint**: At this point, the package list should be well-documented and validation should detect drift

---

## Phase 5: User Story 7 - Automated Script Testing (Priority: P2)

**Goal**: Create automated tests for the version extraction logic to prevent regressions

**Independent Test**: Run the test script and verify that all test cases pass, including edge cases like missing packages and malformed versions.

### Implementation for User Story 7

- [x] T020 [US7] Create test directory structure at `tests/bash/` with subdirectories `mocks/` and `fixtures/`
- [x] T021 [P] [US7] Create mock package.json with known versions for testing in `tests/bash/mocks/package.json`
- [x] T022 [P] [US7] Create mock CLAUDE.md with outdated versions in `tests/bash/mocks/CLAUDE.md`
- [x] T023 [P] [US7] Create expected CLAUDE.md output in `tests/bash/fixtures/expected-output.md`
- [x] T024 [US7] Create `tests/bash/test-version-extraction.sh` with run_test() assertion function
- [x] T025 [P] [US7] Add test case: Valid package.json extraction in `tests/bash/test-version-extraction.sh`
- [x] T026 [P] [US7] Add test case: npm prefix stripping (^, ~, >=) in `tests/bash/test-version-extraction.sh`
- [x] T027 [P] [US7] Add test case: Full semver preservation (major.minor.patch) in `tests/bash/test-version-extraction.sh`
- [x] T028 [P] [US7] Add test case: Pre-release tag handling (-beta.2, -alpha.1) in `tests/bash/test-version-extraction.sh`
- [x] T029 [P] [US7] Add test case: Missing package graceful skip in `tests/bash/test-version-extraction.sh`
- [ ] T030 [P] [US7] Add test case: Invalid JSON error handling in `tests/bash/test-version-extraction.sh`
- [ ] T031 [P] [US7] Add test case: Missing jq dependency error in `tests/bash/test-version-extraction.sh`
- [ ] T032 [P] [US7] Add test case: Idempotency (no changes needed) in `tests/bash/test-version-extraction.sh`
- [ ] T033 [P] [US7] Add test case: Parenthetical version update (postgres, drizzle-orm) in `tests/bash/test-version-extraction.sh`
- [ ] T034 [P] [US7] Add test case: Special characters in display name in `tests/bash/test-version-extraction.sh`
- [x] T035 [US7] Make test script executable and add shebang to `tests/bash/test-version-extraction.sh`
- [ ] T036 [US7] Run complete test suite and verify all 10 test cases pass
- [ ] T037 [US7] Add test execution to GitHub Actions workflow (if .github/workflows/ exists)

**Checkpoint**: At this point, comprehensive tests should exist and pass for all version extraction logic

---

## Phase 6: User Story 8 - Numbered Command Aliases (Priority: P3)

**Goal**: Create numbered aliases for all spec-kit commands to show recommended workflow order

**Independent Test**: List all available spec-kit commands and verify that numbered aliases exist alongside original names (backward compatible).

### Implementation for User Story 8

- [x] T038 [P] [US8] Create symlink `.claude/commands/1.constitution.md` → `speckit.constitution.md`
- [x] T039 [P] [US8] Create symlink `.claude/commands/2.specify.md` → `speckit.specify.md`
- [x] T040 [P] [US8] Create symlink `.claude/commands/2.1.clarify.md` → `speckit.clarify.md`
- [x] T041 [P] [US8] Create symlink `.claude/commands/3.plan.md` → `speckit.plan.md`
- [x] T042 [P] [US8] Create symlink `.claude/commands/3.1.validate.md` → `speckit.plan.validate.md`
- [x] T043 [P] [US8] Create symlink `.claude/commands/4.tasks.md` → `speckit.tasks.md`
- [x] T044 [P] [US8] Create symlink `.claude/commands/5.implement.md` → `speckit.implement.md`
- [x] T045 [P] [US8] Create symlink `.claude/commands/6.analyze.md` → `speckit.analyze.md`
- [x] T046 [P] [US8] Create symlink `.claude/commands/7.checklist.md` → `speckit.checklist.md`
- [x] T047 [P] [US8] Create symlink `.claude/commands/8.taskstoissues.md` → `speckit.taskstoissues.md`
- [x] T048 [US8] Test numbered alias invocation (e.g., /2.specify) behaves identically to original (/speckit.specify)
- [x] T049 [US8] Verify symlinks remain valid on macOS, Linux, and WSL platforms

**Checkpoint**: At this point, numbered aliases should be functional and backward compatible

---

## Phase 7: User Story 9 - Interactive Workflow Mode (Priority: P3)

**Goal**: Add user-guided completion prompts to all spec-kit commands

**Independent Test**: Run a spec-kit command (e.g., `/speckit.specify`) and verify that after completion, you're prompted with "What would you like to do next?" with contextually appropriate options.

### Implementation for User Story 9

- [x] T050 [US9] Add user-guided completion prompt to `.claude/commands/speckit.specify.md` using AskUserQuestion
- [x] T051 [US9] Add user-guided completion prompt to `.claude/commands/speckit.plan.md` using AskUserQuestion
- [x] T052 [US9] Add user-guided completion prompt to `.claude/commands/speckit.tasks.md` using AskUserQuestion
- [x] T053 [US9] Add user-guided completion prompt to `.claude/commands/speckit.implement.md` using AskUserQuestion
- [x] T054 [US9] Ensure consistent "Next Steps" format across all command files with appropriate options
- [x] T055 [US9] Remove automatic mode and mode selection logic (simplified to user-guided only per user feedback)
- [x] T056 [US9] Verify prompt options are contextually appropriate for each command
- [x] T057 [US9] Test user-guided completion prompts trigger correctly at command end
- [ ] T058 [US9] REMOVED - No automatic mode in simplified implementation
- [ ] T059 [US9] REMOVED - No mode selection in simplified implementation
- [ ] T060 [US9] REMOVED - No mode storage in simplified implementation

**Checkpoint**: At this point, all spec-kit commands should prompt users with contextually appropriate "Next Steps" options after completion (user-guided prompts only, no automatic mode)

---

## Phase 8: User Story 10 - Automatic GitHub Issue Creation (Priority: P3)

**Goal**: Automatically create a GitHub issue after successful task generation with checklist of all tasks

**Independent Test**: Complete the tasks step for a new feature and verify that a GitHub issue is created with a checkbox list of all tasks.

### Implementation for User Story 10

- [x] T061 [US10] Add GitHub remote check to `.claude/commands/speckit.tasks.md` (step 6a)
- [x] T062 [US10] Add automatic invocation of `/speckit.taskstoissues` after tasks.md generation (step 6b)
- [x] T063 [US10] Implement non-blocking error handling for issue creation failures (step 6c)
- [x] T064 [US10] Add manual fallback instructions when auto-creation fails (step 6c)
- [x] T065 [US10] Ensure workflow continues to Next Steps regardless of issue creation outcome (step 6c)
- [x] T066 [US10] Display success message with issue URLs when creation succeeds (step 6d)
- [x] T067 [US10] Note that tasks.md remains source of truth for task status (step 6d)
- [ ] T068 [US10] Test automatic issue creation flow with valid GitHub authentication
- [ ] T069 [US10] Test non-blocking behavior when issue creation fails
- [ ] T070 [US10] Test manual fallback by intentionally causing issue creation to fail
- [ ] T071 [US10] REMOVED - Retry logic handled by existing taskstoissues command
- [ ] T072 [US10] REMOVED - Error classification handled by existing taskstoissues command
- [ ] T073 [US10] REMOVED - Exponential backoff handled by existing taskstoissues command
- [ ] T074 [US10] REMOVED - Issue title/body generation handled by existing taskstoissues command
- [ ] T075 [US10] REMOVED - Feature metadata extraction handled by existing taskstoissues command

**Checkpoint**: At this point, GitHub issues should be automatically created after task generation with proper error handling

---

## Phase 9: User Story 11 - Current Branch Visibility (Priority: P3)

**Goal**: Display current git branch at the end of every Claude response

**Independent Test**: Ask Claude any question and verify that the response ends with "Current branch: <branch-name>".

### Implementation for User Story 11

- [x] T076 [US11] Create get_current_branch() function to detect branch name or detached HEAD state
- [x] T077 [US11] Handle normal branch: return branch name (e.g., "005-user-auth")
- [x] T078 [US11] Handle detached HEAD: return commit SHA (first 7 chars) with "(detached)" prefix
- [x] T079 [US11] Handle no git repository: return "N/A" or omit line entirely
- [x] T080 [US11] Implement response footer template: `---\nCurrent branch: {branch}`
- [x] T081 [US11] Add footer to Claude Code response pipeline (if hook available) or template-based footer in command files
- [x] T082 [US11] Ensure branch detection completes in < 50ms (performance requirement)
- [x] T083 [US11] Test branch visibility on normal branch
- [x] T084 [US11] Test branch visibility on detached HEAD state
- [x] T085 [US11] Test branch visibility when not in git repository

**Checkpoint**: At this point, current branch should be visible in all Claude responses

---

## Phase 10: User Story 12 - Automatic PR Creation (Priority: P3)

**Goal**: Automatically offer to create a PR when implementation is complete, with PR body linking to GitHub issue

**Independent Test**: Complete all implementation tasks, verify Claude offers to create a PR, accept, and verify the PR body contains "Closes #<issue-number>".

### Implementation for User Story 12

- [x] T086 [US12] Detect implementation completion by checking all tasks marked as complete in tasks.md (step 10a)
- [x] T087 [US12] Add post-implementation completion hook to `.claude/commands/speckit.implement.md` (step 10)
- [x] T088 [US12] Prompt user: "All tasks complete. Create PR now?" with Yes/No options (step 10b)
- [x] T089 [US12] Extract feature number and name from current branch (step 10c)
- [x] T090 [US12] Find associated GitHub issue number using gh issue list (step 10c)
- [x] T091 [US12] Generate PR title format: `[NNN] Feature Short Name` (step 10d)
- [x] T092 [US12] Generate PR body with summary from spec.md and "Closes #<issue-number>" footer (step 10d)
- [x] T093 [US12] Add task completion summary to PR body (X of Y tasks completed) (step 10d)
- [x] T094 [US12] Add links to spec.md, plan.md, and tasks.md in PR body (step 10d)
- [x] T095 [US12] Call gh pr create command with title, body, and base branch (main) (step 10e)
- [x] T096 [US12] Display PR URL in success message after creation (step 10g)
- [x] T097 [US12] Handle PR creation failure with manual fallback instructions (step 10f)
- [ ] T098 [US12] Test PR creation with valid GitHub authentication
- [ ] T099 [US12] Test PR body contains "Closes #<issue-number>" and GitHub auto-links issue
- [ ] T100 [US12] Test that PR creation is only offered when all tasks are complete

**Checkpoint**: At this point, PR creation should be automated with proper issue linking

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T101 [P] Update CLAUDE.md with Phase 2 script enhancements in Technology Stack section
- [ ] T102 [P] Update CLAUDE.md with Phase 3 workflow UX improvements in Feature Implementation Notes
- [ ] T103 [P] Add usage examples to `.specify/scripts/bash/update-agent-context.sh` header comments
- [ ] T104 [P] Update quickstart.md with actual test results from Phase 2 testing (US7)
- [ ] T105 [P] Add troubleshooting section to quickstart.md for common errors (missing deps, auth failures)
- [ ] T106 [P] Create pull request for Phase 2 enhancements (US4-US7) with summary of changes
- [ ] T107 [P] Create pull request for Phase 3 UX improvements (US8-US12) with demo screenshots/recordings
- [ ] T108 Run quickstart.md validation scenarios for all 3 phases
- [ ] T109 Verify all symlinks work correctly across different platforms (macOS, Linux, WSL)
- [ ] T110 Run complete integration test: /2.specify → /3.plan → /4.tasks (with issue creation) → /5.implement → PR creation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US1-US3)**: ✅ Complete - PR 171 merged
- **Phase 2 (US4)**: Depends on Phase 1 completion (script exists) - Can start immediately
- **Phase 3 (US5)**: Depends on Phase 2 (US4) completion - Version extraction logic must be stable before adding validation
- **Phase 4 (US6)**: Depends on Phase 3 (US5) completion - Dependency validation should exist before package list validation
- **Phase 5 (US7)**: Depends on Phases 2-4 completion - Tests validate all script enhancements
- **Phase 6 (US8)**: Independent - Can start immediately (command infrastructure separate from scripts)
- **Phase 7 (US9)**: Depends on Phase 6 (US8) - Workflow mode applies to numbered aliases
- **Phase 8 (US10)**: Depends on Phase 7 (US9) - GitHub automation integrates with workflow mode
- **Phase 9 (US11)**: Independent - Can run in parallel with US8-US10
- **Phase 10 (US12)**: Depends on Phase 8 (US10) - PR creation requires issue number from auto-creation
- **Phase 11 (Polish)**: Depends on all desired user stories being complete

### User Story Dependencies

**Phase 2 Script Enhancements (Sequential)**:

- US4 (Full Semver) → US5 (Dependency Validation) → US6 (Package Validation) → US7 (Testing)
- Reason: Each builds on the previous enhancement to the script

**Phase 3 Workflow UX (Two Parallel Tracks)**:

Track 1 - Command Infrastructure (Sequential):

- US8 (Numbered Aliases) → US9 (Workflow Mode) → US10 (GitHub Issues) → US12 (PR Creation)

Track 2 - Visibility (Independent):

- US11 (Branch Visibility) - Can run in parallel with Track 1

**Independent Stories**:

- US8, US9, US10, US11, US12 are all independent of Phase 2 (script enhancements)
- US11 can be implemented independently of US8-US10, US12

### Within Each User Story

**Phase 2 (Script Enhancements)**:

- US4: Version extraction logic before regex updates before testing
- US5: Dependency check function before individual checks before testing
- US6: Documentation before validation logic before testing
- US7: Test infrastructure (mocks, fixtures) before test cases before execution

**Phase 3 (Workflow UX)**:

- US8: All symlinks can be created in parallel
- US9: User-guided prompts added to each command file (can be done in parallel)
- US10: Metadata extraction before issue generation before retry logic before testing
- US11: Branch detection before footer implementation before testing
- US12: Completion detection before PR generation before testing

### Parallel Opportunities

**Phase 2**:

- Within US5: T009 (jq version check) and T010 (perl version check) can run in parallel
- Within US6: T013 (documentation) and T014 (instructions) can run in parallel
- Within US7: All test case additions (T025-T034) can run in parallel after T024

**Phase 3**:

- All symlink creation tasks (T038-T047) in US8 can run in parallel
- US11 (Branch Visibility) can be implemented in parallel with US8-US10
- Within US10: Error handling tasks can be developed in parallel with main flow

**Phase 11**:

- T101-T105 (documentation updates) can all run in parallel
- T106 and T107 (PR creation) can run in parallel if on separate branches

---

## Parallel Example: User Story 7 (Testing)

```bash
# After T024 (test script framework) is complete, launch all test cases in parallel:
Task: T025 "Add test case: Valid package.json extraction"
Task: T026 "Add test case: npm prefix stripping"
Task: T027 "Add test case: Full semver preservation"
Task: T028 "Add test case: Pre-release tag handling"
Task: T029 "Add test case: Missing package graceful skip"
Task: T030 "Add test case: Invalid JSON error handling"
Task: T031 "Add test case: Missing jq dependency error"
Task: T032 "Add test case: Idempotency"
Task: T033 "Add test case: Parenthetical version update"
Task: T034 "Add test case: Special characters in display name"

# Then sequentially:
Task: T035 "Make test script executable"
Task: T036 "Run complete test suite"
Task: T037 "Add to GitHub Actions"
```

---

## Parallel Example: User Story 8 (Numbered Aliases)

```bash
# All symlink creation tasks can run in parallel:
Task: T038 "Create symlink 1.constitution.md"
Task: T039 "Create symlink 2.specify.md"
Task: T040 "Create symlink 2.1.clarify.md"
Task: T041 "Create symlink 3.plan.md"
Task: T042 "Create symlink 3.1.validate.md"
Task: T043 "Create symlink 4.tasks.md"
Task: T044 "Create symlink 5.implement.md"
Task: T045 "Create symlink 6.analyze.md"
Task: T046 "Create symlink 7.checklist.md"
Task: T047 "Create symlink 8.taskstoissues.md"

# Then sequentially:
Task: T048 "Test numbered alias invocation"
Task: T049 "Verify symlinks on all platforms"
```

---

## Implementation Strategy

### MVP First (User Stories 4-6 Only - Phase 2 Core)

1. ✅ Phase 1 already complete (US1-US3)
2. Complete Phase 2: US4 (Full Semver) - Core enhancement
3. Complete Phase 3: US5 (Dependency Validation) - Quality improvement
4. Complete Phase 4: US6 (Package Validation) - Maintenance improvement
5. **STOP and VALIDATE**: Test script enhancements with real package updates
6. Optional: Add US7 (Testing) before moving to Phase 3

**MVP Delivers**: Enhanced script with full semver, dependency validation, and package documentation

### Incremental Delivery (Recommended)

**Phase 2 Delivery (Script Enhancements)**:

1. US4 → Test → Merge (Full semver preservation)
2. US5 → Test → Merge (Dependency validation)
3. US6 → Test → Merge (Package documentation)
4. US7 → Test → Merge (Automated testing)

**Phase 3 Delivery (Workflow UX)**:

1. US8 → Test → Merge (Numbered aliases)
2. US9 → Test → Merge (Workflow mode)
3. US10 → Test → Merge (GitHub issue creation)
4. US11 → Test → Merge (Branch visibility - can be done in parallel)
5. US12 → Test → Merge (PR creation)

Each story adds value independently without breaking previous functionality.

### Parallel Team Strategy

**If 2 developers available**:

After Phase 1 (already complete):

- Developer A: Phase 2 (US4-US7) - Script enhancements
- Developer B: Phase 3 Track 2 (US11) - Branch visibility

Once Developer A completes Phase 2:

- Developer A: Phase 3 Track 1 (US8→US9→US10→US12) - Command infrastructure
- Developer B: Continue with Phase 3 Track 2 (US11) or help with Track 1

Stories integrate independently at merge time.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Phase 1 is already complete - focus on Phase 2 and Phase 3
- Phase 2 tasks are sequential (each builds on previous script enhancements)
- Phase 3 has two parallel tracks: command infrastructure (sequential) and visibility (independent)
- Commit after each task or logical group adhering to .claude/rules.md
- Stop at any checkpoint to validate story independently
- GitHub automation (US10, US12) requires `gh` CLI authentication
- Symlinks (US8) must work across macOS, Linux, and WSL platforms
