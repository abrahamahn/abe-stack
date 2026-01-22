// apps/server/src/infrastructure/data/index.ts
/**
 * Data Layer
 *
 * Data persistence and file handling:
 * - database: Database client, schema, transactions
 * - storage: File storage providers (local, S3)
 * - files: File handling utilities
 */

// Database - Schema
export {
  emailVerificationTokens,
  loginAttempts,
  passwordResetTokens,
  refreshTokenFamilies,
  refreshTokens,
  securityEvents,
  USER_ROLES,
  users,
  type EmailVerificationToken,
  type LoginAttempt,
  type NewEmailVerificationToken,
  type NewLoginAttempt,
  type NewPasswordResetToken,
  type NewRefreshToken,
  type NewRefreshTokenFamily,
  type NewSecurityEvent,
  type NewUser,
  type PasswordResetToken,
  type RefreshToken,
  type RefreshTokenFamily,
  type SecurityEvent,
  type User,
  type UserRole,
} from './database';

// Database - Client
export {
  buildConnectionString,
  createDbClient,
  resolveConnectionStringWithFallback,
  type DbClient,
} from './database';

// Database - Utils
export {
  isInTransaction,
  isOptimisticLockError,
  OptimisticLockError,
  updateUserWithVersion,
  withTransaction,
} from './database';

// Note: createMockDb and MockDbClient are NOT exported here.
// They import vitest which cannot be loaded at runtime.
// Import directly from './database/utils/test-utils' in test files.

// Database - Schema Validation
export {
  getExistingTables,
  REQUIRED_TABLES,
  requireValidSchema,
  SchemaValidationError,
  validateSchema,
  type RequiredTable,
  type SchemaValidationResult,
} from './database';

// Database - JSON (development/testing only)
export { createJsonDbClient, JsonDatabase, JsonDbClient } from './database';

// Storage
export {
  createStorage,
  LocalStorageProvider,
  S3StorageProvider,
  createSignedUrl,
  parseSignedUrl,
  isUrlExpired,
  getDefaultExpiration,
  createSignature as createStorageSignature,
  verifySignature as verifyStorageSignature,
  normalizeFilename as normalizeStorageFilename,
  type SignedUrlData,
  type StorageConfig,
  type StorageProviderName,
  type LocalStorageConfig,
  type S3StorageConfig,
  type UploadParams,
  type StorageProvider,
} from './storage';

// Files - explicit exports
export {
  normalizeFilename as normalizeFileFilename,
  createSignature as createFileSignature,
  verifySignature as verifyFileSignature,
  registerFileServer,
  type FileSignatureData,
  type FilesConfig,
} from './files';
