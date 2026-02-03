// shared/src/domain/auth/auth.password.ts

/**
 * @file Password Logic
 * @description Utilities for validating password strength, entropy, and checking against common patterns.
 * @module Domain/Auth
 */

// ============================================================================
// Types
// ============================================================================

export interface PasswordPenalties {
  isCommon: boolean;
  hasRepeats: boolean;
  hasSequence: boolean;
  hasKeyboard: boolean;
  containsInput: boolean;
}

interface CrackTime {
  seconds: number;
  display: string;
}

/**
 * Result returned by full password strength estimation.
 */
export interface StrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  feedback: {
    warning: string;
    suggestions: string[];
  };
  crackTimeDisplay: string;
  entropy: number;
}

// ============================================================================
// Pattern Detection Utilities
// ============================================================================

/**
 * Checks if password contains common keyboard patterns (qwerty, asdf, etc.).
 * @param password - The password to check
 */
export function hasKeyboardPattern(password: string): boolean {
  const patterns = ['qwerty', 'asdf', 'zxcv', '1234', '4321', 'qwer', '321', 'abc', 'cba'];
  const lowerPassword = password.toLowerCase();
  return patterns.some((pattern) => lowerPassword.includes(pattern));
}

/**
 * Checks if password contains 3+ repeated characters (e.g. "aaa").
 * @param password - The password to check
 */
export function hasRepeatedChars(password: string): boolean {
  return /(.)\1{2,}/.test(password);
}

/**
 * Checks if password contains sequential characters (e.g. "abc", "123").
 * @param password - The password to check
 */
export function hasSequentialChars(password: string): boolean {
  const lowerPassword = password.toLowerCase();
  // Check ascending
  for (let i = 0; i < lowerPassword.length - 2; i++) {
    const code = lowerPassword.charCodeAt(i);
    if (
      code + 1 === lowerPassword.charCodeAt(i + 1) &&
      code + 2 === lowerPassword.charCodeAt(i + 2)
    )
      return true;
  }
  // Check descending
  for (let i = 0; i < lowerPassword.length - 2; i++) {
    const code = lowerPassword.charCodeAt(i);
    if (
      code - 1 === lowerPassword.charCodeAt(i + 1) &&
      code - 2 === lowerPassword.charCodeAt(i + 2)
    )
      return true;
  }
  return false;
}

/**
 * Checks if password is in a list of common weak passwords.
 * @param password - The password to check
 */
export function isCommonPassword(password: string): boolean {
  const commonPasswords = [
    'password',
    '123456',
    '12345678',
    'qwerty',
    'abc123',
    'admin',
    'welcome',
    '12345',
    '1234',
    '111111',
  ];
  return commonPasswords.includes(password.toLowerCase());
}

/**
 * Checks if password contains any user-specific input (e.g. email, name).
 * @param password - The password
 * @param userInputs - List of user strings (email, name, username)
 */
export function containsUserInput(password: string, userInputs: string[]): boolean {
  const p = password.toLowerCase();
  return userInputs
    .map((s) => s.toLowerCase().trim())
    .filter((s): s is string => s !== '' && s.length >= 3)
    .some((s) => p.includes(s));
}

// ============================================================================
// Scoring & Estimation
// ============================================================================

/**
 * Calculates raw entropy bits of the password.
 * @param password - The password
 */
export function calculateEntropy(password: string): number {
  if (password === '') return 0;
  let charsetSize = 0;
  if (/[a-z]/.test(password)) charsetSize += 26;
  if (/[A-Z]/.test(password)) charsetSize += 26;
  if (/[0-9]/.test(password)) charsetSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32;
  return Math.log2(Math.pow(charsetSize, password.length));
}

/**
 * Derives a 0-4 score from entropy and applied penalties.
 * @param entropy - Raw bit entropy
 * @param penalties - Detected penalties
 */
