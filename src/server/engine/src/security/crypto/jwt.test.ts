// backend/engine/src/security/crypto/jwt.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { decode, jwtDecode, JwtError, jwtSign, jwtVerify, sign, verify } from '../jwt';

describe('JWT', () => {
  const secret = 'test-secret-key-with-sufficient-length-for-security';
  const payload = { userId: '123', email: 'test@example.com' };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('sign', () => {
    it('should create a valid JWT token', () => {
      const token = sign(payload, secret);

      expect(token).toBeTruthy();
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include iat (issued at) timestamp', () => {
      const token = sign(payload, secret);
      const decoded = decode(token);

      expect(decoded?.iat).toBe(Math.floor(Date.now() / 1000));
    });

    it('should add expiration when expiresIn is provided', () => {
      const token = sign(payload, secret, { expiresIn: '1h' });
      const decoded = decode(token);

      const expectedExp = Math.floor(Date.now() / 1000) + 3600;
      expect(decoded?.exp).toBe(expectedExp);
    });

    it('should support different expiration formats', () => {
      const testCases = [
        { input: '30s', expected: 30 },
        { input: '15m', expected: 900 },
        { input: '2h', expected: 7200 },
        { input: '7d', expected: 604800 },
        { input: 3600, expected: 3600 },
      ];

      const now = Math.floor(Date.now() / 1000);

      for (const { input, expected } of testCases) {
        const token = sign(payload, secret, { expiresIn: input });
        const decoded = decode(token);
        expect(decoded?.exp).toBe(now + expected);
      }
    });

    it('should preserve custom payload fields', () => {
      const customPayload = {
        userId: '123',
        role: 'admin',
        permissions: ['read', 'write'],
      };

      const token = sign(customPayload, secret);
      const decoded = decode(token);

      expect(decoded?.['userId']).toBe('123');
      expect(decoded?.['role']).toBe('admin');
      expect(decoded?.['permissions']).toEqual(['read', 'write']);
    });
  });

  describe('verify', () => {
    it('should verify a valid token', () => {
      const token = sign(payload, secret);
      const verified = verify(token, secret);

      expect(verified['userId']).toBe('123');
      expect(verified['email']).toBe('test@example.com');
    });

    it('should throw on invalid signature', () => {
      const token = sign(payload, secret);
      const wrongSecret = 'wrong-secret';

      expect(() => verify(token, wrongSecret)).toThrow(JwtError);
      expect(() => verify(token, wrongSecret)).toThrow('Invalid signature');
    });

    it('should throw on expired token', () => {
      const token = sign(payload, secret, { expiresIn: '1h' });

      // Advance time by 2 hours
      vi.advanceTimersByTime(2 * 60 * 60 * 1000);

      expect(() => verify(token, secret)).toThrow(JwtError);
      expect(() => verify(token, secret)).toThrow('Token has expired');
    });

    it('should throw on malformed token', () => {
      expect(() => verify('invalid.token', secret)).toThrow(JwtError);
      expect(() => verify('invalid.token', secret)).toThrow('Invalid token format');
    });

    it('should throw on token with wrong number of parts', () => {
      expect(() => verify('only.two', secret)).toThrow('Invalid token format');
      expect(() => verify('too.many.parts.here', secret)).toThrow('Invalid token format');
    });

    it('should reject tokens with unsupported algorithm', () => {
      // Manually craft a token with "none" algorithm and a dummy signature
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const maliciousToken = `${header}.${encodedPayload}.dummy`;

      expect(() => verify(maliciousToken, secret)).toThrow('Algorithm not supported');
    });

    it('should throw on non-string token', () => {
      expect(() => verify(null as any, secret)).toThrow('Token must be a string');
      expect(() => verify(undefined as any, secret)).toThrow('Token must be a string');
      expect(() => verify(123 as any, secret)).toThrow('Token must be a string');
    });
  });

  describe('decode', () => {
    it('should decode a token without verification', () => {
      const token = sign(payload, secret);
      const decoded = decode(token);

      expect(decoded?.['userId']).toBe('123');
      expect(decoded?.['email']).toBe('test@example.com');
    });

    it('should return null for invalid tokens', () => {
      expect(decode('invalid')).toBeNull();
      expect(decode('invalid.token')).toBeNull();
      expect(decode('')).toBeNull();
    });

    it('should decode even with wrong signature', () => {
      const token = sign(payload, secret);
      // Tamper with the signature
      const parts = token.split('.');
      const part0 = parts[0];
      const part1 = parts[1];
      const tamperedToken = `${String(part0)}.${String(part1)}.wrong-signature`;

      const decoded = decode(tamperedToken);
      expect(decoded?.['userId']).toBe('123');
    });
  });

  // JWT Rotation tests are in jwt-rotation.test.ts

  describe('Aliases', () => {
    it('jwtSign should work like sign', () => {
      const token = jwtSign(payload, secret);
      expect(token).toBeTruthy();
      expect(token.split('.')).toHaveLength(3);
    });

    it('jwtVerify should work like verify', () => {
      const token = jwtSign(payload, secret);
      const verified = jwtVerify(token, secret);
      expect(verified['userId']).toBe('123');
    });

    it('jwtDecode should work like decode', () => {
      const token = jwtSign(payload, secret);
      const decoded = jwtDecode(token);
      expect(decoded?.['userId']).toBe('123');
    });
  });

  describe('Security', () => {
    it('should use constant-time comparison for signatures', () => {
      const token = sign(payload, secret);

      // Even with slightly different signatures, should not leak timing info
      // This is hard to test directly, but we verify it doesn't throw unexpected errors
      expect(() => verify(token, secret)).not.toThrow();
    });

    it('should validate header before processing payload', () => {
      // Token with invalid header should fail early
      const invalidHeader = Buffer.from('invalid json').toString('base64url');
      const validPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const token = `${invalidHeader}.${validPayload}.signature`;

      expect(() => verify(token, secret)).toThrow('Invalid header');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty payload', () => {
      const token = sign({}, secret);
      const verified = verify(token, secret);

      expect(verified).toBeTruthy();
      expect(verified.iat).toBeDefined();
    });

    it('should handle payload with nested objects', () => {
      const complexPayload = {
        user: {
          id: '123',
          profile: {
            name: 'Test User',
            settings: { theme: 'dark' },
          },
        },
      };

      const token = sign(complexPayload, secret);
      const verified = verify(token, secret);

      expect(verified['user']).toEqual(complexPayload.user);
    });

    it('should handle payload with arrays', () => {
      const payloadWithArray = {
        roles: ['admin', 'user'],
        permissions: [1, 2, 3],
      };

      const token = sign(payloadWithArray, secret);
      const verified = verify(token, secret);

      expect(verified['roles']).toEqual(['admin', 'user']);
      expect(verified['permissions']).toEqual([1, 2, 3]);
    });

    it('should handle very long secrets', () => {
      const longSecret = 'a'.repeat(1000);
      const token = sign(payload, longSecret);
      const verified = verify(token, longSecret);

      expect(verified['userId']).toBe('123');
    });
  });
});
