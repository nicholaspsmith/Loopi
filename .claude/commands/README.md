# Claude Code Commands

This directory contains numbered symlinks that provide quick access to spec-kit workflow commands.

## Symlink Structure

The numbered prefixes create a logical workflow order:

```
1.constitution.md    -> speckit.constitution.md
2.specify.md         -> speckit.specify.md
2.1.clarify.md       -> speckit.clarify.md
2.2.checklist.md     -> speckit.checklist.md
3.plan.md            -> speckit.plan.md
3.1.validate.md      -> speckit.plan.validate.md
4.tasks.md           -> speckit.tasks.md
4.1.analyze.md       -> speckit.analyze.md
4.2.taskstoissues.md -> speckit.taskstoissues.md
5.implement.md       -> speckit.implement.md
```

This allows you to type `/2` and get autocomplete for `specify`, `/3` for `plan`, etc.

## CI Validation

GitHub Actions CI includes a symlink validation step that checks:

- All symlinks exist and aren't broken
- Target files are present
- Repository structure is intact

If CI fails with symlink errors, check that:

1. All `speckit.*.md` files exist
2. Symlinks point to the correct targets
3. No files were accidentally deleted or renamed
