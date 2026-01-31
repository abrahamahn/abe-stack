// shared/core/src/infrastructure/errors/validation-error.test.ts
import { describe, expect, it } from 'vitest';

import {
  formatValidationErrors,
  type ValidationErrorResponse,
  type ZodIssueMinimal,
} from './validation-error';

describe('formatValidationErrors', () => {
  describe('basic functionality', () => {
    it('should format a single validation error', () => {
      const issues: ZodIssueMinimal[] = [
        { path: ['email'], message: 'Invalid email address', code: 'invalid_string' },
      ];

      const result = formatValidationErrors(issues);

      expect(result).toEqual<ValidationErrorResponse>({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: [{ field: 'email', message: 'Invalid email address', code: 'invalid_string' }],
        },
      });
    });

    it('should format multiple validation errors', () => {
      const issues: ZodIssueMinimal[] = [
        { path: ['email'], message: 'Invalid email address', code: 'invalid_string' },
        { path: ['password'], message: 'Password is required', code: 'invalid_type' },
        { path: ['age'], message: 'Must be at least 18', code: 'too_small' },
      ];

      const result = formatValidationErrors(issues);

      expect(result.ok).toBe(false);
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.details).toHaveLength(3);
      expect(result.error.details[0]!).toEqual({
        field: 'email',
        message: 'Invalid email address',
        code: 'invalid_string',
      });
      expect(result.error.details[1]).toEqual({
        field: 'password',
        message: 'Password is required',
        code: 'invalid_type',
      });
      expect(result.error.details[2]).toEqual({
        field: 'age',
        message: 'Must be at least 18',
        code: 'too_small',
      });
    });

    it('should handle empty issues array', () => {
      const issues: ZodIssueMinimal[] = [];

      const result = formatValidationErrors(issues);

      expect(result).toEqual<ValidationErrorResponse>({
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: [],
        },
      });
    });
  });

  describe('path handling', () => {
    it('should join nested string paths with dots', () => {
      const issues: ZodIssueMinimal[] = [
        {
          path: ['user', 'address', 'street'],
          message: 'Street is required',
          code: 'invalid_type',
        },
      ];

      const result = formatValidationErrors(issues);

      expect(result.error.details[0]!.field).toBe('user.address.street');
    });

    it('should join paths with numeric indices', () => {
      const issues: ZodIssueMinimal[] = [
        { path: ['items', 0, 'name'], message: 'Name is required', code: 'invalid_type' },
      ];

      const result = formatValidationErrors(issues);

      expect(result.error.details[0]!.field).toBe('items.0.name');
    });

    it('should handle deeply nested paths with mixed types', () => {
      const issues: ZodIssueMinimal[] = [
        {
          path: ['data', 'users', 2, 'addresses', 0, 'zipCode'],
          message: 'Invalid zip code',
          code: 'invalid_string',
        },
      ];

      const result = formatValidationErrors(issues);

      expect(result.error.details[0]!.field).toBe('data.users.2.addresses.0.zipCode');
    });

    it('should handle root-level errors with empty path', () => {
      const issues: ZodIssueMinimal[] = [
        { path: [], message: 'Invalid input', code: 'invalid_type' },
      ];

      const result = formatValidationErrors(issues);

      expect(result.error.details[0]!.field).toBe('');
    });

    it('should handle single-level path', () => {
      const issues: ZodIssueMinimal[] = [
        { path: ['username'], message: 'Username is required', code: 'invalid_type' },
      ];

      const result = formatValidationErrors(issues);

      expect(result.error.details[0]!.field).toBe('username');
    });
  });

  describe('Zod error codes', () => {
    it('should preserve common Zod error codes', () => {
      const issues: ZodIssueMinimal[] = [
        { path: ['a'], message: 'Expected string, received number', code: 'invalid_type' },
        { path: ['b'], message: 'Invalid email', code: 'invalid_string' },
        { path: ['c'], message: 'String must contain at least 8 character(s)', code: 'too_small' },
        { path: ['d'], message: 'String must contain at most 100 character(s)', code: 'too_big' },
        { path: ['e'], message: 'Invalid enum value', code: 'invalid_enum_value' },
        { path: ['f'], message: 'Required', code: 'invalid_type' },
        { path: ['g'], message: 'Unrecognized key(s)', code: 'unrecognized_keys' },
        { path: ['h'], message: 'Invalid union', code: 'invalid_union' },
      ];

      const result = formatValidationErrors(issues);

      expect(result.error.details.map((d) => d.code)).toEqual([
        'invalid_type',
        'invalid_string',
        'too_small',
        'too_big',
        'invalid_enum_value',
        'invalid_type',
        'unrecognized_keys',
        'invalid_union',
      ]);
    });

    it('should handle custom error codes', () => {
      const issues: ZodIssueMinimal[] = [
        { path: ['custom'], message: 'Custom validation failed', code: 'custom' },
      ];

      const result = formatValidationErrors(issues);

      expect(result.error.details[0]!.code).toBe('custom');
    });
  });

  describe('message preservation', () => {
    it('should preserve exact error messages', () => {
      const issues: ZodIssueMinimal[] = [
        {
          path: ['field'],
          message: 'This is a very specific error message with special chars: @#$%',
          code: 'custom',
        },
      ];

      const result = formatValidationErrors(issues);

      expect(result.error.details[0]!.message).toBe(
        'This is a very specific error message with special chars: @#$%',
      );
    });

    it('should preserve unicode in messages', () => {
      const issues: ZodIssueMinimal[] = [
        {
          path: ['name'],
          message: 'Name must not contain emojis like \u{1F600}',
          code: 'invalid_string',
        },
      ];

      const result = formatValidationErrors(issues);

      expect(result.error.details[0]!.message).toBe('Name must not contain emojis like \u{1F600}');
    });

    it('should preserve empty messages', () => {
      const issues: ZodIssueMinimal[] = [{ path: ['field'], message: '', code: 'custom' }];

      const result = formatValidationErrors(issues);

      expect(result.error.details[0]!.message).toBe('');
    });
  });

  describe('response structure', () => {
    it('should always return ok: false', () => {
      const result = formatValidationErrors([]);
      expect(result.ok).toBe(false);
    });

    it('should always return VALIDATION_ERROR code', () => {
      const result = formatValidationErrors([]);
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('should always return consistent message', () => {
      const result = formatValidationErrors([]);
      expect(result.error.message).toBe('Request validation failed');
    });

    it('should return details as an array', () => {
      const result = formatValidationErrors([]);
      expect(Array.isArray(result.error.details)).toBe(true);
    });
  });

  describe('realistic Zod error scenarios', () => {
    it('should handle typical registration form errors', () => {
      const issues: ZodIssueMinimal[] = [
        { path: ['email'], message: 'Invalid email', code: 'invalid_string' },
        {
          path: ['password'],
          message: 'String must contain at least 8 character(s)',
          code: 'too_small',
        },
        { path: ['confirmPassword'], message: 'Passwords do not match', code: 'custom' },
        { path: ['termsAccepted'], message: 'You must accept the terms', code: 'invalid_literal' },
      ];

      const result = formatValidationErrors(issues);

      expect(result.error.details).toHaveLength(4);
      expect(result.error.details.map((d) => d.field)).toEqual([
        'email',
        'password',
        'confirmPassword',
        'termsAccepted',
      ]);
    });

    it('should handle array item validation errors', () => {
      const issues: ZodIssueMinimal[] = [
        {
          path: ['items', 0, 'quantity'],
          message: 'Number must be greater than 0',
          code: 'too_small',
        },
        { path: ['items', 2, 'productId'], message: 'Invalid uuid', code: 'invalid_string' },
      ];

      const result = formatValidationErrors(issues);

      expect(result.error.details).toHaveLength(2);
      expect(result.error.details[0]!.field).toBe('items.0.quantity');
      expect(result.error.details[1]!.field).toBe('items.2.productId');
    });

    it('should handle discriminated union errors', () => {
      const issues: ZodIssueMinimal[] = [
        {
          path: ['type'],
          message: "Invalid discriminator value. Expected 'admin' | 'user'",
          code: 'invalid_union_discriminator',
        },
      ];

      const result = formatValidationErrors(issues);

      expect(result.error.details[0]!).toEqual({
        field: 'type',
        message: "Invalid discriminator value. Expected 'admin' | 'user'",
        code: 'invalid_union_discriminator',
      });
    });
  });
});
