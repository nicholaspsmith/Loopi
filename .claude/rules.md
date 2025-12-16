# Project Rules for Claude Code

## Git Commit Rules

1. **Maximum Commit Message Length**: 100 characters for commit message
2. **No AI Attribution**: Do not mention "Generated with Claude Code" or similar AI attribution in commit messages
3. **Co-Author Tags Allowed**: You may include "Co-Authored-By: Claude <noreply@anthropic.com>" tags
4. **One Individual Change Per Commit**: Each commit should have a single responsibility. If multiple actions have been performed, create a separate commit for each.

### Good Examples

```
Add forgot password feature task; Co-Authored-By: Claude <noreply@anthropic.com>
```

```
Implement embeddings and conversation persistence
```

```
Fixed async embedding generation in message creation; Co-Authored-By: Claude
```

```
Added comprehensive integration tests.
Co-Authored-By: Claude <noreply@anthropic.com>
```

### Bad Examples

```
Add forgot password feature task (memoryloop-h2ng) - Created beads task and GitHub issue #154

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

```
Implement embeddings and conversation persistence
Fixed async embeddings generation in message creation
Added comprehensive integration tests.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

## Remember

- Keep commits focused and atomic
- Write clear, imperative commit messages ("Add feature" not "Added feature")
- Commit message must be under 100 characters
- Reference issue/task numbers in commit body if needed, not subject line
- Detailed descriptions belong in commit body, not subject
