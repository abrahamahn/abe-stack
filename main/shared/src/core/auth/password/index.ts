// main/shared/src/core/auth/password/index.ts
/**
 * @file Password Module Barrel
 * @description Re-exports for password validation, patterns, scoring, and strength.
 * @module Core/Auth
 */

// --- auth.password-patterns ---
export {
  COMMON_PASSWORDS,
  containsUserInput,
  hasKeyboardPattern,
  hasRepeatedChars,
  hasSequentialChars,
  isCommonPassword,
  KEYBOARD_PATTERNS,
} from './auth.password-patterns';

// --- auth.password-scoring ---
export {
  calculateEntropy,
  calculateScore,
  estimateCrackTime,
  generateFeedback,
  getCharsetSize,
  type PasswordPenalties,
} from './auth.password-scoring';

// --- auth.password-strength ---
export {
  estimatePasswordStrength,
  type StrengthResult,
} from './auth.password-strength';

// --- auth.password ---
export {
  defaultPasswordConfig,
  getStrengthColor,
  getStrengthLabel,
  validatePassword,
  validatePasswordBasic,
  type PasswordConfig,
  type PasswordValidationResult,
} from './auth.password';
