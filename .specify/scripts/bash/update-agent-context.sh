#!/usr/bin/env bash

# Sync package versions from package.json to CLAUDE.md Technology Stack
#
# This script reads package.json and updates the Technology Stack section
# in CLAUDE.md with the current package versions.
#
# Run this script after installing or updating packages to keep CLAUDE.md
# in sync with actual dependency versions.
#
# Usage: ./update-agent-context.sh

set -e
set -o pipefail

#==============================================================================
# Configuration
#==============================================================================

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
PACKAGE_JSON="$REPO_ROOT/package.json"
CLAUDE_MD="$REPO_ROOT/CLAUDE.md"

#==============================================================================
# Utility Functions
#==============================================================================

log_info() {
    echo "INFO: $1"
}

log_success() {
    echo "✓ $1"
}

log_error() {
    echo "ERROR: $1" >&2
}

# Extract version from package.json (strips ^ ~ and other prefixes, returns major.minor)
get_version() {
    local package="$1"
    local version

    # Try dependencies first, then devDependencies
    version=$(jq -r ".dependencies[\"$package\"] // .devDependencies[\"$package\"] // empty" "$PACKAGE_JSON" 2>/dev/null)

    if [[ -n "$version" ]]; then
        # Strip version prefixes (^, ~, >=, etc.) and get major.minor
        echo "$version" | sed 's/^[\^~>=<]*//' | sed 's/\.[0-9]*$//' | sed 's/-.*$//'
    fi
}

#==============================================================================
# Version Update Functions
#==============================================================================

update_version() {
    local temp_file="$1"
    local display_name="$2"
    local package_name="$3"

    local version
    version=$(get_version "$package_name")

    if [[ -n "$version" ]]; then
        # Check if the display name exists in the file with a version number
        if grep -q "$display_name [0-9]" "$temp_file" 2>/dev/null; then
            # Use perl for more reliable substitution with special characters
            perl -i -pe "s/(\Q$display_name\E) [0-9]+\.[0-9]+(\.[0-9]+)?/\$1 $version/" "$temp_file"
            log_info "Updated $display_name to $version"
            return 0
        fi
    fi
    return 1
}

update_claude_md() {
    log_info "Reading versions from $PACKAGE_JSON"

    if [[ ! -f "$PACKAGE_JSON" ]]; then
        log_error "package.json not found at $PACKAGE_JSON"
        exit 1
    fi

    if [[ ! -f "$CLAUDE_MD" ]]; then
        log_error "CLAUDE.md not found at $CLAUDE_MD"
        exit 1
    fi

    # Create a temporary file for the updated content
    local temp_file
    temp_file=$(mktemp)
    cp "$CLAUDE_MD" "$temp_file"

    local updates_made=0

    # Update each package version
    # Format: "Display Name" "package-name-in-package.json"
    update_version "$temp_file" "TypeScript" "typescript" && ((updates_made++)) || true
    update_version "$temp_file" "Next.js" "next" && ((updates_made++)) || true
    update_version "$temp_file" "React" "react" && ((updates_made++)) || true
    update_version "$temp_file" "Tailwind CSS" "tailwindcss" && ((updates_made++)) || true
    update_version "$temp_file" "LanceDB" "@lancedb/lancedb" && ((updates_made++)) || true
    update_version "$temp_file" "pgvector" "pgvector" && ((updates_made++)) || true
    update_version "$temp_file" "Anthropic Claude SDK" "@anthropic-ai/sdk" && ((updates_made++)) || true
    update_version "$temp_file" "ts-fsrs" "ts-fsrs" && ((updates_made++)) || true
    update_version "$temp_file" "NextAuth" "next-auth" && ((updates_made++)) || true
    update_version "$temp_file" "Vitest" "vitest" && ((updates_made++)) || true
    update_version "$temp_file" "Playwright" "@playwright/test" && ((updates_made++)) || true
    update_version "$temp_file" "ESLint" "eslint" && ((updates_made++)) || true
    update_version "$temp_file" "Prettier" "prettier" && ((updates_made++)) || true
    update_version "$temp_file" "lint-staged" "lint-staged" && ((updates_made++)) || true

    # Handle special cases with parenthetical versions like "PostgreSQL (via postgres 3.4, drizzle-orm 0.45)"
    local postgres_ver drizzle_ver
    postgres_ver=$(get_version "postgres")
    drizzle_ver=$(get_version "drizzle-orm")

    if [[ -n "$postgres_ver" ]]; then
        if grep -q "postgres [0-9]" "$temp_file" 2>/dev/null; then
            perl -i -pe "s/postgres [0-9]+\.[0-9]+/postgres $postgres_ver/" "$temp_file"
            log_info "Updated postgres to $postgres_ver"
            ((updates_made++)) || true
        fi
    fi

    if [[ -n "$drizzle_ver" ]]; then
        if grep -q "drizzle-orm [0-9]" "$temp_file" 2>/dev/null; then
            perl -i -pe "s/drizzle-orm [0-9]+\.[0-9]+/drizzle-orm $drizzle_ver/" "$temp_file"
            log_info "Updated drizzle-orm to $drizzle_ver"
            ((updates_made++)) || true
        fi
    fi

    # Only update if changes were made
    if ! diff -q "$CLAUDE_MD" "$temp_file" > /dev/null 2>&1; then
        mv "$temp_file" "$CLAUDE_MD"
        log_success "Updated CLAUDE.md with $updates_made package version(s)"
    else
        rm -f "$temp_file"
        log_info "No version updates needed - CLAUDE.md is already current"
    fi
}

#==============================================================================
# Main
#==============================================================================

main() {
    log_info "=== Syncing package versions to CLAUDE.md ==="
    update_claude_md
    log_success "Package version sync completed"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
