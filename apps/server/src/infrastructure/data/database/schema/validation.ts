// apps/server/src/infrastructure/data/database/schema/validation.ts
/**
 * Schema Validation
 *
 * Validates that required database tables exist before accepting requests.
 * Prevents cryptic "relation does not exist" errors in production.
 */

import { sql } from 'drizzle-orm';

import type { DbClient } from '../client';

// ============================================================================
// Required Tables
// ============================================================================

/**
 * All tables required for the application to function.
 * Keep in sync with schema/*.ts
 */
export const REQUIRED_TABLES = [
  'users',
  'refresh_tokens',
  'refresh_token_families',
  'login_attempts',
  'password_reset_tokens',
  'email_verification_tokens',
  'security_events',
] as const;

export type RequiredTable = (typeof REQUIRED_TABLES)[number];

// ============================================================================
// Types
// ============================================================================

export interface SchemaValidationResult {
  valid: boolean;
  missingTables: string[];
  existingTables: string[];
}

export class SchemaValidationError extends Error {
  constructor(public readonly missingTables: string[]) {
    super(
      `Database schema is incomplete. Missing tables: ${missingTables.join(', ')}. ` +
        `Run 'pnpm --filter @abe-stack/server db:push' to create tables.`,
    );
    this.name = 'SchemaValidationError';
  }
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check which tables exist in the database
 */
export async function getExistingTables(db: DbClient): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  `);

  // Drizzle with postgres-js returns array directly, not { rows: [...] }
  const rows = result as unknown as Array<{ tablename: string }>;
  return rows.map((row) => row.tablename);
}

/**
 * Validate that all required tables exist
 */
export async function validateSchema(db: DbClient): Promise<SchemaValidationResult> {
  const existingTables = await getExistingTables(db);
  const existingSet = new Set(existingTables);

  const missingTables = REQUIRED_TABLES.filter((table) => !existingSet.has(table));

  return {
    valid: missingTables.length === 0,
    missingTables,
    existingTables,
  };
}

/**
 * Validate schema and throw if incomplete.
 * Call this during app startup.
 */
export async function requireValidSchema(db: DbClient): Promise<void> {
  const result = await validateSchema(db);

  if (!result.valid) {
    throw new SchemaValidationError(result.missingTables);
  }
}
