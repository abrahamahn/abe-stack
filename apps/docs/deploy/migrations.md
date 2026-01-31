# Database Migrations

Migration strategy for ABE Stack using Drizzle ORM.

---

## Quick Reference

| Command             | Purpose                                      | Environment      |
| ------------------- | -------------------------------------------- | ---------------- |
| `pnpm db:push`      | Sync schema directly (no migration files)    | Development      |
| `pnpm db:generate`  | Generate migration files from schema changes | Pre-deploy       |
| `pnpm db:migrate`   | Run pending migrations                       | Production       |
| `pnpm db:studio`    | Open Drizzle Studio GUI                      | Development      |
| `pnpm db:seed`      | Seed with test data                          | Development only |
| `pnpm db:reset`     | Drop all tables + recreate + seed            | Development only |
| `pnpm db:bootstrap` | Seed initial data                            | First deploy     |

---

## Development Workflow

During development, use `db:push` for fast iteration:

```bash
# Start database
pnpm docker:dev

# Sync schema changes directly (no migration files)
pnpm db:push

# Optional: seed test data
pnpm db:seed
```

**Why `db:push` in development?**

- Faster iteration (no migration file management)
- Schema changes apply immediately
- No migration history to manage during active development

---

## Production Migration Workflow

For production deployments, use proper migrations:

### 1. Generate Migration Files

After finalizing schema changes:

```bash
# Generate migration from schema diff
pnpm db:generate
```

This creates timestamped SQL files in `apps/server/drizzle/`:

```
apps/server/drizzle/
├── 0000_initial_schema.sql
├── 0001_add_user_roles.sql
└── meta/
    └── _journal.json
```

### 2. Review Generated SQL

Always review the generated migration:

```bash
cat apps/server/drizzle/XXXX_*.sql
```

Check for:

- Data loss (DROP statements)
- Long-running operations (large table alterations)
- Missing indexes
- Constraint changes

### 3. Run Migrations

```bash
# Apply pending migrations
pnpm db:migrate
```

### 4. Verify

```bash
# Open Studio to inspect schema
pnpm db:studio
```

---

## Deployment Migration Strategy

### First Deploy

```bash
# 1. Start services (database will be empty)
pnpm docker:prod

# 2. Run migrations
docker compose -f infra/docker/production/docker-compose.prod.yml exec api \
  pnpm db:migrate

# 3. Bootstrap admin user (generates secure random password)
docker compose -f infra/docker/production/docker-compose.prod.yml exec api \
  pnpm db:bootstrap:admin

# IMPORTANT: Save the generated admin credentials shown in output!
```

### Subsequent Deploys

```bash
# 1. Pull latest code
git pull

# 2. Rebuild and restart
pnpm docker:prod

# 3. Run any pending migrations
docker compose -f infra/docker/production/docker-compose.prod.yml exec api \
  node -e "require('child_process').execSync('pnpm db:migrate', {stdio: 'inherit'})"
```

### Zero-Downtime Deploys

For zero-downtime migrations:

1. **Additive changes first**: Add new columns/tables
2. **Deploy code** that works with both old and new schema
3. **Migrate data** if needed
4. **Remove old columns** in a later deploy

```
Deploy 1: Add new_column (nullable)
Deploy 2: Code uses new_column, backfill data
Deploy 3: Make new_column NOT NULL, drop old_column
```

---

## Rollback Strategy

### Immediate Rollback (No Data Changes)

If a migration only added columns/tables:

```sql
-- Manually reverse in psql
DROP TABLE new_table;
ALTER TABLE users DROP COLUMN new_column;
```

### Planned Rollback

For complex migrations, create a rollback script:

```
apps/server/drizzle/
├── 0005_add_feature.sql
└── 0005_add_feature_rollback.sql  # Manual rollback script
```

### Point-in-Time Recovery

For data loss scenarios, restore from backup:

