# Feature Specification: Spec-Kit Workflow Improvements

**Feature Branch**: `001-speckit-workflow-improvements`
**Created**: 2025-12-23
**Status**: Draft
**Input**: User description: "Spec-Kit Workflow Improvements: Agent Context Refactoring and Enhanced Developer Experience

This specification combines three related improvements:

1. PR 171: Simplify agent context script from 799 to ~160 lines by removing multi-agent support and refocusing on package version syncing
2. Issue 184: Enhance update-agent-context.sh with better version handling, dependency checks, and error handling
3. Issue 172: Improve spec-kit workflow with numbered command aliases, interactive workflow modes, automatic GitHub issue creation, current branch visibility, and streamlined PR creation

The goal is to improve developer experience by:

- Simplifying agent context management (Claude-only, package version syncing)
- Adding workflow guidance (numbered aliases, interactive prompts)
- Automating repetitive tasks (GitHub issue creation, PR workflows)
- Improving visibility (current branch display, workflow progress)

This will be implemented in 3 phases:

- Phase 1 (P1): Agent context simplification (PR 171 changes)
- Phase 2 (P2): Script enhancements (Issue 184 improvements)
- Phase 3 (P3): Workflow UX improvements (Issue 172 features)

Each phase can be developed, tested, and merged independently."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Agent Context Package Version Syncing (Priority: P1) 🎯 Phase 1

As a developer working with Claude, I want package versions from package.json automatically synchronized to CLAUDE.md so that Claude always has accurate technology stack information without manual updates.

**Why this priority**: Foundation for Phase 1. This is already implemented in PR 171 but needs to be documented and merged. It eliminates manual synchronization errors and ensures Claude always has current dependency information.

**Independent Test**: Install or update a package via npm, run the update-agent-context.sh script, and verify that CLAUDE.md Technology Stack section reflects the correct version from package.json.

**Acceptance Scenarios**:

1. **Given** I have updated a package in package.json, **When** I run update-agent-context.sh, **Then** CLAUDE.md shows the new version in the Technology Stack section
2. **Given** I have a fresh clone of the repository, **When** I run update-agent-context.sh, **Then** all package versions in CLAUDE.md match package.json versions
3. **Given** a package exists in the sync list but not in package.json, **When** I run the script, **Then** no error occurs and the package is skipped gracefully

---

### User Story 2 - Feature-Specific Context Discovery (Priority: P1) 🎯 Phase 1

As Claude working on a feature branch, I want to automatically discover and read specifications from matching spec directories so that I have relevant context without manual file references.

**Why this priority**: Foundation for Phase 1. Already implemented in PR 171. This enables automatic context loading when working on feature branches, reducing cognitive load and manual navigation.

**Independent Test**: Check out a feature branch like `003-feature-name`, start a Claude session, and verify that Claude reads from `specs/003-feature-name/` directory without being explicitly told to do so.

**Acceptance Scenarios**:

1. **Given** I'm on branch `005-user-auth`, **When** Claude starts working, **Then** Claude reads specs from `specs/005-user-auth/` automatically
2. **Given** I'm on the main branch, **When** Claude starts working, **Then** Claude does not attempt to read from any feature-specific spec directory
3. **Given** I switch from one feature branch to another, **When** I ask Claude a question, **Then** Claude uses the specs matching the current branch

---

### User Story 3 - Multi-Agent Support Removal (Priority: P1) 🎯 Phase 1

As a maintainer of the spec-kit workflow, I want the agent context script to support only Claude (removing Gemini, Copilot, Cursor) so that the codebase is simpler and easier to maintain.

**Why this priority**: Foundation for Phase 1. Already implemented in PR 171. This reduces the script from 799 lines to ~160 lines, making it easier to understand, test, and enhance.

**Independent Test**: Review the update-agent-context.sh script and verify that it contains no code for Gemini, Copilot, or Cursor agents.

**Acceptance Scenarios**:

1. **Given** the refactored script, **When** I search for "gemini" (case-insensitive), **Then** no results are found
2. **Given** the refactored script, **When** I count the lines of code, **Then** the script is approximately 160 lines (down from 799)
3. **Given** the refactored script, **When** I run it, **Then** it only updates CLAUDE.md and no other agent files

---

### User Story 4 - Full Semantic Version Preservation (Priority: P2) 🎯 Phase 2

As a developer, I want package versions to include the full semantic version (major.minor.patch) so that Claude is aware of important patch-level updates.

**Why this priority**: Quality improvement for Phase 2. Currently patch versions are stripped (e.g., 0.71.2 becomes 0.71), which hides important updates from Claude.

**Independent Test**: Install a package with a specific patch version (e.g., @anthropic-ai/sdk@0.71.2), run the script, and verify CLAUDE.md shows "0.71.2" not "0.71".

**Acceptance Scenarios**:

1. **Given** package.json has `"@anthropic-ai/sdk": "^0.71.2"`, **When** I run update-agent-context.sh, **Then** CLAUDE.md shows "0.71.2" (full version)
2. **Given** package.json has versions with caret (^), tilde (~), or exact, **When** I run the script, **Then** all versions are extracted correctly with patch numbers
3. **Given** a package with version "1.2.3-beta.4", **When** I run the script, **Then** the full version including prerelease tag is preserved

---

### User Story 5 - Script Dependency Validation (Priority: P2) 🎯 Phase 2

As a developer running the update-agent-context.sh script, I want clear error messages if required dependencies (jq, perl) are missing so that I know what to install to fix the issue.

**Why this priority**: Quality improvement for Phase 2. Currently the script fails with cryptic errors if jq or perl are missing, making it hard to diagnose the problem.

**Independent Test**: Run the script on a system without jq installed and verify that a helpful error message is displayed with installation instructions.

**Acceptance Scenarios**:

1. **Given** jq is not installed, **When** I run update-agent-context.sh, **Then** I see an error message like "Error: jq is required but not found. Install with: brew install jq"
2. **Given** perl is not installed, **When** I run update-agent-context.sh, **Then** I see an error message with installation instructions for perl
3. **Given** both jq and perl are installed, **When** I run the script, **Then** no dependency warnings are shown

---

### User Story 6 - Package List Documentation and Validation (Priority: P2) 🎯 Phase 2

As a maintainer, I want inline documentation about the hardcoded package list and optional validation warnings for unlisted packages so that the script remains up-to-date as dependencies change.

**Why this priority**: Maintenance improvement for Phase 2. Currently the package list is hardcoded without documentation, requiring manual script updates when the tech stack changes.

**Independent Test**: Add a new dependency to package.json, run the script, and verify that a warning is displayed if the package is not in the sync list.

**Acceptance Scenarios**:

1. **Given** the script has inline comments, **When** I review the package list section, **Then** I see documentation explaining how to add or remove packages
2. **Given** package.json contains a package not in the sync list, **When** I run the script with validation enabled, **Then** a warning is displayed listing the untracked package
3. **Given** all packages in package.json are in the sync list, **When** I run the script, **Then** no validation warnings are shown

---

### User Story 7 - Automated Script Testing (Priority: P2) 🎯 Phase 2

As a maintainer, I want automated tests for the version extraction logic so that future changes don't break the synchronization behavior.

**Why this priority**: Quality improvement for Phase 2. Currently there are no tests for the version sync logic, making it risky to refactor or enhance the script.

**Independent Test**: Run the test script and verify that all test cases pass, including edge cases like missing packages and malformed versions.

**Acceptance Scenarios**:

1. **Given** a test script exists, **When** I run it with mock package.json and CLAUDE.md files, **Then** all version extraction tests pass
2. **Given** edge cases like missing packages or malformed versions, **When** the tests run, **Then** the script handles them gracefully without errors
3. **Given** the tests are integrated into CI, **When** I open a PR that changes the script, **Then** the tests run automatically and prevent regressions

