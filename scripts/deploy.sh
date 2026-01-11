#!/bin/bash
set -e

# Deployment script for Loopi
# This script is executed on the VPS during deployment

DEPLOY_DIR="/opt/loopi"
IMAGE_NAME="${IMAGE_NAME:-ghcr.io/nicholaspsmith/loopi:latest}"
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

# Ensure data directories exist with correct permissions
echo "Ensuring data directories have correct permissions..."
mkdir -p "${DEPLOY_DIR}/data/postgres"
mkdir -p "${DEPLOY_DIR}/data/lancedb"
# PostgreSQL runs as uid 70 in alpine image
chown -R 70:70 "${DEPLOY_DIR}/data/postgres"
# Next.js app runs as uid 1001 (nextjs user)
chown -R 1001:1001 "${DEPLOY_DIR}/data/lancedb"

# Create backup of current state
BACKUP_TAG="backup-$(date +%Y%m%d-%H%M%S)"
if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "loopi-backup"; then
    echo "Removing old backup..."
    docker rmi loopi-backup:latest 2>/dev/null || true
fi

# Tag current image as backup (if exists)
if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "${IMAGE_NAME}"; then
    echo "Creating backup of current image..."
    docker tag "${IMAGE_NAME}" "loopi-backup:${BACKUP_TAG}" 2>/dev/null || true
fi

# Stop existing app container
echo "Stopping existing app container..."
docker compose -f "${COMPOSE_FILE}" stop app 2>/dev/null || true

# Start all services (postgres, nginx, app)
echo "Starting services..."
docker compose -f "${COMPOSE_FILE}" up -d

# Wait for postgres to be healthy
echo "Waiting for PostgreSQL to be ready..."
PG_ATTEMPTS=0
PG_MAX=30
while [ $PG_ATTEMPTS -lt $PG_MAX ]; do
    PG_ATTEMPTS=$((PG_ATTEMPTS + 1))
    if docker exec loopi-postgres pg_isready -U memoryloop > /dev/null 2>&1; then
        echo "PostgreSQL is ready."
        break
    fi
    echo "Waiting for PostgreSQL... (${PG_ATTEMPTS}/${PG_MAX})"
    sleep 2
done

# Install pgcrypto extension (idempotent)
echo "Ensuring pgcrypto extension is installed..."
docker exec loopi-postgres psql -U memoryloop -d memoryloop -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" 2>/dev/null || true

# Wait for app health check
echo "Waiting for health check..."
MAX_ATTEMPTS=30
ATTEMPT=0
HEALTHY=false

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    echo "Attempt ${ATTEMPT}/${MAX_ATTEMPTS}..."

    # Check if container is healthy
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' loopi-app 2>/dev/null || echo "unknown")

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
    if docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "loopi-backup:${BACKUP_TAG}"; then
        echo "Restoring backup..."
        docker tag "loopi-backup:${BACKUP_TAG}" "${IMAGE_NAME}"
        docker compose -f "${COMPOSE_FILE}" up -d app
    fi

    exit 1
fi