```bash
# Stop services
pnpm docker:prod:down

# Restore database (example with pg_restore)
pg_restore -d abe_stack backup_20260122.dump

# Restart services
pnpm docker:prod
```

---

## Idempotency & Safety

### Migration Safety Checklist

Before running migrations:

- [ ] Reviewed generated SQL
- [ ] No unexpected DROP statements
- [ ] Large tables have appropriate strategy (batching, off-peak)
- [ ] Database backup taken
- [ ] Rollback plan documented

### Idempotent Migrations

Drizzle migrations are tracked in `drizzle/__drizzle_migrations` table:

```sql
SELECT * FROM __drizzle_migrations;
```

Running `db:migrate` multiple times is safe - already-applied migrations are skipped.

### Handling Failed Migrations

If a migration fails mid-execution:

1. **Check current state**: `pnpm db:studio`
2. **Fix the issue** in the migration file or database
3. **Mark as applied** if partially complete:
   ```sql
   INSERT INTO __drizzle_migrations (hash, created_at)
   VALUES ('migration_hash', now());
   ```
4. **Or rollback** and re-run

---

## Schema Location

```
apps/server/src/infrastructure/data/database/schema/
├── index.ts          # Barrel export
├── auth.ts           # Auth tables (users, sessions, tokens)
├── magic-link.ts     # Magic link tokens
├── oauth.ts          # OAuth accounts
├── notifications.ts  # Push subscriptions
└── security.ts       # Security events
```

Config: `config/drizzle.config.ts`

---

## Common Scenarios

### Adding a Column

```typescript
// 1. Update schema
export const users = pgTable('users', {
  // existing columns...
  newField: varchar('new_field', { length: 255 }),
});

// 2. Generate migration
pnpm db:generate

// 3. Review and apply
pnpm db:migrate
```

### Adding a Table

```typescript
// 1. Create new table in schema/
export const newTable = pgTable('new_table', {
  id: uuid('id').primaryKey().defaultRandom(),
  // ...
});

// 2. Export from schema/index.ts
export { newTable } from './new-table';

// 3. Generate and apply
pnpm db:generate
pnpm db:migrate
```

### Renaming a Column (Safe)

```typescript
// Step 1: Add new column
newName: varchar('new_name'),

// Step 2: Deploy, backfill data
UPDATE users SET new_name = old_name;

// Step 3: Make required, drop old
newName: varchar('new_name').notNull(),
// Remove old_name from schema

// Step 4: Generate migration for removal
pnpm db:generate
```

### Dropping a Table (Careful!)

```typescript
// 1. Remove from schema
// 2. Generate migration
pnpm db:generate

// 3. REVIEW CAREFULLY - this deletes data!
cat apps/server/drizzle/XXXX_*.sql

// 4. Apply only if certain
pnpm db:migrate
```

---

## Environment Variables

| Variable            | Default         | Description                               |
| ------------------- | --------------- | ----------------------------------------- |
| `DATABASE_URL`      | -               | Full connection string (takes precedence) |
| `POSTGRES_HOST`     | `localhost`     | Database host                             |
| `POSTGRES_PORT`     | `5432`          | Database port                             |
| `POSTGRES_DB`       | `abe_stack_dev` | Database name                             |
| `POSTGRES_USER`     | `postgres`      | Database user                             |
| `POSTGRES_PASSWORD` | -               | Database password                         |

---

## Troubleshooting

### "relation does not exist"

Schema not synced. Run:

```bash
pnpm db:push  # development
pnpm db:migrate  # production
```

### "migration already applied"

Check migration status:

```sql
SELECT * FROM __drizzle_migrations ORDER BY created_at DESC;
```

### "permission denied"

Database user lacks permissions:

```sql
GRANT ALL PRIVILEGES ON DATABASE abe_stack TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
```

### Migration timeout

For large tables, increase timeout or run manually:

```bash
psql $DATABASE_URL -f apps/server/drizzle/0005_large_migration.sql
```
