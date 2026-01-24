# DigitalOcean Deployment Guide

Step-by-step guide to deploy ABE Stack on a DigitalOcean Droplet.

---

## Prerequisites

- DigitalOcean account
- Domain name with DNS access
- SSH key pair (for secure access)

---

## 1. Create Droplet

### Via DigitalOcean Console

1. Go to **Create → Droplets**
2. Choose **Ubuntu 24.04 LTS**
3. Select plan:
   - **Basic**: $12/mo (2 GB RAM, 1 vCPU) - minimum for small apps
   - **Regular**: $24/mo (4 GB RAM, 2 vCPUs) - recommended for production
4. Choose datacenter region closest to your users
5. Add your SSH key
6. Set hostname: `abe-stack-prod`
7. Click **Create Droplet**

### Via doctl CLI

```bash
# Install doctl: https://docs.digitalocean.com/reference/doctl/how-to/install/

# Authenticate
doctl auth init

# Create droplet
doctl compute droplet create abe-stack-prod \
  --image ubuntu-24-04-x64 \
  --size s-2vcpu-4gb \
  --region nyc1 \
  --ssh-keys $(doctl compute ssh-key list --format ID --no-header | head -1) \
  --wait
```

---

## 2. Configure DNS

Point your domain to the Droplet IP:

| Type | Name | Value          | TTL |
| ---- | ---- | -------------- | --- |
| A    | @    | `<droplet-ip>` | 300 |
| A    | www  | `<droplet-ip>` | 300 |

Wait for DNS propagation (usually 5-15 minutes).

```bash
# Verify DNS
dig +short example.com
```

---

## 3. Initial Server Setup

SSH into your droplet:

```bash
ssh root@<droplet-ip>
```

### Create Deploy User

```bash
# Create non-root user
adduser deploy
usermod -aG sudo deploy

# Copy SSH keys to new user
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Test login (in new terminal)
# ssh deploy@<droplet-ip>
```

### Configure Firewall

```bash
# Enable UFW firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

# Verify
ufw status
```

### System Updates

```bash
apt update && apt upgrade -y
apt install -y curl git
```

---

## 4. Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Add deploy user to docker group
usermod -aG docker deploy

# Enable Docker to start on boot
systemctl enable docker

# Verify installation
docker --version
docker compose version
```

Log out and back in for group changes to take effect:

```bash
exit
ssh deploy@<droplet-ip>
```

---

## 5. Clone and Configure

```bash
# Clone repository
cd ~
git clone https://github.com/your-org/abe-stack.git
cd abe-stack

# Create production environment file
cp .env.example .config/env/.config/env/.env.production
```

### Generate Secrets

```bash
# Generate secure secrets
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)" >> .config/env/.config/env/.env.production
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .config/env/.config/env/.env.production
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .config/env/.config/env/.env.production
```

### Edit Environment File

```bash
nano .config/env/.config/env/.env.production
```

Update these values:

```bash
# Required
DOMAIN=example.com
ACME_EMAIL=admin@example.com
POSTGRES_PASSWORD=<generated>
JWT_SECRET=<generated>
SESSION_SECRET=<generated>

# Optional (update as needed)
NODE_ENV=production
EMAIL_PROVIDER=smtp  # If sending real emails
```

Secure the file:

```bash
chmod 600 .config/env/.config/env/.env.production
```

---

## 6. Deploy

### Build and Start

```bash
cd ~/abe-stack

# Build and start all services
docker compose -f config/docker/docker-compose.prod.yml \
  --env-file .config/env/.config/env/.env.production \
  up -d --build

# View logs
docker compose -f config/docker/docker-compose.prod.yml logs -f
```

### Verify Deployment

```bash
# Check services are running
docker compose -f config/docker/docker-compose.prod.yml ps

# Test health endpoint
curl http://localhost:8080/health

# Test HTTPS (after Caddy obtains certificate)
curl https://example.com/health
```

---

## 7. Set Up Systemd (Auto-restart)

Create a systemd service for automatic restarts:

```bash
sudo nano /etc/systemd/system/abe-stack.service
```

```ini
[Unit]
Description=ABE Stack Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
User=deploy
WorkingDirectory=/home/deploy/abe-stack
ExecStart=/usr/bin/docker compose -f config/docker/docker-compose.prod.yml --env-file .config/env/.config/env/.env.production up -d
ExecStop=/usr/bin/docker compose -f config/docker/docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable abe-stack
sudo systemctl start abe-stack

# Check status
sudo systemctl status abe-stack
```

---

## 8. Database Backups

### Automated Daily Backups

Create backup script:

```bash
sudo nano /home/deploy/backup-db.sh
```

```bash
#!/bin/bash
set -e

