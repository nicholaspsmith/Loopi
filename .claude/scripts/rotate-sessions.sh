#!/bin/bash
# Rotate session logs older than 7 days

SESSIONS_DIR="$(dirname "$0")/../sessions"
ARCHIVE_DIR="$SESSIONS_DIR/archive"

mkdir -p "$ARCHIVE_DIR"

# Find and archive session files older than 7 days
find "$SESSIONS_DIR" -maxdepth 1 -name "*.md" -type f -mtime +7 -exec mv {} "$ARCHIVE_DIR/" \;

# Count archived files
ARCHIVED=$(find "$ARCHIVE_DIR" -name "*.md" -type f | wc -l | tr -d ' ')
echo "Archived session logs in $ARCHIVE_DIR: $ARCHIVED files"
