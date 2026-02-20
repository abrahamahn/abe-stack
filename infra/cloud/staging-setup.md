# Staging Environment Setup Guide

## Overview

The staging environment mirrors production with smaller resources. It uses the
same Terraform modules, Docker images, and deployment pipeline — the only
differences are instance sizes and the `environment = "staging"` flag.

## Prerequisites

- Terraform >= 1.0 installed
- DigitalOcean API token (or GCP credentials)
- SSH key pair for server access
- Domain name for staging (e.g., `staging.yourdomain.com`)

## 1. Configure Variables

Copy the staging tfvars and add your credentials:

```bash
cd infra/cloud
cp staging.tfvars my-staging.tfvars
```

Edit `my-staging.tfvars` and set:

```hcl
domain         = "staging.yourdomain.com"
ssh_public_key = "ssh-ed25519 AAAA... your-key"
```

For DigitalOcean, also set the provider token:

```hcl
digitalocean_token = "dop_v1_..."
```

## 2. Initialize and Deploy

```bash
# Initialize Terraform
terraform init

# Preview changes
terraform plan -var-file="my-staging.tfvars"

# Apply
terraform apply -var-file="my-staging.tfvars"
```

## 3. Deploy Application

After infrastructure is provisioned:

```bash
# SSH into staging server
ssh root@$(terraform output -raw server_ip)

# Clone and deploy (or use CI/CD)
git clone <repo-url> /opt/bslt
cd /opt/bslt

# Copy staging env file
cp config/env/.env.staging .env

# Start with Docker
docker compose -f infra/docker/production/docker-compose.yml up -d
```

## 4. Environment Variables

Create `config/env/.env.staging` based on `.env.example` with:

- `NODE_ENV=staging`
- `APP_URL=https://staging.yourdomain.com`
- Database connection string from managed DB
- Stripe test-mode keys (not live keys)
- Reduced rate limits for testing
- Console email provider (or staging SMTP)
- `SENTRY_ENVIRONMENT=staging`

## 5. CI/CD Integration

The staging deployment can be automated via GitHub Actions. Add a
`deploy-staging` job to `.github/workflows/deploy.yml` that triggers
on pushes to the `staging` branch:

```yaml
deploy-staging:
  if: github.ref == 'refs/heads/staging'
  environment: staging
  steps:
    - uses: actions/checkout@v4
    - run: terraform apply -var-file="staging.tfvars" -auto-approve
      env:
        DIGITALOCEAN_TOKEN: ${{ secrets.DO_TOKEN_STAGING }}
```

## 6. Resource Comparison

| Resource   | Staging        | Production      |
| ---------- | -------------- | --------------- |
| Compute    | s-1vcpu-1gb    | s-2vcpu-4gb+    |
| Database   | db-s-1vcpu-1gb | db-s-2vcpu-4gb+ |
| Backups    | Disabled       | Enabled         |
| SSL        | Let's Encrypt  | Let's Encrypt   |
| Monitoring | Enabled        | Enabled         |

## 7. Teardown

```bash
terraform destroy -var-file="my-staging.tfvars"
```
