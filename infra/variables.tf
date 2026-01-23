# Infrastructure Variables - "Bring Your Own" Configuration
# These variables allow customization for different deployment scenarios

variable "domain" {
  description = "Domain name for the application (e.g., example.com)"
  type        = string
  validation {
    condition     = can(regex("^[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", var.domain))
    error_message = "Domain must be a valid domain name format."
  }
}

variable "ssh_public_key" {
  description = "SSH public key for server access (RSA/ECDSA/Ed25519 format)"
  type        = string
  sensitive   = true
  validation {
    condition = can(regex(
      "^(ssh-rsa|ssh-ed25519|ecdsa-sha2-nistp256|ecdsa-sha2-nistp384|ecdsa-sha2-nistp521)\\s+[A-Za-z0-9+/]+[=]*\\s+.*$",
      var.ssh_public_key
    ))
    error_message = "SSH public key must be in valid OpenSSH format."
  }
}

variable "region" {
  description = "Cloud provider region for deployment"
  type        = string
  default     = "us-east-1" # AWS default, override in provider modules
}

variable "instance_size" {
  description = "Compute instance size/type"
  type        = string
  default     = "s-1vcpu-1gb" # DigitalOcean default, override in provider modules
}

# Optional database configuration
variable "enable_managed_database" {
  description = "Enable managed database service"
  type        = bool
  default     = false
}

variable "database_size" {
  description = "Managed database instance size (when enabled)"
  type        = string
  default     = "db-s-1vcpu-1gb"
}

# Environment configuration
variable "environment" {
  description = "Deployment environment (staging/production)"
  type        = string
  default     = "production"
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either 'staging' or 'production'."
  }
}

# Provider-specific configuration
variable "digitalocean_token" {
  description = "DigitalOcean API token (required for DigitalOcean deployments)"
  type        = string
  sensitive   = true
  default     = null
}

variable "gcp_project_id" {
  description = "Google Cloud Project ID (required for GCP deployments)"
  type        = string
  default     = null
}

# Application configuration
variable "app_name" {
  description = "Application name for resource naming"
  type        = string
  default     = "abe-stack"
}

variable "app_port" {
  description = "Port the application listens on"
  type        = number
  default     = 3000
}