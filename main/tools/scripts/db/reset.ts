// main/tools/scripts/db/reset.ts
/**
 * Database Reset Script
 *
 * Drops all tables, recreates the schema, and seeds dev data.
 * Run with: pnpm db:reset
 *
 * Supports --force flag to skip confirmation prompt.
 *
 * WARNING: This script is for DEVELOPMENT ONLY. It destroys all data.
 */

import { createInterface } from 'node:readline';

import { buildConnectionString, createDbClient } from '@bslt/db';
import { loadServerEnv } from '@bslt/server-system';

import { pushSchema } from './push';
import { seed } from './seed';

/**
 * Prompt the user for confirmation via stdin.
 *
 * @param message - The confirmation message to display
 * @returns True if the user confirms (y/Y), false otherwise
 */
async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${message} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

/**
 * Reset the database: DROP schema → recreate → push → seed.
 *
 * @throws {Error} If NODE_ENV is 'production' (exits with code 1)
 * @throws {Error} If database connection or operations fail
 */
export async function reset(): Promise<void> {
  loadServerEnv();

  if (process.env['NODE_ENV'] === 'production') {
    process.stderr.write('\nERROR: Cannot run reset script in production!\n');
    process.stderr.write('This script destroys all data and is intended for development only.\n\n');
    process.exit(1);
  }

  const force = process.argv.includes('--force');

  if (!force) {
    const confirmed = await confirm('\n⚠️  This will DROP all tables and data. Continue?');
    if (!confirmed) {
      process.stdout.write('Aborted.\n');
      process.exit(0);
    }
  }

  process.stdout.write('\n🗑️  Resetting database...\n\n');

  try {
    const connectionString = buildConnectionString();
    const db = createDbClient(connectionString);

    // 1. Drop everything
    process.stdout.write('  Dropping schema...\n');
    await db.execute({ text: 'DROP SCHEMA public CASCADE', values: [] });
    await db.execute({ text: 'CREATE SCHEMA public', values: [] });

    // 2. Recreate tables
    process.stdout.write('  Pushing schema...\n');
    await pushSchema();

    // 3. Seed dev data
    process.stdout.write('  Seeding data...\n');
    await seed();

    await db.close();

    process.stdout.write('\n✅ Database reset successfully!\n\n');
    process.exit(0);
  } catch (error) {
    process.stderr.write(`\n❌ Reset failed: ${String(error)}\n`);
    process.exit(1);
  }
}

const isMainModule =
  typeof process !== 'undefined' &&
  process.argv[1] !== undefined &&
  (process.argv[1].includes('reset') || process.argv[1].includes('reset.ts')) &&
  process.env['VITEST'] === undefined;

if (isMainModule) {
  reset().catch((error: unknown) => {
    process.stderr.write(`❌ Reset failed: ${String(error)}\n`);
    process.exit(1);
  });
}
