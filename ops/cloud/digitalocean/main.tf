# DigitalOcean Infrastructure Module
# Deploys ABE Stack to DigitalOcean Droplet with optional managed database

terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

# DigitalOcean Droplet (VM Instance)
resource "digitalocean_droplet" "abe_stack" {
  name     = "${var.app_name}-${var.environment}"
  region   = var.region
  size     = var.instance_size
  image    = "ubuntu-24-04-x64" # Latest LTS Ubuntu
  ssh_keys = [digitalocean_ssh_key.default.id]

  # Enable monitoring and backups
  monitoring = true
  backups    = var.environment == "production"

  # User data for initial server setup
  user_data = templatefile("${path.module}/user-data.sh", {
    app_name = var.app_name
    app_port = var.app_port
  })

  tags = [
    "abe-stack",
    var.environment,
    "managed-by-terraform"
  ]
}

# SSH Key for server access
resource "digitalocean_ssh_key" "default" {
  name       = "${var.app_name}-ssh-key-${var.environment}"
  public_key = var.ssh_public_key
}

# Firewall configuration
resource "digitalocean_firewall" "abe_stack" {
  name = "${var.app_name}-firewall-${var.environment}"

  droplet_ids = [digitalocean_droplet.abe_stack.id]

  # Inbound rules
  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = ["0.0.0.0/0", "::/0"] # SSH from anywhere (restrict in production)
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = tostring(var.app_port)
    source_addresses = ["0.0.0.0/0", "::/0"] # Application port
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0", "::/0"] # HTTP
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"] # HTTPS
  }

  # Outbound rules (allow all outbound)
  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}

# Domain configuration
resource "digitalocean_domain" "abe_stack" {
  name = var.domain
}

resource "digitalocean_record" "abe_stack_a" {
  domain = digitalocean_domain.abe_stack.name
  type   = "A"
  name   = "@"
  value  = digitalocean_droplet.abe_stack.ipv4_address
  ttl    = 300
}

resource "digitalocean_record" "abe_stack_aaaa" {
  domain = digitalocean_domain.abe_stack.name
  type   = "AAAA"
  name   = "@"
  value  = digitalocean_droplet.abe_stack.ipv6_address
  ttl    = 300
}

# Optional managed database
resource "digitalocean_database_cluster" "abe_stack" {
  count = var.enable_managed_database ? 1 : 0

  name       = "${var.app_name}-db-${var.environment}"
  engine     = "pg"
  version    = "16"
  size       = var.database_size
  region     = var.region
  node_count = 1

  maintenance_window {
    day  = "sunday"
    hour = "02:00"
  }

  tags = [
    "abe-stack",
    var.environment,
    "managed-by-terraform"
  ]
}

# Database firewall (allow connection from droplet)
resource "digitalocean_database_firewall" "abe_stack" {
  count = var.enable_managed_database ? 1 : 0

  cluster_id = digitalocean_database_cluster.abe_stack[0].id

  rule {
    type  = "droplet"
    value = digitalocean_droplet.abe_stack.id
  }
}