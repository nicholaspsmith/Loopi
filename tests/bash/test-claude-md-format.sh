#!/usr/bin/env bash

#==============================================================================
# test-claude-md-format.sh
#==============================================================================
# Tests CLAUDE.md format validation to ensure it remains general and doesn't
# contain feature-specific implementation notes.
#
# Usage: ./test-claude-md-format.sh
#==============================================================================

set -euo pipefail

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CLAUDE_MD="$REPO_ROOT/CLAUDE.md"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

#==============================================================================
# Test Functions
#==============================================================================

pass() {
    echo -e "${GREEN}✓${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

fail() {
    echo -e "${RED}✗${NC} $1"
    echo "  Expected: $2"
    echo "  Actual:   $3"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

run_test() {
    local test_name="$1"
    local expected="$2"
    local actual="$3"

    TESTS_RUN=$((TESTS_RUN + 1))

    if [[ "$actual" == "$expected" ]]; then
        pass "$test_name"
    else
        fail "$test_name" "$expected" "$actual"
    fi
}

#==============================================================================
# Main Tests
#==============================================================================

echo "=== Running CLAUDE.md Format Validation Tests ==="
echo ""

# Test 1: CLAUDE.md exists
if [[ -f "$CLAUDE_MD" ]]; then
    pass "CLAUDE.md file exists"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    fail "CLAUDE.md file exists" "File should exist" "File not found"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    exit 1
fi

# Test 2: No feature-specific implementation notes headers
if grep -q "^## Feature Implementation Notes" "$CLAUDE_MD"; then
    fail "No feature implementation notes section" "Section should not exist" "Found '## Feature Implementation Notes'"
    TESTS_FAILED=$((TESTS_FAILED + 1))
else
    pass "No feature implementation notes section"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

# Test 3: No specific feature headings (001-xxx, 004-xxx, 010-xxx)
if grep -qE "^###[0-9]{3}-[a-z-]+:" "$CLAUDE_MD"; then
    fail "No feature-specific headings" "No headings like '###001-feature-name:'" "Found feature-specific heading"
    TESTS_FAILED=$((TESTS_FAILED + 1))
else
    pass "No feature-specific headings"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

# Test 4: Technology Stack section exists
if grep -q "^## Technology Stack" "$CLAUDE_MD"; then
    pass "Technology Stack section exists"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    fail "Technology Stack section exists" "Section should exist" "Section not found"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 5: Feature-Specific Context section exists
if grep -q "^## Feature-Specific Context" "$CLAUDE_MD"; then
    pass "Feature-Specific Context section exists"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    fail "Feature-Specific Context section exists" "Section should exist" "Section not found"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 6: File size is reasonable (not bloated with implementation notes)
file_lines=$(wc -l < "$CLAUDE_MD" | tr -d ' ')
if [[ $file_lines -le 200 ]]; then
    pass "File size is reasonable ($file_lines lines <= 200)"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    fail "File size is reasonable" "<= 200 lines" "$file_lines lines (may contain feature-specific notes)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 7: No "Status: ✅ Complete" markers (indicates implementation notes)
if grep -q "Status.*Complete" "$CLAUDE_MD"; then
    fail "No implementation status markers" "Should not contain status markers" "Found 'Status: Complete' marker"
    TESTS_FAILED=$((TESTS_FAILED + 1))
else
    pass "No implementation status markers"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

# Test 8: No "Files Modified/Created" sections (indicates implementation notes)
if grep -q "Files Modified" "$CLAUDE_MD" || grep -q "Files Created" "$CLAUDE_MD"; then
    fail "No file modification sections" "Should not list modified files" "Found file modification section"
    TESTS_FAILED=$((TESTS_FAILED + 1))
else
    pass "No file modification sections"
    TESTS_PASSED=$((TESTS_PASSED + 1))
fi

# Test 9: Available Commands section exists
if grep -q "^## Available Commands" "$CLAUDE_MD"; then
    pass "Available Commands section exists"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    fail "Available Commands section exists" "Section should exist" "Section not found"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 10: Workflow section exists
if grep -q "^## Workflow" "$CLAUDE_MD"; then
    pass "Workflow section exists"
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    fail "Workflow section exists" "Section should exist" "Section not found"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi

#==============================================================================
# Summary
#==============================================================================

echo ""
echo "=== Test Summary ==="
echo "Total:  $((TESTS_PASSED + TESTS_FAILED))"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
if [[ $TESTS_FAILED -gt 0 ]]; then
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    echo ""
    echo "CLAUDE.md should only contain general project information."
    echo "Feature-specific notes belong in specs/[feature]/implementation-notes.md"
    exit 1
else
    echo "Failed: 0"
    echo ""
    echo "✅ CLAUDE.md format validation passed!"
    exit 0
fi
