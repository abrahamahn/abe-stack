# Production PostgreSQL Configuration

Settings and recommendations for running PostgreSQL in production with BSLT.

---

## Connection Settings

### Environment Variables

```bash
# Connection (pick one method)
DATABASE_URL=postgresql://user:password@host:5432/abe_stack?sslmode=require
# OR individual fields:
POSTGRES_HOST=db.example.com
POSTGRES_PORT=5432
POSTGRES_DB=abe_stack
POSTGRES_USER=abe_app
POSTGRES_PASSWORD=<generated-secret>

# Connection pool
DB_MAX_CONNECTIONS=20

# SSL (required in production — config validation enforces this)
DB_SSL=true
```

### Connection Pooling

BSLT uses Drizzle with `node-postgres` (`pg`), which maintains a client-side connection pool.

| Setting              | Dev Default | Production Recommendation | Notes                                                                        |
| -------------------- | ----------- | ------------------------- | ---------------------------------------------------------------------------- |
| `DB_MAX_CONNECTIONS` | 10          | 20–50                     | Match to your Postgres `max_connections` minus headroom for admin/monitoring |
| Idle timeout         | 10s         | 30s (pg default)          | Configured in `pg` pool options                                              |

**Sizing guideline:** For a single API server instance, start with `DB_MAX_CONNECTIONS=20`. If running multiple replicas behind a load balancer, divide the total Postgres `max_connections` across instances — e.g., 100 max connections with 4 replicas = 25 per instance.

**External pooler (PgBouncer):** If you need >100 concurrent connections or are on a managed database with connection limits (e.g., Supabase, Neon, RDS), place PgBouncer in front of Postgres:

```bash
# Point BSLT at PgBouncer instead of Postgres directly
DATABASE_URL=postgresql://user:password@pgbouncer-host:6432/abe_stack?sslmode=require

# PgBouncer settings (pgbouncer.ini)
# pool_mode = transaction    (required for Drizzle — session mode breaks prepared statements)
# max_client_conn = 200
# default_pool_size = 20
# reserve_pool_size = 5
```

### SSL Configuration

Production deployments **must** enable SSL. The config factory rejects `DB_SSL=false` when `NODE_ENV=production`.

```bash
DB_SSL=true
```

For self-signed certificates (e.g., internal infrastructure):

```bash
# Set in DATABASE_URL
DATABASE_URL=postgresql://user:password@host:5432/abe_stack?sslmode=require&sslrootcert=/path/to/ca.crt
```

For managed databases (RDS, Cloud SQL, Supabase), SSL is typically pre-configured — just ensure `DB_SSL=true`.

---

## PostgreSQL Server Tuning

These settings go in `postgresql.conf` or are set via your managed database provider's dashboard.

### Memory

| Setting                | Default | Recommendation (4GB RAM server) | Notes                                                                 |
| ---------------------- | ------- | ------------------------------- | --------------------------------------------------------------------- |
| `shared_buffers`       | 128MB   | 1GB (25% of RAM)                | Main cache for hot data                                               |
| `effective_cache_size` | 4GB     | 3GB (75% of RAM)                | Query planner hint — not an allocation                                |
| `work_mem`             | 4MB     | 16–32MB                         | Per-sort/hash operation. Multiply by `max_connections` for worst case |
| `maintenance_work_mem` | 64MB    | 256MB                           | For VACUUM, CREATE INDEX, etc.                                        |

### Write Performance

| Setting                        | Default | Recommendation | Notes                                         |
| ------------------------------ | ------- | -------------- | --------------------------------------------- |
| `wal_buffers`                  | -1      | 16MB           | Auto-tuned from `shared_buffers` in modern PG |
| `checkpoint_completion_target` | 0.9     | 0.9            | Spread checkpoint writes                      |
| `max_wal_size`                 | 1GB     | 2GB            | Increase if frequent checkpoints in logs      |

### Connections

