# Quickstart: Pre-Commit Quality Hooks

## Prerequisites

- Node.js 20+
- npm
- Git repository initialized

## Installation

After this feature is implemented, hooks auto-configure on `npm install`:

```bash
# Clone and install
git clone <repo>
cd memoryloop
npm install  # Hooks auto-configured via prepare script
```

## Manual Setup (if needed)

```bash
# Configure git to use .githooks directory
git config core.hooksPath .githooks

# Verify configuration
git config core.hooksPath  # Should output: .githooks
```

## How It Works

### On Every Commit

1. **Pre-commit hook** runs:
   - TypeScript type checking (`tsc --noEmit`)
   - ESLint on staged files
   - Prettier formatting check

2. **Commit-msg hook** validates:
   - Subject line ≤ 72 characters
   - Imperative mood (no "Added", "Fixed")
   - Body format matches `.claude/rules.md`

### On Every Push

1. **Pre-push hook** runs:
   - Test quality audit (blocks new tests without assertions)
   - Unit tests (`npm test`)
   - Integration tests (`npm run test:integration`)
   - Retry once on failure before blocking

## Bypass (Emergency Only)

```bash
# Skip all hooks (use sparingly!)
git commit --no-verify -m "WIP: emergency fix"
git push --no-verify
```

## Troubleshooting

### Hooks not running?

```bash
# Check hooks path
git config core.hooksPath

# Should be: .githooks
# If empty, run:
git config core.hooksPath .githooks
```

### Type errors blocking commit?

```bash
# Run type check to see all errors
npm run typecheck

# Fix errors, then commit
```

### Commit message rejected?

Check `.claude/rules.md` for format requirements:

- Subject: imperative mood, ≤72 chars
- Body: only Co-Authored-By line

### Tests failing on push?

```bash
# Run tests locally first
npm test
npm run test:integration
```

## Development

### Testing hooks locally

```bash
# Test pre-commit manually
.githooks/pre-commit

# Test commit-msg with a sample message
echo "Add new feature" > /tmp/msg
.githooks/commit-msg /tmp/msg

# Test pre-push manually
.githooks/pre-push
```

### Adding new validation rules

1. Commit message rules: Edit `scripts/hooks/commit-msg-validator.ts`
2. Test quality rules: Edit `eslint.config.mjs` (vitest plugin rules)
3. Lint rules: Edit `eslint.config.mjs`

## Verification

After installation, verify hooks are working:

```bash
# 1. Check hooks are configured
git config core.hooksPath  # Should output: .githooks

# 2. Test commit-msg validation
echo "Add test" > /tmp/msg && npx tsx scripts/hooks/commit-msg-validator.ts /tmp/msg

# 3. Test with an actual commit
git add -A && git commit -m "Test commit"  # Should run pre-commit + commit-msg hooks
```
