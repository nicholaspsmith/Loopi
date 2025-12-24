#!/usr/bin/env bash

# Update CLAUDE.md with package versions and feature context
#
# This script performs two operations:
#
# 1. PACKAGE VERSION SYNC
#    - Reads package.json and updates the Technology Stack section
#    - Syncs 16 tracked packages with strict semver validation
#    - Updates both inline versions (e.g., "TypeScript 5.7.0")
#    - Updates parenthetical versions (e.g., "postgres 3.4.7, drizzle-orm 0.45.1")
#
# 2. FEATURE CONTEXT MANAGEMENT
#    - Parses all plan.md files in specs/ directories
#    - Extracts: Language/Version, Primary Dependencies, Storage
#    - Updates "Active Technologies" section with tech stack per feature
#    - Updates "Recent Changes" section with last 3 features
#
# Run this script after:
#   - Installing or updating npm packages (to sync versions)
#   - Completing a new feature (to update Active Technologies/Recent Changes)
#
# Usage: ./update-agent-context.sh [OPTIONS]
#        ./update-agent-context.sh --validate   (test package tracking and plan.md parsing)
#        ./update-agent-context.sh --help       (show full usage information)

set -e
set -o pipefail

#==============================================================================
# Configuration
#==============================================================================

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
PACKAGE_JSON="$REPO_ROOT/package.json"
CLAUDE_MD="$REPO_ROOT/CLAUDE.md"

# Source common.sh for additional utilities (optional - provides get_feature_paths if available)
COMMON_SH="$SCRIPT_DIR/common.sh"
if [[ -f "$COMMON_SH" ]]; then
    # Don't source yet - not needed for current functionality
    # Can be enabled later if we need get_feature_paths()
    :
