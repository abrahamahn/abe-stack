// packages/core/src/validation/__tests__/password.test.ts
import { describe, expect, test } from 'vitest';

import {
  defaultPasswordConfig,
  getStrengthColor,
  getStrengthLabel,
  validatePassword,
  validatePasswordBasic,
} from '@validation/password';

describe('defaultPasswordConfig', () => {
  test('should have minLength of 8', () => {
    expect(defaultPasswordConfig.minLength).toBe(8);
  });

  test('should have maxLength of 64', () => {
    expect(defaultPasswordConfig.maxLength).toBe(64);
  });

  test('should have minScore of 3', () => {
    expect(defaultPasswordConfig.minScore).toBe(3);
  });
});

describe('validatePasswordBasic', () => {
  test('should pass for valid password', () => {
    const result = validatePasswordBasic('validpassword123');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should fail for password shorter than minLength', () => {
    const result = validatePasswordBasic('short');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters');
  });

  test('should fail for password longer than maxLength', () => {
    const longPassword = 'a'.repeat(65);
    const result = validatePasswordBasic(longPassword);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must be at most 64 characters');
  });

  test('should fail for password with all same characters', () => {
    const result = validatePasswordBasic('aaaaaaaa');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password cannot be all the same character');
  });

  test('should fail for simple numeric sequences', () => {
    // The regex matches repeating 3-digit patterns like 123123123
    const result = validatePasswordBasic('123123123');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password cannot be a simple sequence');
  });

  test('should use custom config when provided', () => {
    const customConfig = { minLength: 10, maxLength: 20, minScore: 2 as const };
    const result = validatePasswordBasic('12345678', customConfig);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must be at least 10 characters');
  });

  test('should accumulate multiple errors', () => {
    const result = validatePasswordBasic('aaa');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

describe('validatePassword', () => {
  test('should pass for strong password', async () => {
    const result = await validatePassword('MyStr0ng!P@ssword2024');
    expect(result.isValid).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(3);
  });

  test('should fail for short password', async () => {
    const result = await validatePassword('short');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters');
    expect(result.score).toBe(0);
  });

  test('should fail for too long password', async () => {
    const longPassword = 'a'.repeat(65);
    const result = await validatePassword(longPassword);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must be at most 64 characters');
  });

  test('should fail for weak password', async () => {
    const result = await validatePassword('password123');
    expect(result.isValid).toBe(false);
    expect(result.score).toBeLessThan(3);
  });

  test('should provide feedback for weak passwords', async () => {
    const result = await validatePassword('password');
    expect(result.feedback).toBeDefined();
  });

  test('should provide crack time display', async () => {
    const result = await validatePassword('testpassword');
    expect(result.crackTimeDisplay).toBeDefined();
    expect(typeof result.crackTimeDisplay).toBe('string');
  });

  test('should penalize user-specific inputs', async () => {
    const resultWithoutInputs = await validatePassword('johnsmith2024!');
    const resultWithInputs = await validatePassword('johnsmith2024!', ['john', 'smith']);
    // Score with user inputs should be lower or equal
    expect(resultWithInputs.score).toBeLessThanOrEqual(resultWithoutInputs.score);
  });

  test('should use custom config', async () => {
    const customConfig = { minLength: 12, maxLength: 32, minScore: 4 as const };
    const result = await validatePassword('short123!', [], customConfig);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must be at least 12 characters');
  });
});

describe('getStrengthLabel', () => {
  test('should return "Very Weak" for score 0', () => {
    expect(getStrengthLabel(0)).toBe('Very Weak');
  });

  test('should return "Weak" for score 1', () => {
    expect(getStrengthLabel(1)).toBe('Weak');
  });

  test('should return "Fair" for score 2', () => {
    expect(getStrengthLabel(2)).toBe('Fair');
  });

  test('should return "Strong" for score 3', () => {
    expect(getStrengthLabel(3)).toBe('Strong');
  });

  test('should return "Very Strong" for score 4', () => {
    expect(getStrengthLabel(4)).toBe('Very Strong');
  });

  test('should return "Unknown" for invalid score', () => {
    expect(getStrengthLabel(5)).toBe('Unknown');
    expect(getStrengthLabel(-1)).toBe('Unknown');
  });
});

describe('getStrengthColor', () => {
  test('should return red for score 0', () => {
    expect(getStrengthColor(0)).toBe('#dc2626');
  });

  test('should return orange for score 1', () => {
    expect(getStrengthColor(1)).toBe('#ea580c');
  });

  test('should return yellow for score 2', () => {
    expect(getStrengthColor(2)).toBe('#ca8a04');
  });

  test('should return green for score 3', () => {
    expect(getStrengthColor(3)).toBe('#16a34a');
  });

  test('should return emerald for score 4', () => {
    expect(getStrengthColor(4)).toBe('#059669');
  });

  test('should return gray for invalid score', () => {
    expect(getStrengthColor(5)).toBe('#6b7280');
    expect(getStrengthColor(-1)).toBe('#6b7280');
  });
});
