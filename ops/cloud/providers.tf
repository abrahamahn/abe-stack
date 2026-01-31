# Provider configurations for ABE Stack Infrastructure
# This file defines the required providers and their configurations

terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }

    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

# DigitalOcean Provider (configure when using DigitalOcean module)
# provider "digitalocean" {
#   token = var.digitalocean_token
# }

# Google Cloud Provider (configure when using GCP module)
# provider "google" {
#   project = var.gcp_project_id
#   region  = var.region
# }