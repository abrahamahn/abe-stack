# ABE Stack Deployment Guide

Docker-based deployment for the ABE Stack monorepo.

---

## Quick Start

### Development (Local)

Start the database and run the dev servers:

```bash
# Start PostgreSQL
docker compose -f config/docker/docker-compose.dev.yml up -d

# Run migrations
pnpm db:push

# Start all dev servers (web + server)
pnpm dev
```

Access:

- Web: http://localhost:5173
- API: http://localhost:8080
- API Health: http://localhost:8080/health

### Production (Docker)

```bash
# 1. Create production environment file
cp .env.example .config/env/.config/env/.env.production
# Edit .config/env/.config/env/.env.production with production values

# 2. Set required environment variables
export DOMAIN=example.com
export ACME_EMAIL=admin@example.com
export POSTGRES_PASSWORD=$(openssl rand -base64 32)
export JWT_SECRET=$(openssl rand -base64 32)
export SESSION_SECRET=$(openssl rand -base64 32)

# 3. Build and start (includes Caddy reverse proxy with auto TLS)
docker compose -f config/docker/docker-compose.prod.yml --env-file .config/env/.config/env/.env.production up -d

# 4. Run migrations (first deploy only)
docker compose -f config/docker/docker-compose.prod.yml exec api node -e "/* migration command */"
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                       Internet                          │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│               Caddy (Reverse Proxy)                     │
│              Port 80 / 443 (TLS)                        │
│         Automatic Let's Encrypt certificates            │
└─────────────────────────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
    ┌──────────┐    ┌──────────────┐    ┌──────────┐
    │/health*  │    │/ws /api/*    │    │    /*    │
    │          │    │              │    │          │
    │  api     │    │    api       │    │   web    │
    │ :8080    │    │   :8080      │    │   :80    │
    └──────────┘    └──────────────┘    └──────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │   postgres   │
                    │    :5432     │
                    └──────────────┘
```

**Routing:**

- `/health*` → API server (health checks)
- `/ws` → API server (WebSocket)
- `/api/*` → API server (REST API)
- `/uploads/*` → API server (file uploads)
- `/*` → Web server (SPA frontend)

---

## Port Reference

| Service  | Internal Port | External Port | Purpose                         |
| -------- | ------------- | ------------- | ------------------------------- |
| caddy    | 80/443        | 80/443        | Reverse proxy + TLS termination |
| postgres | 5432          | (none)        | PostgreSQL database             |
| api      | 8080          | (none)        | Backend API server              |
| web      | 80            | (none)        | Frontend (nginx)                |

In production, only Caddy ports (80/443) are exposed to the internet.

---

## Required Environment Variables

### Secrets (Required)

| Variable            | Description            | Example                   |
| ------------------- | ---------------------- | ------------------------- |
| `POSTGRES_PASSWORD` | Database password      | `openssl rand -base64 32` |
| `JWT_SECRET`        | JWT signing key        | `openssl rand -base64 32` |
| `SESSION_SECRET`    | Session encryption key | `openssl rand -base64 32` |

### Domain Configuration

| Variable     | Default             | Description                           |
| ------------ | ------------------- | ------------------------------------- |
| `DOMAIN`     | `localhost`         | Your domain (e.g., `example.com`)     |
| `ACME_EMAIL` | `admin@example.com` | Email for Let's Encrypt notifications |

### Database

| Variable        | Default     | Description   |
| --------------- | ----------- | ------------- |
| `POSTGRES_DB`   | `abe_stack` | Database name |
| `POSTGRES_USER` | `postgres`  | Database user |
| `POSTGRES_HOST` | `postgres`  | Database host |
| `POSTGRES_PORT` | `5432`      | Database port |

### Application

| Variable       | Default      | Description                             |
| -------------- | ------------ | --------------------------------------- |
| `NODE_ENV`     | `production` | Environment mode                        |
| `TRUST_PROXY`  | `true`       | Trust X-Forwarded-\* headers            |
| `VITE_API_URL` | (empty)      | API URL for frontend (empty = relative) |

### Optional Services

| Variable           | Default   | Description         |
| ------------------ | --------- | ------------------- |
| `STORAGE_PROVIDER` | `local`   | `local` or `s3`     |
| `EMAIL_PROVIDER`   | `console` | `console` or `smtp` |

See `.env.example` for the complete list.

---

## Health Endpoints

| Endpoint        | Service | Description                              |
| --------------- | ------- | ---------------------------------------- |
| `/health`       | api     | Basic health check (always 200 if alive) |
| `/health/ready` | api     | Readiness (DB connected)                 |
| `/health/live`  | api     | Liveness probe                           |
| `/health`       | web     | Nginx health check (200 OK)              |

---

## Caddy Configuration

