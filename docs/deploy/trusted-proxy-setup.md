# Trusted Proxy Configuration

Proper proxy trust configuration is critical for security when running behind reverse proxies, load balancers, or CDNs.

---

## Why Proxy Trust Matters

When your application runs behind a reverse proxy (Caddy, nginx, AWS ALB, Cloudflare), the direct connection comes from the proxy, not the client. To get the real client IP, your application reads headers like `X-Forwarded-For`.

**The security problem:** An attacker can send fake `X-Forwarded-For` headers directly to your server. Without proper configuration:

- Rate limiting bypassed (fake IPs)
- IP-based blocking ineffective
- Audit logs contain spoofed IPs
- Geo-restrictions circumvented

**The solution:** Only trust proxy headers from known, trusted proxy IPs.

---

## Configuration Options

### Environment Variables

| Variable          | Default                    | Description                               |
| ----------------- | -------------------------- | ----------------------------------------- |
| `TRUST_PROXY`     | `false`                    | Enable proxy header trust                 |
| `TRUSTED_PROXIES` | `172.16.0.0/12,10.0.0.0/8` | Comma-separated list of trusted IPs/CIDRs |
| `MAX_PROXY_DEPTH` | `1`                        | Max hops in X-Forwarded-For chain         |

### TRUST_PROXY

Controls whether to trust `X-Forwarded-*` headers at all.

```bash
# Development (no proxy)
TRUST_PROXY=false

# Production (behind reverse proxy)
TRUST_PROXY=true
```

### TRUSTED_PROXIES

A comma-separated list of IP addresses or CIDR ranges that are allowed to set trusted headers.

```bash
# Docker default networks
TRUSTED_PROXIES=172.16.0.0/12,10.0.0.0/8

# Single proxy
TRUSTED_PROXIES=192.168.1.100

# Multiple specific IPs
TRUSTED_PROXIES=10.0.0.5,10.0.0.6,10.0.0.7

# Mixed formats
TRUSTED_PROXIES=10.0.0.0/8,192.168.1.100,2001:db8::/32
```

### MAX_PROXY_DEPTH

Limits how many proxy hops are trusted in the `X-Forwarded-For` chain.

```
X-Forwarded-For: client, proxy1, proxy2

MAX_PROXY_DEPTH=1  # Trust only last proxy (proxy2 reports proxy1's IP)
MAX_PROXY_DEPTH=2  # Trust last 2 proxies (gets client IP)
```

Use the minimum value that works for your setup. Higher values increase attack surface.

---

## Common Configurations

### Docker Compose (Default)

The default configuration trusts Docker's default network ranges:

```bash
TRUST_PROXY=true
TRUSTED_PROXIES=172.16.0.0/12,10.0.0.0/8
MAX_PROXY_DEPTH=1
```

This covers:

- `172.16.0.0/12` - Docker bridge networks
- `10.0.0.0/8` - Custom Docker networks

### Single Server with Caddy

If Caddy runs on the same server (common setup):

```bash
TRUST_PROXY=true
TRUSTED_PROXIES=127.0.0.1,::1
MAX_PROXY_DEPTH=1
```

### AWS Application Load Balancer (ALB)

ALB adds its own IP to `X-Forwarded-For`. Trust the VPC CIDR:

```bash
TRUST_PROXY=true
TRUSTED_PROXIES=10.0.0.0/8  # Adjust to your VPC CIDR
MAX_PROXY_DEPTH=1
```

For ALB + internal proxy:

```bash
MAX_PROXY_DEPTH=2
```

### AWS CloudFront

CloudFront publishes its IP ranges. Download and configure:

```bash
# CloudFront IP ranges (updated periodically)
# https://ip-ranges.amazonaws.com/ip-ranges.json (filter for CLOUDFRONT)
TRUSTED_PROXIES=13.32.0.0/15,13.35.0.0/16,...
MAX_PROXY_DEPTH=2  # CloudFront + origin
```

