// main/shared/src/core/constants/auth.ts

/**
 * @file Authentication Constants
 * @description Roles, OAuth providers, expiry times, login failures, and password config.
 * @module Core/Constants/Auth
 */

// ============================================================================
// Roles
// ============================================================================

export const APP_ROLES = ['admin', 'moderator', 'user'] as const;

// ============================================================================
// OAuth
// ============================================================================

export const OAUTH_PROVIDERS = ['google', 'github', 'apple'] as const;

// ============================================================================
// Expiry / Timeouts
// ============================================================================

export const AUTH_EXPIRY = {
  EMAIL_CHANGE_HOURS: 24,
  EMAIL_CHANGE_REVERT_HOURS: 48,
  MAGIC_LINK_MINUTES: 15,
  OAUTH_STATE_MINUTES: 10,
  VERIFICATION_TOKEN_HOURS: 24,
  SUDO_MINUTES: 5,
  INVITE_DAYS: 7,
  SMS_CODE_MINUTES: 5,
  IMPERSONATION_MINUTES: 30,
} as const;

// ============================================================================
// Login Failure Reasons
// ============================================================================

export const LOGIN_FAILURE_REASON = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  PASSWORD_MISMATCH: 'PASSWORD_MISMATCH',
  UNVERIFIED_EMAIL: 'UNVERIFIED_EMAIL',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  TOTP_REQUIRED: 'TOTP_REQUIRED',
  SMS_REQUIRED: 'SMS_REQUIRED',
  TOTP_INVALID: 'TOTP_INVALID',
  CAPTCHA_FAILED: 'CAPTCHA_FAILED',
  ACCOUNT_DEACTIVATED: 'ACCOUNT_DEACTIVATED',
  ACCOUNT_DELETED: 'ACCOUNT_DELETED',
} as const;

// ============================================================================
// Password Configuration
// ============================================================================

export const defaultPasswordConfig = {
  minLength: 8,
  maxLength: 64,
  minScore: 3,
};

export const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  'password',
  '123456',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty',
  'abc123',
  '111111',
  'password1',
  'iloveyou',
  'admin',
  'welcome',
  'monkey',
  'dragon',
  'master',
  'letmein',
  'login',
  'princess',
  'football',
  'shadow',
  'sunshine',
  'trustno1',
  'batman',
  'access',
  'hello',
  'charlie',
  'donald',
  '!@#$%^&*',
  'passw0rd',
  'qwerty123',
]);

export const KEYBOARD_PATTERNS: readonly string[] = [
  'qwerty',
  'qwertz',
  'azerty',
  'asdf',
  'asdfgh',
  'zxcv',
  'zxcvbn',
  'qazwsx',
  '1qaz2wsx',
  '1234',
  '12345',
  '123456',
  '1234567',
  '12345678',
  '0987',
  '09876',
  '098765',
  '0987654',
  '09876543',
] as const;
