# Feature Specification: Pre-Commit Quality Hooks

**Feature Branch**: `008-pre-commit-hooks`
**Created**: 2025-12-21
**Status**: Draft
**Input**: User description: "Create git hooks that will audit all unit, integration, and e2e tests ensuring they are meaningful and test for something useful. Ensure that before a PR is created, all tests are passing, there are no typescript type errors or warnings, no eslint errors or warnings, and no prettier errors or warnings."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Pre-Commit Code Quality Validation (Priority: P1)

As a developer, I want my code to be automatically validated for type errors, linting issues, and formatting problems before I can commit, so that I catch issues early and maintain code quality standards.

**Why this priority**: This is the foundation of the quality gate - catching issues at commit time prevents broken code from entering the repository.

**Independent Test**: Can be fully tested by attempting to commit code with type errors, lint errors, or formatting issues and verifying the commit is blocked with clear error messages.

**Acceptance Scenarios**:

1. **Given** code with type errors, **When** I attempt to commit, **Then** the commit is blocked and I see specific type error messages
2. **Given** code with lint errors, **When** I attempt to commit, **Then** the commit is blocked and I see specific lint error messages with fix suggestions
3. **Given** code with formatting issues, **When** I attempt to commit, **Then** the commit is blocked and I see which files need formatting
4. **Given** code that passes all checks, **When** I attempt to commit, **Then** the commit succeeds without intervention

---

### User Story 2 - Pre-Push Test Validation (Priority: P2)

As a developer, I want all tests to run and pass before I can push my changes, so that I don't push broken code that will fail CI.

**Why this priority**: Running tests before push ensures the remote repository always has passing tests, reducing CI failures and wasted pipeline resources.

**Independent Test**: Can be tested by attempting to push with failing tests and verifying the push is blocked with test failure details.

**Acceptance Scenarios**:

1. **Given** failing unit tests, **When** I attempt to push, **Then** the push is blocked and I see which tests failed with failure reasons
2. **Given** failing integration tests, **When** I attempt to push, **Then** the push is blocked and I see which integration tests failed
3. **Given** all tests passing, **When** I attempt to push, **Then** the push succeeds
4. **Given** a push to a feature branch with failing tests, **When** I want to bypass temporarily, **Then** I can use an explicit override flag

---

### User Story 3 - Test Quality Audit (Priority: P3)

As a developer, I want a way to audit existing tests to ensure they are meaningful and actually test the features they claim to test, so that I can trust the test suite catches real bugs.

**Why this priority**: This ensures tests provide real value rather than just passing without validating behavior.

**Independent Test**: Can be tested by running the audit tool and verifying it identifies tests that don't make meaningful assertions.

**Acceptance Scenarios**:

1. **Given** a test that has no assertions, **When** I run the test audit, **Then** it is flagged as potentially meaningless
2. **Given** a test that only checks truthy values without behavior validation, **When** I run the test audit, **Then** it is flagged for review
3. **Given** a well-written test with meaningful assertions, **When** I run the test audit, **Then** it passes validation
4. **Given** audit findings, **When** I review them, **Then** I see specific suggestions for improving each flagged test

---

### User Story 4 - Commit Message Validation (Priority: P2)

As a developer, I want my commit messages to be validated against project standards before the commit is accepted, so that all commits follow consistent formatting and documentation rules.

**Why this priority**: Consistent commit messages improve project history readability and ensure compliance with project standards defined in .claude/rules.md.

**Independent Test**: Can be tested by attempting commits with invalid messages (too long, wrong format, multiple responsibilities mentioned) and verifying they are rejected with specific guidance.

**Acceptance Scenarios**:

1. **Given** a commit message exceeding 72 characters in the subject line, **When** I attempt to commit, **Then** the commit is blocked and I see the character limit violation
2. **Given** a commit message not in imperative mood, **When** I attempt to commit, **Then** the commit is blocked with guidance to use imperative form
3. **Given** a commit message mentioning multiple changes (indicating multiple responsibilities), **When** I attempt to commit, **Then** I receive a warning about atomic commits
4. **Given** a commit body with content other than the required co-author tag, **When** I attempt to commit, **Then** the commit is blocked with the correct format shown
5. **Given** a properly formatted commit message, **When** I attempt to commit, **Then** the commit proceeds to other validation checks

---

### User Story 5 - Fix Suggestions for Implementation Code (Priority: P4)

As a developer, when tests fail before PR creation, I want to receive suggestions for fixing the implementation code (not just the tests), so that I can quickly resolve issues and proceed with my PR.

**Why this priority**: This accelerates the feedback loop by providing actionable guidance rather than just error messages.

