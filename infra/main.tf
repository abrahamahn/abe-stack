# Root Terraform configuration for ABE Stack Infrastructure
# This file defines the main infrastructure setup across providers

terraform {
  required_version = ">= 1.0"

  # TODO: Configure backend for state management (recommended for production)
  # backend "s3" {
  #   bucket = "abe-stack-terraform-state"
  #   key    = "infrastructure/terraform.tfstate"
  #   region = "us-east-1"
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