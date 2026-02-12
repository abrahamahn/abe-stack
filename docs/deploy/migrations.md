# Database Migration Guide

## Overview

ABE Stack uses sequential SQL migration files managed by a custom migration runner (not Drizzle Kit). Migration files live in `src/server/db/migrations/` and are named `NNNN_description.sql` (e.g., `0000_init.sql` through `0026_performance_indexes.sql`). Applied migrations are tracked in a `migrations` table in PostgreSQL.

The migration runner (`src/tools/scripts/db/migrate.ts`) reads all `.sql` files in order, skips already-applied ones, and wraps each new migration in a transaction.

## Running Migrations

### Development

```bash
pnpm db:migrate
```

### Production

Run before or during deployment. The Docker entrypoint or deploy script should execute:

```bash
pnpm db:migrate
```

The runner connects using `DATABASE_*` env vars (or `DATABASE_URL` if set) and applies all pending migrations.

### How it works

1. Creates `migrations` table if it does not exist
2. Reads all `.sql` files from `src/server/db/migrations/`, sorted alphabetically
3. Queries the `migrations` table for already-applied file names
4. For each pending file: executes SQL inside a transaction, then inserts the file name into `migrations`
5. If any migration fails, the transaction rolls back and the process exits with code 1

## Creating New Migrations

1. Determine the next sequence number (check the highest `NNNN` in `src/server/db/migrations/`)
2. Create a new file: `NNNN_short_description.sql`
3. Write idempotent SQL where possible (`CREATE INDEX IF NOT EXISTS`, `ALTER TABLE ADD COLUMN IF NOT EXISTS`)
4. Test locally: `pnpm db:migrate`

```bash
# Example: adding a new column
# File: src/server/db/migrations/0027_add_user_timezone.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone text;
```

### Naming conventions

- Use sequential four-digit prefix: `0027`, `0028`, etc.
- Use lowercase snake_case for the description
- Keep descriptions short but descriptive: `0027_add_user_timezone.sql`

## Rollback Procedure

Drizzle/ABE Stack migrations are forward-only. There is no automatic rollback mechanism.

### Manual rollback steps

1. **Back up the database first** (see `docs/deploy/backup-restore.md`)
2. Write a reversal SQL script manually (e.g., `DROP COLUMN`, `DROP INDEX`)
3. Execute the reversal SQL against the database
4. Remove the migration name from the `migrations` table:
   ```sql
   DELETE FROM migrations WHERE name = '0027_add_user_timezone.sql';
   ```

### When rollback is not possible

Destructive migrations (dropping columns, changing types with data loss) cannot be cleanly reversed. Always keep a backup before applying migrations to production.

## Best Practices

- **Never modify an already-applied migration file.** Create a new migration instead.
- **Test in staging first.** Run `pnpm db:migrate` against a staging database before production.
- **Keep migrations idempotent** where SQL allows (`IF NOT EXISTS`, `IF EXISTS`).
- **One logical change per file.** Do not bundle unrelated schema changes.
- **Back up before migrating production.** Use `pg_dump` or a managed snapshot.
- **Development shortcut:** `pnpm db:push` creates all tables directly (no migration tracking). Use only for fresh dev databases.
