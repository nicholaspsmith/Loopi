#!/bin/sh
set -e

echo "Starting Loopi application..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
timeout=30
counter=0

until PGPASSWORD="${POSTGRES_PASSWORD:-postgres}" psql -h "${DATABASE_HOST:-postgres}" -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-memoryloop}" -c '\q' 2>/dev/null; do
  counter=$((counter + 1))
  if [ $counter -gt $timeout ]; then
    echo "Error: PostgreSQL is not available after ${timeout} seconds"
    exit 1
  fi
  echo "PostgreSQL is unavailable - waiting..."
  sleep 1
done

echo "PostgreSQL is ready!"

# Run database schema initialization (idempotent)
echo "Initializing database schema..."
PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "${DATABASE_HOST:-postgres}" -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-memoryloop}" -f /app/scripts/init-db.sql || echo "Warning: Schema initialization had issues (may be OK if tables exist)"

# Initialize LanceDB directory
echo "Ensuring LanceDB directory exists..."
mkdir -p /app/data/lancedb
chown -R nextjs:nodejs /app/data/lancedb 2>/dev/null || true

echo "Starting Next.js server..."
exec "$@"
