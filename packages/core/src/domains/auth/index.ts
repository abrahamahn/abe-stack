// packages/core/src/domains/auth/index.ts
/**
 * Auth Domain
 *
 * Authentication errors and password validation.
 */

// Auth errors
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

// Password validation (re-export from validation submodule)
export {
  COMMON_PASSWORDS,
  containsUserInput,
  defaultPasswordConfig,
  estimatePasswordStrength,
  getStrengthColor,
  getStrengthLabel,
  hasKeyboardPattern,
  hasRepeatedChars,
  hasSequentialChars,
  isCommonPassword,
  KEYBOARD_PATTERNS,
  validatePassword,
  validatePasswordBasic,
} from './validation';
export type {
  PasswordConfig,
  PasswordPenalties,
  PasswordValidationResult,
  StrengthResult,
} from './validation';
