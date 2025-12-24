# Claude Code Commands

This directory contains numbered symlinks that provide quick access to spec-kit workflow commands.

## Symlink Structure

The numbered prefixes create a logical workflow order:

```
1.constitution.md    -> speckit.constitution.md
2.specify.md         -> speckit.specify.md
2.1.clarify.md       -> speckit.clarify.md
3.plan.md            -> speckit.plan.md
3.1.validate.md      -> speckit.plan.validate.md
4.tasks.md           -> speckit.tasks.md
5.implement.md       -> speckit.implement.md
6.analyze.md         -> speckit.analyze.md
7.checklist.md       -> speckit.checklist.md
8.taskstoissues.md   -> speckit.taskstoissues.md
```

This allows you to type `/2` and get autocomplete for `specify`, `/3` for `plan`, etc.

## Windows Setup

**Symlinks require Developer Mode on Windows 10/11.**

### Option 1: Enable Developer Mode (Recommended)

1. Open **Settings** → **Update & Security** → **For developers**
2. Toggle **Developer Mode** to **On**
3. Restart if prompted
4. Re-clone the repository to properly create symlinks

### Option 2: Use WSL2

Clone and work with the repository inside Windows Subsystem for Linux 2.

### Option 3: Manual Copying (Not Recommended)

If you cannot enable Developer Mode, you can manually copy files:

```bash
# PowerShell
cd .claude/commands
Copy-Item speckit.constitution.md 1.constitution.md
Copy-Item speckit.specify.md 2.specify.md
Copy-Item speckit.clarify.md 2.1.clarify.md
Copy-Item speckit.plan.md 3.plan.md
Copy-Item speckit.plan.validate.md 3.1.validate.md
Copy-Item speckit.tasks.md 4.tasks.md
Copy-Item speckit.implement.md 5.implement.md
Copy-Item speckit.analyze.md 6.analyze.md
Copy-Item speckit.checklist.md 7.checklist.md
Copy-Item speckit.taskstoissues.md 8.taskstoissues.md
```

**Warning**: Manual copies will become outdated when the original files are updated. You'll need to re-copy after pulling changes.

## Verifying Symlinks

To verify symlinks are working correctly:

```bash
# Linux/macOS
ls -la .claude/commands/*.md | head -5

# Should show arrows (->) pointing to target files
# Example: 1.constitution.md -> speckit.constitution.md

# Windows PowerShell
Get-ChildItem .claude/commands/*.md | Select-Object Name, Target | Format-Table

# Target column should show the actual file names
```

## CI Validation

GitHub Actions CI includes a symlink validation step that checks:

- All symlinks exist and aren't broken
- Target files are present
- Repository structure is intact

If CI fails with symlink errors, check that:

1. All `speckit.*.md` files exist
2. Symlinks point to the correct targets
3. No files were accidentally deleted or renamed
