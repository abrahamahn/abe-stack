// apps/server/src/modules/auth/utils/jwt.test.ts
/**
 * JWT Token Utility Tests
 *
 * Tests the JWT utility functions with actual implementations
 * (no mocking of internal dependencies).
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
    createAccessToken,
    createRefreshToken,
    getRefreshTokenExpiry,
    JwtError,
    verifyToken,
} from './jwt';

describe('JWT Utilities', () => {
  const validSecret = 'this-is-a-very-long-secret-for-testing-purposes';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAccessToken', () => {
    test('should create a valid JWT token', () => {
      const token = createAccessToken('user-123', 'test@example.com', 'user', validSecret);

      expect(typeof token).toBe('string');
      // JWT tokens have 3 parts separated by dots
      expect(token.split('.').length).toBe(3);
    });

    test('should create token that can be verified', () => {
      const token = createAccessToken('user-123', 'test@example.com', 'user', validSecret);
      const payload = verifyToken(token, validSecret);

      expect(payload.userId).toBe('user-123');
      expect(payload.email).toBe('test@example.com');
      expect(payload.role).toBe('user');
    });

    test('should include expiration in token', () => {
      const token = createAccessToken('user-123', 'test@example.com', 'user', validSecret, '1h');
      const payload = verifyToken(token, validSecret);

      expect(payload.exp).toBeDefined();
      expect(typeof payload.exp).toBe('number');
    });

    test('should throw error when secret is too short', () => {
      expect(() => createAccessToken('user-123', 'test@example.com', 'user', 'short')).toThrow(
        /JWT secret must be at least/,
      );
    });

    test('should throw error when secret is empty', () => {
      expect(() => createAccessToken('user-123', 'test@example.com', 'user', '')).toThrow(
        /JWT secret must be at least/,
      );
    });

    test('should include custom expiration', () => {
      const token = createAccessToken('user-123', 'test@example.com', 'admin', validSecret, '30m');
      const payload = verifyToken(token, validSecret);

      expect(payload.role).toBe('admin');
      expect(payload.exp).toBeDefined();
    });
  });

  describe('verifyToken', () => {
    test('should verify and return token payload', () => {
      const token = createAccessToken('user-456', 'test2@example.com', 'admin', validSecret);
      const payload = verifyToken(token, validSecret);

      expect(payload).toMatchObject({
        userId: 'user-456',
        email: 'test2@example.com',
        role: 'admin',
      });
    });

    test('should throw error when secret is too short', () => {
      expect(() => verifyToken('some-token', 'short')).toThrow(/JWT secret must be at least/);
    });

    test('should throw error when secret is empty', () => {
      expect(() => verifyToken('some-token', '')).toThrow(/JWT secret must be at least/);
    });

    test('should throw error for invalid token format', () => {
      expect(() => verifyToken('invalid-token', validSecret)).toThrow();
    });

    test('should throw error for token with wrong secret', () => {
      const token = createAccessToken('user-123', 'test@example.com', 'user', validSecret);
      const wrongSecret = 'this-is-a-different-secret-for-testing-purposes';

      expect(() => verifyToken(token, wrongSecret)).toThrow();
    });

    test('should throw error for tampered token', () => {
      const token = createAccessToken('user-123', 'test@example.com', 'user', validSecret);
      const parts = token.split('.');
      // Tamper with the payload
      parts[1] = 'tampered' + (parts[1] ?? '');
      const tamperedToken = parts.join('.');

      expect(() => verifyToken(tamperedToken, validSecret)).toThrow();
    });
  });

  describe('createRefreshToken', () => {
    test('should create a refresh token as hex string', () => {
      const token = createRefreshToken();

      expect(typeof token).toBe('string');
      expect(token.length).toBe(128); // 64 bytes = 128 hex characters
    });

    test('should create unique tokens on each call', () => {
      const token1 = createRefreshToken();
      const token2 = createRefreshToken();

      expect(token1).not.toBe(token2);
    });

    test('should only contain hex characters', () => {
      const token = createRefreshToken();

      expect(token).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('getRefreshTokenExpiry', () => {
    test('should calculate expiry date correctly', () => {
      const now = new Date();
      const expiry = getRefreshTokenExpiry(7);

      const expectedDate = new Date(now);
      expectedDate.setDate(expectedDate.getDate() + 7);

      // Compare dates (within a second tolerance)
      expect(Math.abs(expiry.getTime() - expectedDate.getTime())).toBeLessThan(1000);
    });

    test('should handle different expiry days', () => {
      const now = new Date();

      const expiry30 = getRefreshTokenExpiry(30);
      const expected30 = new Date(now);
      expected30.setDate(expected30.getDate() + 30);

      expect(Math.abs(expiry30.getTime() - expected30.getTime())).toBeLessThan(1000);
    });
  });

  describe('JwtError', () => {
    test('should be exported and usable', () => {
      expect(JwtError).toBeDefined();
      const error = new JwtError('test error', 'INVALID_TOKEN');
      expect(error.message).toBe('test error');
      expect(error.name).toBe('JwtError');
    });
  });
});
