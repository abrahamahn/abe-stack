# GCP Module Outputs

output "instance_name" {
  description = "GCP compute instance name"
  value       = google_compute_instance.abe_stack.name
}

output "instance_public_ip" {
  description = "Public IP address of the compute instance"
  value       = google_compute_instance.abe_stack.network_interface[0].access_config[0].nat_ip
}

output "instance_private_ip" {
  description = "Private IP address of the compute instance"
  value       = google_compute_instance.abe_stack.network_interface[0].network_ip
}

output "ssh_connection_string" {
  description = "SSH connection command"
  value       = "ssh -i <your-private-key> abe-stack@${google_compute_instance.abe_stack.network_interface[0].access_config[0].nat_ip}"
}

output "service_account_email" {
  description = "Service account email address"
  value       = google_service_account.abe_stack.email
}

output "domain_name" {
  description = "Configured domain name"
  value       = trimsuffix(google_dns_managed_zone.abe_stack.dns_name, ".")
}

output "name_servers" {
  description = "DNS name servers for the domain"
  value       = google_dns_managed_zone.abe_stack.name_servers
}

output "database_connection_string" {
  description = "PostgreSQL connection string (if Cloud SQL enabled)"
  value       = var.enable_managed_database ? "postgresql://${google_sql_user.abe_stack[0].name}:${google_sql_user.abe_stack[0].password}@${google_sql_database_instance.abe_stack[0].public_ip_address}:${google_sql_database_instance.abe_stack[0].port}/${google_sql_database.abe_stack[0].name}?sslmode=require" : null
  sensitive   = true
}

output "database_host" {
  description = "Database host (if Cloud SQL enabled)"
  value       = var.enable_managed_database ? google_sql_database_instance.abe_stack[0].public_ip_address : null
}

output "database_port" {
  description = "Database port (if Cloud SQL enabled)"
  value       = var.enable_managed_database ? google_sql_database_instance.abe_stack[0].port : null
}

output "database_name" {
  description = "Database name (if Cloud SQL enabled)"
  value       = var.enable_managed_database ? google_sql_database.abe_stack[0].name : null
}

output "database_username" {
  description = "Database username (if Cloud SQL enabled)"
  value       = var.enable_managed_database ? google_sql_user.abe_stack[0].name : null
}

output "database_password" {
  description = "Database password (if Cloud SQL enabled)"
  value       = var.enable_managed_database ? google_sql_user.abe_stack[0].password : null
  sensitive   = true
}

output "vpc_network_name" {
  description = "VPC network name"
  value       = google_compute_network.abe_stack.name
}

output "subnet_name" {
  description = "Subnet name"
  value       = google_compute_subnetwork.abe_stack.name
}