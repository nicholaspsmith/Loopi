# Quickstart: CI/CD Pipeline & Production Deployment

**Feature**: 002-ci-cd-deployment | **Date**: 2025-12-19

## Prerequisites

Before implementing this feature, ensure you have:

- [ ] GitHub repository with Actions enabled
- [ ] Hetzner Cloud account (or access to provision CX22)
- [ ] Domain name with DNS access (memoryloop.nicholaspsmith.com)
- [ ] Backblaze B2 account for backups
- [ ] Sentry account (free tier)

---

## Phase 1: CI Pipeline (User Story 1)

### 1.1 Create CI Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test
```

### 1.2 Enable Branch Protection

1. Go to Settings → Branches → Add rule
2. Branch name pattern: `main`
3. Enable: "Require status checks to pass before merging"
4. Select: lint, typecheck, test

---

## Phase 2: Docker Configuration (User Story 2)

### 2.1 Verify Existing Dockerfile

The multi-stage Dockerfile already exists. Verify it builds:

```bash
docker build -t memoryloop:test .
docker run -p 3000:3000 memoryloop:test
curl http://localhost:3000/api/health
```

### 2.2 Create Production Compose File

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    image: ghcr.io/${GITHUB_REPOSITORY}:${IMAGE_TAG:-latest}
    restart: unless-stopped
    ports:
      - '3000:3000'
    volumes:
      - ./data:/app/data
    env_file:
      - .env.production
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/api/health']
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## Phase 3: VPS Setup (User Story 3)

### 3.1 Provision Hetzner CX22

1. Log into Hetzner Cloud Console
2. Create new server:
   - Location: Choose nearest
   - Image: Ubuntu 22.04
   - Type: CX22 (4GB RAM, 2 vCPU)
   - SSH key: Add your public key

### 3.2 Initial Server Setup

SSH into server and run:

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
apt install docker-compose-plugin -y

# Configure firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Create deploy user
adduser --disabled-password deploy
usermod -aG docker deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh

# Create app directory
mkdir -p /opt/memoryloop/{data,config,backups,logs}
chown -R deploy:deploy /opt/memoryloop

# Disable password auth
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

# Install fail2ban
apt install fail2ban -y
systemctl enable fail2ban
```

---

## Phase 4: SSL & Domain (User Story 4)

### 4.1 Configure DNS

Add A record pointing to VPS IP:

```
memoryloop.nicholaspsmith.com → <VPS_IP>
```

### 4.2 Install Nginx and Certbot

```bash
apt install nginx certbot python3-certbot-nginx -y

# Create initial config (HTTP only)
cat > /etc/nginx/sites-available/memoryloop.conf << 'EOF'
server {
    listen 80;
    server_name memoryloop.nicholaspsmith.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -s /etc/nginx/sites-available/memoryloop.conf /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# Obtain SSL certificate
certbot --nginx -d memoryloop.nicholaspsmith.com

# Verify auto-renewal
certbot renew --dry-run
```

---

## Phase 5: Deployment Pipeline (User Story 5)

### 5.1 Add GitHub Secrets

Go to Settings → Secrets → Actions and add:

- `VPS_SSH_KEY`: Contents of private SSH key
- `VPS_HOST`: VPS IP address
- `VPS_USER`: `deploy`
- `SENTRY_AUTH_TOKEN`: From Sentry settings

### 5.2 Create Deploy Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

permissions:
  contents: read
  packages: write

jobs:
  build-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            ghcr.io/${{ github.repository }}:${{ github.sha }}
            ghcr.io/${{ github.repository }}:latest

  deploy:
    needs: build-push
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/memoryloop
            export IMAGE_TAG=${{ github.sha }}
            docker compose -f docker-compose.prod.yml pull
            docker compose -f docker-compose.prod.yml up -d
            sleep 10
            curl -f http://localhost:3000/api/health
```

---

## Phase 6: Monitoring (User Story 6)

### 6.1 Configure Sentry

Run the Sentry wizard:

```bash
npx @sentry/wizard@latest -i nextjs
```

### 6.2 Set Up UptimeRobot

1. Create account at uptimerobot.com
2. Add new monitor:
   - Type: HTTP(s)
   - URL: https://memoryloop.nicholaspsmith.com/api/health
   - Interval: 5 minutes

### 6.3 Configure Backups

Create `/opt/memoryloop/scripts/backup.sh`:

```bash
#!/bin/bash
set -e

DATE=$(date +%Y%m%d)
BACKUP_FILE="/opt/memoryloop/backups/backup-${DATE}.tar.gz"

# Compress LanceDB data
tar -czf "$BACKUP_FILE" -C /opt/memoryloop/data .

# Upload to B2
rclone copy "$BACKUP_FILE" b2:memoryloop-backups/

# Clean up local file
rm "$BACKUP_FILE"

# Remove backups older than 7 days from B2
rclone delete --min-age 7d b2:memoryloop-backups/
```

Add cron job:

```bash
crontab -e
# Add: 0 3 * * * /opt/memoryloop/scripts/backup.sh
```

---

## Verification Checklist

### CI Pipeline

- [ ] Push to feature branch triggers CI
- [ ] Failed lint blocks merge
- [ ] All checks show in PR

### Docker

- [ ] `docker build .` succeeds locally
- [ ] Image size < 500MB
- [ ] Health check returns 200

### VPS

- [ ] SSH with key authentication works
- [ ] Password authentication disabled
- [ ] UFW shows only 22, 80, 443 open

### SSL

- [ ] https://memoryloop.nicholaspsmith.com loads
- [ ] Certificate valid (check with browser)
- [ ] HTTP redirects to HTTPS

### Deployment

- [ ] Merge to main triggers deploy
- [ ] Health check validates deployment
- [ ] Rollback script works

### Monitoring

- [ ] Sentry captures test error
- [ ] UptimeRobot shows site as UP
- [ ] Backup script runs successfully
