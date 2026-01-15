// apps/server/src/infra/database/index.ts

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

// Transaction exports
export { withTransaction, isInTransaction } from './transaction';

// Optimistic concurrency control utilities (Chet-stack pattern)
export { OptimisticLockError, updateUserWithVersion, isOptimisticLockError } from './utils';
