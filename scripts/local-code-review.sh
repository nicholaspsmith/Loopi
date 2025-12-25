#!/usr/bin/env bash
#
# Local Code Review Script
# Runs Claude-powered code review on local changes before pushing to a PR.
#
# Usage:
#   ./scripts/local-code-review.sh              # Review uncommitted changes
#   ./scripts/local-code-review.sh --staged     # Review only staged changes
#   ./scripts/local-code-review.sh --branch     # Review all changes vs main branch
#   ./scripts/local-code-review.sh <commit>     # Review changes since specific commit
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default mode
MODE="uncommitted"
BASE_REF=""

print_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --staged      Review only staged changes"
    echo "  --branch      Review all changes compared to main/master branch"
    echo "  --base <ref>  Review changes compared to specific branch/commit"
    echo "  -h, --help    Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Review all uncommitted changes"
    echo "  $0 --staged           # Review staged changes only"
    echo "  $0 --branch           # Review branch changes vs main"
    echo "  $0 --base develop     # Review changes vs develop branch"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --staged)
            MODE="staged"
            shift
            ;;
        --branch)
            MODE="branch"
            shift
            ;;
        --base)
            MODE="base"
            BASE_REF="$2"
            shift 2
            ;;
        -h|--help)
            print_usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            print_usage
            exit 1
            ;;
    esac
done

# Detect main branch name
get_main_branch() {
    if git show-ref --verify --quiet refs/heads/main; then
        echo "main"
    elif git show-ref --verify --quiet refs/heads/master; then
        echo "master"
    else
        echo "main"
    fi
}

# Get the diff based on mode
get_diff() {
    case $MODE in
        staged)
            git diff --cached
            ;;
        branch)
            local main_branch
            main_branch=$(get_main_branch)
            git diff "$main_branch"...HEAD
            ;;
        base)
            git diff "$BASE_REF"...HEAD
            ;;
        uncommitted)
            git diff HEAD
            ;;
    esac
}

# Get list of changed files
get_changed_files() {
    case $MODE in
        staged)
            git diff --cached --name-only
            ;;
        branch)
            local main_branch
            main_branch=$(get_main_branch)
            git diff "$main_branch"...HEAD --name-only
            ;;
        base)
            git diff "$BASE_REF"...HEAD --name-only
            ;;
        uncommitted)
            git diff HEAD --name-only
            ;;
    esac
}

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}       Local Code Review (Claude-powered)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check for changes
DIFF=$(get_diff)
if [[ -z "$DIFF" ]]; then
    echo -e "${YELLOW}No changes to review.${NC}"
    case $MODE in
        staged)
            echo "Tip: Stage some changes with 'git add' first."
            ;;
        branch)
            echo "Tip: Your branch appears to be up-to-date with $(get_main_branch)."
            ;;
        uncommitted)
            echo "Tip: Make some changes or use --branch to review committed changes."
            ;;
    esac
    exit 0
fi

# Show what we're reviewing
echo -e "${GREEN}Review mode:${NC} $MODE"
echo -e "${GREEN}Changed files:${NC}"
get_changed_files | sed 's/^/  - /'
echo ""

# Count lines changed
LINES_ADDED=$(echo "$DIFF" | grep -c '^+[^+]' || true)
LINES_REMOVED=$(echo "$DIFF" | grep -c '^-[^-]' || true)
echo -e "${GREEN}Changes:${NC} +$LINES_ADDED / -$LINES_REMOVED lines"
echo ""

echo -e "${BLUE}Starting Claude review...${NC}"
echo ""

# Create a temporary file for the diff
DIFF_FILE=$(mktemp)
echo "$DIFF" > "$DIFF_FILE"

# Build the review prompt
REVIEW_PROMPT="Review this code diff focusing ONLY on issues and potential problems. Be brief and actionable.

CRITICAL RULES:
- Only mention problems, bugs, or security concerns
- Do NOT mention what is good or correct
- Do NOT provide positive feedback or praise
- Keep each point concise (1-2 sentences max)
- Only include actionable recommendations
- Reference specific line numbers when possible

Focus areas:
- Bugs or logic errors
- Security vulnerabilities
- Performance issues
- Missing error handling
- Type safety issues

If there are no issues, respond with: \"No issues found.\"

Here is the diff to review:

\`\`\`diff
$(cat "$DIFF_FILE")
\`\`\`"

# Clean up temp file
rm -f "$DIFF_FILE"

# Run Claude Code for the review
# Using claude with print mode to get direct output
# --tools "" disables tools for faster review (no file access needed)
# --model sonnet uses a faster model for quicker reviews
claude --print --tools "" --model sonnet "$REVIEW_PROMPT"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Review complete!${NC}"
