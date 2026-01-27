// packages/core/src/modules/auth/index.ts
/**
 * Authentication Module
 *
 * Password strength estimation, validation, pattern detection, and auth errors.
 */

// ============================================================================
// Errors
// ============================================================================
export {
  AccountLockedError,
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  EmailSendError,
  InvalidCredentialsError,
  InvalidTokenError,
  OAuthError,
  OAuthStateMismatchError,
  TokenReuseError,
  TotpInvalidError,
  TotpRequiredError,
  UserNotFoundError,
  WeakPasswordError,
} from './errors';

// ============================================================================
// Password Validation
// ============================================================================
export {
  defaultPasswordConfig,
  getStrengthColor,
  getStrengthLabel,
  validatePassword,
  validatePasswordBasic,
} from './password';
export type { PasswordConfig, PasswordValidationResult } from './password';

// ============================================================================
// Password Patterns
// ============================================================================
export {
  COMMON_PASSWORDS,
  containsUserInput,
  hasKeyboardPattern,
  hasRepeatedChars,
  hasSequentialChars,
  isCommonPassword,
  KEYBOARD_PATTERNS,
} from './password-patterns';

// ============================================================================
// Password Scoring
// ============================================================================
export {
  calculateEntropy,
  calculateScore,
  estimateCrackTime,
  generateFeedback,
  getCharsetSize,
} from './password-scoring';
export type { PasswordPenalties } from './password-scoring';

// ============================================================================
// Password Strength Estimation
// ============================================================================
export { estimatePasswordStrength } from './password-strength';
export type { StrengthResult } from './password-strength';

// ============================================================================
// HTTP Mapping
// ============================================================================
export { HTTP_ERROR_MESSAGES, isKnownAuthError, mapErrorToHttpResponse } from './http-mapper';
export type {
  ErrorMapperLogger,
  ErrorMapperOptions,
  ErrorStatusCode,
  HttpErrorResponse,
} from './http-mapper';
