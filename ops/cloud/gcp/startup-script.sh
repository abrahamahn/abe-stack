#!/bin/bash
# Startup script for ABE Stack GCP deployment
# This script runs on first boot to prepare the compute instance

set -euo pipefail

# Update system packages
apt-get update
apt-get upgrade -y

# Install essential packages
apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    htop \
    jq \
    ufw \
    fail2ban \
    unattended-upgrades \
    google-cloud-sdk

# Install Node.js (LTS) and pnpm
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt-get install -y nodejs
npm install -g pnpm

# Install Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker abe-stack

# Install Caddy web server
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update
apt-get install -y caddy

# Create application user and directory
useradd -m -s /bin/bash abe-stack
mkdir -p /home/abe-stack/${app_name}
chown -R abe-stack:abe-stack /home/abe-stack/${app_name}

# Set up basic firewall (ufw)
ufw --force enable
ufw allow ssh
ufw allow ${app_port}
ufw allow 80
ufw allow 443

# Configure automatic security updates
dpkg-reconfigure --frontend=noninteractive unattended-upgrades

# Set up log rotation
cat > /etc/logrotate.d/${app_name} << EOF
/home/abe-stack/${app_name}/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 abe-stack abe-stack
    postrotate
        systemctl reload ${app_name} || true
    endscript
}
EOF

# Create systemd service
cat > /etc/systemd/system/${app_name}.service << EOF
[Unit]
Description=${app_name} Application
After=network.target

[Service]
Type=simple
User=abe-stack
WorkingDirectory=/home/abe-stack/${app_name}
ExecStart=/usr/bin/node /home/abe-stack/${app_name}/dist/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=${app_port}

[Install]
WantedBy=multi-user.target
EOF

# Enable and start services
systemctl enable ${app_name}
systemctl enable caddy

# Install Google Cloud Ops Agent for monitoring
curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
bash add-google-cloud-ops-agent-repo.sh --also-install

# Configure Ops Agent for application logs
cat > /etc/google-cloud-ops-agent/config.yaml << EOF
logging:
  receivers:
    ${app_name}:
      type: files
      include_paths:
        - /home/abe-stack/${app_name}/logs/*.log
      record_log_file_path: true
  service:
    pipelines:
      ${app_name}:
        receivers: [${app_name}]
EOF

systemctl restart google-cloud-ops-agent

# Clean up
apt-get autoremove -y
apt-get clean

echo "ABE Stack GCP instance initialization complete!"