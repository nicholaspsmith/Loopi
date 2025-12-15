---
description: Convert existing tasks into actionable, dependency-ordered beads issues for the feature based on available design artifacts.
---

## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Outline

1. Run `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` from repo root and parse FEATURE_DIR and AVAILABLE_DOCS list. All paths must be absolute. For single quotes in args like "I'm Groot", use escape syntax: e.g 'I'\''m Groot' (or double-quote if possible: "I'm Groot").
1. From the executed script, extract the path to **tasks**.
1. For each task in the list, use the `bd create` command to create a new beads issue:

```bash
bd create "Task title" --json
```

> [!IMPORTANT]
> - Use `bd create` with `--json` flag for programmatic output
> - Task titles should be clear and actionable
> - Use appropriate flags like `--priority`, `--type`, `--deps` as needed
> - All issues are automatically tracked in `.beads/issues.jsonl`