### Cloudflare

Cloudflare publishes IP ranges at https://www.cloudflare.com/ips/

```bash
# IPv4 ranges (as of 2024)
TRUSTED_PROXIES=173.245.48.0/20,103.21.244.0/22,103.22.200.0/22,103.31.4.0/22,141.101.64.0/18,108.162.192.0/18,190.93.240.0/20,188.114.96.0/20,197.234.240.0/22,198.41.128.0/17,162.158.0.0/15,104.16.0.0/13,104.24.0.0/14,172.64.0.0/13,131.0.72.0/22

MAX_PROXY_DEPTH=1
```

**Recommended:** Use Cloudflare's `CF-Connecting-IP` header instead of parsing `X-Forwarded-For`:

```bash
# In your application config
REAL_IP_HEADER=CF-Connecting-IP
```

### Google Cloud Load Balancer

Trust Google's load balancer ranges:

```bash
TRUST_PROXY=true
TRUSTED_PROXIES=35.191.0.0/16,130.211.0.0/22
MAX_PROXY_DEPTH=1
```

### DigitalOcean Load Balancer

DigitalOcean load balancers use internal IPs:

```bash
TRUST_PROXY=true
TRUSTED_PROXIES=10.132.0.0/16  # DO internal network
MAX_PROXY_DEPTH=1
```

---

## Verification

### Check Current IP Detection

```bash
# Make request and check logged IP
curl https://your-domain.com/api/auth/me -v

# Check server logs for the IP
docker compose -f config/docker/docker-compose.prod.yml logs api | grep "ip"
```

### Test with Fake Headers

This should NOT work (IP should be the proxy's IP, not the fake one):

```bash
curl -H "X-Forwarded-For: 1.2.3.4" https://your-domain.com/api/auth/me
```

Check logs - the IP should be your actual proxy IP, not `1.2.3.4`.

### Debug Mode

Enable debug logging to see IP resolution:

```bash
DEBUG=true
```

Logs will show:

- Raw `X-Forwarded-For` header
- Trusted proxy check result
- Final resolved client IP

---

## Security Checklist

Before deploying to production:

- [ ] `TRUST_PROXY=true` only if behind a proxy
- [ ] `TRUSTED_PROXIES` contains only your actual proxy IPs/ranges
- [ ] `MAX_PROXY_DEPTH` is set to the minimum required value
- [ ] Tested that fake `X-Forwarded-For` headers are ignored
- [ ] Verified logs show correct client IPs
- [ ] Rate limiting tested from various IPs

---

## Common Mistakes

### Trusting All IPs

```bash
# NEVER DO THIS
TRUSTED_PROXIES=0.0.0.0/0
```

This trusts everyone, defeating the purpose entirely.

### Forgetting IPv6

If your proxy uses IPv6:

```bash
TRUSTED_PROXIES=172.16.0.0/12,10.0.0.0/8,::1,2001:db8::/32
```

### Wrong MAX_PROXY_DEPTH

If you have:

```
Client -> CDN -> Load Balancer -> App
```

You need `MAX_PROXY_DEPTH=2` (CDN + LB).

### Not Updating Cloudflare/CDN IPs

CDN IP ranges change. Automate updates:

```bash
# Example: Fetch Cloudflare IPs periodically
curl https://www.cloudflare.com/ips-v4 > /tmp/cf-ips.txt
```

---

## Advanced: Custom Header Names

Some proxies use non-standard headers:

| Proxy      | Header             |
| ---------- | ------------------ |
| Cloudflare | `CF-Connecting-IP` |
| Fastly     | `Fastly-Client-IP` |
| Akamai     | `True-Client-IP`   |

Configure in your application if needed:

```bash
# Example environment variable (if supported)
REAL_IP_HEADER=CF-Connecting-IP
```

---

## Related Documentation

- [Reverse Proxy Configuration](./reverse-proxy.md) - Caddy setup
- [Deployment README](./README.md) - General deployment guide
