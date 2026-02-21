# Google Cloud Platform Infrastructure Module
# Deploys BSLT to GCP Compute Instance with optional Cloud SQL

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

# GCP Compute Instance (VM)
resource "google_compute_instance" "abe_stack" {
  name         = "${var.app_name}-${var.environment}"
  machine_type = var.instance_size
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2404-lts-amd64"  # Latest LTS Ubuntu
      size  = 50
      type  = "pd-balanced"
    }
  }

  network_interface {
    network = google_compute_network.abe_stack.name
    access_config {
      # Ephemeral public IP
    }
  }

  metadata = {
    ssh-keys = "bslt:${var.ssh_public_key}"
  }

  metadata_startup_script = templatefile("${path.module}/startup-script.sh", {
    app_name = var.app_name
  })

  service_account {
    email  = google_service_account.abe_stack.email
    scopes = ["cloud-platform"]
  }

  tags = [
    "bslt",
    var.environment,
    "managed-by-terraform"
  ]

  # Enable automatic restart
  scheduling {
    automatic_restart   = true
    on_host_maintenance = "MIGRATE"
  }

  # Enable monitoring
  shielded_instance_config {
    enable_secure_boot          = true
    enable_vtpm                 = true
    enable_integrity_monitoring = true
  }
}

# Service Account for the instance
resource "google_service_account" "abe_stack" {
  account_id   = "${var.app_name}-${var.environment}"
  display_name = "${var.app_name} ${var.environment} Service Account"
  description  = "Service account for BSLT ${var.environment} environment"
}

# IAM binding for the service account (minimal permissions)
resource "google_project_iam_member" "abe_stack_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.abe_stack.email}"
}

resource "google_project_iam_member" "abe_stack_monitoring" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.abe_stack.email}"
}

# VPC Network
resource "google_compute_network" "abe_stack" {
  name                    = "${var.app_name}-network-${var.environment}"
  auto_create_subnetworks = false
  mtu                     = 1460
}

# Subnet
resource "google_compute_subnetwork" "abe_stack" {
  name          = "${var.app_name}-subnet-${var.environment}"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.region
  network       = google_compute_network.abe_stack.id
}

# Firewall rules
resource "google_compute_firewall" "abe_stack_ssh" {
  name    = "${var.app_name}-ssh-${var.environment}"
  network = google_compute_network.abe_stack.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = var.ssh_allowed_cidrs
  target_tags   = ["bslt"]
}

resource "google_compute_firewall" "abe_stack_http" {
  name    = "${var.app_name}-http-${var.environment}"
  network = google_compute_network.abe_stack.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["bslt"]
}

# Cloud DNS for domain management
resource "google_dns_managed_zone" "abe_stack" {
  name        = "${var.app_name}-zone-${var.environment}"
  dns_name    = "${var.domain}."
  description = "DNS zone for ${var.app_name} ${var.environment}"
}

resource "google_dns_record_set" "abe_stack_a" {
  name         = google_dns_managed_zone.abe_stack.dns_name
  managed_zone = google_dns_managed_zone.abe_stack.name
  type         = "A"
  ttl          = 300
  rrdatas = [
    google_compute_instance.abe_stack.network_interface[0].access_config[0].nat_ip
  ]
}

# ---------------------------------------------------------------------------
# Private Service Access — required for Cloud SQL private IP
# Allocates a private IP range in the VPC and peers it with Google's
# managed services network so Cloud SQL is reachable without a public IP.
# ---------------------------------------------------------------------------

resource "google_project_service" "service_networking" {
  count   = var.enable_managed_database ? 1 : 0
  project = var.project_id
  service = "servicenetworking.googleapis.com"

  disable_on_destroy = false
}

resource "google_compute_global_address" "private_ip_range" {
  count = var.enable_managed_database ? 1 : 0

  name          = "${var.app_name}-private-ip-${var.environment}"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.abe_stack.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  count = var.enable_managed_database ? 1 : 0

  network                 = google_compute_network.abe_stack.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range[0].name]

  depends_on = [google_project_service.service_networking]
}

# Optional Cloud SQL PostgreSQL database
resource "google_sql_database_instance" "abe_stack" {
  count = var.enable_managed_database ? 1 : 0

  name             = "${var.app_name}-db-${var.environment}"
  database_version = "POSTGRES_16"
  region           = var.region

  settings {
    tier = var.database_size

    disk_autoresize = true
    disk_size        = 10
    disk_type        = "PD_SSD"

    backup_configuration {
      enabled    = true
      start_time = "02:00"
    }

    maintenance_window {
      day  = 7  # Sunday
      hour = 2
    }

    insights_config {
      query_insights_enabled = true
    }

    ip_configuration {
      # Private IP only — no public internet exposure.
      # The compute instance connects via the VPC private network.
      ipv4_enabled    = false
      private_network = google_compute_network.abe_stack.id
    }
  }

  deletion_protection = var.environment == "production"

  depends_on = [google_service_networking_connection.private_vpc_connection]
}

resource "google_sql_database" "abe_stack" {
  count = var.enable_managed_database ? 1 : 0

  name     = var.app_name
  instance = google_sql_database_instance.abe_stack[0].name
}

resource "google_sql_user" "abe_stack" {
  count = var.enable_managed_database ? 1 : 0

  name     = var.database_username
  instance = google_sql_database_instance.abe_stack[0].name
  password = var.database_password
}
