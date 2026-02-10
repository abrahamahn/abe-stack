# Reverse Proxy Configuration

Caddy-based reverse proxy for TLS termination and request routing in ABE Stack.

---

## Architecture

```
                        Internet
                           |
                           v
            +-----------------------------+
            |          Caddy              |
            |    (TLS Termination)        |
            |     Ports: 80, 443          |
            +-----------------------------+
                           |
        +------------------+------------------+
        |                  |                  |
        v                  v                  v
   /health*             /ws              /api/*            /*
        |                  |                  |             |
        v                  v                  v             v
   +---------+        +---------+        +---------+   +---------+
   |   API   |        |   API   |        |   API   |   |   Web   |
   |  :8080  |        |  :8080  |        |  :8080  |   |   :80   |
   | (health)|        |(websocket)|      |(routes) |   | (nginx) |
   +---------+        +---------+        +---------+   +---------+
        |
        v
   +---------+
   |Postgres |
   |  :5432  |
   +---------+
```

All services (postgres, api, web) are on an internal Docker network. Only Caddy is exposed to the internet.

---

## Quick Start

### 1. Set Environment Variables

```bash
# Create production environment file
cp config/env/.env.production.example config/env/.env.production

# Edit with your values
nano config/env/.env.production
```

Required variables for TLS:

```bash
# Your domain (Caddy will auto-provision Let's Encrypt certificate)
DOMAIN=example.com

# Email for Let's Encrypt notifications
ACME_EMAIL=admin@example.com

# Required secrets
POSTGRES_PASSWORD=your_strong_password
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
```

### 2. Start the Stack

```bash
docker compose -f infra/docker/production/docker-compose.prod.yml \
  --env-file config/env/.env.production up -d
```

### 3. Verify Deployment

```bash
# Check all services are running
docker compose -f infra/docker/production/docker-compose.prod.yml ps

# Check Caddy logs for certificate acquisition
docker compose -f infra/docker/production/docker-compose.prod.yml logs caddy

# Test HTTPS
curl https://your-domain.com/health
```

---

## Port Reference

| Port | Protocol | Service  | Purpose                       |
| ---- | -------- | -------- | ----------------------------- |
| 80   | TCP      | Caddy    | HTTP (redirects to HTTPS)     |
| 443  | TCP      | Caddy    | HTTPS                         |
| 443  | UDP      | Caddy    | HTTP/3 (QUIC)                 |
| 8080 | Internal | API      | Backend API server            |
| 80   | Internal | Web      | Frontend (nginx static files) |
| 5432 | Internal | Postgres | Database                      |

**Production security:** Only ports 80, 443, and 443/udp are exposed to the internet.

---

## Route Configuration

| Path         | Destination | Description                            |
| ------------ | ----------- | -------------------------------------- |
| `/health*`   | api:8080    | Health check endpoints                 |
| `/ws`        | api:8080    | WebSocket connections (with upgrade)   |
| `/api/*`     | api:8080    | All API routes                         |
| `/uploads/*` | api:8080    | Static file uploads (if local storage) |
| `/*`         | web:80      | Frontend static files                  |

---

## WebSocket Configuration

WebSocket connections at `/ws` are automatically handled with proper upgrade headers:

```caddyfile
@websocket {
    path /ws
    header Connection *Upgrade*
    header Upgrade websocket
}
handle @websocket {
    reverse_proxy api:8080 {
        header_up Connection {http.request.header.Connection}
        header_up Upgrade {http.request.header.Upgrade}
        header_up Sec-WebSocket-Key {http.request.header.Sec-WebSocket-Key}
        header_up Sec-WebSocket-Version {http.request.header.Sec-WebSocket-Version}
        header_up Sec-WebSocket-Extensions {http.request.header.Sec-WebSocket-Extensions}
        header_up Sec-WebSocket-Protocol {http.request.header.Sec-WebSocket-Protocol}

        transport http {
            read_timeout 0
            write_timeout 0
        }
    }
}
```

The `read_timeout 0` and `write_timeout 0` settings allow WebSocket connections to remain open indefinitely.

### Testing WebSocket

```bash
# Install wscat if needed
npm install -g wscat

# Test WebSocket connection
wscat -c wss://your-domain.com/ws
```

---

## Health Check Endpoints

| Endpoint        | Response | Description                                 |
| --------------- | -------- | ------------------------------------------- |
| `/health`       | 200 OK   | Basic health (service is alive)             |
| `/health/ready` | 200 OK   | Readiness (DB connected, ready for traffic) |
| `/health/live`  | 200 OK   | Liveness probe                              |

