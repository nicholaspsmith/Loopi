# Data Model: CI/CD Pipeline & Production Deployment

**Date**: 2025-12-19 | **Feature**: 002-ci-cd-deployment

## Overview

This feature primarily deals with infrastructure configuration rather than traditional data entities. The "data model" consists of configuration files, environment variables, and operational state.

---

## 1. Configuration Entities

### GitHub Actions Workflow

**Entity**: CI Workflow (`ci.yml`)

| Field       | Type   | Description                             |
| ----------- | ------ | --------------------------------------- |
| name        | string | Workflow display name                   |
| on          | object | Trigger events (push, pull_request)     |
| jobs        | object | Job definitions (lint, typecheck, test) |
| permissions | object | Required permissions                    |

**State Transitions**:

- `pending` → `in_progress` → `completed` (success/failure/cancelled)

---

### Docker Image

**Entity**: Container Image

| Field      | Type      | Description              |
| ---------- | --------- | ------------------------ |
| repository | string    | `ghcr.io/<owner>/<repo>` |
| tag        | string    | Commit SHA or `latest`   |
| created    | timestamp | Build timestamp          |
| size       | integer   | Image size in bytes      |
| digest     | string    | SHA256 content hash      |

**Lifecycle**:

- Built on merge to main
- Tagged with commit SHA
- Latest 5 versions retained
- Older versions eligible for deletion

---

### Deployment

**Entity**: Deployment Event

| Field             | Type      | Description                                        |
| ----------------- | --------- | -------------------------------------------------- |
| id                | string    | Unique deployment ID (timestamp-based)             |
| commitSha         | string    | Git commit being deployed                          |
| imageTag          | string    | Docker image tag                                   |
| status            | enum      | pending, in_progress, success, failed, rolled_back |
| startedAt         | timestamp | Deployment start time                              |
| completedAt       | timestamp | Deployment completion time                         |
| healthCheckPassed | boolean   | Whether health check succeeded                     |
| previousVersion   | string    | Previous image tag (for rollback)                  |

**State Machine**:

```
pending → in_progress → health_check
                              ↓
                    ┌────────┴────────┐
                    ↓                 ↓
                 success           failed
                                     ↓
                              rolled_back
```

---

### Health Check

**Entity**: Health Status

| Field          | Type      | Description                  |
| -------------- | --------- | ---------------------------- |
| status         | enum      | healthy, degraded, unhealthy |
| database       | boolean   | LanceDB connection status    |
| ollama         | boolean   | Ollama API availability      |
| anthropic      | boolean   | Anthropic API key validity   |
| timestamp      | timestamp | Check timestamp              |
| responseTimeMs | integer   | Health check latency         |

**Endpoint**: `GET /api/health`

**Response Schema**:

```json
{
  "status": "healthy",
  "checks": {
    "database": { "status": "up", "latencyMs": 5 },
    "ollama": { "status": "up", "latencyMs": 120 },
    "anthropic": { "status": "up" }
  },
  "version": "abc1234",
  "uptime": 86400
}
```

---

### Backup

**Entity**: Database Backup

| Field         | Type      | Description                               |
| ------------- | --------- | ----------------------------------------- |
| id            | string    | Backup ID (date-based: `backup-YYYYMMDD`) |
| createdAt     | timestamp | Backup creation time                      |
| sizeBytes     | integer   | Compressed backup size                    |
| location      | string    | B2 bucket path                            |
| checksum      | string    | SHA256 of backup file                     |
| retentionDays | integer   | Days until auto-deletion (7)              |

**Retention Policy**:

- Keep 7 daily backups
- Auto-delete backups older than 7 days
- Manual backups can be marked as permanent

---

## 2. Environment Variables

### Build-Time Variables

| Variable            | Scope   | Description                     |
| ------------------- | ------- | ------------------------------- |
| `SENTRY_AUTH_TOKEN` | CI only | Sentry source map upload        |
| `GITHUB_TOKEN`      | CI only | Auto-provided by GitHub Actions |