The production compose includes Caddy as a reverse proxy with:

- **Automatic TLS** via Let's Encrypt (set `DOMAIN` and `ACME_EMAIL`)
- **HTTP/2 and HTTP/3** support
- **WebSocket** proxying with proper upgrade headers
- **Compression** (gzip, zstd)
- **Security headers** (HSTS, X-Frame-Options, X-Content-Type-Options)

### Configuration Files

| File                         | Purpose                  |
| ---------------------------- | ------------------------ |
| `config/caddy/Caddyfile`     | Production configuration |
| `config/caddy/Caddyfile.dev` | Development (HTTP only)  |

### Staging Certificates

For testing, uncomment the staging ACME server in Caddyfile to avoid rate limits:

```caddyfile
{
    acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
}
```

---

## Deployment Workflow

### Automated Deployment (Recommended)

Use the GitHub Actions deployment workflow for reliable, repeatable deployments:

1. **Configure Secrets**: Follow the [secrets checklist](./secrets-checklist.md)
2. **Run Release Checklist**: Complete all items in the [release checklist](./release-checklist.md)
3. **Trigger Deployment**: Go to GitHub Actions → "Deploy" workflow → "Run workflow"
4. **Monitor**: Watch the deployment logs in real-time
5. **Verify**: Test your application at `https://yourdomain.com`

### Manual Deployment (Alternative)

For custom deployment scenarios, use the traditional Docker Compose approach:

```bash
# 1. Configure environment
cp .env.example .config/env/.config/env/.env.production
# Edit .config/env/.config/env/.env.production with production values

# 2. Build and deploy
docker compose -f config/docker/docker-compose.prod.yml --env-file .config/env/.config/env/.env.production up -d --build

# 3. Run migrations (first deploy only)
docker compose -f config/docker/docker-compose.prod.yml exec api node -e "/* migration command */"
```

---

## Common Operations

### View Logs

```bash
# All services
docker compose -f config/docker/docker-compose.prod.yml logs -f

# Specific service
docker compose -f config/docker/docker-compose.prod.yml logs -f api
docker compose -f config/docker/docker-compose.prod.yml logs -f caddy
```

### Restart Services

```bash
# Restart all
docker compose -f config/docker/docker-compose.prod.yml restart

# Restart specific service
docker compose -f config/docker/docker-compose.prod.yml restart api
```

### Update Deployment

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose -f config/docker/docker-compose.prod.yml up -d --build

# Run migrations if needed
# (migration command here)
```

### Shell Access

```bash
# API container
docker compose -f config/docker/docker-compose.prod.yml exec api sh

# Database
docker compose -f config/docker/docker-compose.prod.yml exec postgres psql -U postgres -d abe_stack
```

---

## Troubleshooting

### API Won't Start

1. Check logs: `docker compose logs api`
2. Verify database is healthy: `docker compose ps`
3. Check environment variables are set
4. Ensure migrations have run

### Database Connection Failed

1. Verify postgres container is running: `docker compose ps postgres`
2. Check `POSTGRES_HOST=postgres` (use container name, not localhost)
3. Verify credentials match between services

### WebSocket Connection Failed

1. Check Caddy logs: `docker compose logs caddy`
2. Ensure `/ws` route is being proxied
3. Verify WebSocket upgrade headers are forwarded

### TLS Certificate Issues

1. Ensure DNS is pointing to server IP
2. Check ACME email is valid
3. Try staging CA first to avoid rate limits
4. Check Caddy logs for certificate errors

---

## File Reference

```
config/
├── docker/
│   ├── Dockerfile              # API server (multi-stage build)
│   ├── Dockerfile.web          # Web frontend (nginx serving static)
│   ├── Dockerfile.dockerignore # Build context exclusions
│   ├── nginx.conf              # Nginx config for web container
│   ├── docker-compose.yml      # Legacy (use dev/prod instead)
│   ├── docker-compose.dev.yml  # Development (database only)
│   └── docker-compose.prod.yml # Production (full stack + Caddy)
├── caddy/
│   ├── Caddyfile              # Production Caddy config (TLS)
│   └── Caddyfile.dev          # Development Caddy config (HTTP)
└── .env/
    ├── .env.example           # Environment variable template
    ├── .config/env/.config/env/.env.development       # Development settings
    └── .config/env/.config/env/.env.production        # Production settings (create this)
```

---

## Related Documentation

- [DigitalOcean Deployment](./digitalocean.md) - Step-by-step Droplet deployment
- [GCP Deployment](./gcp.md) - Compute Engine VM deployment
- [Reverse Proxy Configuration](./reverse-proxy.md) - Detailed Caddy setup, routing, WebSocket
- [Trusted Proxy Setup](./trusted-proxy-setup.md) - IP extraction, security configuration
