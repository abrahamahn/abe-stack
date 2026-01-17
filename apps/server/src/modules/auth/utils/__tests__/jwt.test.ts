// apps/server/src/modules/auth/utils/__tests__/jwt.test.ts
import {
  createAccessToken,
  createRefreshToken,
  getRefreshTokenExpiry,
  verifyToken,
} from '@modules/auth/utils/jwt';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// Mock dependencies
vi.mock('../../../../infra/crypto/index.js', () => ({
  jwtSign: vi.fn(() => 'mock-jwt-token'),
  jwtVerify: vi.fn(() => ({ userId: 'user-123', email: 'test@example.com', role: 'user' })),
  JwtError: class JwtError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'JwtError';
    }
  },
}));

vi.mock('@shared/constants', () => ({
  MIN_JWT_SECRET_LENGTH: 32,
  REFRESH_TOKEN_BYTES: 64,
}));

describe('JWT Utilities', () => {
  const validSecret = 'this-is-a-very-long-secret-for-testing-purposes';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAccessToken', () => {
    test('should create an access token with valid parameters', () => {
      const token = createAccessToken('user-123', 'test@example.com', 'user', validSecret);

      expect(token).toBe('mock-jwt-token');
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

    test('should pass correct payload to jwtSign', async () => {
      const { jwtSign } = await import('../../../../infra/crypto/index.js');
      createAccessToken('user-123', 'test@example.com', 'admin', validSecret, '30m');

      expect(jwtSign).toHaveBeenCalledWith(
        { userId: 'user-123', email: 'test@example.com', role: 'admin' },
        validSecret,
        { expiresIn: '30m' },
      );
    });

    test('should use default expiration when not specified', async () => {
      const { jwtSign } = await import('../../../../infra/crypto/index.js');
      createAccessToken('user-123', 'test@example.com', 'user', validSecret);

      expect(jwtSign).toHaveBeenCalledWith(expect.anything(), validSecret, { expiresIn: '15m' });
    });
  });

  describe('verifyToken', () => {
    test('should verify and return token payload', () => {
      const payload = verifyToken('valid-token', validSecret);

      expect(payload).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });
    });

    test('should throw error when secret is too short', () => {
      expect(() => verifyToken('some-token', 'short')).toThrow(/JWT secret must be at least/);
    });

    test('should throw error when secret is empty', () => {
      expect(() => verifyToken('some-token', '')).toThrow(/JWT secret must be at least/);
    });

    test('should call jwtVerify with correct parameters', async () => {
      const { jwtVerify } = await import('../../../../infra/crypto/index.js');
      verifyToken('test-token', validSecret);

      expect(jwtVerify).toHaveBeenCalledWith('test-token', validSecret);
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
});
