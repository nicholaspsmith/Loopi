#!/usr/bin/env bash

# Update Claude Code context file with information from plan.md
#
# This script maintains the CLAUDE.md context file by parsing feature specifications
# and updating it with project information.
#
# MAIN FUNCTIONS:
# 1. Environment Validation
#    - Verifies git repository structure and branch information
#    - Checks for required plan.md files and templates
#    - Validates file permissions and accessibility
#
# 2. Plan Data Extraction
#    - Parses plan.md files to extract project metadata
#    - Identifies language/version, frameworks, databases, and project types
#    - Handles missing or incomplete specification data gracefully
#
# 3. Agent File Management
#    - Creates new CLAUDE.md from template when needed
#    - Updates existing CLAUDE.md with new project information
#    - Preserves manual additions and custom configurations
#
# 4. Content Generation
#    - Generates language-specific build/test commands
#    - Creates appropriate project directory structures
#    - Updates technology stacks and recent changes sections
#    - Maintains consistent formatting and timestamps
#
# Usage: ./update-agent-context.sh

set -e

# Enable strict error handling
set -u
set -o pipefail

#==============================================================================
# Configuration and Global Variables
#==============================================================================

# Get script directory and load common functions
SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Get all paths and variables from common functions
eval $(get_feature_paths)

NEW_PLAN="$IMPL_PLAN"  # Alias for compatibility with existing code

# Claude Code context file path
CLAUDE_FILE="$REPO_ROOT/CLAUDE.md"

# Template file
TEMPLATE_FILE="$REPO_ROOT/.specify/templates/agent-file-template.md"

# Global variables for parsed plan data
NEW_LANG=""
NEW_FRAMEWORK=""
NEW_DB=""
NEW_PROJECT_TYPE=""

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

# Cleanup function for temporary files
cleanup() {
    local exit_code=$?
    rm -f /tmp/agent_update_*_$$
    rm -f /tmp/manual_additions_$$
    exit $exit_code
}

# Set up cleanup trap
trap cleanup EXIT INT TERM

#==============================================================================
# Validation Functions
#==============================================================================

validate_environment() {
    # Check if we have a current branch/feature (git or non-git)
    if [[ -z "$CURRENT_BRANCH" ]]; then
        log_error "Unable to determine current feature"
        if [[ "$HAS_GIT" == "true" ]]; then
            log_info "Make sure you're on a feature branch"
        else
            log_info "Set SPECIFY_FEATURE environment variable or create a feature first"
        fi
        exit 1
    fi
    
    # Check if plan.md exists
    if [[ ! -f "$NEW_PLAN" ]]; then
        log_error "No plan.md found at $NEW_PLAN"
        log_info "Make sure you're working on a feature with a corresponding spec directory"
        if [[ "$HAS_GIT" != "true" ]]; then
            log_info "Use: export SPECIFY_FEATURE=your-feature-name or create a new feature first"
        fi
        exit 1
    fi
    
    # Check if template exists (needed for new files)
    if [[ ! -f "$TEMPLATE_FILE" ]]; then
        log_warning "Template file not found at $TEMPLATE_FILE"
        log_warning "Creating new agent files will fail"
    fi
}

#==============================================================================
# Plan Parsing Functions
#==============================================================================

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

parse_plan_data() {
    local plan_file="$1"
    
    if [[ ! -f "$plan_file" ]]; then
        log_error "Plan file not found: $plan_file"
        return 1
    fi
    
    if [[ ! -r "$plan_file" ]]; then
        log_error "Plan file is not readable: $plan_file"
        return 1
    fi
    
    log_info "Parsing plan data from $plan_file"
    
    NEW_LANG=$(extract_plan_field "Language/Version" "$plan_file")
    NEW_FRAMEWORK=$(extract_plan_field "Primary Dependencies" "$plan_file")
    NEW_DB=$(extract_plan_field "Storage" "$plan_file")
    NEW_PROJECT_TYPE=$(extract_plan_field "Project Type" "$plan_file")
    
    # Log what we found
    if [[ -n "$NEW_LANG" ]]; then
        log_info "Found language: $NEW_LANG"
    else
        log_warning "No language information found in plan"
    fi
    
    if [[ -n "$NEW_FRAMEWORK" ]]; then
        log_info "Found framework: $NEW_FRAMEWORK"
    fi
    
    if [[ -n "$NEW_DB" ]] && [[ "$NEW_DB" != "N/A" ]]; then
        log_info "Found database: $NEW_DB"
    fi
    
    if [[ -n "$NEW_PROJECT_TYPE" ]]; then
        log_info "Found project type: $NEW_PROJECT_TYPE"
    fi
}

