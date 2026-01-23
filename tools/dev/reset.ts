// tools/dev/reset.ts
/**
 * Database Reset Script
 *
 * Drops all tables and re-seeds the database with fresh bootstrap data.
 * USE WITH CAUTION - This will delete ALL data!
 *
 * Usage:
 *   pnpm db:reset
 *   ./node_modules/.bin/tsx tools/dev/reset.ts
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { bootstrap } from './bootstrap';

// Helper to parse .env file
function parseEnv(path: string): Record<string, string> {
  try {
    const content = readFileSync(path, 'utf-8');
    const env: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const match = line.match(/^([^=:#]+?)[=:](.*)/);
      if (match) {
        const value = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
        env[match[1].trim()] = value;
      }
    }
    return env;
  } catch {
    console.warn(`Warning: Could not read env file at ${path}`);
    return {};
  }
}

function buildConnectionString(env: Record<string, string>): string {
  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }

  const user = env.POSTGRES_USER || env.DB_USER || 'postgres';
  const password = env.POSTGRES_PASSWORD || env.DB_PASSWORD || '';
  const host = env.POSTGRES_HOST || env.DB_HOST || 'localhost';
  const port = env.POSTGRES_PORT || env.DB_PORT || '5432';
  const database = env.POSTGRES_DB || env.DB_NAME || 'abe_stack_dev';

  const auth = password ? `${user}:${password}` : user;
  return `postgres://${auth}@${host}:${port}/${database}`;
}

// Inline type for table records returned from pg_tables
interface TableRecord {
  tablename: string;
}

// Inline type for the raw db client methods we use
interface RawDbClient {
  raw<T>(sql: string, values?: unknown[]): Promise<T[]>;
  close(): Promise<void>;
}

// Type for the @abe-stack/db module
interface DbModule {
  createRawDb: (connectionString: string) => RawDbClient;
}

async function dropAllTables(connectionString: string): Promise<void> {
  // Dynamic import with explicit type assertion
  const dbModule: DbModule = await import('../../packages/db/src/index.ts') as DbModule;
  const db = dbModule.createRawDb(connectionString);

  console.log('🗑️  Dropping all tables...');

  try {
    // Get all tables in public schema
    const tables = await db.raw<TableRecord>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
    );

    if (tables.length === 0) {
      console.log('  No tables to drop.');
    } else {
      // Drop all tables with CASCADE to handle foreign key constraints
      for (const table of tables) {
        console.log(`  Dropping table: ${table.tablename}`);
        await db.raw(`DROP TABLE IF EXISTS "${table.tablename}" CASCADE`);
      }
      console.log(`  ✓ Dropped ${String(tables.length)} tables`);
    }
  } finally {
    await db.close();
  }
}

async function pushSchema(envVars: Record<string, string>): Promise<void> {
  console.log('\n🔄 Recreating database schema...');

  const { spawnSync } = await import('node:child_process');

  const result = spawnSync('pnpm', ['--filter', '@abe-stack/server', 'db:push'], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: { ...process.env, ...envVars },
  });

  if (result.status !== 0) {
    throw new Error('Failed to push database schema');
  }

  console.log('  ✓ Schema recreated');
}

async function reset(): Promise<void> {
  console.log('🔄 Starting Database Reset...');
  console.log('⚠️  WARNING: This will delete ALL data!\n');

  // Load environment variables
  const envPath = resolve(process.cwd(), 'config/.env/.env.development');
  const envVars = parseEnv(envPath);

  // Apply env vars to process.env for bootstrap
  for (const [key, value] of Object.entries(envVars)) {
    process.env[key] = value;
  }

  const connectionString = buildConnectionString(envVars);

  // Drop all tables
  await dropAllTables(connectionString);

  // Recreate schema using db:push
  await pushSchema(envVars);

  // Bootstrap with seed data
  bootstrap();

  console.log('\n🎉 Database reset complete!');
}

// Run if called directly
const isMainModule = process.argv[1]?.includes('reset.ts') ?? false;
if (isMainModule) {
  reset().catch((error: unknown) => {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  });
}
