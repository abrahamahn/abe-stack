// main/shared/src/core/auth/password/auth.password-strength.ts
/**
 * @file Password Strength Estimation
 * @description Lightweight replacement for zxcvbn. Provides score (0-4) based on
 *   entropy and patterns, feedback with warnings and suggestions, and crack time estimates.
 * @module Core/Auth
 */

import {
  containsUserInput,
  hasKeyboardPattern,
  hasRepeatedChars,
  hasSequentialChars,
  isCommonPassword,
} from './auth.password-patterns';
import {
  calculateEntropy,
  calculateScore,
  estimateCrackTime,
  generateFeedback,
} from './auth.password-scoring';

// ============================================================================
// Types
// ============================================================================

/**
 * Strength result returned by estimatePasswordStrength
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
// Functions
// ============================================================================

/**
 * Estimate password strength
 *
 * @param password - Password to analyze
 * @param userInputs - Optional user-specific words to penalize (email, name, etc.)
 * @returns StrengthResult with score, feedback, and crack time estimate
 */
export function estimatePasswordStrength(
  password: string,
  userInputs: string[] = [],
): StrengthResult {
  // Calculate base entropy
  const entropy = calculateEntropy(password);

  // Detect patterns
  const penalties = {
    isCommon: isCommonPassword(password),
    hasRepeats: hasRepeatedChars(password),
    hasSequence: hasSequentialChars(password),
    hasKeyboard: hasKeyboardPattern(password),
    containsInput: containsUserInput(password, userInputs),
  };

  // Calculate score
  const score = calculateScore(entropy, penalties);

  // Generate feedback
  const feedback = generateFeedback(password, penalties);

  // Estimate crack time
  const crackTime = estimateCrackTime(entropy);

  return {
    score,
    feedback,
    crackTimeDisplay: crackTime.display,
    entropy,
  };
}
