// packages/core/src/validation/__tests__/passwordStrength.test.ts
import { estimatePasswordStrength } from '@validation/passwordStrength';
import { describe, expect, test } from 'vitest';

describe('estimatePasswordStrength', () => {
  describe('score calculation', () => {
    test('should return score 0 for very weak passwords', () => {
      const result = estimatePasswordStrength('password');
      expect(result.score).toBe(0);
    });

    test('should return score 4 for very strong passwords', () => {
      const result = estimatePasswordStrength('Xk9$mQ2@nL5!pR8*');
      expect(result.score).toBe(4);
    });

    test('should penalize common passwords', () => {
      const commonResult = estimatePasswordStrength('password123');
      const uncommonResult = estimatePasswordStrength('x7k9m2n5p8');
      expect(commonResult.score).toBeLessThan(uncommonResult.score);
    });

    test('should penalize keyboard patterns', () => {
      const result = estimatePasswordStrength('qwertyuiop');
      expect(result.score).toBeLessThanOrEqual(1);
    });

    test('should penalize repeated characters', () => {
      const result = estimatePasswordStrength('aaaaaaaaaa');
      expect(result.score).toBeLessThanOrEqual(1);
    });

    test('should penalize sequential characters', () => {
      const result = estimatePasswordStrength('abcdefghij');
      expect(result.score).toBeLessThanOrEqual(1);
    });
  });

  describe('user inputs', () => {
    test('should penalize passwords containing user inputs', () => {
      const withoutInputs = estimatePasswordStrength('johnsmith2024');
      const withInputs = estimatePasswordStrength('johnsmith2024', ['john', 'smith']);
      expect(withInputs.score).toBeLessThanOrEqual(withoutInputs.score);
    });

    test('should ignore short user inputs', () => {
      const result = estimatePasswordStrength('abcdefgh12', ['ab']);
      // Short input (< 3 chars) should not trigger penalty
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe('feedback', () => {
    test('should provide warning for common passwords', () => {
      const result = estimatePasswordStrength('password');
      expect(result.feedback.warning).toContain('commonly used');
    });

    test('should provide suggestions for weak passwords', () => {
      const result = estimatePasswordStrength('password');
      expect(result.feedback.suggestions.length).toBeGreaterThan(0);
    });

    test('should suggest adding uppercase letters', () => {
      const result = estimatePasswordStrength('password123!');
      expect(result.feedback.suggestions).toContain('Add uppercase letters');
    });

    test('should suggest adding symbols', () => {
      const result = estimatePasswordStrength('Password123');
      expect(result.feedback.suggestions).toContain('Add symbols');
    });

    test('should limit suggestions to 3', () => {
      const result = estimatePasswordStrength('a');
      expect(result.feedback.suggestions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('crack time display', () => {
    test('should return instant for very weak passwords', () => {
      const result = estimatePasswordStrength('abc');
      expect(result.crackTimeDisplay).toMatch(/second|instant/);
    });

    test('should return longer time for strong passwords', () => {
      const result = estimatePasswordStrength('Xk9$mQ2@nL5!pR8*vB3#');
      expect(result.crackTimeDisplay).toMatch(/years|centuries/);
    });
  });

  describe('entropy calculation', () => {
    test('should calculate higher entropy for longer passwords', () => {
      const short = estimatePasswordStrength('abcd');
      const long = estimatePasswordStrength('abcdefghijklmnop');
      expect(long.entropy).toBeGreaterThan(short.entropy);
    });

    test('should calculate higher entropy for diverse character sets', () => {
      const lower = estimatePasswordStrength('abcdefgh');
      const mixed = estimatePasswordStrength('aBcD1234');
      expect(mixed.entropy).toBeGreaterThan(lower.entropy);
    });
  });

  describe('l33t speak detection', () => {
    test('should detect common password with l33t substitutions', () => {
      const result = estimatePasswordStrength('p@ssw0rd');
      expect(result.score).toBeLessThanOrEqual(1);
    });

    test('should detect password with trailing numbers removed', () => {
      const result = estimatePasswordStrength('password123456');
      expect(result.feedback.warning).toContain('commonly used');
    });
  });
});
