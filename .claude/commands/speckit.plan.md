---
description: Execute the implementation planning workflow using the plan template to generate design artifacts.
handoffs:
  - label: Create Tasks
    agent: speckit.tasks
    prompt: Break the plan into tasks
    send: true
  - label: Create Checklist
    agent: speckit.checklist
    prompt: Create a checklist for the following domain...
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. **Setup**: Run `.specify/scripts/bash/setup-plan.sh --json` from repo root and parse JSON for FEATURE_SPEC, IMPL_PLAN, SPECS_DIR, BRANCH. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").

2. **Load context**: Read FEATURE_SPEC and `.specify/memory/constitution.md`. Load IMPL_PLAN template (already copied).

3. **Execute plan workflow**: Follow the structure in IMPL_PLAN template to:
   - Fill Technical Context (mark unknowns as "NEEDS CLARIFICATION")
   - Fill Constitution Check section from constitution
   - Evaluate gates (ERROR if violations unjustified)
   - Phase 0: Generate research.md (resolve all NEEDS CLARIFICATION)
   - Phase 1: Generate data-model.md, contracts/, quickstart.md
   - Sync package versions: Run `.specify/scripts/bash/update-agent-context.sh` to ensure CLAUDE.md has current dependency versions
   - Re-evaluate Constitution Check post-design

4. **Stop and report**: Command ends after Phase 2 planning. Report branch, IMPL_PLAN path, and generated artifacts.

5. **Branch Footer**:

   After all other output is complete, run `.specify/scripts/bash/get-current-branch.sh --format footer` and display the result as the final line of your response.

## Phases

### Phase 0: Outline & Research

1. **Extract unknowns from Technical Context** above:
   - For each NEEDS CLARIFICATION → research task
   - For each dependency → best practices task
   - For each integration → patterns task

2. **Generate and dispatch research agents**:

   ```text
   For each unknown in Technical Context:
     Task: "Research {unknown} for {feature context}"
   For each technology choice:
     Task: "Find best practices for {tech} in {domain}"
   ```

3. **Consolidate findings** in `research.md` using format:
   - Decision: [what was chosen]
   - Rationale: [why chosen]
   - Alternatives considered: [what else evaluated]

**Output**: research.md with all NEEDS CLARIFICATION resolved

### Phase 1: Design & Contracts

**Prerequisites:** `research.md` complete

1. **Extract entities from feature spec** → `data-model.md`:
   - Entity name, fields, relationships
   - Validation rules from requirements
   - State transitions if applicable

2. **Generate API contracts** from functional requirements:
   - For each user action → endpoint
   - Use standard REST/GraphQL patterns
   - Output OpenAPI/GraphQL schema to `/contracts/`

3. **Sync package versions and update agent context**:
   - Run `.specify/scripts/bash/update-agent-context.sh`
   - Updates CLAUDE.md Technology Stack with current versions from package.json
   - Updates CLAUDE.md Active Technologies with tech stack from plan.md files
   - Updates CLAUDE.md Recent Changes with last 3 features
   - Ensures Claude has accurate dependency info and feature context for planning decisions

**Output**: data-model.md, /contracts/\*, quickstart.md

## Key rules

- Use absolute paths
- ERROR on gate failures or unresolved clarifications

## Next Steps

After completion, use AskUserQuestion to ask what to do next:

**Question**: "Implementation plan complete! What would you like to do next?"

**Options**:

- **Generate Tasks** (`/4.tasks`): Create detailed task breakdown
- **Validate Plan** (`/3.1.validate`): Audit plan for completeness
- **Review Plan**: I'll review the plan myself before continuing
- **Exit**: I'm done for now

- Execute the selected command if applicable
