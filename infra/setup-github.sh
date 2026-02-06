#!/bin/bash
# GitHub Repository Setup Script for ABE Stack IaC
# This script helps configure the required secrets and variables for CI/CD

set -e

echo "🚀 ABE Stack GitHub Repository Setup"
echo "===================================="
echo ""
echo "This script will help you configure the required GitHub secrets and variables"
echo "for the Infrastructure as Code and CI/CD pipelines."
echo ""
echo "You'll need to run this on your local machine and then manually set the values"
echo "in your GitHub repository settings."
echo ""

# Check if we're in the right directory
if [ ! -f "infra/README.md" ]; then
    echo "❌ Error: Please run this script from the repository root directory"
    exit 1
fi

echo "📋 Required GitHub Secrets:"
echo "============================"
echo ""

# Infrastructure secrets
echo "## Infrastructure Secrets (for infra-deploy.yml)"
echo "DIGITALOCEAN_TOKEN        - Your DigitalOcean API token"
echo "GCP_SA_KEY               - GCP Service Account JSON (base64 encoded)"
echo "SSH_PUBLIC_KEY           - SSH public key for server access"
echo "SSH_PRIVATE_KEY          - SSH private key for server access"
echo "DOMAIN                   - Your domain name (e.g., abe-stack.com)"
echo ""

# Application secrets
echo "## Application Secrets (for deploy-to-infra.yml)"
echo "JWT_SECRET               - JWT signing secret (generate: openssl rand -hex 32)"
echo "SESSION_SECRET           - Session signing secret (generate: openssl rand -hex 32)"
echo "DB_PASSWORD              - Database password (generate: openssl rand -hex 16)"
echo "ACME_EMAIL              - Email for SSL certificates"
echo ""

# Registry secrets
echo "## Container Registry Secrets"
echo "REGISTRY_USERNAME        - Container registry username"
echo "REGISTRY_PASSWORD        - Container registry password/token"
echo ""

echo "📋 Required GitHub Variables:"
echo "=============================="
echo ""

# Registry variables
echo "## Container Registry Variables"
echo "REGISTRY                 - Container registry URL (e.g., ghcr.io)"
echo "IMAGE_NAME              - Image name (e.g., username/abe-stack)"
echo ""

# Infrastructure variables
echo "## Infrastructure Variables (Optional - defaults provided)"
echo "DO_REGION               - DigitalOcean region (default: nyc1)"
echo "DO_INSTANCE_SIZE        - DigitalOcean droplet size (default: s-1vcpu-1gb)"
echo "DO_ENABLE_MANAGED_DB    - Enable DO managed DB (default: false)"
echo "DO_DATABASE_SIZE        - DO managed DB size (default: db-s-1vcpu-1gb)"
echo ""
echo "GCP_PROJECT_ID          - GCP Project ID"
echo "GCP_REGION              - GCP region (default: us-central1)"
echo "GCP_ZONE                - GCP zone (default: us-central1-a)"
echo "GCP_INSTANCE_SIZE       - GCP machine type (default: e2-small)"
echo "GCP_ENABLE_MANAGED_DB   - Enable GCP Cloud SQL (default: false)"
echo "GCP_DATABASE_SIZE       - GCP Cloud SQL tier (default: db-f1-micro)"
echo ""

# SSH variables
echo "## SSH Variables (Optional - defaults provided)"
echo "SSH_USERNAME            - SSH username (default: root)"
echo "SSH_PORT                - SSH port (default: 22)"
echo ""

echo "🔧 Setup Commands:"
echo "=================="
echo ""

# Generate secrets
echo "## 1. Generate Required Secrets"
echo "# JWT Secret (32 bytes hex)"
echo "openssl rand -hex 32"
echo ""

echo "# Session Secret (32 bytes hex)"
echo "openssl rand -hex 32"
echo ""

echo "# Database Password (16 bytes hex)"
echo "openssl rand -hex 16"
echo ""

echo "# SSH Key Pair (if you don't have one)"
echo "ssh-keygen -t rsa -b 4096 -C 'abe-stack-deploy'"
echo "# This creates id_rsa and id_rsa.pub"
echo ""

echo "## 2. Set GitHub Secrets (Repository Settings > Secrets and variables > Actions)"
echo "# Run these commands to set secrets (replace with actual values):"
echo ""

# Generate the commands for setting secrets
SECRETS=(
    "DIGITALOCEAN_TOKEN"
    "GCP_SA_KEY"
    "SSH_PUBLIC_KEY"
    "SSH_PRIVATE_KEY"
    "DOMAIN"
    "JWT_SECRET"
    "SESSION_SECRET"
    "DB_PASSWORD"
    "ACME_EMAIL"
    "REGISTRY_USERNAME"
    "REGISTRY_PASSWORD"
)

for secret in "${SECRETS[@]}"; do
    echo "# Set $secret"
    echo "gh secret set $secret --body 'YOUR_$secret_VALUE'"
    echo ""
done

echo "## 3. Set GitHub Variables (Repository Settings > Secrets and variables > Variables)"
echo "# Run these commands to set variables:"
echo ""

VARIABLES=(
    "REGISTRY=ghcr.io"
    "IMAGE_NAME=YOUR_USERNAME/abe-stack"
    "DO_REGION=nyc1"
    "DO_INSTANCE_SIZE=s-1vcpu-1gb"
    "DO_ENABLE_MANAGED_DB=false"
    "GCP_REGION=us-central1"
    "GCP_ZONE=us-central1-a"
    "GCP_INSTANCE_SIZE=e2-small"
    "GCP_ENABLE_MANAGED_DB=false"
    "SSH_USERNAME=root"
    "SSH_PORT=22"
)

for var in "${VARIABLES[@]}"; do
    var_name=$(echo $var | cut -d'=' -f1)
    var_value=$(echo $var | cut -d'=' -f2)
    echo "# Set $var_name"
    echo "gh variable set $var_name --body '$var_value'"
    echo ""
done

echo "## 4. GCP Service Account Setup (if using GCP)"
echo "# Create a service account with these roles:"
echo "# - Compute Admin"
echo "# - DNS Administrator"
echo "# - Cloud SQL Admin (if using managed DB)"
echo "# - Storage Admin (if using GCS)"
echo ""
echo "# Download the JSON key and base64 encode it:"
echo "base64 -i service-account-key.json"
echo "# Set the result as GCP_SA_KEY secret"
echo ""

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Set all required secrets and variables in GitHub"
echo "2. Run 'infra-test.yml' to validate your configurations"
echo "3. Run 'infra-deploy.yml' to provision infrastructure"
echo "4. Run 'deploy-to-infra.yml' to deploy your application"
echo ""
echo "For detailed documentation, see infra/README.md"