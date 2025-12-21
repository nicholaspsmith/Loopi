#!/bin/bash
set -e

# Deployment script for MemoryLoop
# This script is executed on the VPS during deployment

DEPLOY_DIR="/opt/memoryloop"
IMAGE_NAME="${IMAGE_NAME:-ghcr.io/nicholaspsmith/memoryloop:latest}"
COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.prod.yml"

echo "=== Deploying ${IMAGE_NAME} ==="

cd "${DEPLOY_DIR}"

# Ensure required files exist
if [ ! -f "${COMPOSE_FILE}" ]; then
    echo "Error: docker-compose.prod.yml not found at ${COMPOSE_FILE}"
    exit 1
fi

if [ ! -f "${DEPLOY_DIR}/.env" ]; then
    echo "Error: .env file not found at ${DEPLOY_DIR}/.env"
    exit 1
fi

# Pull the latest image
echo "Pulling image..."
docker pull "${IMAGE_NAME}"

# Create backup of current state
BACKUP_TAG="backup-$(date +%Y%m%d-%H%M%S)"
if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "memoryloop-backup"; then
    echo "Removing old backup..."
    docker rmi memoryloop-backup:latest 2>/dev/null || true
fi

# Tag current image as backup (if exists)
if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "${IMAGE_NAME}"; then
    echo "Creating backup of current image..."
    docker tag "${IMAGE_NAME}" "memoryloop-backup:${BACKUP_TAG}" 2>/dev/null || true
fi

# Stop existing container
echo "Stopping existing container..."
docker compose -f "${COMPOSE_FILE}" stop app 2>/dev/null || true

# Start new container
echo "Starting new container..."
docker compose -f "${COMPOSE_FILE}" up -d app

# Wait for health check
echo "Waiting for health check..."
MAX_ATTEMPTS=30
ATTEMPT=0
HEALTHY=false

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    echo "Attempt ${ATTEMPT}/${MAX_ATTEMPTS}..."

    # Check if container is healthy
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' memoryloop-app 2>/dev/null || echo "unknown")

    if [ "$HEALTH" = "healthy" ]; then
        HEALTHY=true
        break
    fi

    sleep 2
done

if [ "$HEALTHY" = true ]; then
    echo "Deployment successful! Container is healthy."

    # Clean up old images
    echo "Cleaning up old images..."
    docker image prune -f

    exit 0
else
    echo "Health check failed! Rolling back..."

    # Stop failed container
    docker compose -f "${COMPOSE_FILE}" stop app

    # Restore backup if available
    if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "memoryloop-backup:${BACKUP_TAG}"; then
        echo "Restoring backup..."
        docker tag "memoryloop-backup:${BACKUP_TAG}" "${IMAGE_NAME}"
        docker compose -f "${COMPOSE_FILE}" up -d app
    fi

    exit 1
fi
