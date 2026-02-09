// src/shared/src/domain/auth/auth.password-scoring.ts

/**
 * Penalties structure for password scoring
 */
export interface PasswordPenalties {
  isCommon: boolean;
  hasRepeats: boolean;
  hasSequence: boolean;
  hasKeyboard: boolean;
  containsInput: boolean;
}

/**
 * Calculate character set size based on password composition
 */
export function getCharsetSize(password: string): number {
  let size = 0;

  if (/[a-z]/.test(password)) size += 26;
  if (/[A-Z]/.test(password)) size += 26;
  if (/[0-9]/.test(password)) size += 10;
  if (/[^a-zA-Z0-9]/.test(password)) size += 32; // Common symbols

  return size !== 0 ? size : 1;
}

/**
 * Calculate entropy in bits
 */
export function calculateEntropy(password: string): number {
  const charsetSize = getCharsetSize(password);
  return password.length * Math.log2(charsetSize);
}

/**
 * Estimate crack time based on entropy
 * Assumes offline slow hashing (10,000 guesses/second)
 */
export function estimateCrackTime(entropy: number): { seconds: number; display: string } {
  // 10^4 guesses per second (offline slow hashing like bcrypt)
  const guessesPerSecond = 10000;
  const possibleCombinations = Math.pow(2, entropy);
  const seconds = possibleCombinations / guessesPerSecond / 2; // Average case

  // Format display
  if (seconds < 1) {
    return { seconds, display: 'less than a second' };
  }
  if (seconds < 60) {
    return { seconds, display: `${String(Math.round(seconds))} seconds` };
  }
  if (seconds < 3600) {
    return { seconds, display: `${String(Math.round(seconds / 60))} minutes` };
  }
  if (seconds < 86400) {
    return { seconds, display: `${String(Math.round(seconds / 3600))} hours` };
  }
  if (seconds < 2592000) {
    return { seconds, display: `${String(Math.round(seconds / 86400))} days` };
  }
  if (seconds < 31536000) {
    return { seconds, display: `${String(Math.round(seconds / 2592000))} months` };
  }
  if (seconds < 3153600000) {
    return { seconds, display: `${String(Math.round(seconds / 31536000))} years` };
  }
  return { seconds, display: 'centuries' };
}

/**
 * Calculate password strength score (0-4)
 */
export function calculateScore(entropy: number, penalties: PasswordPenalties): 0 | 1 | 2 | 3 | 4 {
  // Apply entropy penalties for patterns
  let adjustedEntropy = entropy;

  if (penalties.isCommon) adjustedEntropy *= 0.1;
  if (penalties.hasRepeats) adjustedEntropy *= 0.7;
  if (penalties.hasSequence) adjustedEntropy *= 0.7;
  if (penalties.hasKeyboard) adjustedEntropy *= 0.5;
  if (penalties.containsInput) adjustedEntropy *= 0.5;

  // Score thresholds based on adjusted entropy
  if (adjustedEntropy < 20) return 0;
  if (adjustedEntropy < 35) return 1;
  if (adjustedEntropy < 50) return 2;
  if (adjustedEntropy < 65) return 3;
  return 4;
}

/**
 * Generate feedback based on detected patterns
 */
export function generateFeedback(
  password: string,
  penalties: PasswordPenalties,
): { warning: string; suggestions: string[] } {
  const suggestions: string[] = [];
  let warning = '';

  if (penalties.isCommon) {
    warning = 'This is a commonly used password.';
    suggestions.push('Avoid common passwords');
  }

  if (penalties.containsInput) {
    warning = warning !== '' ? warning : 'This password contains personal information.';
    suggestions.push('Avoid using personal information in passwords');
  }

  if (penalties.hasKeyboard) {
    warning = warning !== '' ? warning : 'This password uses a keyboard pattern.';
    suggestions.push('Avoid keyboard patterns like "qwerty" or "asdf"');
  }

  if (penalties.hasSequence) {
    warning = warning !== '' ? warning : 'This password contains sequential characters.';
    suggestions.push('Avoid sequential characters like "abc" or "123"');
  }

  if (penalties.hasRepeats) {
    warning = warning !== '' ? warning : 'This password has repeated characters.';
    suggestions.push('Avoid repeated characters like "aaa"');
  }

  // General suggestions based on password composition
  if (!/[A-Z]/.test(password)) {
    suggestions.push('Add uppercase letters');
  }
  if (!/[a-z]/.test(password)) {
    suggestions.push('Add lowercase letters');
  }
  if (!/[0-9]/.test(password)) {
    suggestions.push('Add numbers');
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    suggestions.push('Add symbols');
  }
  if (password.length < 12) {
    suggestions.push('Make the password longer');
  }

  // Limit suggestions
  return {
    warning,
    suggestions: suggestions.slice(0, 3),
  };
}
