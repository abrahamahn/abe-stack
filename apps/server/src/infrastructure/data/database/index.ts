// apps/server/src/infrastructure/data/database/index.ts

// Schema exports
export {
  // Users
  USER_ROLES,
  users,
  refreshTokens,
  type UserRole,
  type User,
  type NewUser,
  type RefreshToken,
  type NewRefreshToken,
  // Auth
  refreshTokenFamilies,
  loginAttempts,
  passwordResetTokens,
  emailVerificationTokens,
  securityEvents,
  type RefreshTokenFamily,
  type NewRefreshTokenFamily,
  type LoginAttempt,
  type NewLoginAttempt,
  type PasswordResetToken,
  type NewPasswordResetToken,
  type EmailVerificationToken,
  type NewEmailVerificationToken,
  type SecurityEvent,
  type NewSecurityEvent,
} from './schema';

// Client exports
export {
  buildConnectionString,
  createDbClient,
  resolveConnectionStringWithFallback,
  type DbClient,
} from './client';

// Utils exports (transaction, optimistic locking, test utils)
export {
  withTransaction,
  isInTransaction,
  OptimisticLockError,
  updateUserWithVersion,
  isOptimisticLockError,
  createMockDb,
  type MockDbClient,
} from './utils';

// Schema validation
export {
  REQUIRED_TABLES,
  validateSchema,
  requireValidSchema,
  getExistingTables,
  SchemaValidationError,
  type RequiredTable,
  type SchemaValidationResult,
} from './schema';

// JSON Database (development/testing only)
export { createJsonDbClient, JsonDatabase, JsonDbClient } from './json';
