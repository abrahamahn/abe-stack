# DigitalOcean Module Outputs

output "droplet_id" {
  description = "DigitalOcean droplet ID"
  value       = digitalocean_droplet.abe_stack.id
}

output "instance_public_ip" {
  description = "Public IP address of the droplet"
  value       = digitalocean_droplet.abe_stack.ipv4_address
}

output "instance_private_ip" {
  description = "Private IP address of the droplet"
  value       = digitalocean_droplet.abe_stack.ipv4_address_private
}

output "ssh_connection_string" {
  description = "SSH connection command"
  value       = "ssh -i <your-private-key> root@${digitalocean_droplet.abe_stack.ipv4_address}"
}

output "domain_name" {
  description = "Configured domain name"
  value       = digitalocean_domain.abe_stack.name
}

output "database_connection_string" {
  description = "PostgreSQL connection string (if managed database enabled)"
  value       = var.enable_managed_database ? "postgresql://doadmin:${digitalocean_database_cluster.abe_stack[0].password}@${digitalocean_database_cluster.abe_stack[0].host}:${digitalocean_database_cluster.abe_stack[0].port}/${digitalocean_database_cluster.abe_stack[0].database}?sslmode=require" : null
  sensitive   = true
}

output "database_host" {
  description = "Database host (if managed database enabled)"
  value       = var.enable_managed_database ? digitalocean_database_cluster.abe_stack[0].host : null
}

output "database_port" {
  description = "Database port (if managed database enabled)"
  value       = var.enable_managed_database ? digitalocean_database_cluster.abe_stack[0].port : null
}

output "database_name" {
  description = "Database name (if managed database enabled)"
  value       = var.enable_managed_database ? digitalocean_database_cluster.abe_stack[0].database : null
}

output "database_username" {
  description = "Database username (if managed database enabled)"
  value       = var.enable_managed_database ? digitalocean_database_cluster.abe_stack[0].user : null
}

output "database_password" {
  description = "Database password (if managed database enabled)"
  value       = var.enable_managed_database ? digitalocean_database_cluster.abe_stack[0].password : null
  sensitive   = true
}