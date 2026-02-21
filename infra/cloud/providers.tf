# Provider configurations for BSLT Infrastructure
# This file defines the required providers and their configurations

terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }

    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

# DigitalOcean Provider — active default (ACTIVE_CLOUD_PROVIDER=digitalocean)
# Comment out if switching to GCP.
provider "digitalocean" {
  token = var.digitalocean_token
}

# Google Cloud Provider — uncomment and comment out the DO block above to switch.
# provider "google" {
#   project = var.gcp_project_id
#   region  = var.region
# }