# Generate documentation URL for a package
# Usage: get_package_doc_url "package-name" "version"
get_package_doc_url() {
    local package="$1"
    local version="$2"

    # Special cases for popular packages with dedicated documentation sites
    case "$package" in
        "next")
            echo "https://nextjs.org/docs"
            ;;
        "react")
            echo "https://react.dev"
            ;;
        "react-dom")
            echo "https://react.dev/reference/react-dom"
            ;;
        "typescript")
            echo "https://www.typescriptlang.org/docs"
            ;;
        "@anthropic-ai/sdk")
            echo "https://docs.anthropic.com/en/api/client-sdks"
            ;;
        "tailwindcss")
            echo "https://tailwindcss.com/docs"
            ;;
        "@lancedb/lancedb")
            echo "https://lancedb.github.io/lancedb"
            ;;
        "postgres")
            echo "https://www.npmjs.com/package/postgres/v/$version"
            ;;
        "drizzle-orm")
            echo "https://orm.drizzle.team/docs/overview"
            ;;
        "next-auth")
            echo "https://next-auth.js.org"
            ;;
        "vitest")
            echo "https://vitest.dev"
            ;;
        "@playwright/test")
            echo "https://playwright.dev/docs/intro"
            ;;
        "eslint")
            echo "https://eslint.org/docs/latest"
            ;;
        "prettier")
            echo "https://prettier.io/docs/en"
            ;;
        "ts-fsrs")
            echo "https://www.npmjs.com/package/ts-fsrs/v/$version"
            ;;
        *)
            # Default to npm package page with specific version
            echo "https://www.npmjs.com/package/$package/v/$version"
            ;;
    esac
}

