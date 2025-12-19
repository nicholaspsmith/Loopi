---
description: Convert existing tasks into a two-tier issue system - high-level GitHub issues as parents with detailed beads (bd) issues as children.
tools: ['github/github-mcp-server/issue_write']
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Overview

This command creates a two-tier issue tracking system:

- **GitHub Issues**: High-level parent issues for phases/features (e.g., "Phase 3: Implement User Interface for AI Chat")
- **Beads Issues**: Detailed, actionable tasks tracked locally with `bd`

Each GitHub issue contains a checklist of bd tasks showing their complete/incomplete status.

## Outline

1. Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

2. From the executed script, extract the path to **tasks**.

3. Get the Git remote by running:

```bash
git config --get remote.origin.url
```

> [!CAUTION]
> ONLY PROCEED TO NEXT STEPS IF THE REMOTE IS A GITHUB URL

4. **Analyze and group tasks** into high-level features/phases:
   - Look for common prefixes, phases, or user stories in task names
   - Group related tasks together (e.g., all "Phase 3" tasks, all "US1" tasks)
   - Typical groupings: by phase, by user story, by feature area, by component

5. **For each high-level group**, create a GitHub issue:
   - Title: High-level feature/phase name (e.g., "Phase 3: User Authentication (US1)")
   - Body: Include:
     - ## Overview section with feature/phase description
     - ## Tasks section with FULL checklist of all individual tasks
     - Each task in format: `- [ ] T### [P] [tags] Task title with full description`
     - **Status:** `X/Y tasks completed` (with ✅ if all complete)
     - ## Local Task Tracking section with bd commands
   - Labels: Add appropriate labels (phase, feature, etc.) if available

6. **For each individual task**, create a bd issue:

   ```bash
   bd create "Task title" --json --priority <0-4> --type <task|bug|feature>
   ```

   - Parse the JSON output to get the issue ID (e.g., `memoryloop-1`)
   - Store the mapping between task number and bd issue ID

7. **Checklist format requirements:**
   - Use `- [ ]` for incomplete tasks and `- [x]` for completed tasks
   - Include task number: `T001`, `T032`, etc.
   - Include all tags from original task: `[P]` for parallel, `[US1]` for user story
   - Include full task description with file paths when relevant
   - Example: `- [ ] T032 [P] [US1] Contract test for POST /api/auth/signin in tests/contract/auth.test.ts`

8. **Output summary**:
   - Total GitHub issues created
   - Total bd issues created
   - Mapping of GitHub issues to bd issue ranges

## Example Output

### GitHub Issue Example

**Title:** Phase 3: User Authentication (US1)

**Body:**

```markdown
## Overview

Implement user authentication system with login, signup, and session management.

## Tasks

- [ ] T032 [P] [US1] Contract test for POST /api/auth/signin in tests/contract/auth.test.ts
- [ ] T033 [P] [US1] Contract test for POST /api/auth/signup in tests/contract/auth.test.ts
- [ ] T034 [P] [US1] Create LoginForm component in components/auth/LoginForm.tsx
- [ ] T035 [P] [US1] Create SignupForm component in components/auth/SignupForm.tsx
- [ ] T036 [US1] Configure NextAuth.js 5 in auth.ts

**Status:** 0/5 tasks completed

## Local Task Tracking

These tasks are tracked locally with beads. Run:

- `bd list` - View all tasks
- `bd ready` - View ready-to-work tasks
- `bd show memoryloop-<id>` - View task details
- `bd update memoryloop-<id> --status in_progress` - Claim a task
```

**Labels:** phase-3, user-story-1, authentication

## Important Notes

> [!IMPORTANT]
>
> - GitHub issues are **high-level tracking** only - don't create individual GitHub issues for each task
> - Beads (bd) issues are the **source of truth** for task details and status
> - Update GitHub issue checklists when bd tasks are completed
> - Use `bd create` with `--json` flag for programmatic output
> - All bd issues are automatically tracked in `.beads/issues.jsonl` and synced with git

> [!CAUTION]
> UNDER NO CIRCUMSTANCES EVER CREATE GITHUB ISSUES IN REPOSITORIES THAT DO NOT MATCH THE REMOTE URL