---

### User Story 8 - Numbered Command Aliases (Priority: P3) 🎯 Phase 3

As a developer using spec-kit, I want numbered aliases for all spec-kit commands (e.g., /1.constitution, /2.specify) so that I know the recommended order of operations without memorizing steps.

**Why this priority**: Workflow guidance for Phase 3. This addresses confusion about which command to run next and prevents common mistakes like working on the wrong branch or merging directly to main.

**Independent Test**: List all available spec-kit commands and verify that numbered aliases exist alongside original names (backward compatible).

**Acceptance Scenarios**:

1. **Given** I want to start a new feature, **When** I list available commands, **Then** I see both `/2.specify` and `/speckit.specify` as options
2. **Given** I run `/2.specify`, **When** it completes, **Then** it behaves identically to `/speckit.specify`
3. **Given** I'm at any workflow stage, **When** I review the command list, **Then** the numbering shows me the typical order: 1.constitution → 2.specify → 3.plan → 4.tasks → 5.implement

---

### User Story 9 - Interactive Workflow Mode (Priority: P3) 🎯 Phase 3

As a developer, I want an interactive prompt at the start of each spec-kit command asking whether to proceed automatically or guide me through steps so that I have control over workflow pacing.

**Why this priority**: Workflow guidance for Phase 3. This balances automation with user control, allowing experienced users to automate while helping new users learn the process.

**Independent Test**: Run a spec-kit command and verify that you're prompted to choose between "Automatic" and "User-Guided" modes before the command executes.

**Acceptance Scenarios**:

1. **Given** I run `/2.specify`, **When** it starts, **Then** I'm asked "Run in (A)utomatic or (U)ser-Guided mode?"
2. **Given** I choose "Automatic", **When** the workflow runs, **Then** it proceeds through all steps without prompting unless critical decisions are needed
3. **Given** I choose "User-Guided", **When** each step completes, **Then** I'm shown available next steps and asked which to run

---

### User Story 10 - Automatic GitHub Issue Creation (Priority: P3) 🎯 Phase 3

As a developer, I want a GitHub issue automatically created during the tasks step (after successful task generation) so that I don't have to manually track work or run a separate command.

**Why this priority**: Automation for Phase 3. This eliminates the manual step of creating issues and ensures all features are tracked from the start.

**Independent Test**: Complete the tasks step for a new feature and verify that a GitHub issue is created with a checkbox list of all tasks.

**Acceptance Scenarios**:

1. **Given** I successfully generate tasks for a feature, **When** the tasks step completes, **Then** a GitHub issue is created with the feature name as the title
2. **Given** a GitHub issue was created, **When** I view it, **Then** it contains a checkbox list mirroring all tasks from tasks.md
3. **Given** the tasks step failed, **When** the command exits, **Then** no GitHub issue is created

---

### User Story 11 - Current Branch Visibility (Priority: P3) 🎯 Phase 3

As a developer, I want the current git branch displayed at the end of every Claude response so that I always know which branch I'm working on without running git commands.

**Why this priority**: Visibility improvement for Phase 3. This prevents mistakes like working on the wrong branch or forgetting to switch branches.

**Independent Test**: Ask Claude any question and verify that the response ends with "Current branch: <branch-name>".

**Acceptance Scenarios**:

1. **Given** I'm on branch `005-user-auth`, **When** Claude responds to any message, **Then** the response ends with "Current branch: 005-user-auth"
2. **Given** I switch branches mid-conversation, **When** Claude responds, **Then** the displayed branch name updates to match the current branch
3. **Given** I'm on the main branch, **When** Claude responds, **Then** the response shows "Current branch: main"

---

### User Story 12 - Automatic PR Creation on Implementation Complete (Priority: P3) 🎯 Phase 3

As a developer, I want Claude to automatically open a PR when implementation is complete, with the PR body specifying it closes the associated GitHub issue, so that I don't have to manually create PRs.

