// main/shared/src/core/auth/index.ts
/**
 * @file Auth Module Barrel
 * @description Central exports for authentication errors, password validation,
 *   roles, and session management.
 * @module Core/Auth
 */

// --- Password validation ---
export {
  defaultPasswordConfig,
  getStrengthColor,
  getStrengthLabel,
  validatePassword,
  validatePasswordBasic,
  type PasswordConfig,
  type PasswordValidationResult,
} from './passwords/auth.password';

export { estimatePasswordStrength, type StrengthResult } from './passwords/auth.password-strength';

export {
  calculateEntropy,
  calculateScore,
  estimateCrackTime,
  generateFeedback,
  getCharsetSize,
  type PasswordPenalties,
} from './passwords/auth.password-scoring';

export {
  containsUserInput,
  hasKeyboardPattern,
  hasRepeatedChars,
  hasSequentialChars,
  isCommonPassword,
} from './passwords/auth.password-patterns';

// --- Auth errors (canonical in engine/errors) ---
import {
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
} from '../../engine/errors';

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
};

// --- Sessions ---
export {
  getSessionAge,
  isSessionActive,
  isSessionRevoked,
} from './auth-sessions.logic';

export {
  createUserSessionSchema,
  updateUserSessionSchema,
  userSessionSchema,
  type CreateUserSession,
  type UpdateUserSession,
  type UserSession,
} from './auth-sessions.schemas';

// --- Roles ---
export {
  appRoleSchema,
  permissionSchema,
  tenantRoleSchema,
  type AppRole,
  type Permission,
  type TenantRole,
} from './roles';
