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

# Stop existing app container
echo "Stopping existing app container..."
docker compose -f "${COMPOSE_FILE}" stop app 2>/dev/null || true

# Start all services (postgres, ollama, nginx, app)
echo "Starting services..."
docker compose -f "${COMPOSE_FILE}" up -d

# Wait for postgres to be healthy
echo "Waiting for PostgreSQL to be ready..."
PG_ATTEMPTS=0
PG_MAX=30
while [ $PG_ATTEMPTS -lt $PG_MAX ]; do
    PG_ATTEMPTS=$((PG_ATTEMPTS + 1))
    if docker exec memoryloop-postgres pg_isready -U memoryloop > /dev/null 2>&1; then
        echo "PostgreSQL is ready."
        break
    fi
    echo "Waiting for PostgreSQL... (${PG_ATTEMPTS}/${PG_MAX})"
    sleep 2
done

# Install pgcrypto extension (idempotent)
echo "Ensuring pgcrypto extension is installed..."
docker exec memoryloop-postgres psql -U memoryloop -d memoryloop -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" 2>/dev/null || true

# Wait for Ollama to be ready
echo "Waiting for Ollama to be ready..."
OLLAMA_ATTEMPTS=0
OLLAMA_MAX=30
while [ $OLLAMA_ATTEMPTS -lt $OLLAMA_MAX ]; do
    OLLAMA_ATTEMPTS=$((OLLAMA_ATTEMPTS + 1))
    if docker exec memoryloop-ollama ollama list > /dev/null 2>&1; then
        echo "Ollama is ready."
        break
    fi
    echo "Waiting for Ollama... (${OLLAMA_ATTEMPTS}/${OLLAMA_MAX})"
    sleep 2
done

# Check available memory before model operations
echo "Checking system memory..."
AVAILABLE_MEM_KB=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
AVAILABLE_MEM_GB=$(echo "scale=1; $AVAILABLE_MEM_KB / 1024 / 1024" | bc)
REQUIRED_MEM_GB="2.5"

echo "Available memory: ${AVAILABLE_MEM_GB} GiB"

# Compare memory (bc returns 1 if true, 0 if false)
MEM_SUFFICIENT=$(echo "$AVAILABLE_MEM_GB >= $REQUIRED_MEM_GB" | bc)

if [ "$MEM_SUFFICIENT" -eq 0 ]; then
    echo "=========================================="
    echo "WARNING: Insufficient memory for Ollama models"
    echo "Available: ${AVAILABLE_MEM_GB} GiB"
    echo "Required:  ${REQUIRED_MEM_GB} GiB (for llama3.2)"
    echo ""
    echo "Chat and flashcard generation will fail."
    echo "Upgrade VPS to 8 GB RAM to fix this issue."
    echo "=========================================="
fi

# Pull required models with 5-minute timeout (idempotent - skips if already present)
echo "Ensuring Ollama models are available..."
timeout 300 docker exec memoryloop-ollama ollama pull nomic-embed-text || echo "Warning: Failed to pull nomic-embed-text"
timeout 300 docker exec memoryloop-ollama ollama pull llama3.2 || echo "Warning: Failed to pull llama3.2"

# Validate llama3.2 can actually load (catches memory issues early)
echo "Validating llama3.2 model can load..."
if timeout 60 docker exec memoryloop-ollama ollama run llama3.2 "test" > /dev/null 2>&1; then
    echo "llama3.2 model validated successfully."
else
    echo "=========================================="
    echo "WARNING: llama3.2 failed to load"
    echo ""
    echo "This is likely a memory issue. The model requires"
    echo "approximately 2.3 GiB of available RAM."
    echo ""
    echo "Current available: ${AVAILABLE_MEM_GB} GiB"
    echo "Chat and flashcard features will not work."
    echo "=========================================="
fi

echo "Ollama models ready."

# Wait for app health check
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