**Why this priority**: Automation for Phase 3. This streamlines the final step of the workflow and ensures PRs are properly linked to issues.

**Independent Test**: Complete all implementation tasks, verify Claude offers to create a PR, accept, and verify the PR body contains "Closes #<issue-number>".

**Acceptance Scenarios**:

1. **Given** all implementation tasks are complete, **When** Claude finishes the last task, **Then** Claude asks if I want to create a PR
2. **Given** I accept the PR creation, **When** the PR is created, **Then** the PR body includes "Closes #<issue-number>" linking to the feature's GitHub issue
3. **Given** the PR is created, **When** I view it on GitHub, **Then** GitHub automatically links the PR to the issue

---

### Edge Cases

- **What happens when update-agent-context.sh is run on a system with an old version of jq?** The script should check jq version and warn if it's incompatible.
- **How does the system handle a package.json with invalid JSON?** jq will fail with a clear error; the script should catch this and provide a helpful message.
- **What if a feature branch doesn't match any spec directory?** Claude should proceed without feature-specific context and not throw an error.
- **What if the developer runs numbered commands out of order (e.g., /5.implement before /2.specify)?** The command should detect missing prerequisites and warn the developer with suggested next steps.
- **What if GitHub issue creation fails due to API rate limits?** The script should retry with exponential backoff and provide fallback instructions for manual issue creation.
- **What if a developer is working on multiple features simultaneously?** Branch visibility helps track which feature is active; the workflow assumes one feature branch at a time per the constitution.

## Requirements _(mandatory)_

### Functional Requirements

#### Phase 1 Requirements (P1)

- **FR-001**: The update-agent-context.sh script MUST read package versions from package.json using jq
- **FR-002**: The script MUST update the Technology Stack section in CLAUDE.md with current package versions
- **FR-003**: The script MUST use perl for reliable regex-based substitution in CLAUDE.md
- **FR-004**: CLAUDE.md MUST include a "Feature-Specific Context" section directing Claude to read specs from branch-matching directories
- **FR-005**: The script MUST NOT contain any code for Gemini, Copilot, or Cursor agents
- **FR-006**: The script MUST be approximately 160 lines or less (down from 799 lines)
- **FR-007**: Claude MUST automatically detect the current branch and attempt to read specs from `specs/<branch-number>-<branch-name>/` when on a feature branch

#### Phase 2 Requirements (P2)

- **FR-008**: The version extraction logic MUST preserve full semantic versioning (major.minor.patch) instead of stripping patch versions
- **FR-009**: The version extraction logic MUST handle version prefixes (^, ~, >=) correctly
- **FR-010**: The script MUST check for required dependencies (jq, perl) at startup and exit with clear error messages if missing
- **FR-011**: Error messages for missing dependencies MUST include platform-specific installation instructions (homebrew for macOS, apt for Ubuntu, etc.)
- **FR-012**: The script MUST include inline comments documenting how to maintain the hardcoded package list
- **FR-013**: The script SHOULD support an optional --validate flag that warns about packages in package.json not in the sync list
- **FR-014**: A test script MUST exist that validates version extraction logic using mock package.json and CLAUDE.md files
- **FR-015**: Tests MUST cover edge cases: missing packages, malformed versions, missing CLAUDE.md, invalid JSON

#### Phase 3 Requirements (P3)

