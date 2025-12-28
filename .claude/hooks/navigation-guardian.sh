#!/bin/bash
# Navigation Guardian Hook
# Suggests Serena for symbol lookups and lance-context for semantic search
# Uses jq for safe JSON parsing

set -euo pipefail

# Read JSON input from stdin
input=$(cat)

# Validate input is JSON
if ! echo "$input" | jq empty 2>/dev/null; then
  exit 0
fi

# Extract tool name and inputs safely
tool_name=$(echo "$input" | jq -r '.tool_name // empty')

suggestion=""
reason=""

case "$tool_name" in
  "Grep")
    pattern=$(echo "$input" | jq -r '.tool_input.pattern // empty')

    # Check for symbol-like patterns that Serena handles better
    # Patterns like "class Foo", "function bar", "def method", "interface IName"
    if [[ "$pattern" =~ ^(class|function|def|const|let|var|interface|type|enum|struct|impl)[[:space:]]+ ]] || \
       [[ "$pattern" =~ ^(export[[:space:]]+(default[[:space:]]+)?(class|function|const|interface|type)) ]]; then
      suggestion="Serena find_symbol"
      reason="For finding symbol definitions, use Serena's find_symbol tool instead of Grep. It's more precise and token-efficient.\n\nExample: find_symbol with name_path=\"ClassName\" or name_path=\"ClassName/methodName\""
    fi
    ;;

  "Read")
    file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

    # Check if reading a large source file - suggest Serena for targeted reading
    if [[ "$file_path" =~ \.(ts|tsx|js|jsx|py|go|rs|java|rb|cpp|c|h)$ ]] && \
       [[ ! "$file_path" =~ (config|\.d\.ts|types\.ts|index\.) ]] && \
       [[ ! "$file_path" =~ ^tests/ ]] && \
       [[ ! "$file_path" =~ \.test\. ]] && \
       [[ ! "$file_path" =~ \.spec\. ]]; then
      # Only suggest for implementation files, not configs or tests
      suggestion="Serena get_symbols_overview"
      reason="Before reading an entire source file, consider using Serena's get_symbols_overview to see the file structure first, then find_symbol with include_body=True for specific functions.\n\nThis is more token-efficient for large files."
    fi
    ;;

  "Glob"|"Grep")
    # For multiple search operations, suggest Explore agent or lance-context
    # But we can't detect "multiple" in a single hook call, so skip this
    ;;
esac

# If we have a suggestion, provide it (but allow the operation for now)
# Navigation suggestions are softer - we want to educate, not block
if [[ -n "$suggestion" ]]; then
  jq -n \
    --arg suggestion "$suggestion" \
    --arg reason "$reason" \
    '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: (
          "Consider using: " + $suggestion + "\n\n" +
          $reason + "\n\n" +
          "For open-ended codebase exploration, use:\n" +
          "  Task tool with subagent_type=\"Explore\"\n\n" +
          "For semantic code search, use:\n" +
          "  mcp__lance-context__search_code\n\n" +
          "If you need to proceed with this tool, explain why the specialized tools are not suitable."
        )
      }
    }'
  exit 0
fi

# Allow operations not matching any pattern
exit 0
