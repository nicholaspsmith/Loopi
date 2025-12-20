# GitHub Branch Protection Setup

This document describes how to configure branch protection rules for the `main` branch to enforce CI checks before merging.

## Setup Instructions

Navigate to: **Settings → Branches → Add branch protection rule**

### 1. Branch Name Pattern

- **Branch name pattern**: `main`

### 2. Required Settings

Enable the following options:

#### ✅ Require a pull request before merging

- **Required approvals**: 0 (for solo developer) or 1+ (for team)
- ☑️ Dismiss stale pull request approvals when new commits are pushed
- ☑️ Require review from Code Owners (if using CODEOWNERS file)

#### ✅ Require status checks to pass before merging

- ☑️ Require branches to be up to date before merging
- **Status checks that are required**:
  - `Lint & Format Check` (from ci.yml)
  - `Type Check` (from ci.yml)
  - `Unit & Integration Tests` (from ci.yml)
  - `Build Next.js App` (from ci.yml)
  - `E2E Tests (Playwright)` (from integration.yml) - optional for faster iteration

**Note**: Status checks won't appear until you've run the workflows at least once. Push a commit to trigger the workflows, then return to add these checks.

#### ✅ Require conversation resolution before merging

- Ensures all review comments are addressed before merge

#### ✅ Require linear history (Optional but Recommended)

- Enforces rebase/squash merges, keeps commit history clean

#### ✅ Include administrators

- Applies rules to repository administrators as well

#### ❌ Allow force pushes (Leave Unchecked)

- Prevents `git push --force` to main branch

#### ❌ Allow deletions (Leave Unchecked)

- Prevents accidental branch deletion

### 3. Recommended Additional Settings

#### Require deployments to succeed before merging (Optional)

- Useful if using GitHub Environments for staging deployments

#### Restrict who can push to matching branches (Optional for Team)

- Limit direct pushes to main to specific teams/users

## Visual Checklist

After setup, your branch protection rule should show:

```
✅ Require a pull request before merging
  ✅ Require approvals (0 or more)
  ✅ Dismiss stale pull request approvals

✅ Require status checks to pass before merging
  ✅ Require branches to be up to date
  Status checks:
    - ✅ Lint & Format Check
    - ✅ Type Check
    - ✅ Unit & Integration Tests
    - ✅ Build Next.js App

✅ Require conversation resolution before merging
✅ Require linear history
✅ Include administrators

❌ Allow force pushes (disabled)
❌ Allow deletions (disabled)
```

## Testing Branch Protection

### Test that CI blocks failing code:

1. Create a feature branch:

   ```bash
   git checkout -b test-branch-protection
   ```

2. Introduce a lint error:

   ```typescript
   // Add to any file:
   const unused_variable = 123
   ```

3. Commit and push:

   ```bash
   git add .
   git commit -m "Test branch protection"
   git push origin test-branch-protection
   ```

4. Create a PR on GitHub

5. **Expected behavior**:
   - CI workflow runs automatically
   - Lint check fails
   - PR merge button is **disabled** or shows "Merging is blocked"
   - Red X appears next to failed check

6. Fix the error, push again, verify checks pass and merge is enabled

## Workflow Status Badges

Add status badges to README.md to show CI health:

```markdown
![CI](https://github.com/nicholaspsmith/memoryloop/actions/workflows/ci.yml/badge.svg)
![Integration Tests](https://github.com/nicholaspsmith/memoryloop/actions/workflows/integration.yml/badge.svg)
![Deployment](https://github.com/nicholaspsmith/memoryloop/actions/workflows/deploy.yml/badge.svg)
```

## Troubleshooting

### Status checks not appearing

- **Cause**: Workflows haven't run yet
- **Fix**: Push a commit to trigger workflows, wait for completion, then return to branch protection settings

### PR can be merged despite failing checks

- **Cause**: "Require status checks to pass before merging" not enabled
- **Fix**: Enable this option and select the required checks

### Checks always out of date

- **Cause**: "Require branches to be up to date" is enabled
- **Fix**: Merge main into your branch, or click "Update branch" button on PR

## References

- [GitHub Docs: Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Docs: Status Checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks)
