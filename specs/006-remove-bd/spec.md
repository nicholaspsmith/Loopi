# Feature Specification: Remove Beads (bd) Integration

**Feature Branch**: `006-remove-bd`
**Created**: 2025-12-21
**Status**: Draft
**Input**: User description: "Remove bd integration completely. Uninstall library, update all files in .claude/commands where we mention bd. We want to use tasks.md inside each feature's spec folder to keep track of tasks."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Simplified Task Tracking (Priority: P1)

As a developer, I want all task tracking to happen in a single location (`specs/[feature]/tasks.md`) so that I don't need to manage multiple systems or install additional tools.

**Why this priority**: This is the core value proposition - eliminating complexity by removing an unnecessary layer of tooling and consolidating task tracking.

**Independent Test**: Can be fully tested by verifying that all task management happens through tasks.md files and no bd commands are required or referenced.

**Acceptance Scenarios**:

1. **Given** a feature with tasks defined, **When** I want to track progress, **Then** I can do so entirely through the tasks.md file using checkbox syntax (`- [ ]` / `- [x]`)
2. **Given** the codebase after this change, **When** I search for bd or beads references, **Then** no functional references exist in command files
3. **Given** a new clone of the repository, **When** I start working on features, **Then** I do not need to install any additional task tracking tools

---

### User Story 2 - Clean Uninstallation (Priority: P2)

As a developer, I want all traces of the bd library removed from the project so that there are no orphaned dependencies or configuration files.

**Why this priority**: Ensures a clean codebase without leftover artifacts that could cause confusion.

**Independent Test**: Can be tested by verifying no bd-related packages exist in package.json and no .beads directory exists.

**Acceptance Scenarios**:

1. **Given** the current project with bd installed, **When** the removal is complete, **Then** no bd-related entries exist in package.json or package-lock.json
2. **Given** the project root, **When** I check for .beads directory, **Then** it does not exist
3. **Given** the project, **When** I run `npm install`, **Then** no bd-related packages are installed

---

### User Story 3 - Updated Documentation (Priority: P3)

As a developer using speckit commands, I want all command documentation to reflect the simplified task tracking approach so that instructions are accurate and don't reference removed tools.

**Why this priority**: Documentation accuracy is important but secondary to functional changes.

**Independent Test**: Can be tested by reviewing all .claude/commands files and verifying no bd references exist.

**Acceptance Scenarios**:

1. **Given** the speckit.taskstoissues.md command, **When** I read it, **Then** it only references GitHub Issues and tasks.md (no bd mentions)
2. **Given** any .claude/commands file, **When** I search for "bd" or "beads", **Then** no matches are found

---

### Edge Cases

- What happens if .beads directory doesn't exist? No action needed, skip gracefully
- What happens if bd is not in package.json? No action needed, skip gracefully

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST remove all bd/beads package references from package.json
- **FR-002**: System MUST remove .beads directory if it exists
- **FR-003**: System MUST update speckit.taskstoissues.md to use only GitHub Issues and tasks.md for tracking
- **FR-004**: System MUST ensure no .claude/commands files reference bd or beads tools
- **FR-005**: Task tracking MUST be consolidated to use `specs/[feature]/tasks.md` with markdown checkboxes

### Key Entities

- **tasks.md**: Markdown file containing task checkboxes, located at `specs/[feature-name]/tasks.md`
- **GitHub Issues**: High-level feature/milestone tracking (optional, for visibility)

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Zero references to "bd" or "beads" exist in .claude/commands directory
- **SC-002**: No bd-related packages exist in package.json dependencies
- **SC-003**: No .beads directory exists in project root
- **SC-004**: All task tracking can be performed using only tasks.md files and standard git operations
- **SC-005**: New contributors can start working without installing any task tracking tools beyond git

## Assumptions

- The bd library was installed as a dev dependency (if at all)
- The .beads directory may or may not exist depending on prior usage
- GitHub Issues integration for high-level tracking remains useful and should be preserved
- The speckit.taskstoissues.md command should be updated rather than deleted, as GitHub Issues tracking is still valuable
