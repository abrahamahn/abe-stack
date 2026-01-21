// packages/core/src/contracts/__tests__/api.test.ts
/**
 * Integration tests for the combined API contract.
 * Tests that all domain contracts are properly exported.
 */
import { describe, expect, it } from 'vitest';

import {
  apiContract,
  authContract,
  authResponseSchema,
  errorResponseSchema,
  loginRequestSchema,
  logoutResponseSchema,
  refreshResponseSchema,
  registerRequestSchema,
  unlockAccountRequestSchema,
  unlockAccountResponseSchema,
  USER_ROLES,
  userResponseSchema,
  userRoleSchema,
  userSchema,
} from '../';

describe('API Contract Integration', () => {
  describe('apiContract structure', () => {
    it('should include auth contract', () => {
      expect(apiContract.auth).toBeDefined();
      expect(apiContract.auth.login).toBeDefined();
      expect(apiContract.auth.register).toBeDefined();
    });

    it('should include users contract', () => {
      expect(apiContract.users).toBeDefined();
      expect(apiContract.users.me).toBeDefined();
    });

    it('should include admin contract', () => {
      expect(apiContract.admin).toBeDefined();
      expect(apiContract.admin.unlockAccount).toBeDefined();
    });
  });

  describe('USER_ROLES', () => {
    it('should have the expected roles', () => {
      expect(USER_ROLES).toEqual(['user', 'admin', 'moderator']);
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
  });

  describe('loginRequestSchema', () => {
    it('should accept valid login request', () => {
      const valid = { email: 'test@example.com', password: 'password123' };
      expect(loginRequestSchema.parse(valid)).toEqual(valid);
    });

    it('should reject invalid email', () => {
      expect(() =>
        loginRequestSchema.parse({ email: 'invalid', password: 'password123' }),
      ).toThrow();
    });

    it('should reject short password', () => {
      expect(() =>
        loginRequestSchema.parse({ email: 'test@example.com', password: 'short' }),
      ).toThrow();
    });
  });

  describe('registerRequestSchema', () => {
    it('should accept valid registration with name', () => {
      const valid = { email: 'test@example.com', password: 'password123', name: 'John' };
      expect(registerRequestSchema.parse(valid)).toEqual(valid);
    });

    it('should accept valid registration without name', () => {
      const valid = { email: 'test@example.com', password: 'password123' };
      expect(registerRequestSchema.parse(valid)).toEqual(valid);
    });

    it('should reject name that is too short', () => {
      expect(() =>
        registerRequestSchema.parse({
          email: 'test@example.com',
          password: 'password123',
          name: 'A',
        }),
      ).toThrow();
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
  });

  describe('authResponseSchema', () => {
    it('should accept valid auth response', () => {
      const valid = {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'test@example.com',
          name: 'John',
          role: 'user' as const,
        },
      };
      expect(authResponseSchema.parse(valid)).toEqual(valid);
    });
  });

  describe('refreshResponseSchema', () => {
    it('should accept valid refresh response', () => {
      const valid = { token: 'new-access-token' };
      expect(refreshResponseSchema.parse(valid)).toEqual(valid);
    });
  });

  describe('logoutResponseSchema', () => {
    it('should accept valid logout response', () => {
      const valid = { message: 'Logged out successfully' };
      expect(logoutResponseSchema.parse(valid)).toEqual(valid);
    });
  });

  describe('errorResponseSchema', () => {
    it('should accept valid error response with optional fields', () => {
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

    it('should strip unknown fields', () => {
      const withExtra = { message: 'Error', error: 'SomeError' };
      expect(errorResponseSchema.parse(withExtra)).toEqual({ message: 'Error' });
    });
  });

  describe('userResponseSchema', () => {
    it('should accept valid user response with createdAt', () => {
      const valid = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'John',
        role: 'user' as const,
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      expect(userResponseSchema.parse(valid)).toEqual(valid);
    });
  });

  describe('unlockAccountRequestSchema', () => {
    it('should accept valid unlock request with reason', () => {
      const valid = { email: 'locked@example.com', reason: 'User verified identity' };
      expect(unlockAccountRequestSchema.parse(valid)).toEqual(valid);
    });

    it('should reject invalid email', () => {
      expect(() =>
        unlockAccountRequestSchema.parse({ email: 'not-an-email', reason: 'Test reason' }),
      ).toThrow();
    });

    it('should reject missing reason', () => {
      expect(() => unlockAccountRequestSchema.parse({ email: 'locked@example.com' })).toThrow();
    });
  });

  describe('unlockAccountResponseSchema', () => {
    it('should accept valid unlock response', () => {
      const valid = { message: 'Account unlocked', email: 'user@example.com' };
      expect(unlockAccountResponseSchema.parse(valid)).toEqual(valid);
    });
  });

  describe('authContract', () => {
    it('should have register endpoint', () => {
      expect(authContract.register.method).toBe('POST');
      expect(authContract.register.path).toBe('/api/auth/register');
    });

    it('should have login endpoint', () => {
      expect(authContract.login.method).toBe('POST');
      expect(authContract.login.path).toBe('/api/auth/login');
    });

    it('should have refresh endpoint', () => {
      expect(authContract.refresh.method).toBe('POST');
      expect(authContract.refresh.path).toBe('/api/auth/refresh');
    });

    it('should have logout endpoint', () => {
      expect(authContract.logout.method).toBe('POST');
      expect(authContract.logout.path).toBe('/api/auth/logout');
    });

    it('should have verifyEmail endpoint', () => {
      expect(authContract.verifyEmail.method).toBe('POST');
      expect(authContract.verifyEmail.path).toBe('/api/auth/verify-email');
    });
  });
});