export function calculateScore(entropy: number, penalties: PasswordPenalties): 0 | 1 | 2 | 3 | 4 {
  let score = 0;
  if (entropy >= 60) score = 4;
  else if (entropy >= 45) score = 3;
  else if (entropy >= 30) score = 2;
  else if (entropy >= 20) score = 1;

  const penaltyCount = Object.values(penalties).filter(Boolean).length;
  return Math.max(0, score - penaltyCount) as 0 | 1 | 2 | 3 | 4;
}

/**
 * Estimates time to crack via brute force.
 * NOTE: This is a rough heuristic based on entropy. For high-security contexts,
 * prefer a more robust library like zxcvbn or strictly enforce entropy >= 60.
 *
 * @param entropy - Raw bit entropy
 */
export function estimateCrackTime(entropy: number): CrackTime {
  const guessesPerSecond = 10e9; // 10 Billion/sec (Rough estimate for modern hardware)
  const seconds = Math.pow(2, entropy) / guessesPerSecond;

  let display = 'instantly';
  if (seconds >= 3153600000) display = 'centuries';
  else if (seconds >= 31536000) display = `${Math.round(seconds / 31536000)} years`;
  else if (seconds >= 2592000) display = `${Math.round(seconds / 2592000)} months`;
  else if (seconds >= 86400) display = `${Math.round(seconds / 86400)} days`;
  else if (seconds >= 3600) display = `${Math.round(seconds / 3600)} hours`;
  else if (seconds >= 60) display = `${Math.round(seconds / 60)} minutes`;
  else if (seconds >= 1) display = `${Math.round(seconds)} seconds`;

  return { seconds, display };
}

/**
 * Generates user-facing feedback based on analysis.
 */
export function generateFeedback(
  password: string,
  penalties: PasswordPenalties,
): { warning: string; suggestions: string[] } {
  const suggestions: string[] = [];
  if (password.length < 8) suggestions.push('Use at least 8 characters');
  if (!/[a-z]/.test(password)) suggestions.push('Add lowercase letters');
  if (!/[A-Z]/.test(password)) suggestions.push('Add uppercase letters');
  if (!/[0-9]/.test(password)) suggestions.push('Add numbers');
  if (!/[^a-zA-Z0-9]/.test(password)) suggestions.push('Add symbols');

  if (penalties.isCommon) suggestions.push('Avoid common passwords');
  if (penalties.hasRepeats) suggestions.push('Avoid repeated characters');
  if (penalties.hasSequence) suggestions.push('Avoid sequential characters');
  if (penalties.containsInput) suggestions.push('Avoid using personal information');

  return {
    warning: suggestions.length > 0 ? 'This password is weak' : '',
    suggestions,
  };
}

// ============================================================================
// Main Exported Functions
// ============================================================================

/**
 * Analyzes password strength and returns comprehensive details.
 * @param password - The password to analyze
 * @param userInputs - Optional context (email, username) to check against
 */
export function estimatePasswordStrength(
  password: string,
  userInputs: string[] = [],
): StrengthResult {
  const entropy = calculateEntropy(password);
  const penalties = {
    isCommon: isCommonPassword(password),
    hasRepeats: hasRepeatedChars(password),
    hasSequence: hasSequentialChars(password),
    hasKeyboard: hasKeyboardPattern(password),
    containsInput: containsUserInput(password, userInputs),
  };
  const score = calculateScore(entropy, penalties);
  const feedback = generateFeedback(password, penalties);
  const crackTime = estimateCrackTime(entropy);

  return { score, feedback, crackTimeDisplay: crackTime.display, entropy };
}

/**
 * Simple validator for minimum password requirements.
 * @param password - Password to check
 * @param userInputs - Optional context
 */
export function validatePassword(
  password: string,
  userInputs: string[] = [],
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters long');
  if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');

  // Re-use penalties logic for strict checking
  const strength = estimatePasswordStrength(password, userInputs);
  if (strength.score < 2) errors.push('Password is too weak');

  return { isValid: errors.length === 0, errors };
}