fi

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

        # Validate strict semver format: major.minor[.patch][-prerelease][+build]
        # - major.minor.patch: Required (patch optional for npm compatibility)
        # - prerelease: Optional, starts with '-', followed by alphanumeric+dots (no leading/trailing dots)
        # - build: Optional, starts with '+', followed by alphanumeric+dots (no leading/trailing dots)
        # Examples: 1.0, 1.0.0, 1.0.0-alpha, 1.0.0-beta.1, 1.0.0+20130313144700, 1.0.0-rc.1+build.123
        # Rejects: 1.2.-beta, 1.2+, 1.2.-, 1.2-., 1.2+.
        if [[ "$cleaned_version" =~ ^[0-9]+\.[0-9]+(\.[0-9]+)?(-[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*)?(\+[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*)?$ ]]; then
            echo "$cleaned_version"
        else
            echo "Warning: Invalid semver format for $package: $cleaned_version" >&2
            return 1
        fi
    fi
}

#==============================================================================
# Plan.md Parsing Functions
#==============================================================================

# Extract field from plan.md Technical Context section
# Usage: extract_plan_field "Language/Version" "$plan_file"
extract_plan_field() {
    local field_pattern="$1"
    local plan_file="$2"

    grep "^\*\*${field_pattern}\*\*: " "$plan_file" 2>/dev/null | \
        head -1 | \
        sed "s|^\*\*${field_pattern}\*\*: ||" | \
        sed 's/^[ \t]*//;s/[ \t]*$//' | \
        grep -v "NEEDS CLARIFICATION" | \
        grep -v "^N/A$" || echo ""
}

# Parse single plan.md file and return key data
# Returns: branch|lang|framework|storage as pipe-delimited string
parse_plan_file() {
    local plan_file="$1"
    local branch_name="$(basename "$(dirname "$plan_file")")"

    local lang=$(extract_plan_field "Language/Version" "$plan_file")
    local framework=$(extract_plan_field "Primary Dependencies" "$plan_file")
    local storage=$(extract_plan_field "Storage" "$plan_file")

    echo "$branch_name|$lang|$framework|$storage"
}

# Find all plan.md files and parse them
# Returns lines of pipe-delimited strings (one per plan.md file)
collect_all_plan_data() {
    local specs_dir="$REPO_ROOT/specs"

    if [[ ! -d "$specs_dir" ]]; then
        log_warning "specs/ directory not found at $specs_dir"
        return 0
    fi

    # Find all plan.md files and parse each one
    while IFS= read -r plan_file; do
        if [[ -f "$plan_file" && -r "$plan_file" ]]; then
            parse_plan_file "$plan_file"
        fi
    done < <(find "$specs_dir" -name "plan.md" -type f 2>/dev/null | sort)
}

#==============================================================================
# Version Update Functions
#==============================================================================

# Update parenthetical versions (e.g., "via postgres 3.4, drizzle-orm 0.45")
# These appear inline rather than as standalone entries
update_parenthetical_version() {
    local temp_file="$1"
    local package_name="$2"
    local version="$3"

    if [[ -n "$version" ]]; then
        if grep -q "${package_name} [0-9]" "$temp_file" 2>/dev/null; then
            # Pattern matches: major.minor[.patch][-prerelease][+build]
            # Handles both "postgres 3.4," and "postgres 3.4)" formats
            # Note: $version is validated by semver regex in get_version(), safe from injection
            perl -i -pe "s/${package_name} [0-9]+\.[0-9]+(\.[0-9]+)?(-[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*)?(\+[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*)?/${package_name} ${version}/g" "$temp_file"
            log_info "Updated ${package_name} to $version"
            return 0
        else
            log_warning "${package_name} not found in CLAUDE.md (parenthetical format)"
            return 1
        fi
    else
        log_warning "Could not extract version for ${package_name}"
        return 1
    fi
}

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
            # Pattern matches: major.minor[.patch][-prerelease][+build]
            # Note: $version is validated by semver regex (line 121) before use here,
            # ensuring it contains only: digits, dots, hyphens, alphanumeric, and plus
            # This prevents regex injection as no regex metacharacters are allowed
            perl -i -pe "s/(\Q$display_name\E) [0-9]+\.[0-9]+(\.[0-9]+)?(-[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*)?(\+[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*)?/\$1 $version/" "$temp_file"
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

#==============================================================================
# Section Update Functions
#==============================================================================

# Format technology stack entry from plan.md data
# Usage: format_tech_entry "TypeScript 5.7" "Next.js 16, React 19" "004-claude-api"
format_tech_entry() {
    local lang="$1"
    local framework="$2"
    local branch="$3"

    local parts=()
    [[ -n "$lang" ]] && parts+=("$lang")
    # Only take first framework if multiple (e.g., "Next.js 16, React 19" → "Next.js 16")
    if [[ -n "$framework" ]]; then
        # Use awk to extract first comma-separated value and trim whitespace
        local first_framework=$(echo "$framework" | awk -F',' '{gsub(/^[ \t]+|[ \t]+$/, "", $1); print $1}')
        parts+=("$first_framework")
    fi

    if [[ ${#parts[@]} -eq 0 ]]; then
        echo ""
    elif [[ ${#parts[@]} -eq 1 ]]; then
        echo "- ${parts[0]} ($branch)"
    else
        echo "- ${parts[0]} + ${parts[1]} ($branch)"
    fi
}

# Update Active Technologies section in temp file
# Adds or updates section after Technology Stack
update_active_technologies() {
    local temp_file="$1"
    shift
    local plan_data_array=("$@")

    if [[ ${#plan_data_array[@]} -eq 0 ]]; then
        log_info "No plan data to add to Active Technologies"
        return 0
    fi

    # Build list of technology entries
    local tech_entries=()
    for data in "${plan_data_array[@]}"; do
        IFS='|' read -r branch lang framework storage <<< "$data"

        # Add main tech stack entry
        local entry=$(format_tech_entry "$lang" "$framework" "$branch")
        [[ -n "$entry" ]] && tech_entries+=("$entry")

        # Add storage if present and not N/A
        if [[ -n "$storage" && "$storage" != "N/A" ]]; then
            tech_entries+=("- $storage ($branch)")
        fi
    done

    if [[ ${#tech_entries[@]} -eq 0 ]]; then
        log_info "No technology entries to add"
        return 0
    fi

    # Check if section already exists
    if grep -q "^## Active Technologies" "$temp_file"; then
        # Section exists - replace content between ## Active Technologies and next ##
        local output_file=$(mktemp)
        local in_section=false

        while IFS= read -r line || [[ -n "$line" ]]; do
            if [[ "$line" == "## Active Technologies" ]]; then
                echo "$line" >> "$output_file"
                echo "" >> "$output_file"
                printf '%s\n' "${tech_entries[@]}" >> "$output_file"
                in_section=true
            elif [[ $in_section == true ]] && [[ "$line" =~ ^##[[:space:]] ]]; then
                # Hit next section, stop skipping
                echo "" >> "$output_file"
                echo "$line" >> "$output_file"
                in_section=false
            elif [[ $in_section == false ]]; then
                echo "$line" >> "$output_file"
            fi
            # Skip lines inside Active Technologies section (they'll be replaced)
        done < "$temp_file"

        mv "$output_file" "$temp_file"
        log_info "Updated Active Technologies section"
    else
        # Section doesn't exist - add after Technology Stack
        local output_file=$(mktemp)
        local added=false

        while IFS= read -r line || [[ -n "$line" ]]; do
            echo "$line" >> "$output_file"

            # After Technology Stack section heading, skip until we find blank line or next ##
            if [[ "$line" == "## Technology Stack" ]] && [[ $added == false ]]; then
                # Skip content of Technology Stack section
                while IFS= read -r next_line || [[ -n "$next_line" ]]; do
                    echo "$next_line" >> "$output_file"
                    if [[ "$next_line" =~ ^##[[:space:]] ]]; then
                        # Hit next section - insert before it
                        echo "" >> "$output_file"
                        echo "## Active Technologies" >> "$output_file"
                        echo "" >> "$output_file"
                        printf '%s\n' "${tech_entries[@]}" >> "$output_file"
                        added=true
                        break
                    fi
                done < <(tail -n +$(($(grep -n "^## Technology Stack" "$temp_file" | cut -d: -f1) + 1)) "$temp_file")

                if [[ $added == true ]]; then
                    break
                fi
            fi
        done < "$temp_file"

        # If we didn't add it (no next section after Technology Stack), add at end
        if [[ $added == false ]]; then
            echo "" >> "$output_file"
            echo "## Active Technologies" >> "$output_file"
            echo "" >> "$output_file"
            printf '%s\n' "${tech_entries[@]}" >> "$output_file"
        fi

        mv "$output_file" "$temp_file"
        log_info "Created Active Technologies section"
    fi

    return 0
}

# Update Recent Changes section in temp file
# Adds or updates section with last 3 features
update_recent_changes() {
    local temp_file="$1"
    shift
    local plan_data_array=("$@")

    if [[ ${#plan_data_array[@]} -eq 0 ]]; then
        log_info "No plan data for Recent Changes"
        return 0
    fi

    # Get last 3 features (array is already sorted by find ... | sort)
    # Reverse sort to get most recent first
    local changes=()
    local count=0
    local -a reversed=()

    # Reverse the array
    for ((i=${#plan_data_array[@]}-1; i>=0; i--)); do
        reversed+=("${plan_data_array[$i]}")
    done

    # Take first 3 from reversed array
    for data in "${reversed[@]}"; do
        if [[ $count -ge 3 ]]; then break; fi

        IFS='|' read -r branch lang framework storage <<< "$data"

        local change_text="- $branch: Added"
        if [[ -n "$lang" && -n "$framework" ]]; then
            local first_framework=$(echo "$framework" | awk -F',' '{gsub(/^[ \t]+|[ \t]+$/, "", $1); print $1}')
            change_text="$change_text $lang + $first_framework"
        elif [[ -n "$lang" ]]; then
            change_text="$change_text $lang"
        elif [[ -n "$framework" ]]; then
            local first_framework=$(echo "$framework" | awk -F',' '{gsub(/^[ \t]+|[ \t]+$/, "", $1); print $1}')
            change_text="$change_text $first_framework"
        fi

        changes+=("$change_text")
        ((count++))
    done

    if [[ ${#changes[@]} -eq 0 ]]; then
        log_info "No changes to add to Recent Changes"
        return 0
    fi

    # Check if section already exists
    if grep -q "^## Recent Changes" "$temp_file"; then
        # Section exists - replace content
        local output_file=$(mktemp)
        local in_section=false

        while IFS= read -r line || [[ -n "$line" ]]; do
            if [[ "$line" == "## Recent Changes" ]]; then
                echo "$line" >> "$output_file"
                echo "" >> "$output_file"
                printf '%s\n' "${changes[@]}" >> "$output_file"
                in_section=true
            elif [[ $in_section == true ]] && [[ "$line" =~ ^##[[:space:]] ]]; then
                echo "" >> "$output_file"
                echo "$line" >> "$output_file"
                in_section=false
            elif [[ $in_section == false ]]; then
                echo "$line" >> "$output_file"
            fi
        done < "$temp_file"

        mv "$output_file" "$temp_file"
        log_info "Updated Recent Changes section"
    else
        # Section doesn't exist - add after Active Technologies (or after Technology Stack if no Active Technologies)
        echo "" >> "$temp_file"
        echo "## Recent Changes" >> "$temp_file"
        echo "" >> "$temp_file"
        printf '%s\n' "${changes[@]}" >> "$temp_file"
        log_info "Created Recent Changes section"
    fi

    return 0
}

#==============================================================================
# Main Update Function
#==============================================================================

# Update CLAUDE.md with package versions and feature context
# This is the main entry point that orchestrates both operations:
#   1. Sync package versions from package.json to Technology Stack section
#   2. Parse plan.md files and update Active Technologies / Recent Changes sections
#
# The function uses atomic operations with backup/restore for safety
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
    # PART 1: Package Version Synchronization
    #==========================================================================
    # Sync package versions from package.json to CLAUDE.md Technology Stack
    # This updates inline versions (e.g., "TypeScript 5.7.0") and parenthetical
    # versions (e.g., "postgres 3.4.7, drizzle-orm 0.45.1")
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

    update_parenthetical_version "$temp_file" "postgres" "$postgres_ver" && ((updates_made++)) || true
    update_parenthetical_version "$temp_file" "drizzle-orm" "$drizzle_ver" && ((updates_made++)) || true

    #==========================================================================
    # PART 2: Feature Context Management
    #==========================================================================
    # Parse all plan.md files in specs/ directories and update:
    #   - Active Technologies section (tech stack per feature)
    #   - Recent Changes section (last 3 features)
    #==========================================================================

    log_info "Parsing plan.md files for Active Technologies and Recent Changes"

    local plan_data_array=()
    while IFS= read -r line; do
        [[ -n "$line" ]] && plan_data_array+=("$line")
    done < <(collect_all_plan_data)

    if [[ ${#plan_data_array[@]} -gt 0 ]]; then
        log_info "Found ${#plan_data_array[@]} plan.md file(s)"
        update_active_technologies "$temp_file" "${plan_data_array[@]}" || log_warning "Failed to update Active Technologies"
        update_recent_changes "$temp_file" "${plan_data_array[@]}" || log_warning "Failed to update Recent Changes"
    else
        log_info "No plan.md files found, skipping section updates"
    fi

    #==========================================================================
    # PART 3: Apply Changes with Atomic Operations
    #==========================================================================
    # Use diff to detect changes, then atomically update CLAUDE.md with
    # backup/restore error recovery for safety
    #==========================================================================

    local diff_result diff_exit_code
    # Prevent diff exit codes from triggering set -e (0=same, 1=differ, 2=error)
    set +e
    diff_result=$(diff -q "$CLAUDE_MD" "$temp_file" 2>&1)
    diff_exit_code=$?
    set -e

    if [[ $diff_exit_code -eq 0 ]]; then
        # Files are identical - no updates needed
        rm -f "$temp_file"
        log_info "No version updates needed - CLAUDE.md is already current"
    elif [[ $diff_exit_code -eq 1 ]]; then
        # Files differ - update CLAUDE.md with safety backup
        local backup_file="${CLAUDE_MD}.backup.$$"

        # Create backup before modifying
        if ! cp "$CLAUDE_MD" "$backup_file"; then
            log_error "Failed to create backup of CLAUDE.md"
            log_error "Temp file preserved at: $temp_file"
            exit 1
        fi

        # Disable trap before mv to prevent premature temp file deletion
        trap - EXIT INT TERM

        # Attempt atomic move
        if mv "$temp_file" "$CLAUDE_MD"; then
            rm -f "$backup_file"  # Success - remove backup
            temp_file=""  # Clear variable so trap doesn't try to delete moved file
            log_success "Updated CLAUDE.md with $updates_made package version(s)"
        else
            # Move failed - restore from backup
            log_error "Failed to update CLAUDE.md - restoring from backup"
            if mv "$backup_file" "$CLAUDE_MD"; then
                log_success "CLAUDE.md restored successfully"
            else
                log_error "CRITICAL: Failed to restore CLAUDE.md from backup!"
                log_error "Backup file: $backup_file"
            fi
            log_error "Updated content preserved at: $temp_file"
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

Sync package versions from package.json and update context from plan.md files

Operations:
  1. Sync package versions from package.json to CLAUDE.md Technology Stack
  2. Parse all plan.md files and update Active Technologies section
  3. Update Recent Changes section with last 3 features

Options:
  --validate    Validate package tracking and plan.md parsing
  --help        Display this help message

Tracked Packages: (16 total)
  TypeScript, Next.js, React, Tailwind CSS, LanceDB, pgvector,
  Anthropic Claude SDK, ts-fsrs, NextAuth, Vitest, Playwright,
  ESLint, Prettier, lint-staged, postgres, drizzle-orm

Plan.md Fields Tracked:
  Language/Version, Primary Dependencies, Storage

Adding New Packages:
  1. Add package name to TRACKED_PACKAGES array (line ~30)
  2. Add update_version() call in update_claude_md() function

For more details, see: specs/001-speckit-workflow-improvements/contracts/
EOF
}

#==============================================================================
# Main
#==============================================================================

# Main entry point - parses command-line arguments and executes requested operation
# Supports two modes:
#   1. Default mode: Updates CLAUDE.md (package versions + feature context)
#   2. Validate mode (--validate): Tests package tracking and plan.md parsing
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

        # Verify update_version() calls exist for tracked packages
        local missing_updates=()
        for package in "${TRACKED_PACKAGES[@]}"; do
            # Check if package has update_version() call or special case handling
            # Special cases: postgres, drizzle-orm (use update_parenthetical_version)
            if [[ "$package" == "postgres" ]] || [[ "$package" == "drizzle-orm" ]]; then
                # Check for update_parenthetical_version call
                if ! grep -q "update_parenthetical_version.*\"${package}\"" "$0"; then
                    missing_updates+=("$package (special case)")
                fi
            else
                # Check for update_version() call with this package name
                if ! grep -q "update_version.*\"${package}\"" "$0"; then
                    missing_updates+=("$package")
                fi
            fi
        done

        # Report validation results
        local has_errors=false

        if [[ ${#untracked[@]} -gt 0 ]]; then
            has_errors=true
            log_warning "Untracked packages found in package.json:"
            printf '  - %s\n' "${untracked[@]}"
            log_info ""
            log_info "To track a package:"
            log_info "  1. Add package name to TRACKED_PACKAGES array (line 29)"
            log_info "  2. Add update_version() call in update_claude_md() function"
        fi

        if [[ ${#missing_updates[@]} -gt 0 ]]; then
            has_errors=true
            log_warning "Tracked packages missing update_version() calls:"
            printf '  - %s\n' "${missing_updates[@]}"
            log_info ""
            log_info "These packages are in TRACKED_PACKAGES but have no corresponding update logic."
            log_info "Add update_version() call in update_claude_md() function for each."
        fi

        if [[ "$has_errors" == "true" ]]; then
            exit 1
        else
            log_success "All packages are properly tracked with update logic!"
        fi

        # Validate plan.md parsing
        log_info ""
        log_info "=== Validating plan.md parsing ==="

        if [[ ! -d "$REPO_ROOT/specs" ]]; then
            log_warning "specs/ directory not found at $REPO_ROOT/specs"
        else
            local plan_count=0
            local plan_file

            while IFS= read -r plan_file; do
                ((plan_count++))
            done < <(find "$REPO_ROOT/specs" -name "plan.md" -type f 2>/dev/null)

            log_info "Found $plan_count plan.md file(s)"

            if [[ $plan_count -gt 0 ]]; then
                # Test parse a sample plan.md
                local sample_plan=$(find "$REPO_ROOT/specs" -name "plan.md" -type f 2>/dev/null | head -1)
                if [[ -n "$sample_plan" ]]; then
                    log_info "Testing parse of $(basename "$(dirname "$sample_plan")")/plan.md"
                    local parsed=$(parse_plan_file "$sample_plan")
                    log_info "Result: $parsed"

                    # Verify we got some data
                    if [[ -z "$parsed" ]] || [[ "$parsed" == "|" ]]; then
                        log_warning "No data extracted from sample plan.md"
                    else
                        log_success "Plan.md parsing validated successfully"
                    fi
                fi
            fi
        fi

        exit 0
    else
        log_info "=== Syncing package versions to CLAUDE.md ==="
        update_claude_md
        log_success "Package version sync completed"
    fi
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
