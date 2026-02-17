// main/shared/src/core/auth/passwords/auth.password.strength.ts
/**
 * Password Strength Estimation
 *
 * Lightweight replacement for zxcvbn. Provides:
 * - Score (0-4) based on entropy and patterns
 * - Feedback with warnings and suggestions
 * - Crack time estimates
 */

import {
  containsUserInput,
  hasKeyboardPattern,
  hasRepeatedChars,
  hasSequentialChars,
  isCommonPassword,
} from './auth.password.patterns';
import {
  calculateEntropy,
  calculateScore,
  estimateCrackTime,
  generateFeedback,
} from './auth.password.scoring';

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
