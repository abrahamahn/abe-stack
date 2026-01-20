// packages/core/src/auth/index.ts
/**
 * Auth Domain
 *
 * Re-exports auth-specific utilities for authentication and authorization.
 */

// JWT/Token utilities (renamed for convenience)
export { sign as createToken, decode as decodeToken, verify as verifyToken } from '../crypto';

// Password validation
export {
  defaultPasswordConfig,
  estimatePasswordStrength,
  getStrengthColor,
  getStrengthLabel,
  validatePassword,
  validatePasswordBasic,
  type PasswordConfig,
  type PasswordValidationResult,
  type StrengthResult,
} from '../validation';

// Auth-specific errors
export {
  AccountLockedError,
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  InvalidTokenError,
  OAuthError,
  OAuthStateMismatchError,
  TokenReuseError,
  TotpInvalidError,
  TotpRequiredError,
  UserNotFoundError,
  WeakPasswordError,
} from '../errors';