- **FR-016**: All spec-kit commands MUST have numbered aliases (1.constitution, 2.specify, 2.1.clarify, etc.) in addition to original names
- **FR-017**: Original command names (/speckit.specify, /speckit.plan, etc.) MUST remain functional for backward compatibility
- **FR-018**: At the start of each spec-kit command, the system MUST prompt the user to choose between Automatic and User-Guided modes
- **FR-019**: In Automatic mode, the workflow MUST proceed through all steps without prompting unless critical decisions are required
- **FR-020**: In User-Guided mode, after each step completes, the system MUST show available next steps and wait for user selection
- **FR-021**: A /next command MUST exist that runs the recommended next step based on current workflow state
- **FR-022**: After the tasks step successfully generates tasks.md, a GitHub issue MUST be created automatically with the feature name as the title
- **FR-023**: The automatically created GitHub issue MUST contain a checkbox list mirroring all tasks from tasks.md
- **FR-024**: The system MUST NOT create a GitHub issue if task generation fails
- **FR-025**: Every Claude response MUST end with "Current branch: <branch-name>" showing the active git branch
- **FR-026**: When all implementation tasks are complete, Claude MUST ask the user if they want to create a PR
- **FR-027**: Automatically created PRs MUST include "Closes #<issue-number>" in the PR body to link to the feature's GitHub issue
- **FR-028**: New feature branches MUST always be created from the main branch, never from other feature branches

### Key Entities

- **Package Version Entry**: Represents a package name and version extracted from package.json, used to update CLAUDE.md
  - Attributes: package name, semantic version (major.minor.patch), version prefix (^, ~, >=, or none)
  - Relationships: Multiple entries exist in package.json; corresponding entries exist in CLAUDE.md Technology Stack section

- **Feature Branch**: Represents a git branch for a specific feature, following the naming convention `<number>-<short-name>`
  - Attributes: branch number, short name, associated spec directory path
  - Relationships: Has one spec directory (`specs/<number>-<short-name>/`); may have one GitHub issue; may have one PR

- **Spec-Kit Command**: Represents a workflow command with both numbered alias and original name
  - Attributes: step number (e.g., 2), substep number (e.g., 2.1), original name (e.g., specify), numbered alias (e.g., 2.specify)
  - Relationships: Commands form a sequence (1 → 2 → 3 → 4 → 5); some commands have substeps (2.1, 3.1, 4.1, 4.2)

- **GitHub Issue**: Represents a tracking issue for a feature
  - Attributes: issue number, title (feature name), body (checkbox list of tasks), state (open/closed)
  - Relationships: Linked to one feature branch; linked to one spec directory; may be closed by a PR

- **Workflow Mode**: Represents the execution mode for a spec-kit command
  - Attributes: mode type (Automatic or User-Guided), user preference
  - Relationships: Applies to a single command invocation; affects command behavior

## Success Criteria _(mandatory)_

### Measurable Outcomes

#### Phase 1 Success Criteria (P1)

- **SC-001**: The update-agent-context.sh script is 160 lines or less (80% reduction from 799 lines)
- **SC-002**: Running update-agent-context.sh synchronizes 100% of tracked package versions from package.json to CLAUDE.md with zero manual intervention
- **SC-003**: Claude automatically loads feature-specific context 100% of the time when working on a feature branch
- **SC-004**: Zero lines of code remain in update-agent-context.sh related to Gemini, Copilot, or Cursor agents

#### Phase 2 Success Criteria (P2)

- **SC-005**: 100% of package versions in CLAUDE.md include full semantic versioning (major.minor.patch) after running the script
- **SC-006**: Running the script without jq or perl installed produces a clear error message with installation instructions within 1 second
- **SC-007**: The test script validates version extraction with 100% test case coverage for specified edge cases
- **SC-008**: Running the script with --validate flag (if implemented) identifies 100% of unlisted packages in package.json

#### Phase 3 Success Criteria (P3)

- **SC-009**: 100% of spec-kit commands have both numbered aliases and original names available
- **SC-010**: Users are prompted to choose workflow mode at the start of 100% of spec-kit command invocations
- **SC-011**: GitHub issues are created automatically for 100% of successful task generations
- **SC-012**: 100% of Claude responses display the current git branch name at the end
- **SC-013**: PRs created by Claude include "Closes #<issue-number>" linking to the correct GitHub issue 100% of the time
- **SC-014**: Feature branches are created from main 100% of the time, preventing accidental branching from feature branches
- **SC-015**: Developers can complete a full feature workflow (specify → plan → tasks → implement → PR) with 50% fewer manual steps compared to current process

