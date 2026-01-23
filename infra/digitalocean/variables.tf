# DigitalOcean Module Variables

variable "app_name" {
  description = "Application name for resource naming"
  type        = string
  default     = "abe-stack"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "region" {
  description = "DigitalOcean region (e.g., nyc1, sfo3, lon1)"
  type        = string
  default     = "nyc1"

  validation {
    condition = contains([
      "nyc1", "nyc2", "nyc3",
      "sfo1", "sfo2", "sfo3",
      "lon1",
      "tor1",
      "blr1",
      "fra1",
      "ams3",
      "sgp1"
    ], var.region)
    error_message = "Region must be a valid DigitalOcean region."
  }
}

variable "instance_size" {
  description = "Droplet size slug (e.g., s-1vcpu-1gb, s-2vcpu-2gb)"
  type        = string
  default     = "s-1vcpu-1gb"

  validation {
    condition = contains([
      "s-1vcpu-1gb", "s-1vcpu-2gb", "s-1vcpu-3gb",
      "s-2vcpu-2gb", "s-2vcpu-4gb",
      "s-4vcpu-8gb",
      "c-2", "c-4", "c-8", "c-16", "c-32" # CPU-optimized
    ], var.instance_size)
    error_message = "Instance size must be a valid DigitalOcean droplet size."
  }
}

variable "ssh_public_key" {
  description = "SSH public key for droplet access"
  type        = string
  sensitive   = true
}

variable "domain" {
  description = "Domain name for the application"
  type        = string
}

variable "app_port" {
  description = "Port the application listens on"
  type        = number
  default     = 3000
}

variable "enable_managed_database" {
  description = "Enable DigitalOcean managed PostgreSQL database"
  type        = bool
  default     = false
}

variable "database_size" {
  description = "Managed database size slug"
  type        = string
  default     = "db-s-1vcpu-1gb"
}