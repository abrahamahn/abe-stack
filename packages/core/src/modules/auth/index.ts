// packages/core/src/modules/auth/index.ts
/**
 * Authentication Module
 *
 * Password strength estimation, validation, pattern detection, and auth errors.
 */

// ============================================================================
// Errors
// ============================================================================
export * from './errors';

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
export { estimatePasswordStrength } from './passwordStrength';
export type { StrengthResult } from './passwordStrength';

// ============================================================================
// HTTP Mapping
// ============================================================================
export * from './httpMapper';
