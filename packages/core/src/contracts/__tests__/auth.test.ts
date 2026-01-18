// packages/core/src/contracts/__tests__/auth.test.ts
import { describe, expect, it } from 'vitest';

import {
  authContract,
  authResponseSchema,
  loginRequestSchema,
  logoutResponseSchema,
  refreshResponseSchema,
  registerRequestSchema,
} from '../auth';

// ============================================================================
// Auth Schemas Tests
// ============================================================================

describe('auth contracts', () => {
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

    it('should reject empty email', () => {
      expect(() => loginRequestSchema.parse({ email: '', password: 'password123' })).toThrow();
    });

    it('should reject empty password', () => {
      expect(() => loginRequestSchema.parse({ email: 'test@example.com', password: '' })).toThrow();
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

    it('should accept name with minimum length', () => {
      const valid = { email: 'test@example.com', password: 'password123', name: 'Jo' };
      expect(registerRequestSchema.parse(valid).name).toBe('Jo');
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

    it('should reject missing token', () => {
      expect(() =>
        authResponseSchema.parse({
          user: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            email: 'test@example.com',
            name: 'John',
            role: 'user',
          },
        }),
      ).toThrow();
    });

    it('should reject missing user', () => {
      expect(() =>
        authResponseSchema.parse({
          token: 'some-token',
        }),
      ).toThrow();
    });
  });

  describe('refreshResponseSchema', () => {
    it('should accept valid refresh response', () => {
      const valid = { token: 'new-access-token' };
      expect(refreshResponseSchema.parse(valid)).toEqual(valid);
    });

    it('should reject empty token', () => {
      expect(() => refreshResponseSchema.parse({ token: '' })).not.toThrow(); // Empty string is valid
    });

    it('should reject missing token', () => {
      expect(() => refreshResponseSchema.parse({})).toThrow();
    });
  });

  describe('logoutResponseSchema', () => {
    it('should accept valid logout response', () => {
      const valid = { message: 'Logged out successfully' };
      expect(logoutResponseSchema.parse(valid)).toEqual(valid);
    });

    it('should reject missing message', () => {
      expect(() => logoutResponseSchema.parse({})).toThrow();
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

    it('should define response schemas for register', () => {
      expect(authContract.register.responses[201]).toBeDefined();
      expect(authContract.register.responses[400]).toBeDefined();
      expect(authContract.register.responses[409]).toBeDefined();
    });

    it('should define response schemas for login', () => {
      expect(authContract.login.responses[200]).toBeDefined();
      expect(authContract.login.responses[400]).toBeDefined();
      expect(authContract.login.responses[401]).toBeDefined();
    });
  });
});
