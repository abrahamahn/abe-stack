// infra/db/src/scripts/index.ts
/**
 * Database Scripts Barrel Exports
 *
 * CLI scripts for database management: schema push, seed, admin bootstrap.
 *
 * @module
 */

export { bootstrapAdmin } from './bootstrap-admin';
export { getSchemaStatements, pushSchema } from './db-push';
export { seed, TEST_USERS, type PasswordHasher, type SeedUser } from './seed';
