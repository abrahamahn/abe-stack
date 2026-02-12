# Backup and Restore Procedure

## Backup Methods

### Self-hosted PostgreSQL (`pg_dump`)

```bash
# Full database dump (compressed, custom format)
pg_dump -Fc -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).dump

# SQL-format dump (human-readable, slower restore)
pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Managed database (DigitalOcean / GCP)

Use the provider's snapshot feature:

- **DigitalOcean:** Databases > your-cluster > Backups > Create Manual Backup
- **GCP Cloud SQL:** Instance > Backups > Create Backup

Managed providers typically run automated daily backups with 7-day retention. Extend to 30 days if your plan allows.

## Recommended Schedule

| Backup type      | Frequency | Retention |
|------------------|-----------|-----------|
| Automated daily  | Daily     | 30 days   |
| Pre-migration    | Before each migration | Until next successful migration |
| Pre-deployment   | Before major releases | 7 days    |
| Manual snapshot  | On demand | As needed |

## Manual Backup Commands

```bash
# Set connection variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_USER=abe_user
export DB_NAME=abe_stack

# Compressed backup (recommended for production)
pg_dump -Fc -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
  -f "abe_stack_$(date +%Y%m%d_%H%M%S).dump"

# Upload to remote storage (example: S3-compatible)
aws s3 cp "abe_stack_*.dump" s3://your-backup-bucket/db-backups/
```

## Restore Procedure

### Step 1: Stop the application

```bash
docker compose --project-name abe-stack-production -f docker-compose.prod.yml down
```

### Step 2: Restore the database

```bash
# From custom-format dump (recommended)
pg_restore -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --clean --if-exists backup.dump

# From SQL dump
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME < backup.sql
```

For managed databases, use the provider's restore-from-backup UI or CLI.

### Step 3: Restart the application

```bash
docker compose --project-name abe-stack-production -f docker-compose.prod.yml up -d
```

### Step 4: Run pending migrations

If restoring from an older backup, migrations applied after that backup will need to run again:

```bash
pnpm db:migrate
```

## Post-Restore Verification

1. **Health check:** `curl https://your-api-url/health` -- should return 200
2. **Row counts:** Verify critical tables have expected data:
   ```sql
   SELECT 'users' AS tbl, COUNT(*) FROM users
   UNION ALL SELECT 'tenants', COUNT(*) FROM tenants
   UNION ALL SELECT 'subscriptions', COUNT(*) FROM subscriptions;
   ```
3. **Login flow:** Attempt login with a known test account
4. **Migration state:** Verify `SELECT * FROM migrations ORDER BY applied_at DESC LIMIT 5;` matches expected state
5. **Check logs:** Monitor application logs for connection errors or missing data
