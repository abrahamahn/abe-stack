// apps/server/src/infrastructure/data/database/schema/index.ts
/**
 * Schema Validation
 *
 * Local utilities for validating database schema at startup.
 * Table types and constants should be imported directly from @abe-stack/db.
 */

export {
  getExistingTables,
  requireValidSchema,
  REQUIRED_TABLES,
  SchemaValidationError,
  validateSchema,
  type RequiredTable,
  type SchemaValidationResult,
} from './validation';