### Runtime Variables (VPS)

| Variable                 | Required | Description                             |
| ------------------------ | -------- | --------------------------------------- |
| `NODE_ENV`               | Yes      | `production`                            |
| `NEXTAUTH_URL`           | Yes      | `https://memoryloop.nicholaspsmith.com` |
| `NEXTAUTH_SECRET`        | Yes      | Session encryption key                  |
| `ANTHROPIC_API_KEY`      | Yes      | Claude API key                          |
| `NEXT_PUBLIC_SENTRY_DSN` | Yes      | Sentry client DSN                       |
| `SENTRY_DSN`             | Yes      | Sentry server DSN                       |
| `OLLAMA_BASE_URL`        | No       | Ollama API endpoint (if used)           |

### Backup Variables (VPS)

| Variable     | Required | Description                  |
| ------------ | -------- | ---------------------------- |
| `B2_KEY_ID`  | Yes      | Backblaze application key ID |
| `B2_APP_KEY` | Yes      | Backblaze application key    |
| `B2_BUCKET`  | Yes      | Target bucket name           |

---

## 3. File System Layout

### VPS Directory Structure

```
/opt/memoryloop/
├── data/
│   └── lancedb/           # LanceDB persistent storage
├── config/
│   └── .env.production    # Environment variables
├── backups/
│   └── staging/           # Temporary backup storage before B2 upload
├── logs/
│   └── app/               # Application log files (14-day retention)
└── certs/                 # Let's Encrypt certificates (symlinked)
```

### Docker Volume Mounts

| Container Path         | Host Path                                | Purpose             |
| ---------------------- | ---------------------------------------- | ------------------- |
| `/app/data`            | `/opt/memoryloop/data`                   | LanceDB persistence |
| `/app/.env.production` | `/opt/memoryloop/config/.env.production` | Environment config  |

---

## 4. Nginx Configuration Structure

### Sites Configuration

```
/etc/nginx/
├── nginx.conf                      # Main configuration
├── sites-available/
│   └── memoryloop.conf             # Site configuration
├── sites-enabled/
│   └── memoryloop.conf → ../sites-available/memoryloop.conf
└── snippets/
    ├── ssl-params.conf             # TLS 1.3 settings
    └── security-headers.conf       # HSTS, CSP, etc.
```

### SSL Certificates

```
/etc/letsencrypt/
├── live/
│   └── memoryloop.nicholaspsmith.com/
│       ├── fullchain.pem           # Certificate chain
│       ├── privkey.pem             # Private key
│       └── cert.pem                # Domain certificate
└── renewal/
    └── memoryloop.nicholaspsmith.com.conf  # Renewal config
```

---

## 5. Relationships

```
┌─────────────────┐     triggers      ┌─────────────────┐
│   Git Commit    │──────────────────▶│   CI Workflow   │
└─────────────────┘                   └────────┬────────┘
                                               │ builds
                                               ▼
┌─────────────────┐     pulls         ┌─────────────────┐
│      VPS        │◀──────────────────│  Docker Image   │
└────────┬────────┘                   └─────────────────┘
         │ runs
         ▼
┌─────────────────┐     validates     ┌─────────────────┐
│   Container     │──────────────────▶│  Health Check   │
└────────┬────────┘                   └─────────────────┘
         │ stores
         ▼
┌─────────────────┐     backs up to   ┌─────────────────┐
│    LanceDB      │──────────────────▶│   Backblaze B2  │
└─────────────────┘                   └─────────────────┘
```

---

## 6. Validation Rules

### Deployment Validation

- Health check must respond within 30 seconds
- HTTP status must be 200
- All critical checks (database) must be "up"
- Rollback triggered if health check fails after 3 retries

### Backup Validation

- Backup size must be > 0 bytes
- Checksum must match after upload
- Upload must complete within 10 minutes
- Alert if backup fails 2 consecutive days

### SSL Validation

- Certificate must have > 30 days until expiry
- Certificate must match domain name
- OCSP stapling must be enabled
- TLS 1.3 must be supported
