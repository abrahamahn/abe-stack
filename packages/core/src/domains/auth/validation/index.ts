// packages/core/src/domains/auth/validation/index.ts
/**
 * Password Validation
 *
 * Password strength estimation, validation, and pattern detection.
 */

// Password validation
export {
  defaultPasswordConfig,
  getStrengthColor,
  getStrengthLabel,
  validatePassword,
  validatePasswordBasic,
} from './password';
export type { PasswordConfig, PasswordValidationResult } from './password';

// Password patterns
export {
  COMMON_PASSWORDS,
  containsUserInput,
  hasKeyboardPattern,
  hasRepeatedChars,
  hasSequentialChars,
  isCommonPassword,
  KEYBOARD_PATTERNS,
} from './password-patterns';

// Password scoring
export {
  calculateEntropy,
  calculateScore,
  estimateCrackTime,
  generateFeedback,
  getCharsetSize,
} from './password-scoring';
export type { PasswordPenalties } from './password-scoring';

// Password strength estimation
export { estimatePasswordStrength } from './passwordStrength';
export type { StrengthResult } from './passwordStrength';
