#!/bin/bash
set -e

# Rollback script for Loopi
# Reverts to a previous Docker image version
#
# Usage:
#   ./rollback.sh              # List available backup images
#   ./rollback.sh <tag>        # Rollback to specific backup tag

DEPLOY_DIR="/opt/loopi"
IMAGE_NAME="${IMAGE_NAME:-ghcr.io/nicholaspsmith/loopi:latest}"
COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.prod.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# List available backup images
list_backups() {
    log_info "Available backup images:"
    echo ""
    docker images --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}\t{{.Size}}" | grep "loopi-backup" || echo "No backup images found"
    echo ""
}

# Rollback to specific backup
rollback_to() {
    local BACKUP_TAG="$1"
    local BACKUP_IMAGE="loopi-backup:${BACKUP_TAG}"

    # Check if backup exists
    if ! docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "${BACKUP_IMAGE}"; then
        log_error "Backup image not found: ${BACKUP_IMAGE}"
        echo ""
        list_backups
        exit 1
    fi

    log_info "Rolling back to ${BACKUP_IMAGE}..."

    cd "${DEPLOY_DIR}"

    # Stop current app container
    log_info "Stopping current app container..."
    docker compose -f "${COMPOSE_FILE}" stop app

    # Tag backup as latest
    log_info "Restoring backup image..."
    docker tag "${BACKUP_IMAGE}" "${IMAGE_NAME}"

    # Start app with restored image
    log_info "Starting app with restored image..."
    docker compose -f "${COMPOSE_FILE}" up -d app

    # Wait for health check
    log_info "Waiting for health check..."
    MAX_ATTEMPTS=30
    ATTEMPT=0
    HEALTHY=false

    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        ATTEMPT=$((ATTEMPT + 1))

        HEALTH=$(docker inspect --format='{{.State.Health.Status}}' loopi-app 2>/dev/null || echo "unknown")

        if [ "$HEALTH" = "healthy" ]; then
            HEALTHY=true
            break
        fi

        echo "  Attempt ${ATTEMPT}/${MAX_ATTEMPTS}... (status: ${HEALTH})"
        sleep 2
    done

    if [ "$HEALTHY" = true ]; then
        log_info "Rollback successful! Container is healthy."
        exit 0
    else
        log_error "Rollback failed - container not healthy"
        log_warn "Manual intervention may be required"
        docker logs --tail 50 loopi-app
        exit 1
    fi
}

# Main
if [ -z "$1" ]; then
    list_backups
    echo "Usage: $0 <backup-tag>"
    echo "Example: $0 backup-20251221-143000"
    exit 0
else
    rollback_to "$1"
fi
