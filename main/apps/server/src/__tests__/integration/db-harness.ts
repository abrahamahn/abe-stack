// main/apps/server/src/__tests__/integration/db-harness.ts
/**
 * Database Test Harness
 *
 * Manages the lifecycle of a real PostgreSQL database for integration tests.
 * Supports isolated test databases, migration running, and automatic cleanup.
 */

import { randomUUID } from 'node:crypto';

import { buildConnectionString, createDbClient, type DbClient } from '@bslt/db';
import { loadServerEnv } from '@bslt/server-system';

export interface DbHarness {
  /** The connection string for the isolated test database */
  connectionString: string;
  /** The DB client for the isolated test database */
  db: DbClient;
  /** Cleanup the test database (drop it) */
  destroy: () => Promise<void>;
  /** Run all migrations on the test database */
  migrate: () => Promise<void>;
}

/**
 * Creates an isolated PostgreSQL database for testing.
 *
 * @returns DbHarness object with connection info and management methods
 */
export async function createDbHarness(): Promise<DbHarness> {
  // Load environment to get base connection info
  await loadServerEnv();

  const baseConnectionString = buildConnectionString();
  const mainDb = createDbClient(baseConnectionString);

  // Generate a random database name for isolation
  const dbName = `test_${randomUUID().replace(/-/g, '_')}`;

  try {
    // 1. Create the new database
    await mainDb.raw(`CREATE DATABASE ${dbName}`);
    await mainDb.close();

    // 2. Build connection string for the isolated test database
    // Replace the database portion of the base URL with the new DB name
    const testConnectionString = baseConnectionString.replace(/\/[^/?]+(\?|$)/, `/${dbName}$1`);
    const testDb = createDbClient(testConnectionString);

    return {
      connectionString: testConnectionString,
      db: testDb,
      migrate: async () => {
        console.log(`Migrating test database ${dbName}...`);
        // Dynamic import of migration script; path is resolved at runtime
        // The module is a generated artifact not tracked in TypeScript paths
        const scriptPath = '../../../../tools/scripts/db/push';
        const pushScript = (await import(scriptPath)) as { STATEMENTS: string[] };
        const { STATEMENTS } = pushScript;
        for (const sql of STATEMENTS) {
          try {
            await testDb.raw(sql);
          } catch (err) {
            console.error(`Failed to execute SQL: ${sql.substring(0, 100)}...`);
            console.error(err);
            throw err;
          }
        }
        console.log(`Migration of ${dbName} complete.`);
      },
      destroy: async () => {
        await testDb.close();
        const cleanupDb = createDbClient(baseConnectionString);
        // Force disconnect other users if any
        await cleanupDb.raw(`
          SELECT pg_terminate_backend(pg_stat_activity.pid)
          FROM pg_stat_activity
          WHERE pg_stat_activity.datname = '${dbName}'
            AND pid <> pg_backend_pid();
        `);
        await cleanupDb.raw(`DROP DATABASE IF EXISTS ${dbName}`);
        await cleanupDb.close();
      },
    };
  } catch (error) {
    await mainDb.close();
    throw error;
  }
}
