---
description: Audit and validate the implementation plan for completeness, clarity, and task-readiness.
handoffs:
  - label: Improve Plan
    agent: speckit.plan
    prompt: Improve the plan based on validation findings
    send: false
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Goal

Audit the implementation plan (`plan.md`) and associated design artifacts to ensure:

- Sufficient detail for task generation
- Clear references between core implementation steps and implementation details
- Obvious task sequences are documented
- No gaps or ambiguities that would block implementation

## Execution Steps

### 1. Load Context

Run `.specify/scripts/bash/check-prerequisites.sh --json` from repo root and parse JSON for FEATURE_DIR and AVAILABLE_DOCS.

For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

Load the following files from FEATURE_DIR:

- **Required**: `plan.md`, `spec.md`
- **Optional**: `data-model.md`, `contracts/`, `research.md`, `quickstart.md`

### 2. Validation Checks

#### A. Plan Completeness

- [ ] Does Technical Context resolve all NEEDS CLARIFICATION items?
- [ ] Are all dependencies from spec.md addressed in plan?
- [ ] Does Constitution Check section exist and pass all gates?
- [ ] Are all design artifacts referenced (data-model.md, contracts/, etc.)?

#### B. Implementation Detail Referencing

- [ ] Does Core Implementation reference specific sections of implementation details?
- [ ] Can you trace from each core step to the detailed design?
- [ ] Are file paths and module names specific enough?
- [ ] Do refinement sections have clear implementation guidance?

Example of GOOD referencing:

```
**Step 2**: Implement authentication (see `Authentication` in implementation details below)
```

Example of BAD referencing:

```
**Step 2**: Implement authentication
```

#### C. Task Sequence Clarity

- [ ] Is there an obvious sequence of tasks from reading the plan?
- [ ] Are blocking dependencies explicitly called out?
- [ ] Can parallel work opportunities be identified?
- [ ] Are setup/foundational tasks clear?

#### D. Constitution Alignment

- [ ] Does plan follow Documentation-First principle?
- [ ] Does plan include TDD approach?
- [ ] Are modules/components clearly separated?
- [ ] Is complexity justified or YAGNI principle violated?
- [ ] Is observability built in?

#### E. Gap Analysis

- [ ] Are there functional requirements in spec.md without implementation plan?
- [ ] Are there entities in data-model.md without CRUD operations planned?
- [ ] Are there contracts without implementation guidance?
- [ ] Are there edge cases without handling strategy?

### 3. Generate Validation Report

Output a structured report:

## Plan Validation Report

### Summary

- Plan file: `{path}`
- Spec file: `{path}`
- Available artifacts: {list}
- Overall status: ✅ Ready | ⚠️ Needs improvement | ❌ Blocking issues

### Findings

| ID  | Category    | Severity | Issue                                                               | Recommendation                                                 |
| --- | ----------- | -------- | ------------------------------------------------------------------- | -------------------------------------------------------------- |
| V1  | Referencing | HIGH     | Core Implementation step 3 doesn't reference implementation details | Add reference: "see Database Schema in implementation details" |
| V2  | Gaps        | CRITICAL | No implementation plan for FR-005 (password reset)                  | Add password reset flow to Core Implementation                 |

**Severity Levels:**

- **CRITICAL**: Blocks task generation or implementation
- **HIGH**: Will cause confusion during implementation
- **MEDIUM**: Reduces clarity but workable
- **LOW**: Minor improvement opportunity

### Task Sequence Preview

Based on the plan, here's the obvious task sequence:

**Setup Phase:**

- Initialize project structure
- Install dependencies
- Configure environment

**Foundational Phase:**

- Set up database schema
- Create authentication middleware
- Configure API routing

**User Story Phases:**

- {List obvious groupings}

**Gaps**: {Any missing obvious tasks}

### Constitution Compliance

| Principle           | Status | Notes                              |
| ------------------- | ------ | ---------------------------------- |
| Documentation-First | ✅     | Spec complete before plan          |
| TDD                 | ⚠️     | No test strategy mentioned in plan |
| Modularity          | ✅     | Clear component separation         |
| Simplicity          | ✅     | No over-engineering detected       |
| Observability       | ❌     | No logging strategy                |
| Commit Discipline   | ✅     | Referenced in plan                 |

### Recommendations

**Priority 1 (Critical):**

1. {Critical fixes needed}

**Priority 2 (High):**

1. {Important improvements}

**Priority 3 (Medium/Low):**

1. {Nice-to-have enhancements}

### Next Actions

- [ ] If CRITICAL issues: Fix before running `/speckit.tasks`
- [ ] If HIGH issues: Strongly recommend fixing
- [ ] If only MEDIUM/LOW: May proceed but document assumptions
- [ ] Ready for `/speckit.tasks`: {YES/NO}

### Detailed Validation Results

#### Implementation Detail References

{For each core implementation step, check if it references details}

#### Gap Analysis

{List requirements/entities/contracts without implementation}

#### Task Sequence Clarity

{Evaluate if task order is obvious from plan}

## Operating Principles

- **Read-only**: Do NOT modify any files
- **Actionable**: Every finding must have a clear recommendation
- **Specific**: Cite exact sections, line numbers where possible
- **Constitution-aware**: Constitution violations are always CRITICAL
- **Task-focused**: Validate that plan is detailed enough for task generation

## Output

After validation, ask user:

1. "Would you like me to suggest specific improvements to plan.md?"
2. "Should I proceed to `/speckit.tasks` despite any findings?"
3. "Would you like me to create a remediation checklist?"
