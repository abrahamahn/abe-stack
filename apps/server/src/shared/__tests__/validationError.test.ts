// apps/server/src/shared/__tests__/validationError.test.ts
import {
  formatValidationErrors,
  type ValidationErrorResponse,
  type ZodIssueMinimal,
} from '@shared/validationError';
import { describe, expect, test } from 'vitest';

describe('Validation Error Utilities', () => {
  describe('formatValidationErrors', () => {
    test('should format a single validation error', () => {
      const issues: ZodIssueMinimal[] = [
        { path: ['email'], message: 'Invalid email format', code: 'invalid_string' },
      ];

      const result = formatValidationErrors(issues);

      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toBe('Request validation failed');
      expect(result.error.details).toHaveLength(1);
      expect(result.error.details[0]).toEqual({
        field: 'email',
        message: 'Invalid email format',
        code: 'invalid_string',
      });
    });

    test('should format multiple validation errors', () => {
      const issues: ZodIssueMinimal[] = [
        { path: ['email'], message: 'Invalid email format', code: 'invalid_string' },
        {
          path: ['password'],
          message: 'Password must be at least 8 characters',
          code: 'too_small',
        },
        { path: ['age'], message: 'Expected number, received string', code: 'invalid_type' },
      ];

      const result = formatValidationErrors(issues);

      expect(result.error.details).toHaveLength(3);
      expect(result.error.details[0]?.field).toBe('email');
      expect(result.error.details[1]?.field).toBe('password');
      expect(result.error.details[2]?.field).toBe('age');
    });

    test('should handle nested path fields', () => {
      const issues: ZodIssueMinimal[] = [
        { path: ['user', 'profile', 'email'], message: 'Invalid email', code: 'invalid_string' },
      ];

      const result = formatValidationErrors(issues);

      expect(result.error.details[0]?.field).toBe('user.profile.email');
    });

    test('should handle array index in path', () => {
      const issues: ZodIssueMinimal[] = [
        { path: ['items', 0, 'name'], message: 'Required', code: 'invalid_type' },
        { path: ['items', 2, 'price'], message: 'Must be positive', code: 'too_small' },
      ];

      const result = formatValidationErrors(issues);

      expect(result.error.details[0]?.field).toBe('items.0.name');
      expect(result.error.details[1]?.field).toBe('items.2.price');
    });

    test('should handle empty path (root level error)', () => {
      const issues: ZodIssueMinimal[] = [
        { path: [], message: 'Invalid input', code: 'invalid_type' },
      ];

      const result = formatValidationErrors(issues);

      expect(result.error.details[0]?.field).toBe('');
    });

    test('should handle empty issues array', () => {
      const issues: ZodIssueMinimal[] = [];

      const result = formatValidationErrors(issues);

      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.details).toHaveLength(0);
    });

    test('should return correct TypeScript types', () => {
      const issues: ZodIssueMinimal[] = [{ path: ['field'], message: 'Error', code: 'custom' }];

      const result: ValidationErrorResponse = formatValidationErrors(issues);
      const detail = result.error.details[0];

      // Type assertions to verify structure
      expect(result.ok).toBe(false);
      expect(typeof result.error.code).toBe('string');
      expect(typeof result.error.message).toBe('string');
      expect(Array.isArray(result.error.details)).toBe(true);
      expect(detail).toBeDefined();
      expect(typeof detail?.field).toBe('string');
      expect(typeof detail?.message).toBe('string');
      expect(typeof detail?.code).toBe('string');
    });
  });
});
