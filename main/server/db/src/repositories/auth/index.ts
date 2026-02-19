// main/server/db/src/repositories/auth/index.ts
/**
 * Auth Repositories Barrel
 *
 * Functional-style repositories for authentication-related tables.
 */

// Auth Tokens (unified: password_reset, email_verification, email_change,
//              email_change_revert, magic_link)
export { createAuthTokenRepository, type AuthTokenRepository } from './auth-tokens';

// Refresh Tokens (includes family management methods)
export { createRefreshTokenRepository, type RefreshTokenRepository } from './refresh-tokens';

// Login Attempts
export { createLoginAttemptRepository, type LoginAttemptRepository } from './login-attempts';

// Security Events
export { createSecurityEventRepository, type SecurityEventRepository } from './security-events';

// TOTP Backup Codes
export { createTotpBackupCodeRepository, type TotpBackupCodeRepository } from './totp-backup-codes';

// Trusted Devices
export { createTrustedDeviceRepository, type TrustedDeviceRepository } from './trusted-devices';

// WebAuthn Credentials
export {
  createWebauthnCredentialRepository,
  type WebauthnCredentialRepository,
} from './webauthn-credentials';
