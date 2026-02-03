// shared/src/utils/password.test.ts
import { describe, expect, it } from 'vitest';

import {
  calculateEntropy,
  calculateScore,
  containsUserInput,
  estimateCrackTime,
  estimatePasswordStrength,
  generateFeedback,
  hasKeyboardPattern,
  hasRepeatedChars,
  hasSequentialChars,
  isCommonPassword,
  validatePassword,
} from './password';
import type { PasswordPenalties } from './password';

describe('password utilities', () => {
  // ==========================================================================
  // Pattern Detection
  // ==========================================================================
  describe('hasKeyboardPattern', () => {
    it('detects qwerty pattern', () => {
      expect(hasKeyboardPattern('myqwertypass')).toBe(true);
    });

    it('detects asdf pattern', () => {
      expect(hasKeyboardPattern('asdfghjk')).toBe(true);
    });

    it('detects 1234 pattern', () => {
      expect(hasKeyboardPattern('pass1234')).toBe(true);
    });

    it('returns false for no patterns', () => {
      expect(hasKeyboardPattern('Str0ng!P@ss')).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(hasKeyboardPattern('QWERTY')).toBe(true);
    });
  });

  describe('hasRepeatedChars', () => {
    it('detects 3+ repeated characters', () => {
      expect(hasRepeatedChars('paasssword')).toBe(true);
      expect(hasRepeatedChars('aaabbb')).toBe(true);
    });

    it('returns false for fewer than 3 repeats', () => {
      expect(hasRepeatedChars('aabb')).toBe(false);
      expect(hasRepeatedChars('password')).toBe(false);
    });
  });

  describe('hasSequentialChars', () => {
    it('detects ascending sequences', () => {
      expect(hasSequentialChars('abc')).toBe(true);
      expect(hasSequentialChars('xyz')).toBe(true);
      expect(hasSequentialChars('pass123word')).toBe(true);
    });

    it('detects descending sequences', () => {
      expect(hasSequentialChars('cba')).toBe(true);
      expect(hasSequentialChars('321pass')).toBe(true);
    });

    it('returns false for no sequences', () => {
      expect(hasSequentialChars('azbycx')).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(hasSequentialChars('ABC')).toBe(true);
    });
  });

  describe('isCommonPassword', () => {
    it('detects common passwords', () => {
      expect(isCommonPassword('password')).toBe(true);
      expect(isCommonPassword('123456')).toBe(true);
      expect(isCommonPassword('qwerty')).toBe(true);
      expect(isCommonPassword('admin')).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(isCommonPassword('Password')).toBe(true);
      expect(isCommonPassword('ADMIN')).toBe(true);
    });

    it('returns false for non-common passwords', () => {
      expect(isCommonPassword('Str0ng!P@ssW0rd#2024')).toBe(false);
    });
  });

  describe('containsUserInput', () => {
    it('detects user email in password', () => {
      expect(containsUserInput('mypassjohn@test.com', ['john@test.com'])).toBe(true);
    });

    it('detects user name in password', () => {
      expect(containsUserInput('john123pass', ['John'])).toBe(true);
    });

    it('ignores short user inputs (< 3 chars)', () => {
      expect(containsUserInput('abpass', ['ab'])).toBe(false);
    });

    it('ignores empty user inputs', () => {
      expect(containsUserInput('password', ['', '  '])).toBe(false);
    });

    it('returns false when no match', () => {
      expect(containsUserInput('Str0ng!Pass', ['alice@test.com'])).toBe(false);
    });
  });

  // ==========================================================================
  // Scoring & Estimation
  // ==========================================================================
  describe('calculateEntropy', () => {
    it('returns 0 for empty string', () => {
      expect(calculateEntropy('')).toBe(0);
    });

    it('calculates entropy for lowercase only', () => {
      const entropy = calculateEntropy('abcdefgh');
      // 8 chars, 26 charset = log2(26^8) ≈ 37.6
      expect(entropy).toBeCloseTo(37.6, 0);
    });

    it('increases entropy with mixed charsets', () => {
      const lower = calculateEntropy('abcdefgh');
      const mixed = calculateEntropy('Abcdefg1');
      expect(mixed).toBeGreaterThan(lower);
    });

    it('includes special characters in charset', () => {
      const withSymbol = calculateEntropy('a!');
      const withoutSymbol = calculateEntropy('ab');
      // 'a!' uses lowercase (26) + special (32) = 58 charset
      // 'ab' uses lowercase only (26)
      expect(withSymbol).toBeGreaterThan(withoutSymbol);
    });
  });

  describe('calculateScore', () => {
    const noPenalties: PasswordPenalties = {
      isCommon: false,
      hasRepeats: false,
      hasSequence: false,
      hasKeyboard: false,
      containsInput: false,
    };

    it('returns 0 for very low entropy', () => {
      expect(calculateScore(10, noPenalties)).toBe(0);
    });

    it('returns 1 for entropy >= 20', () => {
      expect(calculateScore(20, noPenalties)).toBe(1);
    });

    it('returns 2 for entropy >= 30', () => {
      expect(calculateScore(30, noPenalties)).toBe(2);
    });

    it('returns 3 for entropy >= 45', () => {
      expect(calculateScore(45, noPenalties)).toBe(3);
    });

    it('returns 4 for entropy >= 60', () => {
      expect(calculateScore(60, noPenalties)).toBe(4);
    });

    it('reduces score by penalty count', () => {
      const twoPenalties: PasswordPenalties = {
        isCommon: true,
        hasRepeats: true,
        hasSequence: false,
        hasKeyboard: false,
        containsInput: false,
      };
      // Entropy >= 60 => score 4, minus 2 penalties => 2
      expect(calculateScore(60, twoPenalties)).toBe(2);
    });

    it('never goes below 0', () => {
      const allPenalties: PasswordPenalties = {
        isCommon: true,
        hasRepeats: true,
        hasSequence: true,
        hasKeyboard: true,
        containsInput: true,
      };
      expect(calculateScore(60, allPenalties)).toBe(0);
    });
  });

  describe('estimateCrackTime', () => {
    it('returns instantly for zero entropy', () => {
      const result = estimateCrackTime(0);
      expect(result.display).toBe('instantly');
    });

    it('returns centuries for high entropy', () => {
      const result = estimateCrackTime(128);
      expect(result.display).toBe('centuries');
    });

    it('returns numeric seconds value', () => {
      const result = estimateCrackTime(30);
      expect(result.seconds).toBeGreaterThan(0);
    });
  });

  describe('generateFeedback', () => {
    const noPenalties: PasswordPenalties = {
      isCommon: false,
      hasRepeats: false,
      hasSequence: false,
      hasKeyboard: false,
      containsInput: false,
    };

    it('suggests adding missing character types', () => {
      const result = generateFeedback('abc', noPenalties);
      expect(result.suggestions).toContain('Use at least 8 characters');
      expect(result.suggestions).toContain('Add uppercase letters');
      expect(result.suggestions).toContain('Add numbers');
      expect(result.suggestions).toContain('Add symbols');
    });

    it('suggests avoiding common passwords when isCommon', () => {
      const penalties: PasswordPenalties = { ...noPenalties, isCommon: true };
      const result = generateFeedback('password', penalties);
      expect(result.suggestions).toContain('Avoid common passwords');
    });

    it('suggests avoiding repeated characters', () => {
      const penalties: PasswordPenalties = { ...noPenalties, hasRepeats: true };
      const result = generateFeedback('aaabbb123', penalties);
      expect(result.suggestions).toContain('Avoid repeated characters');
    });

    it('returns warning for weak passwords', () => {
      const result = generateFeedback('weak', noPenalties);
      expect(result.warning).toBe('This password is weak');
    });

    it('returns empty warning for strong passwords', () => {
      const result = generateFeedback('Str0ng!P@ss', noPenalties);
      expect(result.warning).toBe('');
    });
  });

  // ==========================================================================
  // Main Functions
  // ==========================================================================
  describe('estimatePasswordStrength', () => {
    it('returns full analysis result', () => {
      const result = estimatePasswordStrength('Str0ng!P@ssW0rd');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('feedback');
      expect(result).toHaveProperty('crackTimeDisplay');
      expect(result).toHaveProperty('entropy');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(4);
    });

    it('gives low score to weak passwords', () => {
      const result = estimatePasswordStrength('password');
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('gives higher score to strong passwords', () => {
      const result = estimatePasswordStrength('X7$mK2!pQ9&wL4@nR');
      expect(result.score).toBeGreaterThanOrEqual(2);
    });

    it('penalizes passwords containing user inputs', () => {
      const withInput = estimatePasswordStrength('johndoe123!A', ['johndoe']);
      const withoutInput = estimatePasswordStrength('xYz@bC123!A', []);
      expect(withInput.score).toBeLessThanOrEqual(withoutInput.score);
    });
  });

  describe('validatePassword', () => {
    it('passes for strong passwords', () => {
      const result = validatePassword('X7$mK2!pQ9&wL4@n');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails for short passwords', () => {
      const result = validatePassword('Ab1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('fails for passwords without lowercase', () => {
      const result = validatePassword('ABCDEFGH1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('fails for passwords without uppercase', () => {
      const result = validatePassword('abcdefgh1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('fails for weak passwords', () => {
      const result = validatePassword('password');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is too weak');
    });
  });
});
