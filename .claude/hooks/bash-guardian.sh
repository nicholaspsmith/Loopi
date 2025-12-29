#!/bin/bash
# Bash Guardian Hook
# Intercepts Bash commands and suggests git-agent for git operations
# Uses jq for safe JSON parsing

set -euo pipefail

# Read JSON input from stdin
input=$(cat)

# Validate input is JSON
if ! echo "$input" | jq empty 2>/dev/null; then
  exit 0
fi

# Extract tool name and command safely
tool_name=$(echo "$input" | jq -r '.tool_name // empty')
command=$(echo "$input" | jq -r '.tool_input.command // empty')

# Only process Bash operations
if [[ "$tool_name" != "Bash" ]]; then
  exit 0
fi

# Exit if no command
if [[ -z "$command" ]]; then
  exit 0
fi

# Check for git commands that should use git-agent
agent=""
reason=""

# git push - remind about review-agent workflow (but allow through for git-agent)
# Note: Review enforcement is process-based via CLAUDE.md, not technically enforced here
# since we can't distinguish main agent from git-agent subagent
if [[ "$command" =~ ^git[[:space:]]+push ]] || \
   [[ "$command" =~ \&\&[[:space:]]*git[[:space:]]+push ]] || \
   [[ "$command" =~ \;[[:space:]]*git[[:space:]]+push ]]; then
  # Allow push - review-agent approval is enforced by workflow discipline
  : # pass through

# git commit should use git-agent (unless it has proper Co-Authored-By format, indicating git-agent is running)
elif [[ "$command" =~ ^git[[:space:]]+commit ]] || \
     [[ "$command" =~ \&\&[[:space:]]*git[[:space:]]+commit ]] || \
     [[ "$command" =~ \;[[:space:]]*git[[:space:]]+commit ]]; then
  # Allow commits that follow the required format (have Co-Authored-By: Claude)
  # This indicates git-agent is properly formatting the commit
  if [[ "$command" =~ Co-Authored-By:[[:space:]]*Claude ]]; then
    : # Allow - properly formatted git-agent commit
  else
    agent="git-agent"
    reason="Git commits should be created by git-agent for proper commit message formatting."
  fi

# git rebase/merge/cherry-pick - allow through (git-agent will be spawned by workflow)
# Note: Like push, enforcement is process-based via CLAUDE.md
elif [[ "$command" =~ ^git[[:space:]]+(rebase|merge|cherry-pick) ]]; then
  : # pass through - allow rebase operations

# git reset --hard is dangerous
elif [[ "$command" =~ git[[:space:]]+reset[[:space:]]+--hard ]]; then
  agent="git-agent"
  reason="Destructive git operations should be handled by git-agent with proper safeguards."

fi

# If an agent should handle this, deny with guidance
if [[ -n "$agent" ]]; then
  jq -n \
    --arg agent "$agent" \
    --arg cmd "$command" \
    --arg reason "$reason" \
    '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: (
          "Command: " + $cmd + "\n\n" +
          $reason + "\n\n" +
          "Use: Task tool with subagent_type=\"git-agent\"\n\n" +
          "Git workflow: git-agent (commit) → review-agent → git-agent (push)"
        )
      }
    }'
  exit 0
fi

# Allow commands not matching git patterns
exit 0
