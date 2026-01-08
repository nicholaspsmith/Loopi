# Quickstart: Rename MemoryLoop to Loopi

**Feature**: 024-024-rename-loopi
**Date**: 2026-01-08

## Overview

This guide covers the complete rollout process for renaming the project from "MemoryLoop" to "Loopi".

## Prerequisites

- [ ] Access to DNS management (Cloudflare/registrar)
- [ ] SSH access to VPS
- [ ] GitHub repository admin access
- [ ] Let's Encrypt certbot installed on VPS

## Phase 1: Code Changes (Automated)

The code changes are implemented via tasks in `tasks.md`. After completing all tasks:

```bash
# Verify no memoryloop references in source code
grep -ri "memoryloop" --include="*.ts" --include="*.tsx" --include="*.json" \
  --exclude-dir=specs --exclude-dir=tests --exclude-dir=node_modules

# Expected: 0 results
```

## Phase 2: Infrastructure Setup

### Step 1: DNS Configuration

Add A record in your DNS provider:

| Type | Name  | Content  | TTL |
| ---- | ----- | -------- | --- |
| A    | loopi | [VPS_IP] | 300 |

Wait for propagation (check with `dig loopi.nicholaspsmith.com`).

### Step 2: SSL Certificate

SSH to VPS and generate certificate:

```bash
# Stop nginx to free port 80
cd /opt/memoryloop
docker compose -f docker-compose.prod.yml stop nginx

# Generate new certificate
sudo certbot certonly --standalone -d loopi.nicholaspsmith.com

# Certificate will be at:
# /etc/letsencrypt/live/loopi.nicholaspsmith.com/fullchain.pem
# /etc/letsencrypt/live/loopi.nicholaspsmith.com/privkey.pem
```

### Step 3: Update VPS Directory

```bash
# Rename deployment directory
sudo mv /opt/memoryloop /opt/loopi

# Update environment file
sudo sed -i 's/memoryloop\.nicholaspsmith\.com/loopi.nicholaspsmith.com/g' /opt/loopi/.env
sudo sed -i 's/NEXTAUTH_URL=https:\/\/memoryloop/NEXTAUTH_URL=https:\/\/loopi/g' /opt/loopi/.env
```

### Step 4: Deploy New Configuration

```bash
cd /opt/loopi

# Pull latest code with new configs
git pull origin main

# Restart services with new names
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

## Phase 3: Repository Rename

1. Go to GitHub repository settings
2. Navigate to **Settings** → **General**
3. Under "Repository name", change `memoryloop` to `loopi`
4. Click "Rename"

GitHub will automatically redirect the old URL.

## Phase 4: Verification

### Health Check

```bash
# Test new domain
curl -I https://loopi.nicholaspsmith.com/api/health
# Expected: HTTP/2 200

# Test application
curl https://loopi.nicholaspsmith.com/
# Expected: HTML response
```

### Container Check

```bash
# SSH to VPS
docker ps --format "table {{.Names}}\t{{.Status}}"

# Expected:
# loopi-app      Up X minutes (healthy)
# loopi-postgres Up X minutes
# loopi-nginx    Up X minutes
```

### CI/CD Check

1. Push a small change to trigger CI
2. Verify GitHub Actions pass
3. Verify deployment completes

## Phase 5: Cleanup (Optional)

### Set Up Redirect from Old Domain

Add to nginx config on VPS:

```nginx
server {
    listen 80;
    listen 443 ssl;
    server_name memoryloop.nicholaspsmith.com;

    ssl_certificate /etc/letsencrypt/live/memoryloop.nicholaspsmith.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/memoryloop.nicholaspsmith.com/privkey.pem;

    return 301 https://loopi.nicholaspsmith.com$request_uri;
}
```

### Clean Up Old Docker Images

After stability period (1 week):

```bash
# Remove old image tags
docker rmi ghcr.io/nicholaspsmith/memoryloop:latest
docker image prune -f
```

## Rollback Procedure

If issues arise:

### Quick Rollback (DNS)

```bash
# Update DNS to point back to old config
# TTL is 300s, so changes propagate quickly
```

### Full Rollback (VPS)

```bash
# Rename directory back
sudo mv /opt/loopi /opt/memoryloop

# Restore environment
sudo sed -i 's/loopi\.nicholaspsmith\.com/memoryloop.nicholaspsmith.com/g' /opt/memoryloop/.env

# Restart with old config
cd /opt/memoryloop
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

## Checklist

### Pre-Deployment

- [ ] All code changes merged to main
- [ ] CI passing
- [ ] DNS A record created
- [ ] SSL certificate generated

### Deployment

- [ ] VPS directory renamed
- [ ] Environment file updated
- [ ] Services restarted
- [ ] Health check passing

### Post-Deployment

- [ ] GitHub repository renamed
- [ ] CI/CD verified
- [ ] Old domain redirect configured
- [ ] External links updated (if any)
