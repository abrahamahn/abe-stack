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
#   region               = "nyc1"
#   instance_size        = "s-1vcpu-1gb"
#   app_name            = var.app_name
#   environment         = var.environment
#   app_port            = var.app_port
#   enable_managed_database = var.enable_managed_database
#   database_size       = var.database_size
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
#   region               = "us-central1"
#   zone                 = "us-central1-a"
#   instance_size        = "e2-small"
#   app_name            = var.app_name
#   environment         = var.environment
#   app_port            = var.app_port
#   enable_managed_database = var.enable_managed_database
#   database_size       = var.database_size
#   database_username   = "abe_user"
#   database_password   = "your-secure-password"
# }
