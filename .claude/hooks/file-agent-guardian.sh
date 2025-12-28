#!/bin/bash
# File Agent Guardian Hook
# Intercepts Write/Edit calls and suggests appropriate specialized agents
# Uses jq for safe JSON parsing to prevent injection attacks

set -euo pipefail

# Read JSON input from stdin
input=$(cat)

# Validate input is JSON
if ! echo "$input" | jq empty 2>/dev/null; then
  exit 0  # Allow if input is invalid (fail open)
fi

# Extract tool name and file path safely using jq
tool_name=$(echo "$input" | jq -r '.tool_name // empty')
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# Only process Write and Edit operations
if [[ "$tool_name" != "Write" && "$tool_name" != "Edit" ]]; then
  exit 0
fi

# Exit if no file path
if [[ -z "$file_path" ]]; then
  exit 0
fi

# Determine which agent should handle this file
agent=""
reason=""

# Test files → test-agent
# NOTE: Hook cannot distinguish subagent from main agent, so enforcement is advisory.
# test-agent itself gets blocked, making this a process-based rule via CLAUDE.md.
# Temporarily allowing test file edits for maintenance tasks (skip conditions, etc.)
# TODO: Re-enable when subagent detection is possible

# UI components → ui-agent
if [[ "$file_path" =~ ^components/ ]] || \
   [[ "$file_path" =~ ^app/.*\.tsx$ ]] || \
   [[ "$file_path" =~ ^app/\(protected\)/.* && "$file_path" =~ \.tsx$ ]]; then
  agent="ui-agent"
  reason="React components should be written by ui-agent for proper patterns and styling."

# Database files → db-agent
elif [[ "$file_path" =~ ^drizzle/ ]] || \
     [[ "$file_path" =~ ^lib/db/ ]] || \
     [[ "$file_path" =~ \.sql$ ]] || \
     [[ "$file_path" =~ migration ]]; then
  agent="db-agent"
  reason="Database schema and migrations should be handled by db-agent."

# Deployment files → deploy-agent
elif [[ "$file_path" =~ ^Dockerfile ]] || \
     [[ "$file_path" =~ ^docker-compose ]] || \
     [[ "$file_path" =~ ^\.github/workflows/ ]] || \
     [[ "$file_path" =~ ^nginx/ ]] || \
     [[ "$file_path" =~ \.yml$ && "$file_path" =~ (deploy|ci|cd) ]]; then
  agent="deploy-agent"
  reason="Docker, CI/CD, and deployment configs should be handled by deploy-agent."

# Spec files → spec-agent
elif [[ "$file_path" =~ ^specs/.*\.(md|yaml|json)$ ]] && \
     [[ ! "$file_path" =~ tasks\.md$ ]]; then
  agent="spec-agent"
  reason="Feature specifications should be written by spec-agent for proper structure."
fi

# If an agent should handle this, deny with guidance
if [[ -n "$agent" ]]; then
  jq -n \
    --arg agent "$agent" \
    --arg path "$file_path" \
    --arg reason "$reason" \
    '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: (
          "File: " + $path + "\n\n" +
          $reason + "\n\n" +
          "Spawn the agent:\n" +
          "  Task tool with subagent_type=\"" + $agent + "\"\n\n" +
          "If you have a specific reason to write this file directly, explain to the user."
        )
      }
    }'
  exit 0
fi

# Allow files not matching any pattern
exit 0
