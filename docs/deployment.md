# Deployment Guide

This guide covers the complete deployment process for Loopi.

## Overview

Loopi uses a containerized deployment with:

- **Docker Compose** for container orchestration
- **GitHub Actions** for CI/CD pipeline
- **Nginx** for reverse proxy with SSL
- **Let's Encrypt** for SSL certificates

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        VPS                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │                    Nginx                         │    │
│  │              (SSL Termination)                   │    │
│  │                 :80, :443                        │    │
│  └─────────────────────┬───────────────────────────┘    │
│                        │                                 │
│  ┌─────────────────────▼───────────────────────────┐    │
│  │              loopi-app                      │    │
│  │              (Next.js :3000)                     │    │
│  └─────────────────────┬───────────────────────────┘    │
│                        │                                 │
│        ┌───────────────┼───────────────┐                │
│        ▼               ▼               ▼                │
│  ┌──────────┐   ┌──────────┐                           │
│  │ postgres │   │ lancedb  │                           │
│  │  :5432   │   │  (file)  │                           │
│  └──────────┘   └──────────┘                           │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

### VPS Requirements

- Ubuntu 22.04 LTS or later
- Minimum 4GB RAM, 2 vCPU
- 40GB SSD storage
- Public IP address

### Required Secrets (GitHub)

Configure these in repository Settings > Secrets:

| Secret                      | Description                      |
| --------------------------- | -------------------------------- |
| `VPS_HOST`                  | VPS IP address or hostname       |
| `VPS_USER`                  | SSH username (e.g., `deploy`)    |
| `VPS_SSH_KEY`               | Private SSH key for deployment   |
| `POSTGRES_USER`             | PostgreSQL username              |
| `POSTGRES_PASSWORD`         | PostgreSQL password              |
| `POSTGRES_DB`               | PostgreSQL database name         |
| `NEXTAUTH_SECRET`           | NextAuth.js session secret       |
| `NEXTAUTH_URL`              | Production URL                   |
| `ENCRYPTION_KEY`            | Data encryption key              |
| `API_KEY_ENCRYPTION_SECRET` | API key encryption secret        |
| `DEPLOYMENT_WEBHOOK_URL`    | (Optional) Slack/Discord webhook |

See [github-secrets-setup.md](./github-secrets-setup.md) for detailed instructions.

## Initial VPS Setup

### 1. Run Setup Script

```bash
# SSH to VPS as root
ssh root@your-vps-ip

# Download and run setup script
curl -fsSL https://raw.githubusercontent.com/nicholaspsmith/loopi/main/scripts/setup-vps.sh | bash -s -- "your-ssh-public-key"
```

Or manually:

```bash
# Clone the repo temporarily
git clone https://github.com/nicholaspsmith/loopi.git /tmp/loopi
cd /tmp/loopi

# Run setup script with your SSH public key
./scripts/setup-vps.sh "ssh-rsa AAAA..."
```

The script configures:

- UFW firewall (ports 22, 80, 443)
- Docker and Docker Compose
- Deploy user with sudo access
- SSH hardening and fail2ban
- Directory structure at `/opt/loopi`

### 2. Configure Environment

```bash
# SSH as deploy user
ssh deploy@your-vps-ip

# Create environment file
cat > /opt/loopi/.env << 'EOF'
DATABASE_URL=postgresql://loopi:your-password@postgres:5432/loopi
POSTGRES_USER=loopi
POSTGRES_PASSWORD=your-password
POSTGRES_DB=loopi
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://loopi.yourdomain.com
ENCRYPTION_KEY=your-encryption-key
API_KEY_ENCRYPTION_SECRET=your-api-key-secret
EOF

chmod 600 /opt/loopi/.env
```

### 3. Configure DNS

Create an A record pointing your domain to the VPS IP:

```
loopi.yourdomain.com -> YOUR_VPS_IP
```

### 4. Obtain SSL Certificate

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --standalone -d loopi.yourdomain.com

# Certificate will be at:
# /etc/letsencrypt/live/loopi.yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/loopi.yourdomain.com/privkey.pem
```

## Deployment Process

### Automatic Deployment

Deployments are triggered automatically when:

1. Code is merged to `main` branch
2. GitHub Actions workflow runs:
   - Builds Docker image
   - Pushes to GitHub Container Registry
   - SSHs to VPS and runs deploy script
3. Deploy script:
   - Pulls latest image
   - Creates backup of current image
   - Stops old container
   - Starts new container
   - Runs health checks
   - Rolls back if health check fails

### Manual Deployment

```bash
# SSH to VPS
ssh deploy@your-vps-ip
cd /opt/loopi

# Pull latest image
docker pull ghcr.io/nicholaspsmith/loopi:latest

# Run deploy script
./scripts/deploy.sh
```

### First Deployment

For the initial deployment:

```bash
# Copy production compose file
scp docker-compose.prod.yml deploy@your-vps-ip:/opt/loopi/

# Copy nginx configuration
scp nginx/*.conf deploy@your-vps-ip:/opt/loopi/nginx/

# SSH and start services
ssh deploy@your-vps-ip
cd /opt/loopi
docker compose -f docker-compose.prod.yml up -d
```

## Verification

### Check Services

```bash
# Check container status
docker ps

# Check logs
docker logs loopi-app
docker logs loopi-postgres
docker logs loopi-nginx

# Check health endpoint
curl http://localhost:3000/api/health
```

### Run Monitoring Script

```bash
./scripts/monitor.sh
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker logs loopi-app --tail 100

# Check environment
docker exec loopi-app env | grep -v PASSWORD

# Restart container
docker compose -f docker-compose.prod.yml restart app
```

### Database Connection Issues

```bash
# Check postgres is running
docker exec loopi-postgres pg_isready -U loopi

# Check database exists
docker exec loopi-postgres psql -U loopi -c "\l"

# View postgres logs
docker logs loopi-postgres --tail 50
```

### SSL Certificate Issues

```bash
# Check certificate expiry
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Restart nginx
docker compose -f docker-compose.prod.yml restart nginx
```

## Related Documentation

- [Operations Runbook](./operations.md)
- [GitHub Secrets Setup](./github-secrets-setup.md)
- [Branch Protection](./github-branch-protection.md)
- [Uptime Monitoring](./uptime-monitoring.md)
