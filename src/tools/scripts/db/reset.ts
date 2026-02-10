// src/tools/scripts/db/reset.ts
/**
 * Database Reset Script
 *
 * Truncates the users table and all dependent tables (cascading).
 * Run with: pnpm db:reset
 *
 * Environment variables are loaded via Node's native --env-file flag in package.json scripts.
 *
 * WARNING: This script is for DEVELOPMENT ONLY. It deletes data.
 */

import { buildConnectionString, createDbClient } from '@abe-stack/db';
import { loadServerEnv } from '@abe-stack/server-engine';

/**
 * Reset the database by truncating the users table.
 *
 * @throws {Error} If NODE_ENV is 'production' (exits with code 1)
 * @throws {Error} If database connection or truncate fails
 */
export async function reset(): Promise<void> {
  // Load + validate `config/env` files (prefers `.env.local` when present).
  loadServerEnv();

  // Safety check: refuse to reset in production
  if (process.env['NODE_ENV'] === 'production') {
    console.error('');
    console.error('ERROR: Cannot run reset script in production!');
    console.error('');
    console.error('This script deletes all user data and is intended');
    console.error('for development environments only.');
    console.error('');
    process.exit(1);
  }

  console.log('🗑️  Resetting database...\n');

  try {
    const connectionString = buildConnectionString();
    const db = createDbClient(connectionString);

    console.log('⚠️  Truncating users table (CASCADE)...');

    // Truncate users table, cascading to all dependent tables (sessions, tokens, etc.)
    // RESTART IDENTITY resets serial sequences
    await db.execute({
      text: 'TRUNCATE TABLE users RESTART IDENTITY CASCADE',
      values: [],
    });

    console.log('✅ Database reset successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  }
}

// Only run when executed directly (not imported for testing)
// We check if this file is the main module being executed
const isMainModule =
  typeof process !== 'undefined' &&
  process.argv[1] !== undefined &&
  (process.argv[1].includes('reset') || process.argv[1].includes('reset.ts')) &&
  process.env['VITEST'] === undefined;

if (isMainModule) {
  reset().catch((error: unknown) => {
    console.error('❌ Reset failed:', error);
    process.exit(1);
  });
}