| Setting                               | Default | Recommendation | Notes                                               |
| ------------------------------------- | ------- | -------------- | --------------------------------------------------- |
| `max_connections`                     | 100     | 100–200        | With PgBouncer, can stay at 100 and pool externally |
| `idle_in_transaction_session_timeout` | 0       | 30s            | Kill idle-in-transaction sessions                   |
| `statement_timeout`                   | 0       | 30s            | Prevent runaway queries                             |

### Logging (for debugging)

```ini
# Log slow queries (enable temporarily for performance investigation)
log_min_duration_statement = 500   # Log queries taking >500ms
log_statement = 'none'              # Don't log all queries in production
log_connections = off
log_disconnections = off
```

---

## Managed Database Services

### AWS RDS

```bash
DATABASE_URL=postgresql://user:password@your-instance.region.rds.amazonaws.com:5432/abe_stack?sslmode=require
DB_SSL=true
DB_MAX_CONNECTIONS=20   # RDS micro: max 66 connections, small: 171
```

RDS handles backups, patching, and failover. Use Multi-AZ for production availability.

### Google Cloud SQL

```bash
DATABASE_URL=postgresql://user:password@/abe_stack?host=/cloudsql/project:region:instance
DB_SSL=true
DB_MAX_CONNECTIONS=20
```

For non-Cloud Run deployments, use the Cloud SQL Auth Proxy:

```bash
cloud-sql-proxy project:region:instance --port=5432 &
DATABASE_URL=postgresql://user:password@localhost:5432/abe_stack?sslmode=disable
```

### Supabase / Neon

These services have lower connection limits. Use their built-in pooler:

```bash
# Supabase pooler (transaction mode)
DATABASE_URL=postgresql://user:password@db.project.supabase.co:6543/postgres?sslmode=require
DB_MAX_CONNECTIONS=10   # Supabase free: 60 direct connections
```

### DigitalOcean Managed Database

```bash
DATABASE_URL=postgresql://user:password@db-host:25060/abe_stack?sslmode=require
DB_SSL=true
DB_MAX_CONNECTIONS=20
```

---

## Backup Strategy

Full backup procedures are in the [Operations Manual](../OPERATIONS.md#2-backups). Key points:

- **Automated daily backups** via `pg_dump` + cron (3 AM server time)
- **7-day retention** locally, offsite sync to S3 or second server
- **Quarterly restore drills** to verify backup integrity
- **Pre-migration backups** before any schema change

For managed databases, enable the provider's automated backup feature in addition to application-level `pg_dump` backups.

---

## Health Monitoring

BSLT checks database connectivity at multiple levels:

| Endpoint             | What It Checks                         |
| -------------------- | -------------------------------------- |
| `/health`            | Basic `SELECT 1` — DB reachable        |
| `/health/ready`      | DB connected and schema version valid  |
| `/api/system/status` | Detailed latency and connection status |

Configure your monitoring to poll `/health/ready` every 30 seconds. Alert on consecutive failures.

### Query Performance

Monitor slow queries via PostgreSQL's `pg_stat_statements` extension:

```sql
-- Enable (run once)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top 10 slowest queries by total time
SELECT
  calls,
  round(total_exec_time::numeric, 2) AS total_ms,
  round(mean_exec_time::numeric, 2) AS mean_ms,
  substring(query, 1, 80) AS query_preview
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

---

## Security Checklist

- [ ] Dedicated database user for the application (not `postgres` superuser)
- [ ] Strong, randomly generated password (`openssl rand -base64 32`)
- [ ] SSL enabled (`DB_SSL=true`)
- [ ] `statement_timeout` set to prevent runaway queries
- [ ] `idle_in_transaction_session_timeout` set to reclaim connections
- [ ] Network access restricted to application servers only (firewall/security group)
- [ ] Automated backups enabled and tested
- [ ] `pg_stat_statements` enabled for query monitoring

---

## Related Documentation

- [Operations Manual](../OPERATIONS.md) — Backups, restore drills, incident response
- [Secrets Checklist](./secrets-checklist.md) — Required secrets for deployment
- [DigitalOcean Guide](./digitalocean.md) — Server provisioning
- [GCP Guide](./gcp.md) — Compute Engine deployment
