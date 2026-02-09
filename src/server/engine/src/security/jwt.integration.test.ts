// src/server/engine/src/security/jwt.integration.test.ts
/**
 * Integration tests for JWT utilities with real tokens
 *
 * Tests JWT sign, verify, and decode with realistic authentication scenarios.
 */

import { createHmac } from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { checkTokenSecret, decode, JwtError, sign, verify } from './jwt';

describe('JWT Integration', () => {
  const SECRET = 'super-secret-key-for-testing-jwt-123!@#';
  const REFRESH_SECRET = 'different-secret-for-refresh-tokens-456!@#';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Access token workflow', () => {
    interface AccessTokenPayload {
      userId: string;
      email: string;
      role: 'user' | 'admin';
      permissions: string[];
    }

    it('should create and verify access token with user data', () => {
      const payload: AccessTokenPayload = {
        userId: 'user-123-abc',
        email: 'john@example.com',
        role: 'user',
        permissions: ['read:profile', 'write:profile'],
      };

      const token = sign(payload, SECRET, { expiresIn: '15m' });
      const verified = verify(token, SECRET);

      expect(verified['userId']).toBe('user-123-abc');
      expect(verified['email']).toBe('john@example.com');
      expect(verified['role']).toBe('user');
      expect(verified['permissions']).toEqual(['read:profile', 'write:profile']);
    });

    it('should include issued at and expiration claims', () => {
      const token = sign({ userId: '123' }, SECRET, { expiresIn: '1h' });
      const decoded = decode(token);

      const now = Math.floor(Date.now() / 1000);
      expect(decoded?.iat).toBe(now);
      expect(decoded?.exp).toBe(now + 3600); // 1 hour later
    });

    it('should reject expired access token', () => {
      const token = sign({ userId: '123' }, SECRET, { expiresIn: '15m' });

      // Advance time past expiration
      vi.advanceTimersByTime(16 * 60 * 1000); // 16 minutes

      expect(() => verify(token, SECRET)).toThrow(JwtError);
      expect(() => verify(token, SECRET)).toThrow('Token has expired');
    });

    it('should accept token just before expiration', () => {
      const token = sign({ userId: '123' }, SECRET, { expiresIn: '15m' });

      // Advance to 14 minutes 59 seconds
      vi.advanceTimersByTime(14 * 60 * 1000 + 59 * 1000);

      expect(() => verify(token, SECRET)).not.toThrow();
    });
  });

  describe('Refresh token workflow', () => {
    interface RefreshTokenPayload {
      userId: string;
      tokenFamily: string;
      version: number;
    }

    it('should create long-lived refresh tokens', () => {
      const payload: RefreshTokenPayload = {
        userId: 'user-123',
        tokenFamily: 'family-abc',
        version: 1,
      };

      const token = sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
      const decoded = decode(token);

      const now = Math.floor(Date.now() / 1000);
      expect(decoded?.exp).toBe(now + 7 * 24 * 60 * 60); // 7 days later
    });

    it('should use different secret for refresh tokens', () => {
      const accessToken = sign({ userId: '123' }, SECRET);
      const refreshToken = sign({ userId: '123' }, REFRESH_SECRET);

      // Access token should verify with access secret
      expect(() => verify(accessToken, SECRET)).not.toThrow();
      expect(() => verify(accessToken, REFRESH_SECRET)).toThrow('Invalid signature');

      // Refresh token should verify with refresh secret
      expect(() => verify(refreshToken, REFRESH_SECRET)).not.toThrow();
      expect(() => verify(refreshToken, SECRET)).toThrow('Invalid signature');
    });

    it('should simulate refresh token rotation', () => {
      // Initial refresh token
      const token1 = sign({ userId: '123', tokenFamily: 'fam-1', version: 1 }, REFRESH_SECRET, {
        expiresIn: '7d',
      });

      // Simulate time passing
      vi.advanceTimersByTime(1 * 24 * 60 * 60 * 1000); // 1 day

      // Verify original and issue new token
      const verified = verify(token1, REFRESH_SECRET);
      expect(verified['version']).toBe(1);

      // Issue rotated token with incremented version
      const token2 = sign(
        {
          userId: verified['userId'],
          tokenFamily: verified['tokenFamily'],
          version: (verified['version'] as number) + 1,
        },
        REFRESH_SECRET,
        { expiresIn: '7d' },
      );

      const verified2 = verify(token2, REFRESH_SECRET);
      expect(verified2['version']).toBe(2);
      expect(verified2['tokenFamily']).toBe('fam-1');
    });
  });

  describe('Token manipulation detection', () => {
    it('should detect payload tampering', () => {
      const token = sign({ userId: '123', role: 'user' }, SECRET);

      // Tamper with payload (change role to admin)
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1] ?? '', 'base64url').toString()) as Record<
        string,
        unknown
      >;
      payload['role'] = 'admin';
      const tamperedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const tamperedToken = `${parts[0] ?? ''}.${tamperedPayload}.${parts[2] ?? ''}`;

      expect(() => verify(tamperedToken, SECRET)).toThrow('Invalid signature');
    });

    it('should detect header tampering', () => {
      const token = sign({ userId: '123' }, SECRET);

      // Tamper with header (try to change algorithm)
      const parts = token.split('.');
      const header = JSON.parse(Buffer.from(parts[0] ?? '', 'base64url').toString()) as Record<
        string,
        unknown
      >;
      header['alg'] = 'none';
      const tamperedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
      const tamperedToken = `${tamperedHeader}.${parts[1] ?? ''}.${parts[2] ?? ''}`;

      expect(() => verify(tamperedToken, SECRET)).toThrow('Algorithm not supported');
    });

    it('should detect signature tampering', () => {
      const token = sign({ userId: '123' }, SECRET);

      // Change one character in signature
      const parts = token.split('.');
      const sig = parts[2] ?? '';
      const tamperedSig = sig.slice(0, -1) + (sig.slice(-1) === 'a' ? 'b' : 'a');
      const tamperedToken = `${parts[0] ?? ''}.${parts[1] ?? ''}.${tamperedSig}`;

      expect(() => verify(tamperedToken, SECRET)).toThrow('Invalid signature');
    });
  });

  describe('Token structure validation', () => {
    it('should reject tokens with missing parts', () => {
      expect(() => verify('header.payload', SECRET)).toThrow('Invalid token format');
      expect(() => verify('header', SECRET)).toThrow('Invalid token format');
      expect(() => verify('', SECRET)).toThrow('Invalid token format');
    });

    it('should reject tokens with extra parts', () => {
      expect(() => verify('a.b.c.d', SECRET)).toThrow('Invalid token format');
    });

    it('should reject tokens with empty parts', () => {
      expect(() => verify('..', SECRET)).toThrow('Invalid token format');
      expect(() => verify('.payload.sig', SECRET)).toThrow('Invalid token format');
      expect(() => verify('header..sig', SECRET)).toThrow('Invalid token format');
    });

    it('should reject invalid base64 encoding', () => {
      expect(() => verify('not-base64!.not-base64!.not-base64!', SECRET)).toThrow();
    });
  });

  describe('Decode without verification', () => {
    it('should decode valid token without secret', () => {
      const token = sign({ userId: '123', data: 'test' }, SECRET);
      const decoded = decode(token);

      expect(decoded?.['userId']).toBe('123');
      expect(decoded?.['data']).toBe('test');
    });

    it('should decode even with wrong secret', () => {
      const token = sign({ userId: '123' }, SECRET);
      const decoded = decode(token);

      // decode() doesn't verify, so it should work
      expect(decoded?.['userId']).toBe('123');
    });

    it('should return null for invalid tokens', () => {
      expect(decode('invalid')).toBeNull();
      expect(decode('a.b')).toBeNull();
      expect(decode('')).toBeNull();
    });
  });

  describe('Expiration formats', () => {
    it('should handle seconds', () => {
      const token = sign({}, SECRET, { expiresIn: '30s' });
      const decoded = decode(token);

      const now = Math.floor(Date.now() / 1000);
      expect(decoded?.exp).toBe(now + 30);
    });

    it('should handle minutes', () => {
      const token = sign({}, SECRET, { expiresIn: '15m' });
      const decoded = decode(token);

      const now = Math.floor(Date.now() / 1000);
      expect(decoded?.exp).toBe(now + 15 * 60);
    });

    it('should handle hours', () => {
      const token = sign({}, SECRET, { expiresIn: '24h' });
      const decoded = decode(token);

      const now = Math.floor(Date.now() / 1000);
      expect(decoded?.exp).toBe(now + 24 * 60 * 60);
    });

    it('should handle days', () => {
      const token = sign({}, SECRET, { expiresIn: '30d' });
      const decoded = decode(token);

      const now = Math.floor(Date.now() / 1000);
      expect(decoded?.exp).toBe(now + 30 * 24 * 60 * 60);
    });

    it('should handle numeric seconds', () => {
      const token = sign({}, SECRET, { expiresIn: 3600 });
      const decoded = decode(token);

      const now = Math.floor(Date.now() / 1000);
      expect(decoded?.exp).toBe(now + 3600);
    });

    it('should reject invalid formats', () => {
      expect(() => sign({}, SECRET, { expiresIn: 'invalid' })).toThrow('Invalid expiration format');
      expect(() => sign({}, SECRET, { expiresIn: '10w' })).toThrow('Invalid expiration format');
      expect(() => sign({}, SECRET, { expiresIn: '1y' })).toThrow('Invalid expiration format');
    });
  });

  describe('JwtError codes', () => {
    it('should use MALFORMED_TOKEN for structural issues', () => {
      try {
        verify('a.b.c', SECRET);
      } catch (e) {
        expect(e).toBeInstanceOf(JwtError);
        expect((e as JwtError).code).toBe('MALFORMED_TOKEN');
      }
    });

    it('should use INVALID_TOKEN for algorithm issues', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString(
        'base64url',
      );
      const payload = Buffer.from(JSON.stringify({ userId: '123' })).toString('base64url');
      const fakeToken = `${header}.${payload}.fakesig`;

      try {
        verify(fakeToken, SECRET);
      } catch (e) {
        expect(e).toBeInstanceOf(JwtError);
        expect((e as JwtError).code).toBe('INVALID_TOKEN');
      }
    });

    it('should use INVALID_SIGNATURE for wrong secret', () => {
      const token = sign({}, SECRET);

      try {
        verify(token, 'wrong-secret');
      } catch (e) {
        expect(e).toBeInstanceOf(JwtError);
        expect((e as JwtError).code).toBe('INVALID_SIGNATURE');
      }
    });

    it('should use TOKEN_EXPIRED for expired tokens', () => {
      const token = sign({}, SECRET, { expiresIn: '1s' });
      vi.advanceTimersByTime(2000);

      try {
        verify(token, SECRET);
      } catch (e) {
        expect(e).toBeInstanceOf(JwtError);
        expect((e as JwtError).code).toBe('TOKEN_EXPIRED');
      }
    });
  });

  describe('Real-world authentication scenarios', () => {
    it('should handle complete login flow', () => {
      // User logs in, receive access and refresh tokens
      const userId = 'user-abc-123';
      const userEmail = 'user@example.com';

      const accessToken = sign({ userId, email: userEmail, role: 'user' }, SECRET, {
        expiresIn: '15m',
      });

      const refreshToken = sign({ userId, tokenFamily: 'tf-1', version: 1 }, REFRESH_SECRET, {
        expiresIn: '7d',
      });

      // Verify access token on API request
      const accessPayload = verify(accessToken, SECRET);
      expect(accessPayload['userId']).toBe(userId);

      // Verify refresh token is valid
      const refreshPayload = verify(refreshToken, REFRESH_SECRET);
      expect(refreshPayload['userId']).toBe(userId);
    });

    it('should handle token refresh flow', () => {
      const userId = 'user-abc-123';

      // Initial tokens
      sign({ userId }, SECRET, { expiresIn: '15m' });

      const refreshToken = sign({ userId, version: 1 }, REFRESH_SECRET, { expiresIn: '7d' });

      // Access token expires
      vi.advanceTimersByTime(20 * 60 * 1000); // 20 minutes

      // Use refresh token to get new access token
      const refreshPayload = verify(refreshToken, REFRESH_SECRET);
      expect(refreshPayload['userId']).toBe(userId);

      // Issue new access token
      const newAccessToken = sign({ userId: refreshPayload['userId'] }, SECRET, {
        expiresIn: '15m',
      });

      // New access token should be valid
      const newAccessPayload = verify(newAccessToken, SECRET);
      expect(newAccessPayload['userId']).toBe(userId);
    });

    it('should handle logout and token invalidation', () => {
      const userId = 'user-abc-123';
      const tokenVersion = 1;

      const accessToken = sign({ userId, tokenVersion }, SECRET, { expiresIn: '15m' });

      // Decode to get version (simulating server-side check)
      const decoded = decode(accessToken);

      // Server would check: decoded.tokenVersion >= storedVersion
      expect(decoded?.['tokenVersion']).toBe(tokenVersion);

      // After logout, server increments stored version
      const newStoredVersion = 2;

      // Old token's version is now invalid
      expect(decoded?.['tokenVersion']).toBeLessThan(newStoredVersion);
    });

    it('should handle admin vs user permissions', () => {
      const userToken = sign({ userId: '1', role: 'user', permissions: ['read'] }, SECRET, {
        expiresIn: '15m',
      });

      const adminToken = sign(
        { userId: '2', role: 'admin', permissions: ['read', 'write', 'delete'] },
        SECRET,
        { expiresIn: '15m' },
      );

      const userPayload = verify(userToken, SECRET);
      const adminPayload = verify(adminToken, SECRET);

      expect(userPayload['role']).toBe('user');
      expect((userPayload['permissions'] as string[]).includes('delete')).toBe(false);

      expect(adminPayload['role']).toBe('admin');
      expect((adminPayload['permissions'] as string[]).includes('delete')).toBe(true);
    });
  });

  describe('Timing-safe comparison', () => {
    it('should reject tokens with different-length signatures', () => {
      const token = sign({ userId: '123' }, SECRET);
      const parts = token.split('.');

      // Replace signature with a shorter one (different length)
      const shortSig = 'abc123';
      const tamperedToken = `${parts[0] ?? ''}.${parts[1] ?? ''}.${shortSig}`;

      expect(() => verify(tamperedToken, SECRET)).toThrow('Invalid signature');
    });

    it('should reject tokens with longer signatures', () => {
      const token = sign({ userId: '123' }, SECRET);
      const parts = token.split('.');

      // Replace signature with a much longer one
      const longSig = (parts[2] ?? '') + 'extrapaddingtomakeitlonger';
      const tamperedToken = `${parts[0] ?? ''}.${parts[1] ?? ''}.${longSig}`;

      expect(() => verify(tamperedToken, SECRET)).toThrow('Invalid signature');
    });

    it('should reject empty signature', () => {
      const token = sign({ userId: '123' }, SECRET);
      const parts = token.split('.');

      const tamperedToken = `${parts[0] ?? ''}.${parts[1] ?? ''}.`;

      expect(() => verify(tamperedToken, SECRET)).toThrow('Invalid token format');
    });
  });

  describe('Payload structural validation', () => {
    it('should reject array payload', () => {
      // Manually craft a token with an array payload
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
        'base64url',
      );
      const payload = Buffer.from(JSON.stringify([1, 2, 3])).toString('base64url');

      // Create valid signature for tampered content
      const signature = createHmac('sha256', SECRET)
        .update(`${header}.${payload}`)
        .digest('base64url');

      const token = `${header}.${payload}.${signature}`;

      expect(() => verify(token, SECRET)).toThrow('Malformed token payload');
    });

    it('should reject null payload', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
        'base64url',
      );
      const payload = Buffer.from(JSON.stringify(null)).toString('base64url');

      const signature = createHmac('sha256', SECRET)
        .update(`${header}.${payload}`)
        .digest('base64url');

      const token = `${header}.${payload}.${signature}`;

      expect(() => verify(token, SECRET)).toThrow('Malformed token payload');
    });

    it('should reject primitive string payload', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
        'base64url',
      );
      const payload = Buffer.from(JSON.stringify('just a string')).toString('base64url');

      const signature = createHmac('sha256', SECRET)
        .update(`${header}.${payload}`)
        .digest('base64url');

      const token = `${header}.${payload}.${signature}`;

      expect(() => verify(token, SECRET)).toThrow('Malformed token payload');
    });
  });

  describe('Secret strength validation', () => {
    it('should accept secrets with 32+ characters', () => {
      expect(checkTokenSecret('a'.repeat(32))).toBe(true);
      expect(checkTokenSecret('a'.repeat(64))).toBe(true);
      expect(checkTokenSecret(SECRET)).toBe(true);
    });

    it('should reject secrets shorter than 32 characters', () => {
      expect(checkTokenSecret('')).toBe(false);
      expect(checkTokenSecret('short')).toBe(false);
      expect(checkTokenSecret('a'.repeat(31))).toBe(false);
    });

    it('should reject empty string', () => {
      expect(checkTokenSecret('')).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty payload', () => {
      const token = sign({}, SECRET);
      const verified = verify(token, SECRET);

      expect(verified.iat).toBeDefined();
      expect(Object.keys(verified).filter((k) => k !== 'iat')).toHaveLength(0);
    });

    it('should handle payload with special characters', () => {
      const payload = {
        message: 'Hello, World! @#$%^&*()',
        unicode: '\u00e9\u00e8\u00ea',
        emoji: 'data with special chars',
      };

      const token = sign(payload, SECRET);
      const verified = verify(token, SECRET);

      expect(verified['message']).toBe(payload.message);
      expect(verified['unicode']).toBe(payload.unicode);
    });

    it('should handle nested payload objects', () => {
      const payload = {
        user: {
          id: '123',
          profile: {
            name: 'John',
            settings: {
              theme: 'dark',
            },
          },
        },
      };

      const token = sign(payload, SECRET);
      const verified = verify(token, SECRET);

      expect(verified['user']).toEqual(payload.user);
    });

    it('should handle array values in payload', () => {
      const payload = {
        roles: ['admin', 'user'],
        permissions: ['read', 'write', 'delete'],
        numbers: [1, 2, 3, 4, 5],
      };

      const token = sign(payload, SECRET);
      const verified = verify(token, SECRET);

      expect(verified['roles']).toEqual(payload.roles);
      expect(verified['permissions']).toEqual(payload.permissions);
      expect(verified['numbers']).toEqual(payload.numbers);
    });
  });
});
