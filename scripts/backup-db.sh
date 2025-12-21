#!/bin/bash
set -e

# Database backup script for MemoryLoop
# Creates PostgreSQL backups and optionally uploads to B2/S3
#
# Usage:
#   ./backup-db.sh                    # Create local backup
#   ./backup-db.sh --upload           # Create and upload to B2
#   ./backup-db.sh --list             # List local backups
#   ./backup-db.sh --restore <file>   # Restore from backup
#
# Cron example (daily at 2am):
#   0 2 * * * /opt/memoryloop/scripts/backup-db.sh --upload >> /var/log/memoryloop-backup.log 2>&1

DEPLOY_DIR="/opt/memoryloop"
BACKUP_DIR="${DEPLOY_DIR}/backups"
CONTAINER_NAME="memoryloop-postgres"
RETENTION_DAYS=7

# Database credentials from environment or defaults
DB_USER="${POSTGRES_USER:-memoryloop}"
DB_NAME="${POSTGRES_DB:-memoryloop}"

# B2/S3 configuration (set these environment variables for upload)
B2_BUCKET="${B2_BUCKET:-}"
B2_KEY_ID="${B2_KEY_ID:-}"
B2_APP_KEY="${B2_APP_KEY:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] ${RED}[ERROR]${NC} $1"
}

# Create backup
create_backup() {
    local TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    local BACKUP_FILE="memoryloop-${TIMESTAMP}.sql.gz"
    local BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

    log_info "Creating backup: ${BACKUP_FILE}"

    # Ensure backup directory exists
    mkdir -p "${BACKUP_DIR}"

    # Create backup using pg_dump
    docker exec "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" "${DB_NAME}" | gzip > "${BACKUP_PATH}"

    # Verify backup was created
    if [ -f "${BACKUP_PATH}" ] && [ -s "${BACKUP_PATH}" ]; then
        local SIZE=$(du -h "${BACKUP_PATH}" | cut -f1)
        log_info "Backup created successfully: ${BACKUP_PATH} (${SIZE})"
        echo "${BACKUP_PATH}"
    else
        log_error "Backup failed - file is empty or missing"
        exit 1
    fi
}

# Upload to B2
upload_to_b2() {
    local BACKUP_PATH="$1"
    local BACKUP_FILE=$(basename "${BACKUP_PATH}")

    if [ -z "${B2_BUCKET}" ] || [ -z "${B2_KEY_ID}" ] || [ -z "${B2_APP_KEY}" ]; then
        log_warn "B2 credentials not configured. Skipping upload."
        log_warn "Set B2_BUCKET, B2_KEY_ID, and B2_APP_KEY environment variables."
        return 0
    fi

    log_info "Uploading to B2: ${B2_BUCKET}/${BACKUP_FILE}"

    # Check if b2 CLI is installed
    if ! command -v b2 &> /dev/null; then
        log_warn "B2 CLI not installed. Install with: pip install b2"
        return 1
    fi

    # Authorize and upload
    b2 authorize-account "${B2_KEY_ID}" "${B2_APP_KEY}" > /dev/null
    b2 upload-file "${B2_BUCKET}" "${BACKUP_PATH}" "backups/${BACKUP_FILE}"

    log_info "Upload complete"
}

# Clean old backups
cleanup_old_backups() {
    log_info "Cleaning up backups older than ${RETENTION_DAYS} days..."

    local COUNT=$(find "${BACKUP_DIR}" -name "memoryloop-*.sql.gz" -mtime +${RETENTION_DAYS} | wc -l)

    if [ "${COUNT}" -gt 0 ]; then
        find "${BACKUP_DIR}" -name "memoryloop-*.sql.gz" -mtime +${RETENTION_DAYS} -delete
        log_info "Deleted ${COUNT} old backup(s)"
    else
        log_info "No old backups to delete"
    fi
}

# List backups
list_backups() {
    log_info "Local backups in ${BACKUP_DIR}:"
    echo ""

    if [ -d "${BACKUP_DIR}" ]; then
        ls -lh "${BACKUP_DIR}"/memoryloop-*.sql.gz 2>/dev/null || echo "No backups found"
    else
        echo "Backup directory does not exist"
    fi

    echo ""
}

# Restore from backup
restore_backup() {
    local BACKUP_PATH="$1"

    if [ ! -f "${BACKUP_PATH}" ]; then
        log_error "Backup file not found: ${BACKUP_PATH}"
        exit 1
    fi

    log_warn "This will OVERWRITE the current database!"
    echo -n "Are you sure you want to restore from ${BACKUP_PATH}? (yes/no): "
    read -r CONFIRM

    if [ "${CONFIRM}" != "yes" ]; then
        log_info "Restore cancelled"
        exit 0
    fi

    log_info "Restoring from ${BACKUP_PATH}..."

    # Drop and recreate database
    docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -c "DROP DATABASE IF EXISTS ${DB_NAME};"
    docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -c "CREATE DATABASE ${DB_NAME};"

    # Restore from backup
    gunzip -c "${BACKUP_PATH}" | docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" "${DB_NAME}"

    log_info "Restore complete"
}

# Main
case "${1:-}" in
    --list)
        list_backups
        ;;
    --restore)
        if [ -z "$2" ]; then
            log_error "Please specify backup file to restore"
            echo "Usage: $0 --restore <backup-file>"
            exit 1
        fi
        restore_backup "$2"
        ;;
    --upload)
        BACKUP_PATH=$(create_backup)
        upload_to_b2 "${BACKUP_PATH}"
        cleanup_old_backups
        ;;
    *)
        BACKUP_PATH=$(create_backup)
        cleanup_old_backups
        ;;
esac
