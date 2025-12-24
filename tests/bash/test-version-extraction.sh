#!/usr/bin/env bash

# Test script for update-agent-context.sh version extraction logic
# Tests various edge cases and version formats

# Note: set -e disabled for GitHub Actions compatibility (workflow uses bash -e)
set -uo pipefail

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
UPDATE_SCRIPT="$REPO_ROOT/.specify/scripts/bash/update-agent-context.sh"
MOCK_DIR="$SCRIPT_DIR/mocks"
FIXTURES_DIR="$SCRIPT_DIR/fixtures"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

#==============================================================================
# Test Helper Functions
#==============================================================================

run_test() {
    local test_name="$1"
    local expected="$2"
    local actual="$3"

    if [ "$expected" = "$actual" ]; then
        echo -e "${GREEN}✓${NC} $test_name"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗${NC} $test_name"
        echo "  Expected: $expected"
        echo "  Actual:   $actual"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Source the update script to access its functions
source_script_functions() {
    # Create a temporary script that sources the functions without executing main
    local temp_script=$(mktemp)

    # Copy everything except:
    # 1. The source common.sh line (we don't need common.sh for testing get_version)
    # 2. The eval get_feature_paths line (we don't need feature paths)
    # 3. The NEW_PLAN alias line (depends on IMPL_PLAN from get_feature_paths)
    # 4. The main execution block
    sed '/^if \[\[ "\${BASH_SOURCE\[0\]}" == "\${0}" \]\]; then/,$d' "$UPDATE_SCRIPT" | \
        sed '/^source.*common\.sh/d' | \
        sed '/^eval.*get_feature_paths/d' | \
        sed '/^NEW_PLAN=.*IMPL_PLAN/d' > "$temp_script"

    # Remove 'set -e' from the temp script to prevent it from re-enabling errexit in our shell
    # GitHub Actions runs with 'bash -e' which conflicts with sourcing scripts that have 'set -e'
    sed -i.bak '/^set -e$/d' "$temp_script"

    # Set REPO_ROOT for the get_version function
    export REPO_ROOT="$SCRIPT_DIR/../.."

    source "$temp_script"
    rm -f "$temp_script" "$temp_script.bak"

    # Override paths to use mock files
    PACKAGE_JSON="$MOCK_DIR/package.json"
    CLAUDE_MD="$MOCK_DIR/CLAUDE.md"
}

#==============================================================================
# Test Cases
#==============================================================================

echo "=== Running update-agent-context.sh Tests ==="
echo ""

# Source the script functions
source_script_functions

# Test 1: Valid package.json extraction
echo "Test 1: Valid package.json extraction"
version=$(get_version "typescript")
run_test "Extract TypeScript version" "5.7.0" "$version"

# Test 2: npm prefix stripping (^)
echo "Test 2: npm prefix stripping (^)"
version=$(get_version "next")
run_test "Strip caret prefix" "16.0.10" "$version"

# Test 3: npm prefix stripping (~)
echo "Test 3: npm prefix stripping (~)"
version=$(get_version "react")
run_test "Strip tilde prefix" "19.2.3" "$version"

# Test 4: npm prefix stripping (>=)
echo "Test 4: npm prefix stripping (>=)"
version=$(get_version "@lancedb/lancedb")
run_test "Strip >= prefix" "0.22.3" "$version"

# Test 5: Full semver preservation (patch version)
echo "Test 5: Full semver preservation (patch version)"
version=$(get_version "typescript")
run_test "Preserve patch version" "5.7.0" "$version"

# Test 6: Pre-release tag handling
echo "Test 6: Pre-release tag handling"
version=$(get_version "next-auth")
run_test "Preserve pre-release tag" "5.0.0-beta.30" "$version"

# Test 7: Missing package graceful skip
echo "Test 7: Missing package graceful skip"
version=$(get_version "nonexistent-package")
run_test "Missing package returns empty" "" "$version"

# Test 8: Scoped package (@-prefix)
echo "Test 8: Scoped package (@-prefix)"
version=$(get_version "@anthropic-ai/sdk")
run_test "Extract scoped package version" "0.71.2" "$version"

# Test 9: devDependencies extraction
echo "Test 9: devDependencies extraction"
version=$(get_version "prettier")
run_test "Extract from devDependencies" "3.7.4" "$version"

# Test 10: Malformed package.json
echo "Test 10: Malformed package.json"
MALFORMED_JSON=$(mktemp)
echo "{ invalid json }" > "$MALFORMED_JSON"
PACKAGE_JSON="$MALFORMED_JSON"
version=$(get_version "next" 2>/dev/null || echo "")
run_test "Malformed JSON returns empty" "" "$version"
rm -f "$MALFORMED_JSON"
PACKAGE_JSON="$MOCK_DIR/package.json"  # Restore

#==============================================================================
# Test Summary
#==============================================================================

echo ""
echo "=== Test Summary ==="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    exit 1
else
    echo "All tests passed!"
    exit 0
fi
