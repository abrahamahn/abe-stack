# Database Emergency Runbook

## Connection Pool Exhaustion

### Symptoms

- Application returns 500 errors or times out on all endpoints
- Logs show: `too many clients already` or `connection pool timeout`

### Diagnosis

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'abe_stack';

-- Check connection states
SELECT state, count(*)
FROM pg_stat_activity
WHERE datname = 'abe_stack'
GROUP BY state;

-- Show max allowed connections
SHOW max_connections;
```

### Immediate Fix

```sql
-- Kill idle connections older than 5 minutes
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'abe_stack'
  AND state = 'idle'
  AND state_change < now() - interval '5 minutes';
```

Then restart the application to reset the connection pool:

```bash
docker compose --project-name abe-stack-production -f docker-compose.prod.yml restart api
```

### Prevention

- Set `DATABASE_POOL_MAX` to a reasonable value (default: 20)
- Ensure connections are released after use (Drizzle handles this automatically)
- Monitor `pg_stat_activity` periodically

## Long-Running Queries

### Detection

```sql
-- Find queries running longer than 30 seconds
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - pg_stat_activity.query_start > interval '30 seconds'
ORDER BY duration DESC;
```

### Safe Cancellation

```sql
-- Cancel query (graceful, allows cleanup)
SELECT pg_cancel_backend(<pid>);

-- Terminate connection (force, use only if cancel fails)
SELECT pg_terminate_backend(<pid>);
```

## Migration Failures

### Diagnosis

1. Check which migration failed:
   ```sql
   SELECT * FROM migrations ORDER BY applied_at DESC LIMIT 5;
   ```
2. Check the migration runner output for the specific SQL error

### Recovery

1. **If the migration was wrapped in a transaction** (default behavior): no cleanup needed. The failed migration was rolled back automatically.
2. **If partial changes were applied** (e.g., multi-statement migration with a failure mid-way): manually inspect the database state and reverse any applied changes.
3. **Fix the migration SQL file**, then re-run:
   ```bash
   pnpm db:migrate
   ```

## Disk Space Emergency

### Identify large tables

```sql
SELECT relname AS table, pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 10;
```

### Immediate actions

```sql
-- Reclaim space from deleted rows
VACUUM FULL <table_name>;

-- Archive old audit events (if audit_events is large)
DELETE FROM audit_events WHERE created_at < now() - interval '90 days';
VACUUM audit_events;

-- Archive old login attempts
DELETE FROM login_attempts WHERE created_at < now() - interval '90 days';
VACUUM login_attempts;

-- Archive old security events
DELETE FROM security_events WHERE created_at < now() - interval '90 days';
VACUUM security_events;
```

### Prevention

The application has built-in cleanup jobs for audit events, login attempts, sessions, and expired tokens. Verify these are running by checking the `jobs` table:

```sql
SELECT type, status, completed_at
FROM jobs
WHERE type LIKE 'cleanup%'
ORDER BY completed_at DESC;
```
