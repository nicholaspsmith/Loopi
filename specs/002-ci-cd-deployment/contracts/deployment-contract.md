# Deployment Contract

**Version**: 1.0.0 | **Date**: 2025-12-19

## Overview

This document defines the contract between CI/CD pipeline and production VPS for automated deployments.

---

## 1. Pre-Deployment Requirements

### CI Pipeline Must

- [ ] All lint checks pass
- [ ] All type checks pass
- [ ] All unit tests pass
- [ ] All E2E tests pass
- [ ] Docker image builds successfully
- [ ] Docker image pushed to ghcr.io with commit SHA tag

### VPS Must Have

- [ ] Docker and Docker Compose installed
- [ ] Deploy user with SSH key authentication
- [ ] Directory `/opt/memoryloop` exists with correct permissions
- [ ] `.env.production` file with all required variables
- [ ] Nginx configured and running
- [ ] SSL certificate valid

---

## 2. Deployment Protocol

### Step 1: Image Pull

**Action**: Pull new Docker image from registry

```bash
docker pull ghcr.io/<owner>/<repo>:<commit-sha>
```

**Success Criteria**:

- Exit code 0
- Image layers downloaded

**Failure Action**:

- Abort deployment
- Report failure to CI

---

### Step 2: Container Start

**Action**: Start new container

```bash
docker-compose -f docker-compose.prod.yml up -d --no-deps app-new
```

**Success Criteria**:

- Container status: running
- No immediate crash (wait 5 seconds)

**Failure Action**:

- Remove failed container
- Abort deployment
- Report failure to CI

---

### Step 3: Health Check

**Action**: Validate new container health

```bash
curl -f http://localhost:3001/api/health
```

**Success Criteria**:

- HTTP 200 response within 30 seconds
- Response body `status` is `healthy` or `degraded`
- `database.status` is `up`

**Retry Policy**:

- 3 attempts
- 10 second delay between attempts

**Failure Action**:

- Stop new container
- Trigger rollback
- Report failure to CI

---

### Step 4: Traffic Switch

**Action**: Update Nginx upstream to new container

```bash
# Update Nginx config to point to new port
sed -i 's/localhost:3000/localhost:3001/' /etc/nginx/sites-available/memoryloop.conf
nginx -s reload
```

**Success Criteria**:

- Nginx reload successful
- No active connection errors

**Failure Action**:

- Revert Nginx config
- Stop new container
- Report failure to CI

---

### Step 5: Old Container Cleanup

**Action**: Stop and remove old container

```bash
# Wait for connections to drain
sleep 10

# Stop old container
docker stop memoryloop-app-old
docker rm memoryloop-app-old
```

**Success Criteria**:

- Old container stopped
- Resources freed

**Failure Action**:

- Log warning (non-blocking)
- Manual cleanup required

---

### Step 6: Image Cleanup

**Action**: Remove old Docker images

```bash
# Keep last 5 images
docker images ghcr.io/<owner>/<repo> --format '{{.Tag}}' | \
  tail -n +6 | \
  xargs -I {} docker rmi ghcr.io/<owner>/<repo>:{}
```

**Success Criteria**:

- Disk space freed
- Last 5 versions retained

**Failure Action**:

- Log warning (non-blocking)
- Manual cleanup required

---

## 3. Rollback Protocol

### Trigger Conditions

- Health check fails after 3 retries
- Manual rollback command issued
- Critical error detected in logs

### Rollback Steps

1. Identify previous working image tag
2. Pull previous image (if not cached)
3. Start container with previous image
4. Verify health check
5. Update Nginx to previous container
6. Clean up failed container

### Rollback Command

```bash
./scripts/rollback.sh <previous-commit-sha>
```

---

## 4. Environment Contract

### Required Secrets (GitHub Actions)

| Secret        | Purpose                           |
| ------------- | --------------------------------- |
| `VPS_SSH_KEY` | SSH private key for deployment    |
| `VPS_HOST`    | VPS IP address or hostname        |
| `VPS_USER`    | SSH username (typically `deploy`) |
| `VPS_PORT`    | SSH port (default: 22)            |

### Required Files (VPS)

| Path                                         | Purpose                 |
| -------------------------------------------- | ----------------------- |
| `/opt/memoryloop/config/.env.production`     | Environment variables   |
| `/opt/memoryloop/docker-compose.prod.yml`    | Production compose file |
| `/etc/nginx/sites-available/memoryloop.conf` | Nginx site config       |

---

## 5. Monitoring Integration

### Health Check Frequency

- Docker: Every 30 seconds
- UptimeRobot: Every 5 minutes
- Deployment validation: On each deploy

### Alert Conditions

| Condition                | Action                     |
| ------------------------ | -------------------------- |
| Health check fails 3x    | Page on-call               |
| Deployment fails         | GitHub Action notification |
| SSL expires in < 14 days | Email notification         |
| Disk usage > 80%         | Email notification         |

---

## 6. Success Notification

### On Successful Deployment

Report to GitHub Actions:

- Deployment status: success
- Deployed version: `<commit-sha>`
- Deployment time: `<duration>`
- Health check: passed

### On Failed Deployment

Report to GitHub Actions:

- Deployment status: failed
- Failed at step: `<step-name>`
- Error message: `<error>`
- Rollback status: `<success/failed>`
