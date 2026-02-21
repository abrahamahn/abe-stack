#!/bin/bash
# Cloud-init script for BSLT DigitalOcean deployment
# Bootstraps the host with Docker, UFW, and security tooling.
# The application stack is deployed via Docker Compose by CI/CD.
# Caddy, Node.js, and the app run entirely inside Docker containers —
# do NOT install them on the host.

set -euo pipefail

# ---------------------------------------------------------------------------
# System packages
# ---------------------------------------------------------------------------
apt-get update
apt-get upgrade -y
apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    htop \
    jq \
    ufw \
    fail2ban \
    unattended-upgrades

# ---------------------------------------------------------------------------
# Docker
# ---------------------------------------------------------------------------
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# ---------------------------------------------------------------------------
# Application user
# ---------------------------------------------------------------------------
useradd -m -s /bin/bash bslt
mkdir -p /home/bslt/${app_name}
chown -R bslt:bslt /home/bslt/${app_name}
# Allow bslt user to manage containers without sudo
usermod -aG docker bslt

# ---------------------------------------------------------------------------
# Firewall (UFW)
# Caddy (in Docker) owns 80/443 — the app port is internal only.
# ---------------------------------------------------------------------------
ufw --force enable
ufw allow ssh
ufw allow 80
ufw allow 443

# ---------------------------------------------------------------------------
# Security: automatic security updates + fail2ban
# ---------------------------------------------------------------------------
dpkg-reconfigure --frontend=noninteractive unattended-upgrades

# ---------------------------------------------------------------------------
# Log rotation
# ---------------------------------------------------------------------------
cat > /etc/logrotate.d/${app_name} << EOF
/home/bslt/${app_name}/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 bslt bslt
}
EOF

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------
apt-get autoremove -y
apt-get clean

echo "BSLT host bootstrap complete. Deploy the application stack with Docker Compose."
