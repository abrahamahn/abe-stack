// shared/src/core/schemas.test.ts
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  apiResultSchema,
  emailSchema,
  emptyBodySchema,
  errorCodeSchema,
  errorResponseSchema,
  isoDateTimeSchema,
  passwordSchema,
  successResponseSchema,
} from './schemas';

describe('schemas', () => {
  // ==========================================================================
  // isoDateTimeSchema
  // ==========================================================================
  describe('isoDateTimeSchema', () => {
    it('accepts valid ISO datetime strings', () => {
      expect(isoDateTimeSchema.parse('2023-01-01T12:00:00Z')).toBe('2023-01-01T12:00:00Z');
      expect(isoDateTimeSchema.parse('2023-06-15T09:30:00+05:00')).toBe(
        '2023-06-15T09:30:00+05:00',
      );
    });

    it('rejects invalid datetime strings', () => {
      expect(() => isoDateTimeSchema.parse('not-a-date')).toThrow();
      expect(() => isoDateTimeSchema.parse('2023-01-01')).toThrow();
      expect(() => isoDateTimeSchema.parse('')).toThrow();
    });

    it('rejects non-string values', () => {
      expect(() => isoDateTimeSchema.parse(123)).toThrow();
      expect(() => isoDateTimeSchema.parse(null)).toThrow();
    });
  });

  // ==========================================================================
  // emailSchema
  // ==========================================================================
  describe('emailSchema', () => {
    it('accepts valid emails and normalizes', () => {
      expect(emailSchema.parse('Test@Example.COM')).toBe('test@example.com');
      expect(emailSchema.parse('  user@domain.com  ')).toBe('user@domain.com');
    });

    it('rejects invalid emails', () => {
      expect(() => emailSchema.parse('not-an-email')).toThrow();
      expect(() => emailSchema.parse('')).toThrow();
      expect(() => emailSchema.parse('missing@')).toThrow();
    });
  });

  // ==========================================================================
  // errorCodeSchema
  // ==========================================================================
  describe('errorCodeSchema', () => {
    it('accepts valid error codes', () => {
      expect(errorCodeSchema.parse('BAD_REQUEST')).toBe('BAD_REQUEST');
      expect(errorCodeSchema.parse('INTERNAL_ERROR')).toBe('INTERNAL_ERROR');
      expect(errorCodeSchema.parse('VALIDATION_ERROR')).toBe('VALIDATION_ERROR');
      expect(errorCodeSchema.parse('UNAUTHORIZED')).toBe('UNAUTHORIZED');
    });

    it('rejects invalid error codes', () => {
      expect(() => errorCodeSchema.parse('INVALID_CODE_123')).toThrow();
      expect(() => errorCodeSchema.parse('')).toThrow();
      expect(() => errorCodeSchema.parse(42)).toThrow();
    });
  });

  // ==========================================================================
  // passwordSchema
  // ==========================================================================
  describe('passwordSchema', () => {
    it('accepts a strong password', () => {
      const strong = 'MyStr0ng!Pass';
      expect(() => passwordSchema.parse(strong)).not.toThrow();
    });

    it('rejects passwords shorter than 8 characters', () => {
      expect(() => passwordSchema.parse('Ab1!')).toThrow();
    });

    it('rejects weak passwords that fail validation', () => {
      // All lowercase, no uppercase/numbers → fails validatePassword
      expect(() => passwordSchema.parse('aaaaaaaa')).toThrow();
    });

    it('rejects non-string values', () => {
      expect(() => passwordSchema.parse(12345678)).toThrow();
      expect(() => passwordSchema.parse(null)).toThrow();
    });
  });

  // ==========================================================================
  // emptyBodySchema
  // ==========================================================================
  describe('emptyBodySchema', () => {
    it('accepts empty object', () => {
      expect(emptyBodySchema.parse({})).toEqual({});
    });

    it('rejects objects with properties', () => {
      expect(() => emptyBodySchema.parse({ extra: 'field' })).toThrow();
    });
  });

  // ==========================================================================
  // errorResponseSchema
  // ==========================================================================
  describe('errorResponseSchema', () => {
    it('accepts valid error response', () => {
      const data = {
        ok: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid input',
        },
      };
      expect(errorResponseSchema.parse(data)).toEqual(data);
    });

    it('accepts error response with details', () => {
      const data = {
        ok: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: { field: 'email' },
        },
      };
      expect(errorResponseSchema.parse(data)).toEqual(data);
    });

    it('rejects response with ok: true', () => {
      expect(() =>
        errorResponseSchema.parse({
          ok: true,
          error: { code: 'BAD_REQUEST', message: 'test' },
        }),
      ).toThrow();
    });
  });

  // ==========================================================================
  // successResponseSchema
  // ==========================================================================
  describe('successResponseSchema', () => {
    it('creates schema for success response', () => {
      const schema = successResponseSchema(z.object({ id: z.string() }));
      const result = schema.parse({ ok: true, data: { id: '123' } });
      expect(result).toEqual({ ok: true, data: { id: '123' } });
    });

    it('rejects invalid success response', () => {
      const schema = successResponseSchema(z.object({ id: z.string() }));
      expect(() => schema.parse({ ok: false, data: { id: '123' } })).toThrow();
    });
  });

  // ==========================================================================
  // apiResultSchema
  // ==========================================================================
  describe('apiResultSchema', () => {
    it('accepts success response', () => {
      const schema = apiResultSchema(z.object({ name: z.string() }));
      const result = schema.parse({ ok: true, data: { name: 'test' } });
      expect(result).toEqual({ ok: true, data: { name: 'test' } });
    });

    it('accepts error response', () => {
      const schema = apiResultSchema(z.object({ name: z.string() }));
      const result = schema.parse({
        ok: false,
        error: { code: 'BAD_REQUEST', message: 'fail' },
      });
      expect(result).toEqual({
        ok: false,
        error: { code: 'BAD_REQUEST', message: 'fail' },
      });
    });

    it('rejects invalid data', () => {
      const schema = apiResultSchema(z.object({ name: z.string() }));
      expect(() => schema.parse({ ok: true, data: { name: 123 } })).toThrow();
    });
  });
});
