#!/bin/bash
# Test script to validate Terraform configuration
# Run this before deploying to catch common issues

set -e

echo "🔍 Validating Terraform configuration..."

# Check if terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform is not installed. Please install Terraform >= 1.0"
    exit 1
fi

# Check terraform version
TF_VERSION=$(terraform version | head -n1 | cut -d' ' -f2 | sed 's/v//')
if [[ "$(printf '%s\n' "$TF_VERSION" "1.0" | sort -V | head -n1)" != "1.0" ]]; then
    echo "❌ Terraform version $TF_VERSION is too old. Please upgrade to >= 1.0"
    exit 1
fi

echo "✅ Terraform $TF_VERSION is installed"

# Initialize terraform if needed
if [ ! -d ".terraform" ]; then
    echo "📦 Initializing Terraform..."
    terraform init -backend=false
fi

# Validate configuration
echo "🔧 Validating configuration..."
if terraform validate; then
    echo "✅ Configuration is valid"
else
    echo "❌ Configuration validation failed"
    exit 1
fi

# Check if required variables are set (basic check)
echo "📋 Checking required variables..."

# Check for terraform.tfvars file
if [ ! -f "terraform.tfvars" ]; then
    echo "⚠️  No terraform.tfvars file found. Please create one from terraform.tfvars.example"
    echo "   cp terraform.tfvars.example terraform.tfvars"
    echo "   # Then edit terraform.tfvars with your values"
fi

# Check for SSH key
if [ -f "terraform.tfvars" ]; then
    if ! grep -q "ssh_public_key" terraform.tfvars; then
        echo "⚠️  ssh_public_key not found in terraform.tfvars"
    else
        echo "✅ SSH public key configured"
    fi

    if ! grep -q "domain" terraform.tfvars; then
        echo "⚠️  domain not found in terraform.tfvars"
    else
        echo "✅ Domain configured"
    fi
fi

# Check for provider-specific variables
if [ -d "digitalocean" ] && [ -f "digitalocean/main.tf" ]; then
    echo "🌊 DigitalOcean module detected"
    if [ -f "terraform.tfvars" ]; then
        if ! grep -q "digitalocean_token\|DIGITALOCEAN_TOKEN" terraform.tfvars; then
            echo "⚠️  DigitalOcean token not configured"
            echo "   Add 'digitalocean_token = \"your-token\"' to terraform.tfvars"
            echo "   Or set DIGITALOCEAN_TOKEN environment variable"
        fi
    fi
fi

if [ -d "gcp" ] && [ -f "gcp/main.tf" ]; then
    echo "☁️  GCP module detected"
    if [ -f "terraform.tfvars" ]; then
        if ! grep -q "project_id" terraform.tfvars; then
            echo "⚠️  GCP project_id not configured"
            echo "   Add 'project_id = \"your-project-id\"' to terraform.tfvars"
        fi
    fi
fi

echo ""
echo "🎉 Pre-deployment checks complete!"
echo ""
echo "Next steps:"
echo "1. Configure your terraform.tfvars file"
echo "2. Run 'terraform plan' to see what will be created"
echo "3. Run 'terraform apply' to deploy"
echo ""
echo "For detailed documentation, see README.md"