Example health check:

```bash
curl https://your-domain.com/health
# {"status":"ok"}

curl https://your-domain.com/health/ready
# {"status":"ok","checks":{"database":"ok"}}
```

---

## Security Headers

Caddy automatically adds these security headers:

| Header                    | Value                                        |
| ------------------------- | -------------------------------------------- |
| Strict-Transport-Security | max-age=31536000; includeSubDomains; preload |
| X-Frame-Options           | SAMEORIGIN                                   |
| X-Content-Type-Options    | nosniff                                      |
| X-XSS-Protection          | 1; mode=block                                |
| Referrer-Policy           | strict-origin-when-cross-origin              |

Verify headers:

```bash
curl -I https://your-domain.com
```

---

## Compression

Caddy enables gzip and zstd compression automatically for compatible content types.

Test compression:

```bash
# Request with gzip
curl -H "Accept-Encoding: gzip" https://your-domain.com -o /dev/null -w '%{size_download}\n'

# Request without compression
curl https://your-domain.com -o /dev/null -w '%{size_download}\n'
```

---

## TLS Certificate Management

Caddy handles TLS certificates automatically via Let's Encrypt:

1. **Automatic provisioning:** Certificates are obtained when Caddy starts
2. **Automatic renewal:** Certificates are renewed before expiration
3. **No manual configuration:** Just set `DOMAIN` and `ACME_EMAIL`

### Certificate Storage

Certificates are stored in the `caddy_data` volume:

```bash
# View certificate info
docker compose -f infra/docker/production/docker-compose.prod.yml exec caddy \
  caddy list-modules --packages
```

### Staging Mode (Testing)

To avoid Let's Encrypt rate limits during testing, uncomment the staging ACME CA in `infra/runtime/caddy/Caddyfile`:

```caddyfile
{
    # Use staging for testing
    acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
}
```

---

## CDN Integration

When using a CDN (Cloudflare, AWS CloudFront, etc.):

### Cloudflare

1. Set SSL mode to "Full (strict)" in Cloudflare dashboard
2. Configure trusted proxies (see `apps/docs/deploy/trusted-proxy-setup.md`):

```bash
# Add Cloudflare IP ranges to trusted proxies
TRUSTED_PROXIES=173.245.48.0/20,103.21.244.0/22,103.22.200.0/22,...
```

3. Restore original visitor IP via `CF-Connecting-IP` header

### AWS CloudFront

1. Configure origin to use HTTPS
2. Set origin protocol policy to "HTTPS Only"
3. Add CloudFront IP ranges to trusted proxies

---

## Development Mode

For local testing without TLS:

```bash
# Use the development Caddyfile
docker run -p 80:80 \
  -v $(pwd)/infra/runtime/caddy/Caddyfile.dev:/etc/caddy/Caddyfile \
  --network host \
  caddy:2-alpine
```

Or run Caddy directly:

```bash
caddy run --config infra/runtime/caddy/Caddyfile.dev
```

---

## Troubleshooting

### Certificate Not Obtained

1. Ensure DNS points to your server
2. Check ports 80 and 443 are open in firewall
3. Check Caddy logs:

```bash
docker compose -f infra/docker/production/docker-compose.prod.yml logs caddy
```

### WebSocket Connection Failed

1. Verify `/ws` route is configured correctly
2. Check upgrade headers are preserved:

```bash
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Sec-WebSocket-Version: 13" \
  https://your-domain.com/ws
```

### API Returns Wrong Client IP

See `apps/docs/deploy/trusted-proxy-setup.md` for proxy trust configuration.

### 502 Bad Gateway

1. Check if backend service is healthy:

```bash
docker compose -f infra/docker/production/docker-compose.prod.yml ps
docker compose -f infra/docker/production/docker-compose.prod.yml logs api
```

2. Verify network connectivity:

```bash
docker compose -f infra/docker/production/docker-compose.prod.yml exec caddy \
  wget -qO- http://api:8080/health
```

---

## File Reference

```
infra/
├── runtime/
│   └── caddy/
│       ├── Caddyfile       # Production configuration (automatic TLS)
│       └── Caddyfile.dev   # Development configuration (HTTP only)
└── docker/
    └── production/
        └── docker-compose.prod.yml  # Production compose with Caddy
```

---

## Related Documentation

- [Trusted Proxy Setup](./trusted-proxy-setup.md) - IP extraction behind proxies
- [Deployment README](./README.md) - General deployment guide
