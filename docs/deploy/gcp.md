# Google Cloud Platform Deployment Guide

Step-by-step guide to deploy ABE Stack on Google Cloud Platform using Compute Engine.

---

## Prerequisites

- GCP account with billing enabled
- Domain name with DNS access
- `gcloud` CLI installed ([Install Guide](https://cloud.google.com/sdk/docs/install))

---

## Deployment Options

| Option                | Best For                           | Cost            |
| --------------------- | ---------------------------------- | --------------- |
| **Compute Engine VM** | Full control, persistent workloads | ~$25-50/mo      |
| **Cloud Run**         | Serverless, auto-scaling           | Pay per request |

This guide covers **Compute Engine** (recommended for most use cases).

---

## 1. Project Setup

### Create Project

```bash
# Set project ID
PROJECT_ID="abe-stack-prod"

# Create project
gcloud projects create $PROJECT_ID --name="ABE Stack Production"

# Set as default
gcloud config set project $PROJECT_ID

# Enable billing (required)
# Do this in Console: https://console.cloud.google.com/billing
```

### Enable Required APIs

```bash
gcloud services enable compute.googleapis.com
```

---

## 2. Create VM Instance

### Via gcloud CLI (Recommended)

```bash
# Create VM
gcloud compute instances create abe-stack-vm \
  --zone=us-central1-a \
  --machine-type=e2-small \
  --image-family=ubuntu-2404-lts-amd64 \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB \
  --boot-disk-type=pd-balanced \
  --tags=http-server,https-server \
  --metadata=startup-script='#!/bin/bash
    apt-get update
    apt-get install -y docker.io docker-compose-v2
    systemctl enable docker
    systemctl start docker'

# Get external IP
gcloud compute instances describe abe-stack-vm \
  --zone=us-central1-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

### Machine Type Reference

| Type          | vCPUs | Memory | Monthly Cost |
| ------------- | ----- | ------ | ------------ |
| e2-micro      | 0.25  | 1 GB   | ~$8          |
| e2-small      | 0.5   | 2 GB   | ~$15         |
| e2-medium     | 1     | 4 GB   | ~$25         |
| e2-standard-2 | 2     | 8 GB   | ~$50         |

**Recommended**: `e2-small` for small apps, `e2-medium` for production.

### Via Console

1. Go to **Compute Engine → VM instances → Create**
2. Configure:
   - Name: `abe-stack-vm`
   - Region: `us-central1` (or closest to users)
   - Machine type: `e2-small` or `e2-medium`
   - Boot disk: Ubuntu 24.04 LTS, 20 GB
   - Firewall: Allow HTTP and HTTPS
3. Click **Create**

---

## 3. Configure Firewall

```bash
# Allow HTTP
gcloud compute firewall-rules create allow-http \
  --allow=tcp:80 \
  --target-tags=http-server \
  --description="Allow HTTP traffic"

# Allow HTTPS
gcloud compute firewall-rules create allow-https \
  --allow=tcp:443 \
  --target-tags=https-server \
  --description="Allow HTTPS traffic"

# Verify
gcloud compute firewall-rules list
```

---

## 4. Configure DNS

Point your domain to the VM's external IP:

| Type | Name | Value              | TTL |
| ---- | ---- | ------------------ | --- |
| A    | @    | `<vm-external-ip>` | 300 |
| A    | www  | `<vm-external-ip>` | 300 |

If using Cloud DNS:

```bash
# Create managed zone
gcloud dns managed-zones create abe-stack-zone \
  --dns-name="example.com." \
  --description="ABE Stack DNS"

# Add A record
gcloud dns record-sets create example.com. \
  --zone=abe-stack-zone \
  --type=A \
  --ttl=300 \
  --rrdatas="<vm-external-ip>"
```

---

## 5. Initial Server Setup

### SSH into VM

```bash
gcloud compute ssh abe-stack-vm --zone=us-central1-a
```

### Create Deploy User

```bash
# Create non-root user
sudo adduser deploy
sudo usermod -aG sudo deploy
sudo usermod -aG docker deploy

# Switch to deploy user
sudo su - deploy
```

### Install Docker (if not installed via startup script)

```bash
# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Add to docker group
sudo usermod -aG docker $USER

# Log out and back in
exit
gcloud compute ssh abe-stack-vm --zone=us-central1-a -- -l deploy
```

---

## 6. Clone and Configure

```bash
# Clone repository
cd ~
git clone https://github.com/your-org/abe-stack.git
cd abe-stack

# Create production environment file
cp config/.env/.env.example config/.env/.env.production
```

### Generate Secrets

```bash
# Generate secure secrets
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)" >> config/.env/.env.production
echo "JWT_SECRET=$(openssl rand -base64 32)" >> config/.env/.env.production
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> config/.env/.env.production
```

### Edit Environment File

```bash
nano config/.env/.env.production
```

Update these values:

```bash
# Required
DOMAIN=example.com
ACME_EMAIL=admin@example.com

# Optional (update as needed)
NODE_ENV=production
EMAIL_PROVIDER=smtp
```

Secure the file:

```bash
chmod 600 config/.env/.env.production
```

---

## 7. Deploy

### Build and Start

```bash
cd ~/abe-stack

# Build and start all services
docker compose -f config/docker/docker-compose.prod.yml \
  --env-file config/.env/.env.production \
  up -d --build

# View logs
docker compose -f config/docker/docker-compose.prod.yml logs -f
```

### Verify Deployment

```bash
# Check services
docker compose -f config/docker/docker-compose.prod.yml ps

# Test health
curl http://localhost:8080/health

# Test HTTPS (after certificate obtained)
curl https://example.com/health
```

---

## 8. Set Up Systemd (Auto-restart)

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
ExecStart=/usr/bin/docker compose -f config/docker/docker-compose.prod.yml --env-file config/.env/.env.production up -d
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
```

---

## 9. Database Backups

### Automated Backups to Cloud Storage

Create a GCS bucket:

```bash
# From local machine or Cloud Shell
gsutil mb -l us-central1 gs://abe-stack-backups-$PROJECT_ID
```

Create backup script:

```bash
nano /home/deploy/backup-db.sh
```

```bash
#!/bin/bash
set -e

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/tmp/abe_stack_$TIMESTAMP.sql.gz"
BUCKET="gs://abe-stack-backups-YOUR_PROJECT_ID"

# Dump and compress
docker compose -f /home/deploy/abe-stack/config/docker/docker-compose.prod.yml \
  exec -T postgres pg_dump -U postgres abe_stack | gzip > $BACKUP_FILE

# Upload to Cloud Storage
gsutil cp $BACKUP_FILE $BUCKET/

# Clean local file
rm $BACKUP_FILE

# Keep only last 30 days in bucket
gsutil lifecycle set <(cat <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 30}
      }
    ]
  }
}
EOF
) $BUCKET

echo "Backup uploaded: $BUCKET/abe_stack_$TIMESTAMP.sql.gz"
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
0 3 * * * /home/deploy/backup-db.sh >> /home/deploy/backup.log 2>&1
```

### Restore from Cloud Storage

```bash
# List backups
gsutil ls gs://abe-stack-backups-$PROJECT_ID/

# Download backup
gsutil cp gs://abe-stack-backups-$PROJECT_ID/abe_stack_20260122.sql.gz /tmp/

# Stop API
docker compose -f config/docker/docker-compose.prod.yml stop api

# Restore
gunzip -c /tmp/abe_stack_20260122.sql.gz | \
  docker compose -f config/docker/docker-compose.prod.yml exec -T postgres \
  psql -U postgres abe_stack

# Restart API
docker compose -f config/docker/docker-compose.prod.yml start api
```

---

## 10. Updates and Maintenance

### Deploy Updates

```bash
cd ~/abe-stack

# Pull latest
git pull

# Rebuild and restart
docker compose -f config/docker/docker-compose.prod.yml \
  --env-file config/.env/.env.production \
  up -d --build
```

### SSH Access

```bash
# Standard SSH
gcloud compute ssh abe-stack-vm --zone=us-central1-a

# As deploy user
gcloud compute ssh abe-stack-vm --zone=us-central1-a -- -l deploy

# SSH tunnel for local access
gcloud compute ssh abe-stack-vm --zone=us-central1-a -- -L 5432:localhost:5432
```

---

## 11. Monitoring

### Cloud Monitoring (Free Tier)

Automatically enabled. View in Console → Monitoring:

- CPU, memory, disk metrics
- Network traffic
- Uptime checks

### Create Uptime Check

```bash
# Via Console: Monitoring → Uptime Checks → Create
# Or use gcloud:
gcloud monitoring uptime-check-configs create abe-stack-health \
  --display-name="ABE Stack Health" \
  --http-check-path="/health" \
  --monitored-resource-type="uptime-url" \
  --monitored-resource-labels="host=example.com"
```

### Set Up Alerts

In Console → Monitoring → Alerting:

1. Create alert policy
2. Condition: CPU > 80% for 5 minutes
3. Notification: Email or Slack

---

## Alternative: Cloud Run (Serverless)

For serverless deployment with auto-scaling:

### Limitations

- No persistent disk (use Cloud SQL for database)
- No WebSocket support (use Pub/Sub instead)
- Cold starts on first request

### Quick Setup

```bash
# Build and push image
gcloud builds submit --tag gcr.io/$PROJECT_ID/abe-stack-api

# Deploy
gcloud run deploy abe-stack-api \
  --image gcr.io/$PROJECT_ID/abe-stack-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production" \
  --set-secrets="JWT_SECRET=jwt-secret:latest"
```

**Note**: Cloud Run requires Cloud SQL for PostgreSQL and removes the self-contained deployment benefit.

---

## Security Checklist

- [ ] Non-root user created (`deploy`)
- [ ] Firewall rules limited (80, 443 only)
- [ ] SSH keys configured (no password auth)
- [ ] Secrets stored securely (chmod 600)
- [ ] Database not exposed externally
- [ ] Automated backups to Cloud Storage
- [ ] HTTPS working
- [ ] Monitoring alerts configured

### Disable Password Authentication

Edit SSH config via metadata:

```bash
gcloud compute instances add-metadata abe-stack-vm \
  --zone=us-central1-a \
  --metadata=enable-oslogin=TRUE
```

---

## Cost Summary

| Resource                | Spec               | Monthly Cost |
| ----------------------- | ------------------ | ------------ |
| e2-small VM             | 0.5 vCPU, 2 GB RAM | ~$15         |
| e2-medium VM            | 1 vCPU, 4 GB RAM   | ~$25         |
| Boot disk               | 20 GB SSD          | ~$2          |
| Cloud Storage (backups) | 10 GB              | ~$0.20       |
| Static IP (optional)    | 1 IP               | ~$3          |
| **Minimum Total**       |                    | **~$18/mo**  |
| **Recommended Total**   |                    | **~$28/mo**  |

### Free Tier

GCP offers a free tier that includes:

- 1 e2-micro instance (limited)
- 30 GB standard disk
- 5 GB Cloud Storage

---

## Troubleshooting

### Can't SSH into VM

```bash
# Check firewall
gcloud compute firewall-rules list --filter="name:default-allow-ssh"

# If missing, create it
gcloud compute firewall-rules create default-allow-ssh \
  --allow=tcp:22
```

### Certificate Issues

```bash
# Check Caddy logs
docker compose -f config/docker/docker-compose.prod.yml logs caddy

# Verify DNS points to VM IP
dig +short example.com

# Check firewall allows 80/443
gcloud compute firewall-rules list
```

### Out of Memory

```bash
# Check memory usage
free -h

# Add swap (temporary fix)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Upgrade VM for permanent fix
gcloud compute instances set-machine-type abe-stack-vm \
  --zone=us-central1-a \
  --machine-type=e2-medium
```

---

## Related Documentation

- [Deployment README](./README.md) - Overview and quick start
- [Reverse Proxy Configuration](./reverse-proxy.md) - Caddy setup details
- [Trusted Proxy Setup](./trusted-proxy-setup.md) - IP extraction security
- [DigitalOcean Deployment](./digitalocean.md) - Alternative cloud option
