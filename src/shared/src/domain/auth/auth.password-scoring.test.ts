// packages/shared/src/domain/auth/auth.password-scoring.test.ts
import { describe, expect, it } from 'vitest';

import {
  calculateEntropy,
  calculateScore,
  estimateCrackTime,
  generateFeedback,
  getCharsetSize,
  type PasswordPenalties,
} from './auth.password-scoring';

describe('Password Scoring', () => {
  describe('getCharsetSize', () => {
    it('should return 26 for lowercase only', () => {
      expect(getCharsetSize('abcdefgh')).toBe(26);
    });

    it('should return 26 for uppercase only', () => {
      expect(getCharsetSize('ABCDEFGH')).toBe(26);
    });

    it('should return 10 for numbers only', () => {
      expect(getCharsetSize('12345678')).toBe(10);
    });

    it('should return 32 for symbols only', () => {
      expect(getCharsetSize('!@#$%^&*')).toBe(32);
    });

    it('should combine charsets', () => {
      expect(getCharsetSize('abcABC')).toBe(52); // lower + upper
      expect(getCharsetSize('abc123')).toBe(36); // lower + numbers
      expect(getCharsetSize('Abc123!')).toBe(94); // all
    });

    it('should return 1 for empty string', () => {
      expect(getCharsetSize('')).toBe(1);
    });
  });

  describe('calculateEntropy', () => {
    it('should calculate entropy for lowercase password', () => {
      const entropy = calculateEntropy('password');
      // 8 chars * log2(26) ≈ 8 * 4.7 ≈ 37.6
      expect(entropy).toBeGreaterThan(35);
      expect(entropy).toBeLessThan(40);
    });

    it('should increase entropy with charset diversity', () => {
      const lowerOnly = calculateEntropy('password');
      const mixed = calculateEntropy('Password');
      const withNumbers = calculateEntropy('Password1');
      const withSymbols = calculateEntropy('Password1!');

      expect(mixed).toBeGreaterThan(lowerOnly);
      expect(withNumbers).toBeGreaterThan(mixed);
      expect(withSymbols).toBeGreaterThan(withNumbers);
    });

    it('should increase entropy with length', () => {
      const short = calculateEntropy('pass');
      const medium = calculateEntropy('password');
      const long = calculateEntropy('passwordpassword');

      expect(medium).toBeGreaterThan(short);
      expect(long).toBeGreaterThan(medium);
    });
  });

  describe('estimateCrackTime', () => {
    it('should return less than a second for very low entropy', () => {
      const result = estimateCrackTime(5);
      expect(result.display).toBe('less than a second');
    });

    it('should return seconds for low entropy', () => {
      const result = estimateCrackTime(15);
      expect(result.display).toContain('seconds');
    });

    it('should return minutes for moderate entropy', () => {
      // seconds = 2^entropy / 10000 / 2
      // For 60-3600 seconds (minutes): entropy between 20.2 and 26.1 bits
      const result = estimateCrackTime(22); // ~200 seconds = ~3 minutes
      expect(result.display).toContain('minutes');
    });

    it('should return hours for higher entropy', () => {
      // For 3600-86400 seconds (hours): entropy between 26.1 and 30.8 bits
      const result = estimateCrackTime(28); // ~13000 seconds = ~4 hours
      expect(result.display).toContain('hours');
    });

    it('should return days for even higher entropy', () => {
      // For 86400-2592000 seconds (days): entropy between 30.8 and 35.6 bits
      const result = estimateCrackTime(33); // ~430000 seconds = ~5 days
      expect(result.display).toContain('days');
    });

    it('should return months for high entropy', () => {
      // For 2592000-31536000 seconds (months): entropy between 35.6 and 39.2 bits
      const result = estimateCrackTime(37); // ~6.8M seconds = ~79 days = ~3 months
      expect(result.display).toContain('months');
    });

    it('should return years for very high entropy', () => {
      // For 31536000-3153600000 seconds (years): entropy between 39.2 and 45.8 bits
      const result = estimateCrackTime(42); // ~220M seconds = ~7 years
      expect(result.display).toContain('years');
    });

    it('should return centuries for very high entropy', () => {
      const result = estimateCrackTime(100);
      expect(result.display).toBe('centuries');
    });

    it('should include numeric seconds value', () => {
      const result = estimateCrackTime(30);
      expect(typeof result.seconds).toBe('number');
      expect(result.seconds).toBeGreaterThan(0);
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

    it('should return 0 for very weak passwords', () => {
      expect(calculateScore(10, noPenalties)).toBe(0);
    });

    it('should return 1 for weak passwords', () => {
      expect(calculateScore(25, noPenalties)).toBe(1);
    });

    it('should return 2 for fair passwords', () => {
      expect(calculateScore(40, noPenalties)).toBe(2);
    });

    it('should return 3 for good passwords', () => {
      expect(calculateScore(55, noPenalties)).toBe(3);
    });

    it('should return 4 for strong passwords', () => {
      expect(calculateScore(70, noPenalties)).toBe(4);
    });

    it('should reduce score for common passwords', () => {
      const commonPenalty: PasswordPenalties = { ...noPenalties, isCommon: true };
      expect(calculateScore(50, commonPenalty)).toBe(0);
    });

    it('should reduce score for repeated chars', () => {
      const repeatPenalty: PasswordPenalties = { ...noPenalties, hasRepeats: true };
      expect(calculateScore(50, repeatPenalty)).toBeLessThan(calculateScore(50, noPenalties));
    });

    it('should reduce score for keyboard patterns', () => {
      const keyboardPenalty: PasswordPenalties = { ...noPenalties, hasKeyboard: true };
      expect(calculateScore(50, keyboardPenalty)).toBeLessThan(calculateScore(50, noPenalties));
    });

    it('should apply multiple penalties', () => {
      const multiplePenalties: PasswordPenalties = {
        isCommon: false,
        hasRepeats: true,
        hasSequence: true,
        hasKeyboard: false,
        containsInput: false,
      };
      expect(calculateScore(50, multiplePenalties)).toBeLessThan(calculateScore(50, noPenalties));
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

    it('should warn about common passwords', () => {
      const penalties: PasswordPenalties = { ...noPenalties, isCommon: true };
      const feedback = generateFeedback('password', penalties);
      expect(feedback.warning).toBe('This is a commonly used password.');
      expect(feedback.suggestions).toContain('Avoid common passwords');
    });

    it('should warn about personal information', () => {
      const penalties: PasswordPenalties = { ...noPenalties, containsInput: true };
      const feedback = generateFeedback('johnpass', penalties);
      expect(feedback.warning).toBe('This password contains personal information.');
    });

    it('should warn about keyboard patterns', () => {
      const penalties: PasswordPenalties = { ...noPenalties, hasKeyboard: true };
      const feedback = generateFeedback('qwertypass', penalties);
      expect(feedback.warning).toBe('This password uses a keyboard pattern.');
    });

    it('should warn about sequential characters', () => {
      const penalties: PasswordPenalties = { ...noPenalties, hasSequence: true };
      const feedback = generateFeedback('abc123pass', penalties);
      expect(feedback.warning).toBe('This password contains sequential characters.');
    });

    it('should warn about repeated characters', () => {
      const penalties: PasswordPenalties = { ...noPenalties, hasRepeats: true };
      const feedback = generateFeedback('passssword', penalties);
      expect(feedback.warning).toBe('This password has repeated characters.');
    });

    it('should suggest adding uppercase', () => {
      const feedback = generateFeedback('password123!', noPenalties);
      expect(feedback.suggestions).toContain('Add uppercase letters');
    });

    it('should suggest adding lowercase', () => {
      const feedback = generateFeedback('PASSWORD123!', noPenalties);
      expect(feedback.suggestions).toContain('Add lowercase letters');
    });

    it('should suggest adding numbers', () => {
      const feedback = generateFeedback('Password!', noPenalties);
      expect(feedback.suggestions).toContain('Add numbers');
    });

    it('should suggest adding symbols', () => {
      const feedback = generateFeedback('Password123', noPenalties);
      expect(feedback.suggestions).toContain('Add symbols');
    });

    it('should suggest longer password', () => {
      const feedback = generateFeedback('Pass1!', noPenalties);
      expect(feedback.suggestions).toContain('Make the password longer');
    });

    it('should limit suggestions to 3', () => {
      const feedback = generateFeedback('a', noPenalties);
      expect(feedback.suggestions.length).toBeLessThanOrEqual(3);
    });
  });
});
