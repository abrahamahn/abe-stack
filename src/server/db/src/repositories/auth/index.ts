// src/server/db/src/repositories/auth/index.ts
/**
 * Auth Repositories Barrel
 *
 * Functional-style repositories for authentication-related tables.
 */

// Refresh Tokens
export { createRefreshTokenRepository, type RefreshTokenRepository } from './refresh-tokens';

// Refresh Token Families
export {
  createRefreshTokenFamilyRepository,
  type RefreshTokenFamilyRepository,
} from './refresh-token-families';

// Login Attempts
export { createLoginAttemptRepository, type LoginAttemptRepository } from './login-attempts';

// Password Reset Tokens
export {
  createPasswordResetTokenRepository,
  type PasswordResetTokenRepository,
} from './password-reset-tokens';

// Email Verification Tokens
export {
  createEmailVerificationTokenRepository,
  type EmailVerificationTokenRepository,
} from './email-verification-tokens';

// Security Events
export { createSecurityEventRepository, type SecurityEventRepository } from './security-events';

// TOTP Backup Codes
export { createTotpBackupCodeRepository, type TotpBackupCodeRepository } from './totp-backup-codes';

// Email Change Tokens
export {
  createEmailChangeTokenRepository,
  type EmailChangeTokenRepository,
} from './email-change-tokens';
