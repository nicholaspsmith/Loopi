# Uptime Monitoring Setup

This guide explains how to set up uptime monitoring for MemoryLoop production deployment.

## Overview

Uptime monitoring provides:

- Immediate alerts when the application goes down
- Historical uptime statistics
- Response time tracking
- Status page for users (optional)

## Recommended Services

### UptimeRobot (Free Tier Available)

1. Create account at [uptimerobot.com](https://uptimerobot.com)
2. Add new monitor:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: MemoryLoop Production
   - **URL**: `https://memoryloop.nicholaspsmith.com/api/health`
   - **Monitoring Interval**: 5 minutes (free) or 1 minute (paid)
3. Configure alerts:
   - Email notifications
   - Slack/Discord webhook (optional)
   - SMS alerts (paid)

### Better Uptime (Free Tier Available)

1. Create account at [betteruptime.com](https://betteruptime.com)
2. Add monitor with same settings as above
3. Includes built-in status page

### Self-Hosted Options

For self-hosted monitoring, consider:

- **Uptime Kuma**: Open-source, self-hosted alternative
- **Healthchecks.io**: For cron job monitoring

## Health Endpoint

The application exposes a health check endpoint:

```
GET /api/health
```

**Response (healthy)**:

```json
{
  "status": "healthy",
  "database": "connected",
  "ollama": "connected",
  "timestamp": "2025-12-21T12:00:00Z"
}
```

**Response (unhealthy)**:

```json
{
  "status": "unhealthy",
  "database": "error",
  "error": "Connection refused"
}
```

## Alert Configuration

### Recommended Alert Rules

| Condition                            | Action                     |
| ------------------------------------ | -------------------------- |
| Down for 5+ minutes                  | Email + Slack notification |
| Down for 15+ minutes                 | SMS alert (if configured)  |
| Response time > 5 seconds            | Warning notification       |
| SSL certificate expiring (< 14 days) | Email notification         |

### Notification Channels

1. **Email**: Primary notification for all alerts
2. **Slack/Discord**: Team channel for real-time alerts
3. **SMS**: Critical alerts only (paid services)

## Integration with Deployment

The deployment workflow can optionally notify the uptime monitoring service:

```bash
# Pause monitoring during deployment (if supported)
curl -X POST "https://api.uptimerobot.com/v2/editMonitor" \
  -d "api_key=$UPTIMEROBOT_API_KEY" \
  -d "id=$MONITOR_ID" \
  -d "status=0"

# Resume after deployment
curl -X POST "https://api.uptimerobot.com/v2/editMonitor" \
  -d "api_key=$UPTIMEROBOT_API_KEY" \
  -d "id=$MONITOR_ID" \
  -d "status=1"
```

## Local Monitoring Script

For additional monitoring, use the included monitoring script:

```bash
# Full dashboard
./scripts/monitor.sh

# Health check only
./scripts/monitor.sh --health

# JSON output for automation
./scripts/monitor.sh --json
```

## Status Page (Optional)

Both UptimeRobot and Better Uptime offer public status pages:

1. Create status page in your monitoring service
2. Add all monitored services
3. Share URL with users: `status.yourdomain.com`

## Verification Checklist

- [ ] Health endpoint accessible: `curl https://memoryloop.nicholaspsmith.com/api/health`
- [ ] Monitor created in uptime service
- [ ] Email notifications configured
- [ ] Test alert received
- [ ] Response time baseline established
