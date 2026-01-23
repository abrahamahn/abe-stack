# ABE Stack Infrastructure as Code

This directory contains Terraform modules for deploying ABE Stack to cloud providers. Currently supported providers:

- **DigitalOcean** - Simple droplet-based deployment
- **Google Cloud Platform** - Compute instance with advanced networking

## Prerequisites

- [Terraform](https://www.terraform.io/downloads.html) >= 1.0
- Cloud provider account and API credentials
- SSH key pair for server access
- Domain name (optional, but recommended)

## Quick Start

### 1. Choose Your Provider

**DigitalOcean** (Recommended for simplicity):
```bash
cd infra/digitalocean
```

**Google Cloud Platform** (Recommended for enterprise features):
```bash
cd infra/gcp
```

### 2. Configure Variables

Create a `terraform.tfvars` file with your configuration:

```hcl
# Required variables
domain          = "yourdomain.com"
ssh_public_key  = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC..."

# Optional variables (with defaults)
region          = "nyc1"  # DigitalOcean
# region         = "us-central1"  # GCP
instance_size   = "s-1vcpu-1gb"  # DigitalOcean
# instance_size  = "e2-small"     # GCP
app_name        = "my-abe-stack"
environment     = "production"
```

### 3. Initialize and Deploy

```bash
# Initialize Terraform
terraform init

# Plan the deployment
terraform plan

# Apply the configuration
terraform apply
```

## Provider-Specific Setup

### DigitalOcean

#### Required Credentials

Set your DigitalOcean API token:

```bash
export DIGITALOCEAN_TOKEN="your-api-token"
```

Or create a `digitalocean_token` variable in your `terraform.tfvars`:

```hcl
digitalocean_token = "your-api-token"
```

#### Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `domain` | Domain name | - | Yes |
| `ssh_public_key` | SSH public key | - | Yes |
| `region` | DO region | `nyc1` | No |
| `instance_size` | Droplet size | `s-1vcpu-1gb` | No |
| `app_name` | App name | `abe-stack` | No |
| `enable_managed_database` | Enable DO managed DB | `false` | No |

#### Example Deployment

```hcl
# terraform.tfvars
domain         = "abe-stack.com"
ssh_public_key = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC..."
region         = "nyc1"
instance_size  = "s-2vcpu-2gb"
enable_managed_database = true
```

### Google Cloud Platform

#### Required Credentials

Authenticate with GCP:

```bash
# Using service account key
export GOOGLE_CREDENTIALS="$(cat service-account-key.json)"

# Or use application default credentials
gcloud auth application-default login
```

#### Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `project_id` | GCP Project ID | - | Yes |
| `domain` | Domain name | - | Yes |
| `ssh_public_key` | SSH public key | - | Yes |
| `region` | GCP region | `us-central1` | No |
| `zone` | GCP zone | `us-central1-a` | No |
| `instance_size` | Machine type | `e2-small` | No |
| `app_name` | App name | `abe-stack` | No |
| `enable_managed_database` | Enable Cloud SQL | `false` | No |

#### Example Deployment

```hcl
# terraform.tfvars
project_id     = "my-gcp-project-123"
domain         = "abe-stack.com"
ssh_public_key = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC..."
region         = "us-central1"
zone           = "us-central1-a"
instance_size  = "e2-medium"
enable_managed_database = true
```

## What Gets Deployed

### Base Infrastructure

- **Compute Instance**: Ubuntu 24.04 LTS VM
- **Networking**: VPC network with firewall rules
- **Security**: SSH access, service account/IAM
- **Domain**: DNS configuration (A/AAAA records)
- **SSL/TLS**: Caddy web server for HTTPS

### Optional Components

- **Managed Database**: PostgreSQL database cluster
- **Monitoring**: Cloud provider monitoring integration
- **Backups**: Automated backups (production only)

### Software Stack

The startup script installs:
- Node.js LTS + pnpm
- Docker + Docker Compose
- Caddy web server
- Google Cloud Ops Agent (GCP only)
- Security hardening (ufw, fail2ban)

## Post-Deployment

### 1. Connect to Your Server

```bash
# Get the public IP
terraform output instance_public_ip

# SSH into the server
terraform output ssh_connection_string
ssh -i ~/.ssh/your-private-key root@<public-ip>  # DigitalOcean
ssh -i ~/.ssh/your-private-key abe-stack@<public-ip>  # GCP
```

### 2. Deploy Your Application

```bash
# Clone your repository
git clone https://github.com/your-org/abe-stack.git /opt/abe-stack
cd /opt/abe-stack

# Configure environment
cp .env.example .env
# Edit .env with database connection string from terraform outputs

# Install dependencies and build
pnpm install
pnpm build

# Start the application
systemctl start abe-stack
systemctl enable abe-stack
```

### 3. Configure DNS

Update your domain registrar's nameservers to point to the cloud provider:

**DigitalOcean**: Use the nameservers shown in the DigitalOcean control panel
**GCP**: Use the nameservers from `terraform output name_servers`

### 4. SSL Certificate

Caddy will automatically obtain SSL certificates from Let's Encrypt. Ensure your domain's DNS is properly configured before accessing HTTPS.

## Database Configuration

If using managed database, get the connection details:

```bash
# Database connection string
terraform output database_connection_string

# Individual components
terraform output database_host
terraform output database_port
terraform output database_name
terraform output database_username
```

## Security Considerations

### SSH Access
- Restrict SSH source IPs in production
- Use SSH key authentication only
- Disable password authentication

### Firewall
- Only expose necessary ports (22, 80, 443, app port)
- Use cloud provider security groups/firewalls
- Consider VPN for database access

### Secrets Management
- Store sensitive values in Terraform Cloud or similar
- Rotate API keys and passwords regularly
- Use cloud provider secret management services

## Troubleshooting

### Common Issues

1. **SSH Connection Failed**
   - Verify SSH key is correct
   - Check firewall rules
   - Ensure instance is running

2. **Domain Not Resolving**
   - Wait for DNS propagation (5-30 minutes)
   - Verify DNS records in cloud provider console
   - Check domain registrar nameservers

3. **Application Not Starting**
   - Check systemd service status: `systemctl status abe-stack`
   - View application logs: `journalctl -u abe-stack`
   - Verify environment variables and database connection

### Logs and Monitoring

- **System logs**: `journalctl -u abe-stack`
- **Application logs**: `/opt/abe-stack/logs/` or `/home/abe-stack/abe-stack/logs/`
- **Cloud monitoring**: Use provider-specific monitoring dashboards

## CI/CD Integration

ABE Stack includes comprehensive CI/CD workflows that integrate with the IaC infrastructure:

### Available Workflows

#### 🚀 `infra-deploy.yml` - Deploy Infrastructure
- **Trigger**: Manual (workflow_dispatch)
- **Purpose**: Provision cloud infrastructure using Terraform
- **Environments**: staging, production
- **Providers**: DigitalOcean, GCP
- **Features**:
  - Terraform validation and formatting checks
  - Plan preview before apply
  - Manual approval for production deployments
  - Infrastructure output extraction
  - Deployment artifact storage

#### 🗑️ `infra-destroy.yml` - Destroy Infrastructure
- **Trigger**: Manual (workflow_dispatch)
- **Purpose**: Clean up cloud infrastructure
- **Safety**: Requires explicit "DESTROY" confirmation
- **Cleanup**: Removes all resources and artifacts

#### 🧪 `infra-test.yml` - Test Infrastructure
- **Trigger**: Push/PR to infra/ directory, Manual
- **Purpose**: Validate Terraform configurations
- **Tests**:
  - Terraform formatting and validation
  - Configuration script testing
  - Provider-specific validation
  - Documentation completeness
  - Module structure checks

#### 🚀 `deploy-to-infra.yml` - Deploy Application
- **Trigger**: Manual (workflow_dispatch)
- **Purpose**: Deploy application to IaC-provisioned infrastructure
- **Features**:
  - Automatic infrastructure discovery
  - Docker image building and pushing
  - Zero-downtime deployment
  - Health checks and verification
  - Rollback preparation

### Deployment Pipeline

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌──────────────┐
│  infra-test.yml │ -> │  infra-deploy.yml │ -> │ deploy-to-infra │ -> │ rollback.yml │
│                 │    │                  │    │     .yml        │    │  (emergency) │
│ • Validate      │    │ • Provision infra │    │ • Build images  │    │ • Rollback   │
│ • Test configs  │    │ • Configure DNS   │    │ • Deploy app    │    │ • Recovery   │
│ • Check docs    │    │ • Setup security  │    │ • Health check  │    │              │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └──────────────┘
```

### Workflow Details

#### 1. `infra-test.yml` - Infrastructure Validation
- **Triggers**: Push/PR to `infra/` directory
- **Purpose**: Validate Terraform configurations before deployment
- **Runs**: Terraform format check, validation, configuration tests
- **Output**: Test results and configuration validation

#### 2. `infra-deploy.yml` - Infrastructure Provisioning
- **Triggers**: Manual workflow dispatch
- **Purpose**: Deploy cloud infrastructure using Terraform
- **Features**:
  - Multi-environment support (staging/production)
  - Multi-provider support (DigitalOcean/GCP)
  - Plan preview with manual approval
  - Infrastructure output extraction
  - Artifact storage for deployment info

#### 3. `deploy-to-infra.yml` - Application Deployment
- **Triggers**: Manual workflow dispatch
- **Purpose**: Deploy application to provisioned infrastructure
- **Features**:
  - Automatic infrastructure discovery
  - Docker image building and registry push
  - Zero-downtime deployment with health checks
  - Environment-specific configuration
  - Deployment verification and reporting

#### 4. `rollback.yml` - Emergency Rollback
- **Triggers**: Manual workflow dispatch
- **Purpose**: Rollback to previous deployment version
- **Features**:
  - Automatic tag discovery for rollback
  - Graceful container replacement
  - Health verification after rollback
  - Emergency recovery procedures

### Quick Setup

Run the setup script to see all required secrets and variables:

```bash
./infra/setup-github.sh
```

This will display all required GitHub secrets and variables with setup commands.

### Required Secrets

#### For Infrastructure Deployment
```bash
# DigitalOcean
DIGITALOCEAN_TOKEN=your-do-api-token

# GCP
GCP_SA_KEY=your-gcp-service-account-json
GCP_PROJECT_ID=your-gcp-project-id

# SSH Access
SSH_PUBLIC_KEY=your-ssh-public-key

# Domain
DOMAIN=yourdomain.com
```

#### For Application Deployment
```bash
# SSH Access
SSH_PRIVATE_KEY=your-ssh-private-key

# Application Secrets
JWT_SECRET=your-jwt-secret
SESSION_SECRET=your-session-secret
DB_PASSWORD=your-database-password

# SSL Certificate
ACME_EMAIL=your-email@example.com

# Container Registry
REGISTRY_USERNAME=your-registry-username
REGISTRY_PASSWORD=your-registry-password
```

### Required Variables

Set these in your GitHub repository settings:

```bash
# Container Registry
REGISTRY=ghcr.io
IMAGE_NAME=username/abe-stack

# Infrastructure Settings (optional, with defaults)
DO_REGION=nyc1
DO_INSTANCE_SIZE=s-1vcpu-1gb
GCP_REGION=us-central1
GCP_ZONE=us-central1-a
GCP_INSTANCE_SIZE=e2-small

# SSH Settings
SSH_USERNAME=root
SSH_PORT=22
```

## Cost Estimation

### DigitalOcean (s-1vcpu-1gb droplet)
- **Compute**: ~$6/month
- **Managed DB** (optional): ~$15/month
- **Domain**: ~$12/year

### GCP (e2-small instance)
- **Compute**: ~$25/month
- **Cloud SQL** (optional): ~$10/month
- **Domain**: ~$12/year

## Cleanup

To destroy all infrastructure:

```bash
terraform destroy
```

⚠️ **Warning**: This will permanently delete all resources and data.

## Contributing

When adding new providers or features:

1. Follow the existing module structure
2. Include comprehensive documentation
3. Add validation for user inputs
4. Provide cost estimates
5. Test with minimal configurations first