BACKUP_DIR="/home/deploy/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/abe_stack_$TIMESTAMP.sql.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Dump and compress
docker compose -f /home/deploy/abe-stack/config/docker/docker-compose.prod.yml \
  exec -T postgres pg_dump -U postgres abe_stack | gzip > $BACKUP_FILE

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup created: $BACKUP_FILE"
```

```bash
chmod +x /home/deploy/backup-db.sh
```

Add to crontab:

```bash
crontab -e
```

```cron
# Daily backup at 3 AM
0 3 * * * /home/deploy/backup-db.sh >> /home/deploy/backups/backup.log 2>&1
```

### Manual Backup

```bash
# Create backup
docker compose -f config/docker/docker-compose.prod.yml \
  exec -T postgres pg_dump -U postgres abe_stack > backup.sql

# Compress
gzip backup.sql
```

### Restore from Backup

```bash
# Stop API to prevent writes
docker compose -f config/docker/docker-compose.prod.yml stop api

# Restore
gunzip -c backup.sql.gz | docker compose -f config/docker/docker-compose.prod.yml \
  exec -T postgres psql -U postgres abe_stack

# Restart API
docker compose -f config/docker/docker-compose.prod.yml start api
```

---

## 9. Updates and Maintenance

### Deploy Updates

```bash
cd ~/abe-stack

# Pull latest code
git pull

# Rebuild and restart
docker compose -f config/docker/docker-compose.prod.yml \
  --env-file .config/env/.config/env/.env.production \
  up -d --build

# View logs for any issues
docker compose -f config/docker/docker-compose.prod.yml logs -f --tail=100
```

### View Logs

```bash
# All services
docker compose -f config/docker/docker-compose.prod.yml logs -f

# Specific service
docker compose -f config/docker/docker-compose.prod.yml logs -f api
docker compose -f config/docker/docker-compose.prod.yml logs -f caddy
```

### Restart Services

```bash
# Restart all
docker compose -f config/docker/docker-compose.prod.yml restart

# Restart specific service
docker compose -f config/docker/docker-compose.prod.yml restart api
```

---

## 10. Monitoring (Optional)

### DigitalOcean Monitoring

Enable in Droplet settings → **Monitoring** tab. Provides:

- CPU, memory, disk usage
- Bandwidth metrics
- Alerts

### Docker Stats

```bash
# Real-time container stats
docker stats

# Disk usage
docker system df
```

### Log Rotation

Docker handles log rotation automatically with `json-file` driver. To configure limits:

```bash
sudo nano /etc/docker/daemon.json
```

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

```bash
sudo systemctl restart docker
```

---

## Security Checklist

Before going live:

- [ ] Non-root user created (`deploy`)
- [ ] SSH key authentication only (disable password)
- [ ] Firewall enabled (UFW: 22, 80, 443 only)
- [ ] Strong secrets generated (not defaults)
- [ ] Environment file secured (`chmod 600`)
- [ ] Database not exposed externally
- [ ] Automated backups configured
- [ ] HTTPS working (check certificate)
- [ ] DNS propagated correctly

### Disable Password Authentication (Recommended)

```bash
sudo nano /etc/ssh/sshd_config
```

Set:

```
PasswordAuthentication no
PubkeyAuthentication yes
```

```bash
sudo systemctl restart sshd
```

---

## Troubleshooting

### Caddy Certificate Issues

```bash
# Check Caddy logs
docker compose -f config/docker/docker-compose.prod.yml logs caddy

# Common issues:
# - DNS not pointing to server IP
# - Ports 80/443 blocked by firewall
# - Rate limited (use staging CA for testing)
```

### API Won't Start

```bash
# Check API logs
docker compose -f config/docker/docker-compose.prod.yml logs api

# Common issues:
# - Database not ready (check postgres health)
# - Missing environment variables
# - Port conflict
```

### Database Connection Failed

```bash
# Check postgres is running
docker compose -f config/docker/docker-compose.prod.yml ps postgres

# Check postgres logs
docker compose -f config/docker/docker-compose.prod.yml logs postgres

# Test connection
docker compose -f config/docker/docker-compose.prod.yml exec postgres \
  psql -U postgres -d abe_stack -c "SELECT 1"
```

### Out of Disk Space

```bash
# Check disk usage
df -h

# Clean Docker resources
docker system prune -a --volumes
```

---

## Cost Summary

| Resource                      | Spec              | Monthly Cost |
| ----------------------------- | ----------------- | ------------ |
| Droplet (Basic)               | 2 GB RAM, 1 vCPU  | $12          |
| Droplet (Regular)             | 4 GB RAM, 2 vCPUs | $24          |
| Managed Database (optional)   | 1 GB RAM          | $15          |
| Spaces (S3 storage, optional) | 250 GB            | $5           |
| **Minimum Total**             |                   | **$12/mo**   |
| **Recommended Total**         |                   | **$24/mo**   |

---

## Related Documentation

- [Deployment README](./README.md) - Overview and quick start
- [Reverse Proxy Configuration](./reverse-proxy.md) - Caddy setup details
- [Trusted Proxy Setup](./trusted-proxy-setup.md) - IP extraction security
- [GCP Deployment](./gcp.md) - Alternative cloud option