## Assumptions _(optional)_

### Phase 1 Assumptions

- **A-001**: Developers have jq and perl installed or can install them via package managers (documented in setup instructions)
- **A-002**: The CLAUDE.md Technology Stack section exists and follows the expected format for regex substitution
- **A-003**: Feature branches follow the naming convention `<number>-<short-name>` (e.g., 005-user-auth)
- **A-004**: The spec directory structure is `specs/<number>-<short-name>/` matching the branch name

### Phase 2 Assumptions

- **A-005**: Package.json follows standard npm format with valid JSON
- **A-006**: Developers understand semantic versioning conventions (major.minor.patch)
- **A-007**: The hardcoded package list in update-agent-context.sh is maintained as the tech stack evolves
- **A-008**: Test scripts can be run locally and in CI without complex setup

### Phase 3 Assumptions

- **A-009**: Developers have GitHub CLI (gh) installed and authenticated for issue and PR automation
- **A-010**: The repository has GitHub Actions or similar CI configured for running tests
- **A-011**: Users are familiar with git branching concepts (main branch, feature branches)
- **A-012**: The /next command can reliably determine the recommended next step based on current workflow state (e.g., checking for existence of spec.md, plan.md, tasks.md)
- **A-013**: Claude has permissions to create GitHub issues and PRs via the GitHub CLI
- **A-014**: The project constitution's "one feature branch at a time" principle is followed

### Technology Assumptions

- **A-015**: Bash is available on the development environment (macOS or Linux)
- **A-016**: Git is installed and configured
- **A-017**: The repository uses the spec-kit workflow structure with `.specify/` directory
- **A-018**: Node.js and npm are available for package.json operations

## Out of Scope _(optional)_

### Explicitly Excluded from All Phases

- **OS-001**: Automatic branch updates - Per user clarification answer 4.D, updating existing branches with latest main is excluded from this specification
- **OS-002**: Multi-agent support - The refactored script deliberately removes Gemini, Copilot, and Cursor support to simplify the codebase
- **OS-003**: Automatic merging of PRs - While PR creation is automated, merging requires manual review and approval (5.1.implement.merge is excluded per user clarification)
- **OS-004**: Rollback mechanisms - If a spec-kit command fails midway, manual cleanup is expected; automatic rollback is not included
- **OS-005**: Custom workflow ordering - The numbered commands suggest a standard order (1→2→3→4→5), but custom workflows (e.g., skipping steps) are not prevented

### Future Considerations

- **FC-001**: Integration with other CI/CD tools beyond GitHub Actions
- **FC-002**: Support for alternative package managers (yarn, pnpm) beyond npm
- **FC-003**: Automatic dependency updates (e.g., Dependabot integration)
- **FC-004**: Workflow analytics (e.g., tracking time spent in each phase, success rates)
- **FC-005**: Visual workflow dashboard showing current progress across all features

## Dependencies _(optional)_

### External Dependencies

- **D-001**: jq (JSON processor) - Required for parsing package.json
- **D-002**: perl - Required for regex-based CLAUDE.md updates
- **D-003**: git - Required for branch detection and workflow automation
- **D-004**: GitHub CLI (gh) - Required for Phase 3 issue and PR automation
- **D-005**: npm - Required for package.json operations

### Internal Dependencies

- **D-006**: `.specify/templates/` directory structure - Used by spec-kit commands
- **D-007**: CLAUDE.md - Must exist with Technology Stack section for Phase 1
- **D-008**: package.json - Must exist and be valid JSON for Phase 1 and Phase 2
- **D-009**: Existing spec-kit command structure - Numbered aliases build on existing commands for Phase 3

### Phase Dependencies

- **D-010**: Phase 2 depends on Phase 1 completion - Script must be simplified before adding enhancements
- **D-011**: Phase 3 does not depend on Phase 2 - Workflow improvements can be implemented independently
- **D-012**: All phases depend on PR 171 being merged - The 799→160 line simplification is the foundation