**Independent Test**: Can be tested by introducing a bug that causes test failure and verifying the output includes suggestions for fixing the implementation.

**Acceptance Scenarios**:

1. **Given** a test failure due to incorrect return value, **When** I see the failure output, **Then** I see a suggestion pointing to the likely implementation issue
2. **Given** a type error in implementation code, **When** I see the error output, **Then** I see which file and line needs correction
3. **Given** multiple related failures, **When** I see the output, **Then** failures are grouped by likely root cause

---

### Edge Cases

- What happens when a developer needs to commit work-in-progress code that doesn't pass all checks? A `--no-verify` bypass is available but logged
- What happens when tests are flaky (intermittent failures)? Failed tests are retried once; if retry passes, push proceeds with a warning about potential flakiness
- What happens when the hook itself has errors? Clear error messages should indicate hook problems vs code problems
- What happens on a fresh clone before hooks are set up? The setup script should be part of the install process

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST run type checking on staged files before allowing commits
- **FR-002**: System MUST run linting on staged files before allowing commits
- **FR-003**: System MUST verify code formatting on staged files before allowing commits
- **FR-004**: System MUST run unit and integration test suites before allowing pushes (e2e tests run in CI only)
- **FR-004a**: System MUST retry failed tests once before blocking push (to handle transient failures)
- **FR-005**: System MUST display clear, actionable error messages when validation fails
- **FR-006**: System MUST provide a bypass mechanism for exceptional cases (with explicit flag)
- **FR-007**: System MUST run test audit as part of pre-push hook (before test execution) to identify tests without meaningful assertions
- **FR-007a**: System MUST block push when newly added tests lack meaningful assertions
- **FR-007b**: System MUST warn (but allow push) when existing tests lack meaningful assertions
- **FR-008**: System MUST provide suggestions for fixing implementation code when tests fail
- **FR-009**: System MUST automatically configure hooks when dependencies are installed
- **FR-010**: System MUST support running checks on only changed files for performance
- **FR-011**: System MUST exit with appropriate status codes (0 for success, non-zero for failure)
- **FR-012**: System MUST group related errors by root cause when possible
- **FR-013**: System MUST validate commit message subject line is 72 characters or fewer
- **FR-014**: System MUST validate commit message uses imperative mood (via pattern matching for common non-imperative prefixes like "Added", "Fixed", "Updated")
- **FR-015**: System MUST warn when commit message suggests multiple responsibilities
- **FR-016**: System MUST validate commit body format matches project standards
- **FR-017**: System MUST reference project rules file when showing commit message errors

### Key Entities

- **Pre-Commit Hook**: Runs before each commit to validate code quality (types, lint, format)
- **Commit-Msg Hook**: Runs after commit message is entered to validate message format against project rules
- **Pre-Push Hook**: Runs before each push to validate all tests pass
- **Test Audit Report**: Output from test quality analysis identifying weak or meaningless tests
- **Fix Suggestion**: Actionable recommendation for resolving a detected issue
- **Project Rules**: Configuration file defining commit message standards and other project conventions

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Zero commits with type errors, lint errors, or formatting issues reach the repository
- **SC-002**: Zero pushes with failing tests reach the remote repository (without explicit bypass)
- **SC-003**: Pre-commit hooks complete validation in under 30 seconds for typical changes
- **SC-004**: Pre-push hooks complete unit and integration tests in under 5 minutes
- **SC-005**: 100% of test files are analyzed by the test audit tool
- **SC-006**: Developers receive fix suggestions for 80% of common failure patterns
- **SC-007**: Hook setup requires zero manual configuration after initial project setup
- **SC-008**: Build failures in CI pipeline reduce by 75% due to early local validation
- **SC-009**: 100% of commits follow project commit message standards (subject length, format, body)
- **SC-010**: Commit message validation completes in under 1 second

## Clarifications

### Session 2025-12-21

- Q: When should the test audit run? → A: As part of pre-push hook (before tests run)
- Q: Should test audit findings block push or warn? → A: Block on new tests only, warn on existing
- Q: How should the system handle flaky tests? → A: Retry once before failing
- Q: Should e2e tests run in pre-push hook? → A: No, e2e runs in CI only (unit + integration locally)
- Q: How should imperative mood be validated? → A: Simple pattern match (detect common non-imperative prefixes like "Added", "Fixed")

## Assumptions

- Developers have standard development tools installed (Node.js, npm)
- The project already has type checking, linting, and formatting tools configured
- Tests are organized in standard locations (tests/, **tests**, \*.test.ts, etc.)
- Git hooks can be configured via the .githooks directory pattern already in use
- Bypass flags are used responsibly and only for exceptional circumstances
- Project commit message rules are defined in .claude/rules.md and are the source of truth for validation
