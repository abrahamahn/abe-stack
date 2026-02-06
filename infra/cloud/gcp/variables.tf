# GCP Module Variables

variable "project_id" {
  description = "Google Cloud Project ID"
  type        = string
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]*[a-z0-9]$", var.project_id)) && length(var.project_id) >= 6 && length(var.project_id) <= 30
    error_message = "Project ID must be 6-30 characters, start with lowercase letter, contain only lowercase letters, numbers, and hyphens."
  }
}

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
  description = "GCP region (e.g., us-central1, europe-west1)"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone within the region"
  type        = string
  default     = "us-central1-a"
}

variable "instance_size" {
  description = "Compute instance machine type (e.g., e2-micro, e2-small, n1-standard-1)"
  type        = string
  default     = "e2-small"

  validation {
    condition = contains([
      "e2-micro", "e2-small", "e2-medium",
      "n1-standard-1", "n1-standard-2", "n1-standard-4",
      "n2-standard-2", "n2-standard-4", "n2-standard-8"
    ], var.instance_size)
    error_message = "Instance size must be a valid GCP machine type."
  }
}

variable "ssh_public_key" {
  description = "SSH public key for instance access"
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
  description = "Enable Google Cloud SQL PostgreSQL database"
  type        = bool
  default     = false
}

variable "database_size" {
  description = "Cloud SQL tier (e.g., db-f1-micro, db-g1-small)"
  type        = string
  default     = "db-f1-micro"
}

variable "database_username" {
  description = "Database username"
  type        = string
  default     = "abe_user"
}

variable "database_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}