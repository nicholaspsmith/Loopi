# Operations Runbook

This runbook covers common operational tasks for MemoryLoop production environment.

## Quick Reference

| Task             | Command                                                 |
| ---------------- | ------------------------------------------------------- |
| Check status     | `./scripts/monitor.sh`                                  |
| View logs        | `docker logs memoryloop-app --tail 100 -f`              |
| Restart app      | `docker compose -f docker-compose.prod.yml restart app` |
| Rollback         | `./scripts/rollback.sh <backup-tag>`                    |
| Backup database  | `./scripts/backup-db.sh`                                |
| Restore database | `./scripts/backup-db.sh --restore <file>`               |

## Service Management

### Starting Services

```bash
cd /opt/memoryloop
docker compose -f docker-compose.prod.yml up -d
```

### Stopping Services

```bash
cd /opt/memoryloop
docker compose -f docker-compose.prod.yml down
```

### Restarting Individual Services

```bash
# Restart application
docker compose -f docker-compose.prod.yml restart app

# Restart nginx
docker compose -f docker-compose.prod.yml restart nginx

# Restart postgres (caution: causes brief downtime)
docker compose -f docker-compose.prod.yml restart postgres
```

### Viewing Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker logs memoryloop-app --tail 100 -f
docker logs memoryloop-postgres --tail 100 -f
docker logs memoryloop-nginx --tail 100 -f

# Since specific time
docker logs memoryloop-app --since 1h
```

## Rollback Procedures

### Application Rollback

If a deployment causes issues, rollback to the previous version:

```bash
# List available backups
./scripts/rollback.sh

# Rollback to specific backup
./scripts/rollback.sh backup-20251221-143000
```

The rollback script:

1. Stops current container
2. Tags backup image as latest
3. Starts container with backup image
4. Runs health check
5. Reports success or failure

### Database Rollback

```bash
# List available backups
./scripts/backup-db.sh --list

# Restore from backup (WARNING: destructive)
./scripts/backup-db.sh --restore /opt/memoryloop/backups/memoryloop-20251221-020000.sql.gz
```

## Backup & Restore

### Database Backups

Backups are stored in `/opt/memoryloop/backups/` and retained for 7 days.

```bash
# Create manual backup
./scripts/backup-db.sh

# Create and upload to B2 (if configured)
./scripts/backup-db.sh --upload

# List backups
./scripts/backup-db.sh --list
```

### Automated Backups

Add to crontab for daily backups:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /opt/memoryloop/scripts/backup-db.sh --upload >> /var/log/memoryloop-backup.log 2>&1
```

### Data Directories

| Directory                       | Contents          | Backup Priority |
| ------------------------------- | ----------------- | --------------- |
| `/opt/memoryloop/data/postgres` | PostgreSQL data   | High            |
| `/opt/memoryloop/data/lancedb`  | Vector embeddings | Medium          |
| `/opt/memoryloop/backups`       | Database backups  | High            |

## Troubleshooting

### Application Not Responding

1. **Check container status**

   ```bash
   docker ps -a | grep memoryloop
   ```

2. **Check health endpoint**

   ```bash
   curl -v http://localhost:3000/api/health
   ```

3. **Check application logs**

   ```bash
   docker logs memoryloop-app --tail 200
   ```

4. **Restart application**
   ```bash
   docker compose -f docker-compose.prod.yml restart app
   ```

### Database Connection Errors

1. **Check postgres container**

   ```bash
   docker exec memoryloop-postgres pg_isready -U memoryloop
   ```

2. **Check connection from app container**

   ```bash
   docker exec memoryloop-app nc -zv postgres 5432
   ```

3. **Check postgres logs**

   ```bash
   docker logs memoryloop-postgres --tail 100
   ```

4. **Restart postgres (causes downtime)**
   ```bash
   docker compose -f docker-compose.prod.yml restart postgres
   ```

### High Memory Usage

1. **Check memory usage**

   ```bash
   ./scripts/monitor.sh --memory
   docker stats --no-stream
   ```

2. **Check for memory leaks**

   ```bash
   docker exec memoryloop-app node --expose-gc -e "console.log(process.memoryUsage())"
   ```

3. **Restart application to free memory**
   ```bash
   docker compose -f docker-compose.prod.yml restart app
   ```

### Disk Space Issues

1. **Check disk usage**

   ```bash
   ./scripts/monitor.sh --disk
   df -h
   ```

2. **Clean Docker resources**

   ```bash
   docker system prune -f
   docker image prune -a -f --filter "until=168h"
   ```

3. **Clean old backups**

   ```bash
   find /opt/memoryloop/backups -name "*.sql.gz" -mtime +7 -delete
   ```

4. **Clean old logs**
   ```bash
   docker logs memoryloop-app --since 24h > /tmp/recent-logs.txt
   truncate -s 0 $(docker inspect --format='{{.LogPath}}' memoryloop-app)
   ```

### SSL Certificate Expiry

1. **Check certificate expiry**

   ```bash
   sudo certbot certificates
   ```

2. **Renew certificate**

   ```bash
   sudo certbot renew
   ```

3. **Restart nginx**
   ```bash
   docker compose -f docker-compose.prod.yml restart nginx
   ```

## Performance Tuning

### PostgreSQL

Edit `/opt/memoryloop/data/postgres/postgresql.conf`:

```ini
# Memory settings (adjust based on available RAM)
shared_buffers = 256MB
effective_cache_size = 768MB
work_mem = 16MB

# Connection settings
max_connections = 100
```

### Docker Resource Limits

Edit `docker-compose.prod.yml` to add resource limits:

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          memory: 1G
        reservations:
          memory: 512M
```

## Monitoring

### Health Checks

```bash
# Full dashboard
./scripts/monitor.sh

# JSON output for automation
./scripts/monitor.sh --json

# Individual checks
./scripts/monitor.sh --health
./scripts/monitor.sh --disk
./scripts/monitor.sh --memory
./scripts/monitor.sh --containers
```

### Log Aggregation

Logs are configured with Docker's json-file driver with rotation:

- Max size: 10MB per file
- Max files: 3

To view aggregated logs:

```bash
docker compose -f docker-compose.prod.yml logs --tail 100
```

## Emergency Procedures

### Complete Service Failure

1. SSH to VPS
2. Check Docker daemon: `sudo systemctl status docker`
3. Restart Docker if needed: `sudo systemctl restart docker`
4. Start services: `docker compose -f docker-compose.prod.yml up -d`
5. Monitor logs: `docker compose -f docker-compose.prod.yml logs -f`

### Data Corruption

1. Stop application: `docker compose -f docker-compose.prod.yml stop app`
2. Backup current state: `./scripts/backup-db.sh`
3. Restore from known good backup: `./scripts/backup-db.sh --restore <file>`
4. Start application: `docker compose -f docker-compose.prod.yml start app`

### VPS Unreachable

1. Check VPS provider console for status
2. Try rebooting from provider dashboard
3. If persistent, may need to provision new VPS and restore from backups

## Contact & Escalation

For issues not covered in this runbook:

1. Check application logs for specific error messages
2. Search GitHub issues for similar problems
3. Create new issue with logs and reproduction steps
