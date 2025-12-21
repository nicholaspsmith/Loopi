#!/bin/bash

# Monitoring dashboard script for MemoryLoop
# Checks health, disk usage, memory, and container status
#
# Usage:
#   ./monitor.sh              # Full dashboard
#   ./monitor.sh --health     # Health check only
#   ./monitor.sh --disk       # Disk usage only
#   ./monitor.sh --memory     # Memory usage only
#   ./monitor.sh --containers # Container status only
#   ./monitor.sh --json       # Output as JSON (for automation)

DEPLOY_DIR="/opt/memoryloop"
APP_URL="${APP_URL:-http://localhost:3000}"
HEALTH_ENDPOINT="${APP_URL}/api/health"

# Thresholds
DISK_WARN_PERCENT=80
DISK_CRIT_PERCENT=90
MEMORY_WARN_PERCENT=80
MEMORY_CRIT_PERCENT=90

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# JSON output mode
JSON_MODE=false

status_icon() {
    local status="$1"
    if [ "$JSON_MODE" = true ]; then
        echo "$status"
        return
    fi
    case "$status" in
        ok|healthy|running) echo -e "${GREEN}✓${NC}" ;;
        warning) echo -e "${YELLOW}⚠${NC}" ;;
        critical|error|unhealthy) echo -e "${RED}✗${NC}" ;;
        *) echo -e "${BLUE}?${NC}" ;;
    esac
}

# Check application health endpoint
check_health() {
    local response
    local http_code
    local body

    if command -v curl &> /dev/null; then
        response=$(curl -s -w "\n%{http_code}" "$HEALTH_ENDPOINT" 2>/dev/null)
        http_code=$(echo "$response" | tail -n1)
        body=$(echo "$response" | sed '$d')
    else
        echo "curl not installed"
        return 1
    fi

    if [ "$JSON_MODE" = true ]; then
        if [ "$http_code" = "200" ]; then
            echo "{\"status\": \"healthy\", \"http_code\": $http_code, \"response\": $body}"
        else
            echo "{\"status\": \"unhealthy\", \"http_code\": $http_code}"
        fi
        return
    fi

    echo -e "${BLUE}=== Health Check ===${NC}"
    if [ "$http_code" = "200" ]; then
        echo -e "$(status_icon ok) Application: healthy"
        if command -v jq &> /dev/null && [ -n "$body" ]; then
            echo "$body" | jq -r 'to_entries[] | "  \(.key): \(.value)"' 2>/dev/null || true
        fi
    else
        echo -e "$(status_icon error) Application: unhealthy (HTTP $http_code)"
    fi
    echo ""
}

