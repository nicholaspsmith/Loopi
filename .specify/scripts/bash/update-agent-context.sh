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

# List of packages tracked for version synchronization
# NOTE: This is the single source of truth. When adding a new package:
#   1. Add the npm package name to this array
#   2. Add corresponding update_version() call in update_claude_md() function
TRACKED_PACKAGES=(
    "typescript"
    "next"
    "react"
    "tailwindcss"
    "@lancedb/lancedb"
    "pgvector"
    "@anthropic-ai/sdk"
    "ts-fsrs"
    "next-auth"
    "vitest"
    "@playwright/test"
    "eslint"
    "prettier"
    "lint-staged"
    "postgres"
    "drizzle-orm"
)

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

log_warning() {
    echo "WARNING: $1" >&2
}

# Check if a required dependency is installed
check_dependency() {
    local cmd="$1"
    local min_version="$2"
    local install_cmd="$3"

    # Check if command exists
    if ! command -v "$cmd" &> /dev/null; then
        log_error "$cmd is required but not found."
        log_error "Install with: $install_cmd"
        exit 1
    fi

    # Version check (best-effort, warn but don't fail)
    if [[ -n "$min_version" ]]; then
        local version=""
        case "$cmd" in
            jq)
                version=$(jq --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+' | head -1)
                ;;
            perl)
                version=$(perl --version 2>/dev/null | grep -oE 'version [0-9]+' | grep -oE '[0-9]+' | head -1)
                ;;
        esac

        if [[ -n "$version" ]]; then
            # Simple version comparison (works for major version numbers)
            if [[ $(echo "$version" | cut -d. -f1) -lt $(echo "$min_version" | cut -d. -f1) ]]; then
                log_warning "$cmd version $version detected, recommend $min_version+"
            fi
        fi
    fi
}

