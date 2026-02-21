# Root Terraform configuration for BSLT Infrastructure
# This file defines the main infrastructure setup across providers

terraform {
  required_version = ">= 1.0"

  # Remote state backend — enable before your first `terraform apply`.
  # State must never be local on shared/production deployments (no locking, no history).
  #
  # DigitalOcean Spaces (S3-compatible — default for DO deployments):
  #   1. Create a Space and generate a Spaces access key in the DO console.
  #   2. Export: AWS_ACCESS_KEY_ID=<spaces-key> AWS_SECRET_ACCESS_KEY=<spaces-secret>
  #
  # backend "s3" {
  #   bucket                      = "bslt-terraform-state"
  #   key                         = "infrastructure/terraform.tfstate"
  #   region                      = "us-east-1"                           # required by AWS SDK, unused by DO
  #   endpoint                    = "https://nyc3.digitaloceanspaces.com" # change region as needed
  #   skip_credentials_validation = true
  #   skip_metadata_api_check     = true
  #   skip_region_validation      = true
  #   force_path_style            = true
  # }
  #
  # GCP Cloud Storage (for GCP deployments):
  # backend "gcs" {
  #   bucket = "bslt-terraform-state"
  #   prefix = "infrastructure"
  # }
  #
  # Terraform Cloud (provider-agnostic):
  # backend "remote" {
  #   organization = "your-org"
  #   workspaces { name = "bslt-production" }
  # }
}

# ============================================================================
# WORKSPACE → ENVIRONMENT MAPPING
# ============================================================================
# Each Terraform workspace is one isolated deployment environment with its own
# state file. Never deploy from the "default" workspace.
#
#   First-time setup:
#     terraform workspace new staging
#     terraform workspace new production
#
#   Deploy:
#     terraform workspace select staging    && terraform apply
#     terraform workspace select production && terraform apply
#
#   List workspaces:
#     terraform workspace list
# ============================================================================
locals {
  environment = terraform.workspace
}

# ============================================================================
# PROVIDER MODULES
# ============================================================================
# Uncomment and configure ONE of the following provider modules

# DigitalOcean Provider Module
# module "digitalocean" {
#   source = "./digitalocean"
#
#   # Required variables
#   domain         = var.domain
#   ssh_public_key = var.ssh_public_key
#
#   # Optional variables with defaults
#   region                  = "nyc1"
#   instance_size           = "s-1vcpu-1gb"
#   app_name                = var.app_name
#   environment             = local.environment
#   app_port                = var.app_port
#   enable_managed_database = var.enable_managed_database
#   database_size           = var.database_size
#   database_node_count     = var.database_node_count
#   ssh_allowed_cidrs       = var.ssh_allowed_cidrs
# }

# Google Cloud Platform Provider Module
# module "gcp" {
#   source = "./gcp"
#
#   # Required variables
#   project_id     = "your-gcp-project-id"  # Set this in terraform.tfvars
#   domain         = var.domain
#   ssh_public_key = var.ssh_public_key
#
#   # Optional variables with defaults
#   region                  = "us-central1"
#   zone                    = "us-central1-a"
#   instance_size           = "e2-small"
#   app_name                = var.app_name
#   environment             = local.environment
#   app_port                = var.app_port
#   enable_managed_database = var.enable_managed_database
#   database_size           = var.database_size
#   database_username       = "abe_user"
#   database_password       = var.database_password
#   ssh_allowed_cidrs       = var.ssh_allowed_cidrs
# }
