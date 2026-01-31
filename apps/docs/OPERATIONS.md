# Operations Manual

Day-to-day operations for running ABE Stack in production. Covers migrations, backups, restore drills, and incident response.

**Shorthand used throughout:**

```bash
COMPOSE="docker compose -f infra/docker/production/docker-compose.prod.yml"
```

Replace with the actual path when running commands. All commands assume you are in the project root.

---

## Table of Contents

1. [Database Migrations](#1-database-migrations)
2. [Backups](#2-backups)
3. [Restore Procedures](#3-restore-procedures)
4. [Restore Drills](#4-restore-drills)
5. [Incident Response](#5-incident-response)
6. [Troubleshooting Playbooks](#6-troubleshooting-playbooks)
7. [Routine Maintenance](#7-routine-maintenance)

---

## 1. Database Migrations

Full reference: [`apps/docs/deploy/migrations.md`](./deploy/migrations.md)

### Development

Use `db:push` for fast iteration (no migration files):

```bash
pnpm db:push
```

### Production

Generate, review, then apply:

```bash
# 1. Generate migration from schema diff
pnpm db:generate

# 2. Review the generated SQL — look for DROP statements, large-table ALTERs
cat apps/server/drizzle/XXXX_*.sql

# 3. Take a backup before applying (see Section 2)

# 4. Apply pending migrations
$COMPOSE exec api pnpm db:migrate
```

### First Deploy

```bash
# Run migrations against empty database
$COMPOSE exec api pnpm db:migrate

# Bootstrap admin user (outputs credentials ONCE — save them)
$COMPOSE exec api pnpm db:bootstrap:admin
```

### Zero-Downtime Strategy

For schema changes that could break running code:

| Deploy | Action                                          |
| ------ | ----------------------------------------------- |
| 1      | Add new column (nullable) or new table          |
| 2      | Deploy code that uses new column, backfill data |
| 3      | Add NOT NULL constraint, drop old column        |

### Pre-Migration Checklist

- [ ] Reviewed generated SQL — no unexpected DROP statements
- [ ] Database backup taken (see [Manual Backup](#manual-backup))
- [ ] Rollback plan documented (reverse SQL or backup restore)
- [ ] Large tables accounted for (batch strategy, off-peak window)

### Rollback

**Additive-only migration (added columns/tables):**

```sql
-- Reverse manually via psql
DROP TABLE IF EXISTS new_table;
ALTER TABLE users DROP COLUMN IF EXISTS new_column;
```

**Data loss or complex migration:** Restore from backup (see [Section 3](#3-restore-procedures)).

---

## 2. Backups

### What to Back Up

| Data                | Method                          | Location                     |
| ------------------- | ------------------------------- | ---------------------------- |
| PostgreSQL database | `pg_dump` (gzipped)             | `/home/deploy/backups/`      |
| File uploads        | Volume backup or S3 (if remote) | `abe-stack-uploads-data` vol |
| TLS certificates    | Caddy auto-renews; volume data  | `abe-stack-caddy-data` vol   |
| Environment secrets | Stored in CI secrets + server   | `~/.config/env/`             |

### Automated Daily Backup

Create `/home/deploy/backup-db.sh`:

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/home/deploy/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/abe_stack_$TIMESTAMP.sql.gz"

mkdir -p "$BACKUP_DIR"

# Dump and compress
docker compose -f /home/deploy/abe-stack/infra/docker/production/docker-compose.prod.yml \
  exec -T postgres pg_dump -U postgres abe_stack | gzip > "$BACKUP_FILE"

# Verify backup is non-empty
if [ ! -s "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file is empty — $(date)" >&2
  exit 1
fi

# Retain last 7 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete

echo "OK: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1)) — $(date)"
```

```bash
chmod +x /home/deploy/backup-db.sh
```

Schedule via crontab (`crontab -e`):

```cron
# Daily database backup at 3:00 AM server time
0 3 * * * /home/deploy/backup-db.sh >> /home/deploy/backups/backup.log 2>&1
```

### Manual Backup

Before migrations, major deploys, or ad-hoc:

```bash
# Quick backup (uncompressed)
$COMPOSE exec -T postgres pg_dump -U postgres abe_stack > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
$COMPOSE exec -T postgres pg_dump -U postgres abe_stack | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Volume Backup (Uploads)

```bash
# Back up the Docker named volume for file uploads
docker run --rm \
  -v abe-stack-uploads-data:/data:ro \
  -v /home/deploy/backups:/backup \
  alpine tar czf /backup/uploads_$(date +%Y%m%d).tar.gz -C /data .
```

### Offsite Backup (Recommended)

Copy daily backups to a remote location. Example with `rsync` or `scp`:

```bash
# rsync to a second server
rsync -az /home/deploy/backups/ offsite-user@offsite-host:/backups/abe-stack/

# Or upload to S3-compatible storage
aws s3 sync /home/deploy/backups/ s3://your-bucket/abe-stack-backups/ --delete
```

Add this to crontab after the backup job (e.g., 3:30 AM).

### Backup Verification

Check that daily backups are running and non-empty:

```bash
# List recent backups with sizes
ls -lhS /home/deploy/backups/*.sql.gz | head -5

# Verify latest backup can be read
gunzip -t /home/deploy/backups/$(ls -t /home/deploy/backups/*.sql.gz | head -1)

# Check cron log for errors
tail -20 /home/deploy/backups/backup.log
```

---

## 3. Restore Procedures

### Full Database Restore

**When:** Data loss, corruption, or failed migration rollback.

```bash
# 1. Stop API to prevent writes during restore
$COMPOSE stop api

# 2. Drop and recreate the database (DESTRUCTIVE — only if restoring fully)
$COMPOSE exec -T postgres psql -U postgres -c "DROP DATABASE IF EXISTS abe_stack;"
$COMPOSE exec -T postgres psql -U postgres -c "CREATE DATABASE abe_stack OWNER postgres;"

# 3. Restore from backup
gunzip -c /home/deploy/backups/abe_stack_YYYYMMDD_HHMMSS.sql.gz | \
  $COMPOSE exec -T postgres psql -U postgres -d abe_stack

# 4. Verify restore
$COMPOSE exec -T postgres psql -U postgres -d abe_stack -c "\dt"
$COMPOSE exec -T postgres psql -U postgres -d abe_stack -c "SELECT COUNT(*) FROM users;"

# 5. Restart API
$COMPOSE start api

# 6. Verify health
curl -s http://localhost:8080/health/ready | jq .
```

### Partial Restore (Single Table)

```bash
# Dump a single table from backup to inspect
gunzip -c backup.sql.gz | grep -A 1000 "^COPY public.users" | head -1000 > users_data.sql

# Or restore specific table from a full dump
pg_restore -d abe_stack -t users backup.dump
```

### Volume Restore (Uploads)

```bash
# 1. Stop API
$COMPOSE stop api

# 2. Restore uploads volume
docker run --rm \
  -v abe-stack-uploads-data:/data \
  -v /home/deploy/backups:/backup:ro \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/uploads_YYYYMMDD.tar.gz -C /data"

# 3. Restart API
$COMPOSE start api
```

---

## 4. Restore Drills

Run quarterly to validate that backups are usable and the team knows the restore procedure.

### Quarterly Drill Protocol

**Frequency:** Once per quarter (schedule on team calendar).

**Scope:** Full database restore to a throwaway environment.

#### Steps

1. **Prepare a test environment** — spin up a fresh Postgres container (not production):

   ```bash
   docker run -d --name restore-test \
     -e POSTGRES_PASSWORD=test \
     -e POSTGRES_DB=abe_stack_restore \
     -p 5433:5432 \
     postgres:16-alpine
   ```

2. **Pick the latest backup:**

   ```bash
   LATEST=$(ls -t /home/deploy/backups/*.sql.gz | head -1)
   echo "Restoring: $LATEST"
   ```

3. **Restore into the test container:**

   ```bash
   gunzip -c "$LATEST" | docker exec -i restore-test psql -U postgres -d abe_stack_restore
   ```

4. **Validate data integrity:**

   ```bash
   # Table count
   docker exec restore-test psql -U postgres -d abe_stack_restore \
     -c "SELECT schemaname, COUNT(*) FROM pg_tables WHERE schemaname = 'public' GROUP BY schemaname;"

   # Row counts for critical tables
   docker exec restore-test psql -U postgres -d abe_stack_restore \
     -c "SELECT 'users' AS tbl, COUNT(*) FROM users
         UNION ALL SELECT 'refresh_tokens', COUNT(*) FROM refresh_tokens
         UNION ALL SELECT 'security_events', COUNT(*) FROM security_events;"

   # Spot check a recent record
   docker exec restore-test psql -U postgres -d abe_stack_restore \
     -c "SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT 3;"
   ```

5. **Record results** in the drill log (see template below).

6. **Clean up:**

   ```bash
   docker stop restore-test && docker rm restore-test
   ```

### Drill Log Template

Record in `apps/docs/log/` or your team wiki:

```markdown
## Restore Drill — YYYY-MM-DD

- **Backup used:** abe_stack_20260131_030000.sql.gz (245 MB)
- **Restore target:** Throwaway Postgres 16 container
- **Restore duration:** ~2 min
- **Tables restored:** 11/11
- **Row counts match production:** Yes / No (detail)
- **Issues found:** None / [describe]
- **Corrective actions:** None / [describe]
- **Performed by:** [name]
```

### Drill Failure Actions

| Issue                     | Action                                                         |
| ------------------------- | -------------------------------------------------------------- |
| Backup file corrupt       | Check disk health, re-run backup, verify gzip integrity        |
| Backup is empty (0 bytes) | Check cron job logs, verify Postgres is running at backup time |
| Missing tables            | Schema changed after backup — verify `db:push`/`db:migrate`    |
| Row counts off            | Check if backup runs during high-write period; adjust timing   |

---

## 5. Incident Response

### Severity Levels

| Level | Name     | Definition                                       | Response Time     | Examples                             |
| ----- | -------- | ------------------------------------------------ | ----------------- | ------------------------------------ |
| S1    | Critical | Service fully down, data loss risk               | Immediate         | Database crash, API unresponsive     |
| S2    | Major    | Core feature broken, significant user impact     | < 1 hour          | Auth broken, WebSocket down          |
| S3    | Minor    | Non-critical feature degraded, workaround exists | < 4 hours         | Email delivery delayed, slow queries |
| S4    | Low      | Cosmetic or minor inconvenience                  | Next business day | UI glitch, log noise                 |

### Incident Response Steps

#### 1. Detect

- Health endpoint returns non-200: `curl -s https://yourdomain.com/health`
- Docker health checks fail: `$COMPOSE ps` shows `unhealthy`
- User reports or monitoring alerts

#### 2. Assess

```bash
# Check service status
$COMPOSE ps

# Check health detail
curl -s http://localhost:8080/api/system/status | jq .

# Check recent logs (last 200 lines)
$COMPOSE logs --tail=200 api
$COMPOSE logs --tail=200 postgres
$COMPOSE logs --tail=200 caddy
```

#### 3. Mitigate

| Situation                | Action                                                   |
| ------------------------ | -------------------------------------------------------- |
| API crash-looping        | `$COMPOSE restart api`                                   |
| Database connection lost | `$COMPOSE restart postgres`, then `$COMPOSE restart api` |
| Bad deploy               | Rollback (see below)                                     |
| Disk full                | `docker system prune -a --volumes` (careful!)            |
| Memory exhaustion        | `$COMPOSE restart` — investigate resource limits         |

#### 4. Rollback a Bad Deploy

**Via GitHub Actions (preferred):**

Go to Actions > "Rollback Deployment" > Run workflow. Specify the environment and optionally the tag to roll back to.

**Manual rollback:**

```bash
# 1. Identify the previous good image tag
docker images | grep abe-stack

# 2. Stop current services
$COMPOSE down --timeout 30

# 3. Check out the previous good commit
git checkout <previous-good-tag>

# 4. Rebuild and restart
$COMPOSE --env-file .config/env/.env.production up -d --build

# 5. Verify health
curl -s http://localhost:8080/health/ready
```

#### 5. Resolve and Document

After service is restored:

1. Identify root cause from logs
2. Write a brief incident summary (see template below)
3. Create follow-up tasks to prevent recurrence

### Incident Summary Template

```markdown
## Incident — YYYY-MM-DD HH:MM

- **Severity:** S1 / S2 / S3 / S4
- **Duration:** [start] to [resolved] (X minutes)
- **Impact:** [what users experienced]
- **Root cause:** [what failed and why]
- **Resolution:** [what fixed it]
- **Follow-up actions:**
  - [ ] [preventive measure 1]
  - [ ] [preventive measure 2]
```

---

## 6. Troubleshooting Playbooks

### API Won't Start

```bash
# 1. Check container status and exit codes
$COMPOSE ps api

# 2. Read logs
$COMPOSE logs --tail=100 api

# 3. Common causes:
#    - Missing environment variables → check .config/env/.env.production
#    - Database not ready → $COMPOSE ps postgres (should be "healthy")
#    - Migration not run → $COMPOSE exec api pnpm db:migrate
#    - Port conflict → lsof -i :8080
```

### Database Connection Refused

```bash
# 1. Is Postgres running and healthy?
$COMPOSE ps postgres

# 2. Test connection from API container
$COMPOSE exec api node -e "
  const { Client } = require('pg');
  const c = new Client({ host: 'postgres', user: 'postgres', password: process.env.POSTGRES_PASSWORD, database: 'abe_stack' });
  c.connect().then(() => { console.log('OK'); c.end(); }).catch(e => console.error(e.message));
"

# 3. Check Postgres logs
$COMPOSE logs --tail=50 postgres

# 4. Verify POSTGRES_HOST=postgres (container name, not localhost)
```

### WebSocket Not Connecting

```bash
# 1. Check Caddy logs for upgrade errors
$COMPOSE logs --tail=50 caddy

# 2. Verify /ws route is proxied (check Caddyfile)
# 3. Test WebSocket from server itself
$COMPOSE exec api node -e "
  const ws = new (require('ws'))('ws://localhost:8080/ws');
  ws.on('open', () => { console.log('OK'); ws.close(); });
  ws.on('error', e => console.error(e.message));
"
```

### TLS Certificate Issues

```bash
# 1. Check Caddy logs for ACME errors
$COMPOSE logs --tail=50 caddy | grep -i "acme\|tls\|cert"

# 2. Verify DNS resolves to this server
dig +short yourdomain.com

# 3. Switch to staging CA to avoid rate limits (edit Caddyfile):
#    acme_ca https://acme-staging-v02.api.letsencrypt.org/directory

# 4. Force certificate renewal
$COMPOSE restart caddy
```

### High Memory / CPU

```bash
# Container resource usage
docker stats --no-stream

# System-wide
free -h
df -h

# Clean up Docker artifacts
docker system prune -f          # Remove stopped containers, dangling images
docker volume prune -f          # Remove unused volumes (CAREFUL — not named volumes)
```

### Disk Space Running Low

```bash
# Check disk usage
df -h /

# Docker-specific usage
docker system df

# Clean up (safe — only removes unused/dangling resources)
docker system prune -f
docker image prune -a -f --filter "until=168h"   # Remove images older than 7 days

# Check backup directory size
du -sh /home/deploy/backups/
```

---

## 7. Routine Maintenance

### Weekly

- [ ] Check backup log for errors: `tail -20 /home/deploy/backups/backup.log`
- [ ] Verify latest backup exists and is non-empty: `ls -lh /home/deploy/backups/*.sql.gz | tail -1`
- [ ] Review Docker resource usage: `docker stats --no-stream`
- [ ] Check disk space: `df -h /`

### Monthly

- [ ] Review container logs for recurring warnings: `$COMPOSE logs --since 720h api | grep -i warn`
- [ ] Update base Docker images: `docker pull postgres:16-alpine && docker pull caddy:2-alpine`
- [ ] Verify health endpoints: `curl -s https://yourdomain.com/health/ready`
- [ ] Review and rotate old backups if offsite copy is confirmed

### Quarterly

- [ ] Run restore drill (see [Section 4](#4-restore-drills))
- [ ] Rotate secrets (`JWT_SECRET`, `SESSION_SECRET`) — deploy new values, invalidate old sessions
- [ ] Review resource limits in `docker-compose.prod.yml` against actual usage
- [ ] Update server OS packages: `apt update && apt upgrade`
- [ ] Review security events: `$COMPOSE exec -T postgres psql -U postgres -d abe_stack -c "SELECT event_type, COUNT(*) FROM security_events WHERE created_at > NOW() - INTERVAL '90 days' GROUP BY event_type ORDER BY count DESC;"`

---

## Health Endpoints Reference

| Endpoint             | Purpose                                   | Expected Response            |
| -------------------- | ----------------------------------------- | ---------------------------- |
| `/health`            | Basic check — DB reachable                | `200` or `503`               |
| `/health/live`       | Liveness — process alive                  | `200` with uptime            |
| `/health/ready`      | Readiness — DB connected and schema valid | `200` or `503`               |
| `/api/system/status` | Detailed — all services with latency      | JSON with per-service status |

**Service statuses:** `up`, `down`, `degraded`
**Overall statuses:** `healthy`, `degraded`, `down`

**Services checked:** database, schema, email, storage, pubsub, websocket, rate limiting.

---

## Related Documentation

- [Deployment Overview](./deploy/README.md) — Architecture, ports, environment variables
- [Database Migrations (Detailed)](./deploy/migrations.md) — Schema changes, Drizzle workflow
- [Secrets Checklist](./deploy/secrets-checklist.md) — Required secrets and security setup
- [Release Checklist](./deploy/release-checklist.md) — Pre-deployment verification
- [DigitalOcean Guide](./deploy/digitalocean.md) — Server provisioning and setup
- [GCP Guide](./deploy/gcp.md) — Compute Engine deployment
- [Reverse Proxy](./deploy/reverse-proxy.md) — Caddy routing and TLS configuration
