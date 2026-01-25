// packages/core/src/modules/auth/password.ts
import { estimatePasswordStrength } from './passwordStrength';

/**
 * Password validation configuration
 */
export interface PasswordConfig {
  minLength: number;
  maxLength: number;
  minScore: 0 | 1 | 2 | 3 | 4;
}

/**
 * Default password configuration (NIST guidelines)
 */
export const defaultPasswordConfig: PasswordConfig = {
  minLength: 8,
  maxLength: 64,
  minScore: 3,
};

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  isValid: boolean;
  score: number;
  errors: string[];
  feedback: {
    warning: string;
    suggestions: string[];
  };
  crackTimeDisplay: string;
}

/**
 * Validate password strength using custom entropy-based estimation
 * @param password - Password to validate
 * @param userInputs - Optional array of user-specific words to penalize (email, name, etc.)
 * @param config - Password configuration
 * @returns PasswordValidationResult
 */
export function validatePassword(
  password: string,
  userInputs: string[] = [],
  config: PasswordConfig = defaultPasswordConfig,
): Promise<PasswordValidationResult> {
  const errors: string[] = [];

  // Length checks
  if (password.length < config.minLength) {
    errors.push(`Password must be at least ${String(config.minLength)} characters`);
  }

  if (password.length > config.maxLength) {
    errors.push(`Password must be at most ${String(config.maxLength)} characters`);
  }

  // If basic length checks fail, return early
  if (errors.length > 0) {
    return Promise.resolve({
      isValid: false,
      score: 0,
      errors,
      feedback: {
        warning: '',
        suggestions: [],
      },
      crackTimeDisplay: 'instant',
    });
  }

  // Use custom strength estimation
  const result = estimatePasswordStrength(password, userInputs);

  // Check score
  if (result.score < config.minScore) {
    errors.push(
      `Password is too weak (score: ${String(result.score)}/${String(config.minScore)} required)`,
    );
  }

  return Promise.resolve({
    isValid: errors.length === 0,
    score: result.score,
    errors,
    feedback: {
      warning: result.feedback.warning,
      suggestions: result.feedback.suggestions,
    },
    crackTimeDisplay: result.crackTimeDisplay,
  });
}

/**
 * Synchronous password validation (basic checks only)
 * Use for quick client-side validation before full strength check
 */
export function validatePasswordBasic(
  password: string,
  config: PasswordConfig = defaultPasswordConfig,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < config.minLength) {
    errors.push(`Password must be at least ${String(config.minLength)} characters`);
  }

  if (password.length > config.maxLength) {
    errors.push(`Password must be at most ${String(config.maxLength)} characters`);
  }

  // Check for common weak patterns (not comprehensive, just quick checks)
  if (/^(.)\1+$/.test(password)) {
    errors.push('Password cannot be all the same character');
  }

  if (/^(012|123|234|345|456|567|678|789|890)+$/.test(password)) {
    errors.push('Password cannot be a simple sequence');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get a human-readable strength label
 */
export function getStrengthLabel(score: number): string {
  switch (score) {
    case 0:
      return 'Very Weak';
    case 1:
      return 'Weak';
    case 2:
      return 'Fair';
    case 3:
      return 'Strong';
    case 4:
      return 'Very Strong';
    default:
      return 'Unknown';
  }
}

/**
 * Get a color for the strength indicator
 */
export function getStrengthColor(score: number): string {
  switch (score) {
    case 0:
      return '#dc2626'; // red-600
    case 1:
      return '#ea580c'; // orange-600
    case 2:
      return '#ca8a04'; // yellow-600
    case 3:
      return '#16a34a'; // green-600
    case 4:
      return '#059669'; // emerald-600
    default:
      return '#6b7280'; // gray-500
  }
}
