// packages/shared/src/validation/password.ts
import type zxcvbn from 'zxcvbn';

type ZxcvbnFn = typeof zxcvbn;
type ZxcvbnResult = ReturnType<ZxcvbnFn>;

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
 * Dynamically import zxcvbn to avoid bundling on client if not needed
 * Note: On server, this is used for registration validation
 */
let zxcvbnFn: ZxcvbnFn | null = null;

async function getZxcvbn(): Promise<ZxcvbnFn> {
  if (!zxcvbnFn) {
    const mod = await import('zxcvbn');
    zxcvbnFn = mod.default;
  }
  return zxcvbnFn;
}

/**
 * Validate password strength using zxcvbn
 * @param password - Password to validate
 * @param userInputs - Optional array of user-specific words to penalize (email, name, etc.)
 * @param config - Password configuration
 * @returns PasswordValidationResult
 */
export async function validatePassword(
  password: string,
  userInputs: string[] = [],
  config: PasswordConfig = defaultPasswordConfig,
): Promise<PasswordValidationResult> {
  const errors: string[] = [];

  // Length checks
  if (password.length < config.minLength) {
    errors.push(`Password must be at least ${config.minLength} characters`);
  }

  if (password.length > config.maxLength) {
    errors.push(`Password must be at most ${config.maxLength} characters`);
  }

  // If basic length checks fail, return early
  if (errors.length > 0) {
    return {
      isValid: false,
      score: 0,
      errors,
      feedback: {
        warning: '',
        suggestions: [],
      },
      crackTimeDisplay: 'instant',
    };
  }

  // Use zxcvbn for strength analysis
  const zxcvbn = await getZxcvbn();
  const result: ZxcvbnResult = zxcvbn(password, userInputs);

  // Check score
  if (result.score < config.minScore) {
    errors.push(`Password is too weak (score: ${result.score}/${config.minScore} required)`);
  }

  return {
    isValid: errors.length === 0,
    score: result.score,
    errors,
    feedback: {
      warning: result.feedback.warning || '',
      suggestions: result.feedback.suggestions || [],
    },
    crackTimeDisplay: result.crack_times_display.offline_slow_hashing_1e4_per_second as string,
  };
}

/**
 * Synchronous password validation (basic checks only, no zxcvbn)
 * Use for quick client-side validation before full async check
 */
export function validatePasswordBasic(
  password: string,
  config: PasswordConfig = defaultPasswordConfig,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < config.minLength) {
    errors.push(`Password must be at least ${config.minLength} characters`);
  }

  if (password.length > config.maxLength) {
    errors.push(`Password must be at most ${config.maxLength} characters`);
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
