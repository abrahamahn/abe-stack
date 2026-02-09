// src/tools/scripts/db/migrate.ts
/**
 * Database Migration Runner
 *
 * Applies SQL migration files from src/server/db/migrations/ in order.
 * Tracks applied migrations in a `migrations` table to ensure idempotency.
 *
 * @usage pnpm db:migrate
 * @usage pnpm tsx src/tools/scripts/db/migrate.ts
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { buildConnectionString, createRawDb } from '@abe-stack/db';
import { initEnv } from '@abe-stack/server-engine';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Resolve repo root from src/tools/scripts/db/ (4 levels up) */
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

/** SQL migrations directory */
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'src', 'server', 'db', 'migrations');

/**
 * Runs all pending SQL migrations in order.
 * Creates the migrations tracking table if it does not exist.
 *
 * @throws Exits process with code 1 on migration failure
 * @complexity O(n) where n is the number of migration files
 */
async function runMigrations(): Promise<void> {
  console.log('Starting database migrations...');

  initEnv();
  const connectionString = buildConnectionString();
  const db = createRawDb(connectionString);

  try {
    await db.raw(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const files = await fs.readdir(MIGRATIONS_DIR);
    const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();

    const appliedMigrations = await db.query<{ name: string }>({
      text: 'SELECT name FROM migrations',
      values: [],
    });
    const appliedNames = new Set(appliedMigrations.map((m) => m.name));

    let appliedCount = 0;

    for (const file of sqlFiles) {
      if (appliedNames.has(file)) {
        continue;
      }

      console.log(`  Applying migration: ${file}`);
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sqlContent = await fs.readFile(filePath, 'utf-8');

      await db.transaction(async (tx) => {
        await tx.raw(sqlContent);
        await tx.execute({
          text: 'INSERT INTO migrations (name) VALUES ($1)',
          values: [file],
        });
      });

      console.log(`  Applied: ${file}`);
      appliedCount++;
    }

    if (appliedCount === 0) {
      console.log('All migrations already applied.');
    } else {
      console.log(`\nApplied ${String(appliedCount)} migration(s) successfully.`);
    }
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await db.close();
  }
}

const entryArg = process.argv[1];
const isMain = entryArg !== undefined && import.meta.url === `file://${entryArg}`;

if (isMain) {
  runMigrations();
}
