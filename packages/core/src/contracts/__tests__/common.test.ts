// packages/core/src/contracts/__tests__/common.test.ts
import { describe, expect, it } from 'vitest';

import { errorResponseSchema, USER_ROLES, userRoleSchema, userSchema } from '../common';

// ============================================================================
// Common Schemas Tests
// ============================================================================

describe('common contracts', () => {
  describe('USER_ROLES', () => {
    it('should have the expected roles', () => {
      expect(USER_ROLES).toEqual(['user', 'admin', 'moderator']);
    });

    it('should be a tuple', () => {
      expect(USER_ROLES.length).toBe(3);
    });

    it('should have user as first role', () => {
      expect(USER_ROLES[0]).toBe('user');
    });

    it('should have admin as second role', () => {
      expect(USER_ROLES[1]).toBe('admin');
    });

    it('should have moderator as third role', () => {
      expect(USER_ROLES[2]).toBe('moderator');
    });
  });

  describe('userRoleSchema', () => {
    it('should accept valid roles', () => {
      expect(userRoleSchema.parse('user')).toBe('user');
      expect(userRoleSchema.parse('admin')).toBe('admin');
      expect(userRoleSchema.parse('moderator')).toBe('moderator');
    });

    it('should reject invalid roles', () => {
      expect(() => userRoleSchema.parse('invalid')).toThrow();
      expect(() => userRoleSchema.parse('')).toThrow();
    });

    it('should reject numeric values', () => {
      expect(() => userRoleSchema.parse(1)).toThrow();
    });

    it('should reject null', () => {
      expect(() => userRoleSchema.parse(null)).toThrow();
    });

    it('should reject undefined', () => {
      expect(() => userRoleSchema.parse(undefined)).toThrow();
    });
  });

  describe('userSchema', () => {
    it('should accept valid user', () => {
      const valid = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'John',
        role: 'user' as const,
      };
      expect(userSchema.parse(valid)).toEqual(valid);
    });

    it('should accept null name', () => {
      const valid = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: null,
        role: 'admin' as const,
      };
      expect(userSchema.parse(valid)).toEqual(valid);
    });

    it('should reject invalid uuid', () => {
      expect(() =>
        userSchema.parse({ id: 'not-a-uuid', email: 'test@example.com', name: null, role: 'user' }),
      ).toThrow();
    });

    it('should reject invalid email', () => {
      expect(() =>
        userSchema.parse({
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'not-an-email',
          name: null,
          role: 'user',
        }),
      ).toThrow();
    });

    it('should reject invalid role', () => {
      expect(() =>
        userSchema.parse({
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@example.com',
          name: null,
          role: 'superadmin',
        }),
      ).toThrow();
    });

    it('should accept all valid roles', () => {
      for (const role of USER_ROLES) {
        const user = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@example.com',
          name: 'Test',
          role,
        };
        expect(userSchema.parse(user).role).toBe(role);
      }
    });
  });

  describe('errorResponseSchema', () => {
    it('should accept valid error response with all optional fields', () => {
      const valid = {
        message: 'Something went wrong',
        code: 'VALIDATION_ERROR',
        details: { field: 'email' },
      };
      expect(errorResponseSchema.parse(valid)).toEqual(valid);
    });

    it('should accept minimal error response (message only)', () => {
      const minimal = { message: 'Server error' };
      expect(errorResponseSchema.parse(minimal)).toEqual(minimal);
    });

    it('should accept error with code but no details', () => {
      const withCode = { message: 'Message', code: 'CODE' };
      expect(errorResponseSchema.parse(withCode)).toEqual(withCode);
    });

    it('should accept error with details but no code', () => {
      const withDetails = { message: 'Message', details: { field: 'email' } };
      expect(errorResponseSchema.parse(withDetails)).toEqual(withDetails);
    });

    it('should strip unknown fields like error', () => {
      const withExtra = { error: 'SomeError', message: 'Message' };
      expect(errorResponseSchema.parse(withExtra)).toEqual({ message: 'Message' });
    });

    it('should reject missing message field', () => {
      expect(() => errorResponseSchema.parse({ code: 'ERROR' })).toThrow();
    });

    it('should accept complex details object', () => {
      const complex = {
        message: 'Validation failed',
        details: {
          fields: ['email', 'password'],
          nested: { deep: { value: 123 } },
        },
      };
      expect(errorResponseSchema.parse(complex)).toEqual(complex);
    });
  });
});