# Extract version from package.json (strips ^ ~ and other prefixes, preserves full semver)
get_version() {
    local package="$1"
    local version
    local cleaned_version

    # Try dependencies first, then devDependencies
    version=$(jq -r ".dependencies[\"$package\"] // .devDependencies[\"$package\"] // empty" "$PACKAGE_JSON" 2>/dev/null)

    if [[ -n "$version" ]]; then
        # Strip version prefixes (^, ~, >=, etc.) but preserve full semver (major.minor.patch-prerelease)
        cleaned_version=$(echo "$version" | sed 's/^[\^~>=<]*//')

        # Validate semver format: major.minor[.patch][-prerelease][+build]
        # Examples: 1.0, 1.0.0, 1.0.0-alpha, 1.0.0-beta.1, 1.0.0+20130313144700
        if [[ "$cleaned_version" =~ ^[0-9]+\.[0-9]+(\.[0-9]+)?(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$ ]]; then
            echo "$cleaned_version"
        else
            echo "Warning: Invalid semver format for $package: $cleaned_version" >&2
            return 1
        fi
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
            # Pattern matches: major.minor[.patch][-prerelease]
            # Note: $version is validated by semver regex (line 94) before use here,
            # ensuring it contains only: digits, dots, hyphens, alphanumeric, and plus
            # This prevents regex injection as no regex metacharacters are allowed
            perl -i -pe "s/(\Q$display_name\E) [0-9]+\.[0-9]+(\.[0-9]+)?(-[a-zA-Z0-9.-]+)?/\$1 \Q$version\E/" "$temp_file"
            log_info "Updated $display_name to $version"
            return 0
        else
            log_warning "$display_name not found in CLAUDE.md (package: $package_name)"
            return 1
        fi
    else
        log_warning "Could not extract version for $package_name (package not found or invalid semver)"
        return 1
    fi
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
    chmod 600 "$temp_file"  # Set restrictive permissions (owner read/write only)

    # Set up trap to ensure temp file cleanup on exit
    # Note: SIGKILL (kill -9) cannot be trapped and will leave temp file orphaned
    # This is a kernel-level limitation affecting all bash scripts
    trap 'rm -f "$temp_file"' EXIT INT TERM

    cp "$CLAUDE_MD" "$temp_file"

    local updates_made=0

    #==========================================================================
    # Package Version Synchronization List
    #==========================================================================
    # This section defines which packages are synchronized from package.json
    # to CLAUDE.md. Each line follows the format:
    #
    #   update_version "$temp_file" "Display Name" "package-name"
    #
    # Where:
    #   - "Display Name" = How the package appears in CLAUDE.md (e.g., "TypeScript")
    #   - "package-name" = Exact package name from package.json (e.g., "typescript")
    #
    # To ADD a new package to sync:
    #   1. Add a new update_version line below with the correct display name and package name
    #   2. Ensure the display name exists in CLAUDE.md Technology Stack section
    #   3. Run the script to sync the version
    #
    # To REMOVE a package from sync:
    #   1. Comment out or delete the update_version line
    #   2. The package will remain in CLAUDE.md but won't be updated automatically
    #
    # Note: Special cases (parenthetical versions like "postgres" and "drizzle-orm")
    # are handled separately below this section.
    #==========================================================================

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
            # Pattern matches: major.minor[.patch][-prerelease]
            # Note: $postgres_ver validated by semver regex, safe from injection
            perl -i -pe "s/postgres [0-9]+\.[0-9]+(\.[0-9]+)?(-[a-zA-Z0-9.-]+)?/postgres \Q$postgres_ver\E/" "$temp_file"
            log_info "Updated postgres to $postgres_ver"
            ((updates_made++)) || true
        fi
    fi

    if [[ -n "$drizzle_ver" ]]; then
        if grep -q "drizzle-orm [0-9]" "$temp_file" 2>/dev/null; then
            # Pattern matches: major.minor[.patch][-prerelease]
            # Note: $drizzle_ver validated by semver regex, safe from injection
            perl -i -pe "s/drizzle-orm [0-9]+\.[0-9]+(\.[0-9]+)?(-[a-zA-Z0-9.-]+)?/drizzle-orm \Q$drizzle_ver\E/" "$temp_file"
            log_info "Updated drizzle-orm to $drizzle_ver"
            ((updates_made++)) || true
        fi
    fi

    # Only update if changes were made
    local diff_result diff_exit_code
    diff_result=$(diff -q "$CLAUDE_MD" "$temp_file" 2>&1)
    diff_exit_code=$?

    if [[ $diff_exit_code -eq 0 ]]; then
        # Files are identical - no updates needed
        rm -f "$temp_file"
        log_info "No version updates needed - CLAUDE.md is already current"
    elif [[ $diff_exit_code -eq 1 ]]; then
        # Files differ - update CLAUDE.md
        if mv "$temp_file" "$CLAUDE_MD"; then
            log_success "Updated CLAUDE.md with $updates_made package version(s)"
        else
            log_error "Failed to update CLAUDE.md"
            rm -f "$temp_file"
            exit 1
        fi
    else
        # diff command failed (exit code 2 or other error)
        log_error "Failed to compare files: $diff_result"
        rm -f "$temp_file"
        exit 1
    fi
}

#==============================================================================
# Help and Usage
#==============================================================================

show_help() {
    cat <<EOF
Usage: ./update-agent-context.sh [OPTIONS]

Sync package versions from package.json to CLAUDE.md Technology Stack

Options:
  --validate    Validate that all packages in package.json are being tracked
  --help        Display this help message

Tracked Packages:
  TypeScript, Next.js, React, Tailwind CSS, LanceDB, pgvector,
  Anthropic Claude SDK, ts-fsrs, NextAuth, Vitest, Playwright,
  ESLint, Prettier, lint-staged, postgres, drizzle-orm

Adding New Packages:
  Edit this script and add a line to the update_claude_md() function:
    update_version "\$temp_file" "Display Name" "package-name"

For more details, see: specs/001-speckit-workflow-improvements/contracts/
EOF
}

#==============================================================================
# Main
#==============================================================================

main() {
    local VALIDATE_MODE=false

    # Parse command-line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --validate)
                VALIDATE_MODE=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # Check required dependencies
    check_dependency "jq" "1.6" "brew install jq (macOS) or apt install jq (Ubuntu)"
    check_dependency "perl" "5.10" "brew install perl (macOS) or apt install perl (Ubuntu)"

    if [[ "$VALIDATE_MODE" == "true" ]]; then
        log_info "=== Validating package tracking ==="

        # Get all packages from package.json
        local all_packages
        all_packages=$(jq -r '.dependencies // {} + .devDependencies // {} | keys[]' "$PACKAGE_JSON" 2>/dev/null | sort)

        local untracked=()
        local tracked_count=0

        while IFS= read -r package; do
            if printf '%s\n' "${TRACKED_PACKAGES[@]}" | grep -q "^${package}$"; then
                ((tracked_count++))
            else
                untracked+=("$package")
            fi
        done <<< "$all_packages"

        log_info "Tracked: $tracked_count packages"

        if [[ ${#untracked[@]} -gt 0 ]]; then
            log_warning "Untracked packages found in package.json:"
            printf '  - %s\n' "${untracked[@]}"
            log_info ""
            log_info "To track a package:"
            log_info "  1. Add package name to TRACKED_PACKAGES array (line 29)"
            log_info "  2. Add update_version() call in update_claude_md() function"
            exit 1
        else
            log_success "All packages are being tracked!"
            exit 0
        fi
    else
        log_info "=== Syncing package versions to CLAUDE.md ==="
        update_claude_md
        log_success "Package version sync completed"
    fi
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
