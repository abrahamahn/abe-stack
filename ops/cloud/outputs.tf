# Infrastructure Outputs
# These outputs provide information about the deployed infrastructure

output "instance_public_ip" {
  description = "Public IP address of the deployed instance"
  value       = try(module.digitalocean.instance_public_ip, module.gcp.instance_public_ip, null)
}

output "instance_private_ip" {
  description = "Private IP address of the deployed instance"
  value       = try(module.digitalocean.instance_private_ip, module.gcp.instance_private_ip, null)
}

output "domain_name" {
  description = "Domain name configured for the application"
  value       = var.domain
}

output "ssh_connection_string" {
  description = "SSH connection command for the instance"
  value       = try(module.digitalocean.ssh_connection_string, module.gcp.ssh_connection_string, null)
  sensitive   = false # Connection string is not sensitive
}

output "application_url" {
  description = "Full URL to access the deployed application"
  value       = "https://${var.domain}"
}

output "database_connection_string" {
  description = "Database connection string (if managed database is enabled)"
  value       = try(module.digitalocean.database_connection_string, module.gcp.database_connection_string, null)
  sensitive   = true
}

# Provider-specific outputs (conditionally available)
output "digitalocean_droplet_id" {
  description = "DigitalOcean droplet ID (when using DigitalOcean provider)"
  value       = try(module.digitalocean.droplet_id, null)
}

output "gcp_instance_name" {
  description = "GCP compute instance name (when using GCP provider)"
  value       = try(module.gcp.instance_name, null)
}

output "gcp_service_account_email" {
  description = "GCP service account email (when using GCP provider)"
  value       = try(module.gcp.service_account_email, null)
}

output "gcp_name_servers" {
  description = "DNS name servers for domain (when using GCP provider)"
  value       = try(module.gcp.name_servers, null)
}

output "gcp_vpc_network_name" {
  description = "GCP VPC network name (when using GCP provider)"
  value       = try(module.gcp.vpc_network_name, null)
}