# Check disk usage
check_disk() {
    local usage
    local status

    if [ "$JSON_MODE" = true ]; then
        df -h / | awk 'NR==2 {print "{\"filesystem\": \"" $1 "\", \"size\": \"" $2 "\", \"used\": \"" $3 "\", \"available\": \"" $4 "\", \"percent\": " gsub(/%/,"",$5) + 0 "}"}'
        return
    fi

    echo -e "${BLUE}=== Disk Usage ===${NC}"

    # Root filesystem
    usage=$(df -h / | awk 'NR==2 {gsub(/%/,"",$5); print $5}')
    if [ "$usage" -ge "$DISK_CRIT_PERCENT" ]; then
        status="critical"
    elif [ "$usage" -ge "$DISK_WARN_PERCENT" ]; then
        status="warning"
    else
        status="ok"
    fi
    echo -e "$(status_icon $status) Root filesystem: ${usage}% used"
    df -h / | awk 'NR==2 {print "  Size: " $2 ", Used: " $3 ", Available: " $4}'

    # Data directory if exists
    if [ -d "$DEPLOY_DIR/data" ]; then
        echo ""
        echo "Data directory sizes:"
        du -sh "$DEPLOY_DIR/data"/* 2>/dev/null | while read -r line; do
            echo "  $line"
        done
    fi
    echo ""
}

# Check memory usage
check_memory() {
    local total
    local used
    local percent
    local status

    if [ "$JSON_MODE" = true ]; then
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            free -m | awk 'NR==2 {printf "{\"total_mb\": %d, \"used_mb\": %d, \"free_mb\": %d, \"percent\": %.1f}\n", $2, $3, $4, $3/$2*100}'
        else
            # macOS
            vm_stat | awk -v pagesize=$(pagesize) '
                /Pages free/ {free=$3}
                /Pages active/ {active=$3}
                /Pages inactive/ {inactive=$3}
                /Pages wired/ {wired=$4}
                END {
                    total=(free+active+inactive+wired)*pagesize/1024/1024
                    used=(active+wired)*pagesize/1024/1024
                    printf "{\"total_mb\": %.0f, \"used_mb\": %.0f, \"percent\": %.1f}\n", total, used, used/total*100
                }'
        fi
        return
    fi

    echo -e "${BLUE}=== Memory Usage ===${NC}"

    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        read -r total used <<< $(free -m | awk 'NR==2 {print $2, $3}')
        percent=$((used * 100 / total))
    else
        # macOS (approximate)
        total=$(sysctl -n hw.memsize | awk '{print int($1/1024/1024)}')
        used=$(vm_stat | awk -v pagesize=$(pagesize) '
            /Pages active/ {active=$3}
            /Pages wired/ {wired=$4}
            END {print int((active+wired)*pagesize/1024/1024)}')
        percent=$((used * 100 / total))
    fi

    if [ "$percent" -ge "$MEMORY_CRIT_PERCENT" ]; then
        status="critical"
    elif [ "$percent" -ge "$MEMORY_WARN_PERCENT" ]; then
        status="warning"
    else
        status="ok"
    fi

    echo -e "$(status_icon $status) Memory: ${percent}% used (${used}MB / ${total}MB)"
    echo ""
}

# Check container status
check_containers() {
    if ! command -v docker &> /dev/null; then
        if [ "$JSON_MODE" = true ]; then
            echo "{\"error\": \"docker not installed\"}"
        else
            echo "Docker not installed"
        fi
        return
    fi

    if [ "$JSON_MODE" = true ]; then
        docker ps -a --format '{"name": "{{.Names}}", "status": "{{.Status}}", "state": "{{.State}}"}' | \
            grep "memoryloop" | \
            jq -s '.'
        return
    fi

    echo -e "${BLUE}=== Container Status ===${NC}"

    local containers
    containers=$(docker ps -a --format "{{.Names}}|{{.Status}}|{{.State}}" | grep "memoryloop" || true)

    if [ -z "$containers" ]; then
        echo "No memoryloop containers found"
    else
        echo "$containers" | while IFS='|' read -r name status state; do
            case "$state" in
                running)
                    echo -e "$(status_icon running) $name: $status"
                    ;;
                *)
                    echo -e "$(status_icon error) $name: $status"
                    ;;
            esac
        done
    fi
    echo ""
}

# Full dashboard
show_dashboard() {
    if [ "$JSON_MODE" = true ]; then
        echo "{"
        echo "\"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
        echo "\"health\": $(check_health),"
        echo "\"disk\": $(check_disk),"
        echo "\"memory\": $(check_memory),"
        echo "\"containers\": $(check_containers)"
        echo "}"
        return
    fi

    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     MemoryLoop Monitoring Dashboard    ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo "Timestamp: $(date)"
    echo ""

    check_health
    check_disk
    check_memory
    check_containers

    echo -e "${BLUE}==========================================${NC}"
}

# Main
case "${1:-}" in
    --health)
        check_health
        ;;
    --disk)
        check_disk
        ;;
    --memory)
        check_memory
        ;;
    --containers)
        check_containers
        ;;
    --json)
        JSON_MODE=true
        show_dashboard
        ;;
    *)
        show_dashboard
        ;;
esac
