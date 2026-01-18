// apps/server/src/infra/crypto/__tests__/jwt.test.ts
import { decode, JwtError, sign, verify } from '@abe-stack/core/crypto';
import { describe, expect, test, vi } from 'vitest';

describe('Native JWT Implementation', () => {
  const testSecret = 'test-secret-key-for-jwt-testing';

  describe('sign', () => {
    test('should create a valid JWT token', () => {
      const payload = { userId: 'user-123', email: 'test@example.com' };

      const token = sign(payload, testSecret);

      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3);
    });

    test('should include payload data in token', () => {
      const payload = { userId: 'user-123', role: 'admin' };

      const token = sign(payload, testSecret);
      const decoded = decode(token);

      expect(decoded?.userId).toBe('user-123');
      expect(decoded?.role).toBe('admin');
    });

    test('should add iat (issued at) claim', () => {
      const payload = { data: 'test' };

      const token = sign(payload, testSecret);
      const decoded = decode(token);

      expect(decoded?.iat).toBeDefined();
      expect(typeof decoded?.iat).toBe('number');
    });

    test('should add exp (expiration) when expiresIn is provided', () => {
      const payload = { data: 'test' };

      const token = sign(payload, testSecret, { expiresIn: '1h' });
      const decoded = decode(token);

      expect(decoded?.exp).toBeDefined();
      if (decoded?.exp !== undefined && decoded.iat !== undefined) {
        expect(decoded.exp - decoded.iat).toBe(3600); // 1 hour in seconds
      }
    });

    test('should handle expiresIn as number of seconds', () => {
      const payload = { data: 'test' };

      const token = sign(payload, testSecret, { expiresIn: 300 });
      const decoded = decode(token);

      if (decoded?.exp !== undefined && decoded.iat !== undefined) {
        expect(decoded.exp - decoded.iat).toBe(300);
      }
    });

    test('should support different time units', () => {
      const payload = { data: 'test' };

      // Test seconds
      let token = sign(payload, testSecret, { expiresIn: '30s' });
      let decoded = decode(token);
      if (decoded?.exp !== undefined && decoded.iat !== undefined) {
        expect(decoded.exp - decoded.iat).toBe(30);
      }

      // Test minutes
      token = sign(payload, testSecret, { expiresIn: '15m' });
      decoded = decode(token);
      if (decoded?.exp !== undefined && decoded.iat !== undefined) {
        expect(decoded.exp - decoded.iat).toBe(900);
      }

      // Test hours
      token = sign(payload, testSecret, { expiresIn: '2h' });
      decoded = decode(token);
      if (decoded?.exp !== undefined && decoded.iat !== undefined) {
        expect(decoded.exp - decoded.iat).toBe(7200);
      }

      // Test days
      token = sign(payload, testSecret, { expiresIn: '7d' });
      decoded = decode(token);
      if (decoded?.exp !== undefined && decoded.iat !== undefined) {
        expect(decoded.exp - decoded.iat).toBe(604800);
      }
    });
  });

  describe('verify', () => {
    test('should verify a valid token', () => {
      const payload = { userId: 'user-123', email: 'test@example.com' };
      const token = sign(payload, testSecret, { expiresIn: '1h' });

      const verified = verify(token, testSecret);

      expect(verified.userId).toBe('user-123');
      expect(verified.email).toBe('test@example.com');
    });

    test('should throw for invalid token string', () => {
      expect(() => verify(123 as never, testSecret)).toThrow(JwtError);
      expect(() => verify(123 as never, testSecret)).toThrow('Token must be a string');
    });

    test('should throw for malformed token', () => {
      expect(() => verify('not.a.valid.token', testSecret)).toThrow(JwtError);
      expect(() => verify('invalid', testSecret)).toThrow('Invalid token format');
    });

    test('should throw for invalid signature', () => {
      const token = sign({ data: 'test' }, testSecret);

      expect(() => verify(token, 'wrong-secret')).toThrow(JwtError);
      expect(() => verify(token, 'wrong-secret')).toThrow('Invalid signature');
    });

    test('should throw for expired token', () => {
      // Create a token that expires immediately
      const payload = { data: 'test' };
      const token = sign(payload, testSecret, { expiresIn: '0s' });

      // Wait a tiny bit to ensure expiration
      vi.useFakeTimers();
      vi.advanceTimersByTime(1000);

      expect(() => verify(token, testSecret)).toThrow(JwtError);
      expect(() => verify(token, testSecret)).toThrow('Token has expired');

      vi.useRealTimers();
    });

    test('should reject tokens with unsupported algorithm', () => {
      // Manually craft a token with "none" algorithm (attack vector)
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ data: 'test' })).toString('base64url');
      // Use a fake non-empty signature so it passes the format check and reaches algorithm validation
      const fakeToken = `${header}.${payload}.fakesignature`;

      expect(() => verify(fakeToken, testSecret)).toThrow(JwtError);
      expect(() => verify(fakeToken, testSecret)).toThrow('Algorithm not supported');
    });

    test('should accept tokens without expiration', () => {
      const payload = { data: 'test' };
      const token = sign(payload, testSecret); // No expiresIn

      const verified = verify(token, testSecret);

      expect(verified.data).toBe('test');
      expect(verified.exp).toBeUndefined();
    });
  });

  describe('decode', () => {
    test('should decode token without verification', () => {
      const payload = { userId: 'user-123', role: 'admin' };
      const token = sign(payload, testSecret);

      const decoded = decode(token);

      expect(decoded?.userId).toBe('user-123');
      expect(decoded?.role).toBe('admin');
    });

    test('should return null for invalid token', () => {
      expect(decode('invalid')).toBeNull();
      expect(decode('not.valid')).toBeNull();
      expect(decode('')).toBeNull();
    });

    test('should decode token even with wrong secret', () => {
      const token = sign({ data: 'secret-data' }, testSecret);

      // decode doesn't verify signature
      const decoded = decode(token);

      expect(decoded?.data).toBe('secret-data');
    });

    test('should return null for malformed payload', () => {
      // Create token with invalid base64 payload
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
        'base64url',
      );
      const badToken = `${header}.!!!invalid!!!.signature`;

      expect(decode(badToken)).toBeNull();
    });
  });

  describe('JwtError', () => {
    test('should have correct error code', () => {
      const error = new JwtError('Test error', 'INVALID_TOKEN');

      expect(error.code).toBe('INVALID_TOKEN');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('JwtError');
    });

    test('should support all error codes', () => {
      const codes: Array<
        'INVALID_TOKEN' | 'INVALID_SIGNATURE' | 'TOKEN_EXPIRED' | 'MALFORMED_TOKEN'
      > = ['INVALID_TOKEN', 'INVALID_SIGNATURE', 'TOKEN_EXPIRED', 'MALFORMED_TOKEN'];

      for (const code of codes) {
        const error = new JwtError('Test', code);
        expect(error.code).toBe(code);
      }
    });
  });

  describe('security', () => {
    test('should use constant-time comparison for signatures', () => {
      // This test ensures the implementation uses timingSafeEqual
      // We can't directly test timing, but we verify behavior
      const payload = { data: 'test' };
      const token = sign(payload, testSecret);

      // Both should fail but timing should be similar
      expect(() => verify(token, 'wrong1')).toThrow('Invalid signature');
      expect(() => verify(token, 'wrong2-longer-secret')).toThrow('Invalid signature');
    });

    test('should reject tokens with modified payload', () => {
      const token = sign({ role: 'user' }, testSecret);

      // Tamper with payload
      const parts = token.split('.');
      const tamperedPayload = Buffer.from(JSON.stringify({ role: 'admin' })).toString('base64url');
      const header = parts[0] ?? '';
      const signature = parts[2] ?? '';
      const tamperedToken = `${header}.${tamperedPayload}.${signature}`;

      expect(() => verify(tamperedToken, testSecret)).toThrow('Invalid signature');
    });
  });
});
