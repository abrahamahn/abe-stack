// src/server/core/src/auth/security/password-strength.test.ts
import { estimatePasswordStrength } from '@abe-stack/shared';
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

  describe('score threshold boundaries', () => {
    test('should return score 0 for empty password', () => {
      const result = estimatePasswordStrength('');
      expect(result.score).toBe(0);
    });

    test('should return score 0 for single character password', () => {
      const result = estimatePasswordStrength('a');
      expect(result.score).toBe(0);
    });

    test('should return consistent scores across multiple calls', () => {
      const password = 'TestPassword123!';
      const result1 = estimatePasswordStrength(password);
      const result2 = estimatePasswordStrength(password);
      expect(result1.score).toBe(result2.score);
      expect(result1.entropy).toBe(result2.entropy);
    });

    test('should return score between 0 and 4 inclusive', () => {
      const testCases = ['a', 'password', 'Password1', 'Password123!', 'Xk9$mQ2@nL5!pR8*vB3#'];

      for (const password of testCases) {
        const result = estimatePasswordStrength(password);
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(4);
      }
    });
  });

  describe('penalty combinations', () => {
    test('should apply cumulative penalties for multiple issues', () => {
      // Password with both common word and keyboard pattern
      const result = estimatePasswordStrength('password123qwerty');
      // Multiple penalties applied but longer length provides some entropy
      expect(result.score).toBeLessThanOrEqual(1);
      // Should still have a warning about the issues
      expect(result.feedback.warning).toBeTruthy();
    });

    test('should penalize passwords with repeats and sequences together', () => {
      const result = estimatePasswordStrength('aaabbbccc123');
      expect(result.score).toBeLessThanOrEqual(1);
      expect(result.feedback.warning).toBeTruthy();
    });

    test('should apply user input penalty even for strong base passwords', () => {
      const withoutInput = estimatePasswordStrength('JohnSmith2024!@#');
      const withInput = estimatePasswordStrength('JohnSmith2024!@#', ['john', 'smith']);
      expect(withInput.score).toBeLessThan(withoutInput.score);
    });
  });

  describe('edge cases', () => {
    test('should handle unicode characters', () => {
      const result = estimatePasswordStrength('Пароль123!');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(4);
    });

    test('should handle whitespace in passwords', () => {
      const result = estimatePasswordStrength('Password With Spaces 123!');
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    test('should handle very long passwords', () => {
      const longPassword = 'a'.repeat(100) + 'B'.repeat(100) + '1'.repeat(100);
      const result = estimatePasswordStrength(longPassword);
      // Long password has high entropy but repeated chars penalty
      expect(result.entropy).toBeGreaterThan(100);
    });

    test('should handle null-like user inputs', () => {
      const result = estimatePasswordStrength('TestPassword123!', ['', ' ', '  ']);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });
});
