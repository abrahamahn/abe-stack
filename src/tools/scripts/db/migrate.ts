// tools/scripts/db/migrate.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRawDb } from '../src/client';
import { initEnv } from './env.loader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  console.log('🚀 Starting database migrations...');

  initEnv();
  const connectionString =
    process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/abe_stack_dev';
  const db = createRawDb(connectionString);

  try {
    // Ensure migrations table exists
    await db.raw(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Resolve migrations directory path relative to this script
    // src/db/migrate.ts -> ../migrations
    const migrationsDir = path.resolve(__dirname, '../migrations');

    // Read migration files
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort(); // Ensure order like 0000, 0001, etc.

    // Get applied migrations
    const appliedMigrations = await db.query<{ name: string }>({
      text: 'SELECT name FROM migrations',
      values: [],
    });
    const appliedNames = new Set(appliedMigrations.map((m) => m.name));

    for (const file of sqlFiles) {
      if (appliedNames.has(file)) {
        continue; // Skip already applied
      }

      console.log(`📝 Applying migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sqlContent = await fs.readFile(filePath, 'utf-8');

      await db.transaction(async (tx) => {
        await tx.raw(sqlContent);
        await tx.execute({
          text: 'INSERT INTO migrations (name) VALUES ($1)',
          values: [file],
        });
      });

      console.log(`✅ Applied: ${file}`);
    }

    console.log('✨ All migrations applied successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await db.close();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations();
}