# Extract version for a package from package.json
# Usage: get_version "package-name"
# Returns: Version string with prefixes stripped (e.g., "1.2.3" from "^1.2.3")
get_version() {
    local package="$1"
    local package_json="${PACKAGE_JSON:-$REPO_ROOT/package.json}"

    # Check if package.json exists
    if [[ ! -f "$package_json" ]]; then
        echo ""
        return 1
    fi

    # Extract version from dependencies or devDependencies using jq
    # Try both dependencies and devDependencies
    local version=$(jq -r --arg pkg "$package" '
        (.dependencies // {})[$pkg] // (.devDependencies // {})[$pkg] // empty
    ' "$package_json" 2>/dev/null)

    # If version is empty or null, return empty
    if [[ -z "$version" || "$version" == "null" ]]; then
        echo ""
        return 0
    fi

    # Strip npm version prefixes (^, ~, >=, >, <, <=)
    version="${version#^}"
    version="${version#'~'}"
    version="${version#>=}"
    version="${version#>}"
    version="${version#<=}"
    version="${version#<}"

    echo "$version"
}

format_technology_stack() {
    local lang="$1"
    local framework="$2"
    local parts=()
    
    # Add non-empty parts
    [[ -n "$lang" && "$lang" != "NEEDS CLARIFICATION" ]] && parts+=("$lang")
    [[ -n "$framework" && "$framework" != "NEEDS CLARIFICATION" && "$framework" != "N/A" ]] && parts+=("$framework")
    
    # Join with proper formatting
    if [[ ${#parts[@]} -eq 0 ]]; then
        echo ""
    elif [[ ${#parts[@]} -eq 1 ]]; then
        echo "${parts[0]}"
    else
        # Join multiple parts with " + "
        local result="${parts[0]}"
        for ((i=1; i<${#parts[@]}; i++)); do
            result="$result + ${parts[i]}"
        done
        echo "$result"
    fi
}

#==============================================================================
# Template and Content Generation Functions
#==============================================================================

get_project_structure() {
    local project_type="$1"
    
    if [[ "$project_type" == *"web"* ]]; then
        echo "backend/\\nfrontend/\\ntests/"
    else
        echo "src/\\ntests/"
    fi
}

get_commands_for_language() {
    local lang="$1"
    
    case "$lang" in
        *"Python"*)
            echo "cd src && pytest && ruff check ."
            ;;
        *"Rust"*)
            echo "cargo test && cargo clippy"
            ;;
        *"JavaScript"*|*"TypeScript"*)
            echo "npm test \\&\\& npm run lint"
            ;;
        *)
            echo "# Add commands for $lang"
            ;;
    esac
}

get_language_conventions() {
    local lang="$1"
    echo "$lang: Follow standard conventions"
}

create_new_agent_file() {
    local target_file="$1"
    local temp_file="$2"
    local project_name="$3"
    local current_date="$4"
    
    if [[ ! -f "$TEMPLATE_FILE" ]]; then
        log_error "Template not found at $TEMPLATE_FILE"
        return 1
    fi
    
    if [[ ! -r "$TEMPLATE_FILE" ]]; then
        log_error "Template file is not readable: $TEMPLATE_FILE"
        return 1
    fi
    
    log_info "Creating new agent context file from template..."
    
    if ! cp "$TEMPLATE_FILE" "$temp_file"; then
        log_error "Failed to copy template file"
        return 1
    fi
    
    # Replace template placeholders
    local project_structure
    project_structure=$(get_project_structure "$NEW_PROJECT_TYPE")
    
    local commands
    commands=$(get_commands_for_language "$NEW_LANG")
    
    local language_conventions
    language_conventions=$(get_language_conventions "$NEW_LANG")
    
    # Perform substitutions with error checking using safer approach
    # Escape special characters for sed by using a different delimiter or escaping
    local escaped_lang=$(printf '%s\n' "$NEW_LANG" | sed 's/[\[\.*^$()+{}|]/\\&/g')
    local escaped_framework=$(printf '%s\n' "$NEW_FRAMEWORK" | sed 's/[\[\.*^$()+{}|]/\\&/g')
    local escaped_branch=$(printf '%s\n' "$CURRENT_BRANCH" | sed 's/[\[\.*^$()+{}|]/\\&/g')
    
    # Build technology stack and recent change strings conditionally
    local tech_stack
    if [[ -n "$escaped_lang" && -n "$escaped_framework" ]]; then
        tech_stack="- $escaped_lang + $escaped_framework ($escaped_branch)"
    elif [[ -n "$escaped_lang" ]]; then
        tech_stack="- $escaped_lang ($escaped_branch)"
    elif [[ -n "$escaped_framework" ]]; then
        tech_stack="- $escaped_framework ($escaped_branch)"
    else
        tech_stack="- ($escaped_branch)"
    fi

    local recent_change
    if [[ -n "$escaped_lang" && -n "$escaped_framework" ]]; then
        recent_change="- $escaped_branch: Added $escaped_lang + $escaped_framework"
    elif [[ -n "$escaped_lang" ]]; then
        recent_change="- $escaped_branch: Added $escaped_lang"
    elif [[ -n "$escaped_framework" ]]; then
        recent_change="- $escaped_branch: Added $escaped_framework"
    else
        recent_change="- $escaped_branch: Added"
    fi

    local substitutions=(
        "s|\[PROJECT NAME\]|$project_name|"
        "s|\[DATE\]|$current_date|"
        "s|\[EXTRACTED FROM ALL PLAN.MD FILES\]|$tech_stack|"
        "s|\[ACTUAL STRUCTURE FROM PLANS\]|$project_structure|g"
        "s|\[ONLY COMMANDS FOR ACTIVE TECHNOLOGIES\]|$commands|"
        "s|\[LANGUAGE-SPECIFIC, ONLY FOR LANGUAGES IN USE\]|$language_conventions|"
        "s|\[LAST 3 FEATURES AND WHAT THEY ADDED\]|$recent_change|"
    )
    
    for substitution in "${substitutions[@]}"; do
        if ! sed -i.bak -e "$substitution" "$temp_file"; then
            log_error "Failed to perform substitution: $substitution"
            rm -f "$temp_file" "$temp_file.bak"
            return 1
        fi
    done
    
    # Convert \n sequences to actual newlines
    newline=$(printf '\n')
    sed -i.bak2 "s/\\\\n/${newline}/g" "$temp_file"
    
    # Clean up backup files
    rm -f "$temp_file.bak" "$temp_file.bak2"
    
    return 0
}




update_existing_agent_file() {
    local target_file="$1"
    local current_date="$2"
    
    log_info "Updating existing agent context file..."
    
    # Use a single temporary file for atomic update
    local temp_file
    temp_file=$(mktemp) || {
        log_error "Failed to create temporary file"
        return 1
    }
    
    # Generate Active Technologies from package.json dependencies
    local new_tech_entries=()
    local new_change_entry=""

    # Read dependencies from package.json
    local package_json="$REPO_ROOT/package.json"
    if [[ ! -f "$package_json" ]]; then
        log_error "package.json not found at $package_json"
        return 1
    fi

    # Parse dependencies and generate entries with documentation links
    while IFS='|' read -r package_name package_version; do
        # Skip if empty
        [[ -z "$package_name" ]] && continue

        # Remove ^ or ~ from version
        local clean_version="${package_version#^}"
        clean_version="${clean_version#~}"

        # Generate documentation URL
        local doc_url=$(get_package_doc_url "$package_name" "$clean_version")

        # Format entry: - package-name version ([docs](url))
        new_tech_entries+=("- $package_name $clean_version ([docs]($doc_url))")
    done < <(jq -r '.dependencies // {} | to_entries | sort_by(.key) | .[] | "\(.key)|\(.value)"' "$package_json")

    # Prepare new change entry for Recent Changes
    local tech_stack=$(format_technology_stack "$NEW_LANG" "$NEW_FRAMEWORK")
    if [[ -n "$tech_stack" ]]; then
        new_change_entry="- $CURRENT_BRANCH: Added $tech_stack"
    elif [[ -n "$NEW_DB" ]] && [[ "$NEW_DB" != "N/A" ]] && [[ "$NEW_DB" != "NEEDS CLARIFICATION" ]]; then
        new_change_entry="- $CURRENT_BRANCH: Added $NEW_DB"
    fi
    
    # Check if sections exist in the file
    local has_active_technologies=0
    local has_recent_changes=0
    
    if grep -q "^## Active Technologies" "$target_file" 2>/dev/null; then
        has_active_technologies=1
    fi
    
    if grep -q "^## Recent Changes" "$target_file" 2>/dev/null; then
        has_recent_changes=1
    fi
    
    # Process file line by line
    local in_tech_section=false
    local in_changes_section=false
    local tech_entries_added=false
    local changes_entries_added=false
    local existing_changes_count=0
    local file_ended=false
    
    while IFS= read -r line || [[ -n "$line" ]]; do
        # Handle Active Technologies section - REPLACE all existing entries
        if [[ "$line" == "## Active Technologies" ]]; then
            echo "$line" >> "$temp_file"
            in_tech_section=true
            continue
        elif [[ $in_tech_section == true ]] && [[ "$line" =~ ^##[[:space:]] ]]; then
            # Add new tech entries before closing the section (replacing old ones)
            if [[ $tech_entries_added == false ]] && [[ ${#new_tech_entries[@]} -gt 0 ]]; then
                printf '%s\n' "${new_tech_entries[@]}" >> "$temp_file"
                echo "" >> "$temp_file"
                tech_entries_added=true
            fi
            echo "$line" >> "$temp_file"
            in_tech_section=false
            continue
        elif [[ $in_tech_section == true ]]; then
            # Skip all existing lines in Active Technologies section
            # They will be replaced with new package.json-based entries
            continue
        fi
        
        # Handle Recent Changes section
        if [[ "$line" == "## Recent Changes" ]]; then
            echo "$line" >> "$temp_file"
            # Add new change entry right after the heading
            if [[ -n "$new_change_entry" ]]; then
                echo "$new_change_entry" >> "$temp_file"
            fi
            in_changes_section=true
            changes_entries_added=true
            continue
        elif [[ $in_changes_section == true ]] && [[ "$line" =~ ^##[[:space:]] ]]; then
            echo "$line" >> "$temp_file"
            in_changes_section=false
            continue
        elif [[ $in_changes_section == true ]] && [[ "$line" == "- "* ]]; then
            # Keep only first 2 existing changes
            if [[ $existing_changes_count -lt 2 ]]; then
                echo "$line" >> "$temp_file"
                ((existing_changes_count++))
            fi
            continue
        fi
        
        # Update timestamp
        if [[ "$line" =~ \*\*Last\ updated\*\*:.*[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9] ]]; then
            echo "$line" | sed "s/[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]/$current_date/" >> "$temp_file"
        else
            echo "$line" >> "$temp_file"
        fi
    done < "$target_file"
    
    # Post-loop check: if we're still in the Active Technologies section and haven't added new entries
    if [[ $in_tech_section == true ]] && [[ $tech_entries_added == false ]] && [[ ${#new_tech_entries[@]} -gt 0 ]]; then
        printf '%s\n' "${new_tech_entries[@]}" >> "$temp_file"
        tech_entries_added=true
    fi
    
    # If sections don't exist, add them at the end of the file
    if [[ $has_active_technologies -eq 0 ]] && [[ ${#new_tech_entries[@]} -gt 0 ]]; then
        echo "" >> "$temp_file"
        echo "## Active Technologies" >> "$temp_file"
        printf '%s\n' "${new_tech_entries[@]}" >> "$temp_file"
        tech_entries_added=true
    fi
    
    if [[ $has_recent_changes -eq 0 ]] && [[ -n "$new_change_entry" ]]; then
        echo "" >> "$temp_file"
        echo "## Recent Changes" >> "$temp_file"
        echo "$new_change_entry" >> "$temp_file"
        changes_entries_added=true
    fi
    
    # Move temp file to target atomically
    if ! mv "$temp_file" "$target_file"; then
        log_error "Failed to update target file"
        rm -f "$temp_file"
        return 1
    fi
    
    return 0
}
#==============================================================================
# Main Agent File Update Function
#==============================================================================

update_agent_file() {
    local target_file="$1"
    local agent_name="$2"
    
    if [[ -z "$target_file" ]] || [[ -z "$agent_name" ]]; then
        log_error "update_agent_file requires target_file and agent_name parameters"
        return 1
    fi
    
    log_info "Updating $agent_name context file: $target_file"
    
    local project_name
    project_name=$(basename "$REPO_ROOT")
    local current_date
    current_date=$(date +%Y-%m-%d)
    
    # Create directory if it doesn't exist
    local target_dir
    target_dir=$(dirname "$target_file")
    if [[ ! -d "$target_dir" ]]; then
        if ! mkdir -p "$target_dir"; then
            log_error "Failed to create directory: $target_dir"
            return 1
        fi
    fi
    
    if [[ ! -f "$target_file" ]]; then
        # Create new file from template
        local temp_file
        temp_file=$(mktemp) || {
            log_error "Failed to create temporary file"
            return 1
        }
        
        if create_new_agent_file "$target_file" "$temp_file" "$project_name" "$current_date"; then
            if mv "$temp_file" "$target_file"; then
                log_success "Created new $agent_name context file"
            else
                log_error "Failed to move temporary file to $target_file"
                rm -f "$temp_file"
                return 1
            fi
        else
            log_error "Failed to create new agent file"
            rm -f "$temp_file"
            return 1
        fi
    else
        # Update existing file
        if [[ ! -r "$target_file" ]]; then
            log_error "Cannot read existing file: $target_file"
            return 1
        fi
        
        if [[ ! -w "$target_file" ]]; then
            log_error "Cannot write to existing file: $target_file"
            return 1
        fi
        
        if update_existing_agent_file "$target_file" "$current_date"; then
            log_success "Updated existing $agent_name context file"
        else
            log_error "Failed to update existing agent file"
            return 1
        fi
    fi
    
    return 0
}

print_summary() {
    echo
    log_info "Summary of changes:"

    if [[ -n "$NEW_LANG" ]]; then
        echo "  - Added language: $NEW_LANG"
    fi

    if [[ -n "$NEW_FRAMEWORK" ]]; then
        echo "  - Added framework: $NEW_FRAMEWORK"
    fi

    if [[ -n "$NEW_DB" ]] && [[ "$NEW_DB" != "N/A" ]]; then
        echo "  - Added database: $NEW_DB"
    fi

    echo
}

#==============================================================================
# Main Execution
#==============================================================================

main() {
    # Validate environment before proceeding
    validate_environment

    log_info "=== Updating Claude Code context file for feature $CURRENT_BRANCH ==="

    # Parse the plan file to extract project information
    if ! parse_plan_data "$NEW_PLAN"; then
        log_error "Failed to parse plan data"
        exit 1
    fi

    # Update CLAUDE.md
    log_info "Updating Claude Code context file: $CLAUDE_FILE"
    if update_agent_file "$CLAUDE_FILE" "Claude Code"; then
        print_summary
        log_success "Agent context update completed successfully"
        exit 0
    else
        log_error "Agent context update completed with errors"
        exit 1
    fi
}

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi

