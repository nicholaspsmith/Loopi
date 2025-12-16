# Implementation Plan: CI/CD Pipeline & Production Deployment

**Feature**: 002-ci-cd-deployment
**Created**: 2025-12-16
**Status**: Draft

## Overview

Implement automated CI/CD pipeline and production deployment infrastructure for MemoryLoop application using GitHub Actions, Docker, and VPS hosting.

## Technical Stack

### CI/CD
- **GitHub Actions**: Automation platform (free for public repos)
- **Docker**: Containerization (v24+)
- **Docker Compose**: Multi-container orchestration (v2+)

### Infrastructure
- **VPS**: Hetzner CX22 or DigitalOcean Droplet (4GB RAM, 2 vCPU, Ubuntu 22.04)
- **Nginx**: Reverse proxy and web server (v1.24+)
- **Let's Encrypt**: Free SSL certificates via Certbot
- **UFW**: Uncomplicated Firewall for security

### Monitoring
- **UptimeRobot**: Uptime monitoring (free tier)
- **Sentry** (optional): Error tracking
- **Structured Logging**: JSON logs to stdout

### Backup & Storage
- **Backblaze B2** or **AWS S3**: Database backup storage
- **Docker volumes**: Persistent data storage

## Architecture

```
GitHub Repository
    ↓ (push/merge)
GitHub Actions CI
    ↓ (on main merge)
Docker Image Build
    ↓ (push to registry)
VPS Deployment
    ↓
[Nginx] → [Next.js App] → [LanceDB]
           ↓
       [Ollama LLM]
```

**Production Stack on VPS:**
- Nginx (reverse proxy, SSL termination)
- Next.js application (Docker container)
- LanceDB (persistent volume)
- Ollama (separate Docker container)
- Let's Encrypt SSL certificates

## Core Implementation

### Phase 1: GitHub Actions CI Pipeline

**Goal**: Automated testing on all code changes

1. Create `.github/workflows/ci.yml`:
   - Trigger on push to any branch and PR
   - Jobs: lint, type-check, unit-test
   - Use caching for node_modules and Docker layers
   - Fail fast on errors

2. Create `.github/workflows/integration.yml`:
   - Trigger on PR to main
   - Run Playwright E2E tests
   - Use matrix strategy for parallel test execution
   - Upload test artifacts on failure

3. Configure GitHub Actions secrets:
   - ANTHROPIC_API_KEY
   - VPS_SSH_KEY
   - DOCKER_REGISTRY_TOKEN (if using private registry)

4. Add branch protection rules:
   - Require CI checks to pass
   - Require code review
   - No force push to main

**Files**: `.github/workflows/ci.yml`, `.github/workflows/integration.yml`

### Phase 2: Docker Configuration

**Goal**: Containerized application for local dev and production

1. Create `Dockerfile`:
   - Multi-stage build (build stage + production stage)
   - Stage 1: Install dependencies, build Next.js
   - Stage 2: Copy build artifacts, minimal production image
   - Health check command: `curl /api/health`
   - Non-root user for security

2. Create `docker-compose.yml` (local development):
   - Services: app, ollama, nginx
   - Volume mounts for hot-reload
   - Network configuration
   - Environment variables from .env.local

3. Create `docker-compose.prod.yml` (production):
   - Services: app, ollama, nginx
   - Persistent volumes for data
   - Restart policies (always)
   - Resource limits

4. Create `.dockerignore`:
   - Exclude: node_modules, .git, .next, tests, docs, *.md
   - Include: package.json, package-lock.json, public, app

5. Create `app/api/health/route.ts`:
   - Check database connectivity (LanceDB)
   - Check Ollama availability
   - Check Anthropic API key validity
   - Return JSON: `{status, db, ollama, anthropic, timestamp}`

6. Create `scripts/docker-entrypoint.sh`:
   - Initialize LanceDB if not exists
   - Run any pending migrations
   - Start Next.js server

**Files**: `Dockerfile`, `docker-compose.yml`, `docker-compose.prod.yml`, `.dockerignore`, `app/api/health/route.ts`, `scripts/docker-entrypoint.sh`

### Phase 3: VPS Provisioning & Configuration

**Goal**: Secure production server ready for deployment

1. Provision VPS (Hetzner CX22 or DigitalOcean Droplet):
   - 4GB RAM, 2 vCPU
   - Ubuntu 22.04 LTS
   - Note down public IP address

2. Initial server setup (SSH as root):
   - Update packages: `apt update && apt upgrade -y`
   - Create deploy user: `adduser deploy`
   - Add to sudo: `usermod -aG sudo deploy`
   - Copy SSH keys: `rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy`

3. Install Docker:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   usermod -aG docker deploy
   ```

4. Install Docker Compose:
   ```bash
   curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   chmod +x /usr/local/bin/docker-compose
   ```

5. Configure UFW firewall:
   ```bash
   ufw allow 22/tcp
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw enable
   ```

6. SSH hardening (`/etc/ssh/sshd_config`):
   - `PasswordAuthentication no`
   - `PermitRootLogin no`
   - `Port 22` (or change to custom port)
   - Install fail2ban: `apt install fail2ban`

7. Create directory structure:
   ```bash
   mkdir -p /opt/memoryloop/{data,config,backups}
   chown -R deploy:deploy /opt/memoryloop
   ```

**Manual Steps**: VPS provisioning, SSH key setup
**Automation**: Create `scripts/setup-vps.sh` for repeatable configuration

### Phase 4: Nginx & SSL Configuration

**Goal**: HTTPS access with automatic SSL renewal

1. Install Nginx on VPS:
   ```bash
   apt install nginx
   ```

2. Create Nginx config `nginx/memoryloop.conf`:
   ```nginx
   server {
       listen 80;
       server_name memoryloop.nicholaspsmith.com;
       return 301 https://$server_name$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name memoryloop.nicholaspsmith.com;

       # SSL will be added by Certbot

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

3. Copy config to VPS:
   ```bash
   scp nginx/memoryloop.conf deploy@<vps-ip>:/etc/nginx/sites-available/
   ssh deploy@<vps-ip> "ln -s /etc/nginx/sites-available/memoryloop.conf /etc/nginx/sites-enabled/"
   ssh deploy@<vps-ip> "nginx -t && systemctl reload nginx"
   ```

4. Configure DNS A record:
   - Point memoryloop.nicholaspsmith.com to VPS IP
   - Wait for DNS propagation (use `dig` to verify)

5. Install Certbot and obtain SSL certificate:
   ```bash
   apt install certbot python3-certbot-nginx
   certbot --nginx -d memoryloop.nicholaspsmith.com
   ```

6. Verify auto-renewal:
   ```bash
   certbot renew --dry-run
   ```

**Files**: `nginx/memoryloop.conf`
**Manual Steps**: DNS configuration, initial Certbot run

### Phase 5: Deployment Automation

**Goal**: Automated deployment on merge to main

1. Create `.github/workflows/deploy.yml`:
   - Trigger: push to main branch
   - Jobs:
     - Build Docker image with commit SHA tag
     - Push to Docker registry (Docker Hub or GHCR)
     - SSH to VPS and run deployment script
     - Verify health check
     - Send notification (Discord/Slack webhook)

2. Create `scripts/deploy.sh` (runs on VPS):
   ```bash
   #!/bin/bash
   set -e

   # Pull latest image
   docker pull <registry>/memoryloop:$COMMIT_SHA

   # Stop old container gracefully
   docker-compose -f docker-compose.prod.yml down

   # Start new container
   docker-compose -f docker-compose.prod.yml up -d

   # Wait for health check
   for i in {1..30}; do
       if curl -f http://localhost:3000/api/health; then
           echo "Deployment successful!"
           exit 0
       fi
       sleep 1
   done

   echo "Health check failed! Rolling back..."
   docker-compose -f docker-compose.prod.yml down
   docker pull <registry>/memoryloop:previous
   docker-compose -f docker-compose.prod.yml up -d
   exit 1
   ```

3. Create `scripts/rollback.sh`:
   - Stop current container
   - Pull previous image version
   - Start container with previous version
   - Verify health check

4. Configure automated database backups:
   - Create backup script: `scripts/backup-db.sh`
   - Add cron job: `0 2 * * * /opt/memoryloop/scripts/backup-db.sh`
   - Upload to S3/B2 using AWS CLI or rclone
   - Retain last 7 daily backups

5. Configure Docker log rotation:
   - Edit `/etc/docker/daemon.json`:
     ```json
     {
       "log-driver": "json-file",
       "log-opts": {
         "max-size": "10m",
         "max-file": "3"
       }
     }
     ```
   - Restart Docker: `systemctl restart docker`

**Files**: `.github/workflows/deploy.yml`, `scripts/deploy.sh`, `scripts/rollback.sh`, `scripts/backup-db.sh`

### Phase 6: Monitoring & Observability

**Goal**: Production visibility and alerting

1. Implement structured logging in application:
   - Create `lib/logger.ts`:
     - Use pino or winston for JSON logging
     - Log levels: error, warn, info, debug
     - Include: timestamp, level, message, context
   - Add to all API routes
   - Log: requests, errors, performance metrics

2. Configure Docker log aggregation:
   - Option A: Send to external service (Logtail, Papertrail)
   - Option B: Use fluentd sidecar container
   - Option C: Aggregated locally with logrotate

3. Set up error tracking (optional - Sentry):
   - Install @sentry/nextjs
   - Configure in next.config.ts
   - Add Sentry DSN to environment variables
   - Capture errors in error.tsx boundaries

4. Configure uptime monitoring:
   - Create UptimeRobot account (free tier)
   - Add monitor for https://memoryloop.nicholaspsmith.com
   - Set check interval: 5 minutes
   - Add alert contacts (email/SMS)

5. Create monitoring dashboard script:
   `scripts/monitor.sh`:
   - Check application health (curl /api/health)
   - Check disk usage (df -h)
   - Check memory usage (free -m)
   - Check Docker container status
   - Output formatted report

**Files**: `lib/logger.ts`, `scripts/monitor.sh`

### Phase 7: Documentation

**Goal**: Operations runbook for common scenarios

1. Create `docs/deployment.md`:
   - VPS provisioning steps
   - Initial setup checklist
   - Deployment process overview
   - Environment variables reference

2. Create `docs/operations.md`:
   - How to restart application
   - How to rollback deployment
   - How to restore from backup
   - How to check logs
   - How to update SSL certificates
   - Troubleshooting common issues

3. Update `README.md`:
   - Add production deployment badge
   - Add link to live site
   - Add deployment status indicator
   - Link to docs/deployment.md

**Files**: `docs/deployment.md`, `docs/operations.md`, updated `README.md`

## Constitution Check

### ✅ Documentation-First Development
- Specification complete before implementation (spec.md exists)
- All user stories documented with acceptance criteria
- Operations runbook planned

### ✅ Test-First Development (TDD)
- Health check endpoint testable
- CI pipeline validates all code changes
- Integration tests run before merge

### ✅ Modularity & Composability
- Docker services are independent (app, ollama, nginx)
- Scripts are single-purpose (deploy.sh, rollback.sh, backup.sh)
- Monitoring is modular (can add/remove services)

### ✅ Simplicity (YAGNI)
- Single-server deployment (no premature scaling)
- Docker Compose (no Kubernetes complexity)
- Manual provisioning acceptable initially
- No advanced deployment strategies (blue-green, canary)

### ✅ Observability & Debugging
- Structured JSON logging
- Health check endpoint for diagnostics
- Monitoring dashboard script
- Error tracking optional but available

### ✅ Atomic Commits & Version Control Discipline
- Each phase can be committed independently
- Clear commit messages per constitution
- One logical change per commit

## Risk Mitigation

1. **VPS downtime**: Keep backups, document recovery process
2. **SSL renewal failure**: Manual renewal process documented
3. **Deployment failure**: Automatic rollback in deploy script
4. **Disk space**: Log rotation configured, monitoring alerts
5. **Network issues**: Health check timeout and retry logic

## Success Criteria

- ✅ CI pipeline runs on all PRs (< 10 minutes)
- ✅ Docker builds locally and on VPS
- ✅ HTTPS site accessible with valid SSL
- ✅ Automated deployment on merge to main (< 5 minutes)
- ✅ Zero-downtime deployments
- ✅ Monitoring alerts within 5 minutes of downtime
- ✅ Complete operations runbook exists
- ✅ Infrastructure costs < $12/month
