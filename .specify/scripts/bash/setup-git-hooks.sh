#!/usr/bin/env bash

# Setup Git Hooks for Loopi
#
# This script configures Git to use custom hooks from the .githooks directory
# instead of the default .git/hooks directory.
#
# Usage: ./setup-git-hooks.sh

set -euo pipefail

# Get script directory and repo root
SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
GITHOOKS_DIR="$REPO_ROOT/.githooks"

echo "🔧 Setting up Git hooks for Loopi"
echo ""

# Check if we're in a git repository
if [[ ! -d "$REPO_ROOT/.git" ]]; then
    echo "❌ Error: Not a git repository"
    echo "   Run this script from within the loopi git repository"
    exit 1
fi

# Check if .githooks directory exists
if [[ ! -d "$GITHOOKS_DIR" ]]; then
    echo "❌ Error: .githooks directory not found at $GITHOOKS_DIR"
    exit 1
fi

# Configure git to use .githooks directory
echo "📁 Configuring Git hooks path..."
git config core.hooksPath .githooks

# Verify configuration
HOOKS_PATH=$(git config --get core.hooksPath)
if [[ "$HOOKS_PATH" == ".githooks" ]]; then
    echo "✅ Git hooks path configured successfully"
else
    echo "⚠️  Warning: Git hooks path is set to: $HOOKS_PATH"
    echo "   Expected: .githooks"
fi

echo ""
echo "🎣 Available hooks:"

# List all executable hooks in .githooks
HOOK_COUNT=0
for hook in "$GITHOOKS_DIR"/*; do
    if [[ -f "$hook" && -x "$hook" ]]; then
        hook_name=$(basename "$hook")
        echo "  - $hook_name"
        ((HOOK_COUNT++))
    fi
done

if [[ $HOOK_COUNT -eq 0 ]]; then
    echo "  (none found)"
else
    echo ""
    echo "✅ $HOOK_COUNT hook(s) installed"
fi

echo ""
echo "📝 Hook descriptions:"
echo ""
echo "  post-merge: Automatically syncs package.json changes to CLAUDE.md"
echo "              after git pull/merge operations"
echo ""
echo "✨ Setup complete!"
echo ""
echo "💡 Tip: Hooks will run automatically on git operations."
echo "   To disable: git config --unset core.hooksPath"
