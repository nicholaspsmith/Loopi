#!/bin/bash
set -e

# VPS Setup Script for MemoryLoop
# Run this on a fresh Ubuntu 22.04+ VPS as root
#
# Usage: ./setup-vps.sh [DEPLOY_USER_SSH_PUBLIC_KEY]
#
# This script automates:
# - Firewall configuration (UFW)
# - Docker and Docker Compose installation
# - Deploy user creation with SSH key authentication
# - SSH hardening (disable password auth, fail2ban)
# - Directory structure creation

# Configuration
DEPLOY_USER="deploy"
DEPLOY_DIR="/opt/memoryloop"
DATA_DIR="${DEPLOY_DIR}/data"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root"
    exit 1
fi

# Get SSH public key from argument or prompt
SSH_PUBLIC_KEY="${1:-}"
if [ -z "$SSH_PUBLIC_KEY" ]; then
    log_warn "No SSH public key provided as argument"
    echo "Enter the deploy user's SSH public key (or press Enter to skip):"
    read -r SSH_PUBLIC_KEY
fi

log_info "Starting VPS setup..."

# ============================================
# Step 1: System Updates
# ============================================
log_info "Updating system packages..."
apt-get update
apt-get upgrade -y

# ============================================
# Step 2: Configure Firewall (UFW)
# ============================================
log_info "Configuring firewall (UFW)..."
apt-get install -y ufw

# Set default policies
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (port 22)
ufw allow 22/tcp comment 'SSH'

# Allow HTTP (port 80)
ufw allow 80/tcp comment 'HTTP'

# Allow HTTPS (port 443)
ufw allow 443/tcp comment 'HTTPS'

# Enable firewall (non-interactive)
echo "y" | ufw enable

log_info "Firewall configured. Status:"
ufw status verbose

# ============================================
# Step 3: Install Docker and Docker Compose
# ============================================
log_info "Installing Docker..."

# Install prerequisites
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable and start Docker
systemctl enable docker
systemctl start docker

log_info "Docker installed. Version:"
docker --version
docker compose version

# ============================================
# Step 4: Create Deploy User
# ============================================
log_info "Creating deploy user..."

# Create user if doesn't exist
if id "$DEPLOY_USER" &>/dev/null; then
    log_warn "User '$DEPLOY_USER' already exists"
else
    useradd -m -s /bin/bash "$DEPLOY_USER"
    log_info "User '$DEPLOY_USER' created"
fi

# Add to sudo and docker groups
usermod -aG sudo "$DEPLOY_USER"
usermod -aG docker "$DEPLOY_USER"

# Set up SSH key authentication
DEPLOY_HOME="/home/${DEPLOY_USER}"
SSH_DIR="${DEPLOY_HOME}/.ssh"
AUTHORIZED_KEYS="${SSH_DIR}/authorized_keys"

mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"

if [ -n "$SSH_PUBLIC_KEY" ]; then
    # Add key if not already present
    if ! grep -q "$SSH_PUBLIC_KEY" "$AUTHORIZED_KEYS" 2>/dev/null; then
        echo "$SSH_PUBLIC_KEY" >> "$AUTHORIZED_KEYS"
        log_info "SSH public key added for $DEPLOY_USER"
    else
        log_warn "SSH public key already exists"
    fi
    chmod 600 "$AUTHORIZED_KEYS"
fi

chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "$SSH_DIR"

# Allow deploy user to run docker without sudo (already in docker group)
log_info "Deploy user configured with sudo and docker access"

# ============================================
# Step 5: SSH Hardening
# ============================================
log_info "Hardening SSH configuration..."

# Backup original sshd_config
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Disable password authentication
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#*ChallengeResponseAuthentication.*/ChallengeResponseAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#*UsePAM.*/UsePAM no/' /etc/ssh/sshd_config

# Disable root login (optional - comment out if you need root SSH)
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config

# Restart SSH service
systemctl restart sshd

log_info "SSH hardened: password authentication disabled"

# Install and configure fail2ban
log_info "Installing fail2ban..."
apt-get install -y fail2ban

# Create local jail configuration
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 24h
EOF

systemctl enable fail2ban
systemctl restart fail2ban

log_info "fail2ban configured and running"

# ============================================
# Step 6: Create Directory Structure
# ============================================
log_info "Creating directory structure..."

mkdir -p "$DEPLOY_DIR"
mkdir -p "$DATA_DIR"
mkdir -p "${DATA_DIR}/postgres"
mkdir -p "${DATA_DIR}/lancedb"
mkdir -p "${DEPLOY_DIR}/nginx"
mkdir -p "${DEPLOY_DIR}/backups"

# Set ownership
chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "$DEPLOY_DIR"

log_info "Directory structure created:"
ls -la "$DEPLOY_DIR"

# ============================================
# Step 7: Install Additional Utilities
# ============================================
log_info "Installing additional utilities..."
apt-get install -y \
    htop \
    ncdu \
    vim \
    git \
    jq

# ============================================
# Summary
# ============================================
echo ""
echo "========================================"
log_info "VPS Setup Complete!"
echo "========================================"
echo ""
echo "Configuration Summary:"
echo "  - Firewall: UFW enabled (ports 22, 80, 443)"
echo "  - Docker: Installed and running"
echo "  - Deploy user: $DEPLOY_USER (sudo + docker access)"
echo "  - SSH: Password auth disabled, fail2ban active"
echo "  - Directories: $DEPLOY_DIR created"
echo ""
echo "Next steps:"
echo "  1. Copy docker-compose.prod.yml to $DEPLOY_DIR"
echo "  2. Create .env file at $DEPLOY_DIR/.env"
echo "  3. Configure Nginx and SSL certificates"
echo "  4. Run deployment: ./scripts/deploy.sh"
echo ""
if [ -z "$SSH_PUBLIC_KEY" ]; then
    log_warn "No SSH key was added. Add one manually:"
    echo "  echo 'your-public-key' >> /home/$DEPLOY_USER/.ssh/authorized_keys"
fi
echo ""
