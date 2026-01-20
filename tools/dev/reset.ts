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

// Type definitions for database operations (to avoid workspace root type resolution issues)
interface DatabaseClient {
  end: () => Promise<void>;
}

interface DrizzleDatabase {
  execute: (query: unknown) => Promise<unknown>;
}

interface SqlTemplateTag {
  (strings: TemplateStringsArray, ...values: unknown[]): unknown;
  raw: (query: string) => unknown;
}

// Type for the raw query result
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

function isTableArray(obj: unknown): obj is Array<{ tablename: string }> {
  return (
    Array.isArray(obj) &&
    (obj.length === 0 || (typeof obj[0] === 'object' && obj[0] !== null && 'tablename' in obj[0]))
  );
}

async function dropAllTables(connectionString: string): Promise<void> {
  // Dynamic imports to get around workspace root type resolution
  const postgresModule = (await import('postgres')) as {
    default: (url: string, opts: { max: number }) => DatabaseClient;
  };
  const drizzleModule = (await import('drizzle-orm/postgres-js')) as {
    drizzle: (client: DatabaseClient) => DrizzleDatabase;
  };
  const drizzleOrmModule = (await import('drizzle-orm')) as { sql: SqlTemplateTag };

  const client = postgresModule.default(connectionString, { max: 1 });
  const db = drizzleModule.drizzle(client);
  const sqlTag = drizzleOrmModule.sql;

  console.log('🗑️  Dropping all tables...');

  try {
    // Get all tables in public schema
    const query = sqlTag`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
    const tablesResult: unknown = await db.execute(query);

    if (isTableArray(tablesResult)) {
      const tableNames = tablesResult.map((t) => t.tablename);

      if (tableNames.length === 0) {
        console.log('  No tables to drop.');
      } else {
        // Drop all tables with CASCADE to handle foreign key constraints
        for (const tableName of tableNames) {
          console.log(`  Dropping table: ${tableName}`);
          const dropQuery = sqlTag.raw(`DROP TABLE IF EXISTS "${tableName}" CASCADE`);
          await db.execute(dropQuery);
        }
        console.log(`  ✓ Dropped ${String(tableNames.length)} tables`);
      }
    } else {
      console.log('  Could not determine tables to drop.');
    }
  } finally {
    await client.end();
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

  // Recreate schema using drizzle-kit push
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
