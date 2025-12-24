#!/usr/bin/env bash

#==============================================================================
# get-current-branch.sh
#==============================================================================
# Detects the current git branch or repository state.
#
# Returns:
#   - Branch name (e.g., "005-user-auth") if on a normal branch
#   - Commit SHA with "(detached)" prefix if in detached HEAD state
#   - "N/A" if not in a git repository
#
# Performance: < 50ms (optimized for speed)
#
# Usage:
#   ./get-current-branch.sh
#   # Output: 001-speckit-workflow-improvements
#
#   ./get-current-branch.sh --format footer
#   # Output: ---
#   #         Current branch: 001-speckit-workflow-improvements
#==============================================================================

set -euo pipefail

# Parse arguments
FORMAT="plain"  # Default format
if [[ "${1:-}" == "--format" ]] && [[ -n "${2:-}" ]]; then
    FORMAT="$2"
    # Validate format parameter
    if [[ "$FORMAT" != "plain" ]] && [[ "$FORMAT" != "footer" ]]; then
        echo "Error: Invalid format '$FORMAT'. Valid options: plain, footer" >&2
        exit 1
    fi
fi

#==============================================================================
# Function: get_current_branch
#==============================================================================
# Detects current git branch or state
get_current_branch() {
    # Check if we're in a git repository (fast check)
    if ! git rev-parse --git-dir &>/dev/null; then
        echo "N/A"
        return
    fi

    # Get symbolic ref (fastest way to get branch name)
    local branch_name
    branch_name=$(git symbolic-ref --short HEAD 2>/dev/null)

    # If symbolic-ref succeeded, we're on a normal branch
    if [[ -n "$branch_name" ]]; then
        echo "$branch_name"
        return
    fi

    # If we reach here, we're in detached HEAD state
    # Get short commit SHA (first 7 characters)
    local commit_sha
    commit_sha=$(git rev-parse --short=7 HEAD 2>/dev/null)

    if [[ -n "$commit_sha" ]]; then
        echo "${commit_sha} (detached)"
    else
        echo "N/A"
    fi
}

#==============================================================================
# Main
#==============================================================================
main() {
    local branch
    branch=$(get_current_branch)

    case "$FORMAT" in
        footer)
            if [[ "$branch" != "N/A" ]]; then
                printf "%s\n" "---"
                printf "Current branch: %s\n" "$branch"
            fi
            ;;
        plain)
            printf "%s\n" "$branch"
            ;;
    esac
}

main
