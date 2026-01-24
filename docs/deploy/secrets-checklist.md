# Secrets Checklist

This checklist ensures all required secrets and environment variables are properly configured before deployment.

## Repository Variables (GitHub Settings → Secrets and variables → Variables)

Set these in your GitHub repository settings:

### Container Registry Configuration

```bash
REGISTRY=ghcr.io                    # GitHub Container Registry
IMAGE_NAME=username/abe-stack       # Your username/repo-name
VITE_API_URL=                       # Empty for relative URLs (reverse proxy handles routing)
```

### Environment-Specific Variables

```bash
# Production Environment
DOMAIN=yourdomain.com
ACME_EMAIL=admin@yourdomain.com
```

## Repository Secrets (GitHub Settings → Secrets and variables → Secrets)

Set these encrypted secrets in your GitHub repository:

### Server Access

```bash
SERVER_HOST=your-server-ip-or-domain     # Server IP or domain
SERVER_USER=root                         # SSH username (avoid root in production)
SERVER_PORT=22                           # SSH port (default: 22)
SERVER_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----...  # Private SSH key
```

### Database Secrets

```bash
POSTGRES_PASSWORD=your-secure-database-password  # Generate with: openssl rand -base64 32
```

### Application Secrets

```bash
JWT_SECRET=your-jwt-signing-secret            # Generate with: openssl rand -base64 32
SESSION_SECRET=your-session-encryption-secret  # Generate with: openssl rand -base64 32
```

### Optional Services

```bash
# SMTP Email (if using email service)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# S3 Storage (if using S3 instead of local)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket
```

## Pre-Deployment Checklist

### 🔐 Secrets Configuration

- [ ] All repository variables are set in GitHub
- [ ] All repository secrets are set in GitHub
- [ ] SSH key has correct permissions (600) and no passphrase
- [ ] SSH key is added to server's authorized_keys
- [ ] Server firewall allows SSH (port 22) and HTTP (80/443)

### 🌐 Domain & DNS

- [ ] Domain is registered and DNS is configured
- [ ] A/AAAA records point to server IP
- [ ] Domain is set correctly in repository variables

### 🗄️ Database

- [ ] POSTGRES_PASSWORD is strong and randomly generated
- [ ] Database credentials match docker-compose configuration

### 🔑 Application Security

- [ ] JWT_SECRET is unique and randomly generated (32+ chars)
- [ ] SESSION_SECRET is unique and randomly generated (32+ chars)
- [ ] Secrets are different between staging/production environments

### 📧 Email Configuration

- [ ] EMAIL_PROVIDER is set (console for development, smtp for production)
- [ ] SMTP credentials are configured (if using SMTP)
- [ ] EMAIL_FROM_ADDRESS uses your domain

### ☁️ Storage Configuration

- [ ] STORAGE_PROVIDER is set (local for simple, s3 for scalable)
- [ ] AWS credentials configured (if using S3)
- [ ] S3 bucket exists and permissions are correct

## Environment File Template

Create this file on your server at `~/abe-stack-deploy/.config/env/.env.production`:

```bash
# Domain Configuration
DOMAIN=yourdomain.com
ACME_EMAIL=admin@yourdomain.com

# Database Configuration
POSTGRES_PASSWORD=your-secure-database-password
POSTGRES_DB=abe_stack
POSTGRES_USER=postgres

# Application Secrets
JWT_SECRET=your-jwt-signing-secret
SESSION_SECRET=your-session-encryption-secret

# Trust Proxy Configuration (for correct IP extraction)
TRUST_PROXY=true
TRUSTED_PROXIES=172.16.0.0/12,10.0.0.0/8
MAX_PROXY_DEPTH=1

# Storage Configuration
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=/app/uploads
STORAGE_LOCAL_PUBLIC_URL=/uploads

# Email Configuration
EMAIL_PROVIDER=console
EMAIL_FROM_NAME=ABE Stack
EMAIL_FROM_ADDRESS=noreply@yourdomain.com

# Frontend Configuration
VITE_API_URL=
```

## Security Best Practices

### SSH Key Security

- Use ED25519 keys instead of RSA: `ssh-keygen -t ed25519 -C "github-deploy"`
- Never use passwords for SSH authentication
- Restrict SSH access to specific IP ranges if possible
- Use a dedicated deployment user instead of root

### Secret Generation

```bash
# Generate secure random secrets
openssl rand -base64 32

# Or use pwgen if available
pwgen -s 32 1
```

### Environment Separation

- Use different secrets for staging and production
- Never share secrets between environments
- Rotate secrets regularly (quarterly)

### Database Security

- Use strong, unique passwords
- Restrict database access to application only
- Enable database backups and encryption
- Monitor for suspicious activity

## Troubleshooting

### Common Issues

**SSH Connection Failed**

- Verify SERVER_HOST, SERVER_USER, and SERVER_SSH_KEY
- Check SSH key permissions: `chmod 600 ~/.ssh/id_ed25519`
- Ensure SSH key is added to server's authorized_keys
- Test manual SSH connection: `ssh -i ~/.ssh/id_ed25519 user@host`

**Registry Push Failed**

- Verify REGISTRY_USERNAME and REGISTRY_PASSWORD
- Check repository permissions for package publishing
- Ensure GitHub Container Registry is enabled

**Deployment Script Errors**

- Check server has Docker and Docker Compose installed
- Verify user has sudo access for Docker commands
- Ensure deployment directory exists: `mkdir -p ~/abe-stack-deploy`

**Container Health Check Failed**

- Check application logs: `docker compose -f docker-compose.prod.yml logs`
- Verify environment variables are correct
- Test health endpoints manually: `curl http://localhost:8080/health`
