// packages/core/src/infrastructure/crypto/__tests__/jwt.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { decode, JwtError, sign, verify } from '../jwt';

describe('JWT', () => {
  const SECRET = 'test-secret-key-12345';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('sign', () => {
    it('should create a valid JWT token', () => {
      const payload = { userId: '123', role: 'admin' };
      const token = sign(payload, SECRET);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include iat claim', () => {
      const payload = { userId: '123' };
      const token = sign(payload, SECRET);
      const decoded = decode(token);

      expect(decoded?.iat).toBe(Math.floor(Date.now() / 1000));
    });

    it('should add expiration when expiresIn is provided', () => {
      const payload = { userId: '123' };
      const token = sign(payload, SECRET, { expiresIn: '1h' });
      const decoded = decode(token);

      expect(decoded?.exp).toBe(Math.floor(Date.now() / 1000) + 3600);
    });

    it('should handle numeric expiresIn', () => {
      const payload = { userId: '123' };
      const token = sign(payload, SECRET, { expiresIn: 300 });
      const decoded = decode(token);

      expect(decoded?.exp).toBe(Math.floor(Date.now() / 1000) + 300);
    });

    it('should parse different time units', () => {
      const now = Math.floor(Date.now() / 1000);

      expect(decode(sign({}, SECRET, { expiresIn: '30s' }))?.exp).toBe(now + 30);
      expect(decode(sign({}, SECRET, { expiresIn: '15m' }))?.exp).toBe(now + 900);
      expect(decode(sign({}, SECRET, { expiresIn: '2h' }))?.exp).toBe(now + 7200);
      expect(decode(sign({}, SECRET, { expiresIn: '7d' }))?.exp).toBe(now + 604800);
    });

    it('should throw on invalid expiration format', () => {
      expect(() => sign({}, SECRET, { expiresIn: 'invalid' })).toThrow(JwtError);
      expect(() => sign({}, SECRET, { expiresIn: 'invalid' })).toThrow('Invalid expiration format');
    });

    it('should throw on expiration with unsupported unit', () => {
      expect(() => sign({}, SECRET, { expiresIn: '10w' })).toThrow('Invalid expiration format');
      expect(() => sign({}, SECRET, { expiresIn: '1y' })).toThrow('Invalid expiration format');
    });
  });

  describe('verify', () => {
    it('should verify valid token', () => {
      const payload = { userId: '123', role: 'admin' };
      const token = sign(payload, SECRET);
      const verified = verify(token, SECRET);

      expect(verified.userId).toBe('123');
      expect(verified.role).toBe('admin');
    });

    it('should throw on invalid signature', () => {
      const token = sign({ userId: '123' }, SECRET);

      expect(() => verify(token, 'wrong-secret')).toThrow(JwtError);
      expect(() => verify(token, 'wrong-secret')).toThrow('Invalid signature');
    });

    it('should throw on expired token', () => {
      const token = sign({ userId: '123' }, SECRET, { expiresIn: '1h' });

      // Advance time past expiration
      vi.advanceTimersByTime(2 * 60 * 60 * 1000); // 2 hours

      expect(() => verify(token, SECRET)).toThrow(JwtError);
      expect(() => verify(token, SECRET)).toThrow('Token has expired');
    });

    it('should throw on malformed token', () => {
      expect(() => verify('invalid', SECRET)).toThrow(JwtError);
      expect(() => verify('a.b', SECRET)).toThrow('Invalid token format');
      expect(() => verify('a.b.c.d', SECRET)).toThrow('Invalid token format');
    });

    it('should throw on non-string token', () => {
      expect(() => verify(123 as unknown as string, SECRET)).toThrow('Token must be a string');
    });

    it('should throw on invalid algorithm', () => {
      // Create a token with wrong algorithm in header
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ userId: '123' })).toString('base64url');
      const fakeToken = `${header}.${payload}.fakesig`;

      expect(() => verify(fakeToken, SECRET)).toThrow('Algorithm not supported');
    });

    it('should pass for non-expired token', () => {
      const token = sign({ userId: '123' }, SECRET, { expiresIn: '1h' });

      // Advance time but not past expiration
      vi.advanceTimersByTime(30 * 60 * 1000); // 30 minutes

      expect(() => verify(token, SECRET)).not.toThrow();
    });

    it('should throw on token with empty parts', () => {
      // Create token with empty header/payload/signature
      expect(() => verify('..', SECRET)).toThrow('Invalid token format');
      expect(() => verify('.payload.sig', SECRET)).toThrow('Invalid token format');
      expect(() => verify('header..sig', SECRET)).toThrow('Invalid token format');
      expect(() => verify('header.payload.', SECRET)).toThrow('Invalid token format');
    });

    it('should throw on invalid header JSON', () => {
      const invalidHeader = Buffer.from('not-json').toString('base64url');
      const payload = Buffer.from(JSON.stringify({ userId: '123' })).toString('base64url');
      const fakeToken = `${invalidHeader}.${payload}.fakesig`;

      expect(() => verify(fakeToken, SECRET)).toThrow('Invalid header');
    });

    it('should throw on invalid payload JSON', async () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
        'base64url',
      );
      const invalidPayload = Buffer.from('not-json').toString('base64url');

      // We need a valid signature for this test, but since payload is invalid,
      // we need to sign something that will match
      const crypto = await import('node:crypto');
      const signature = crypto
        .createHmac('sha256', SECRET)
        .update(`${header}.${invalidPayload}`)
        .digest('base64url');

      const token = `${header}.${invalidPayload}.${signature}`;

      expect(() => verify(token, SECRET)).toThrow('Malformed token payload');
    });

    it('should throw on header with wrong typ', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'WRONG' })).toString(
        'base64url',
      );
      const payload = Buffer.from(JSON.stringify({ userId: '123' })).toString('base64url');
      const fakeToken = `${header}.${payload}.fakesig`;

      expect(() => verify(fakeToken, SECRET)).toThrow('Algorithm not supported');
    });

    it('should verify token without exp claim', () => {
      const payload = { userId: '123' };
      const token = sign(payload, SECRET); // No expiresIn

      // Should not throw because there's no exp to check
      const verified = verify(token, SECRET);
      expect(verified.userId).toBe('123');
      expect(verified.exp).toBeUndefined();
    });
  });

  describe('decode', () => {
    it('should decode valid token without verification', () => {
      const payload = { userId: '123', role: 'admin' };
      const token = sign(payload, SECRET);
      const decoded = decode(token);

      expect(decoded?.userId).toBe('123');
      expect(decoded?.role).toBe('admin');
    });

    it('should return null for invalid token', () => {
      expect(decode('invalid')).toBeNull();
      expect(decode('a.b')).toBeNull();
      expect(decode('')).toBeNull();
    });

    it('should decode without verifying signature', () => {
      const token = sign({ userId: '123' }, SECRET);
      const decoded = decode(token);

      // Should decode even if we don't have the secret
      expect(decoded?.userId).toBe('123');
    });

    it('should return null for token with invalid payload JSON', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
        'base64url',
      );
      const invalidPayload = Buffer.from('not-valid-json').toString('base64url');
      const token = `${header}.${invalidPayload}.signature`;

      expect(decode(token)).toBeNull();
    });

    it('should return null for token with empty payload part', () => {
      const token = 'header..signature';
      expect(decode(token)).toBeNull();
    });
  });

  describe('JwtError', () => {
    it('should have correct properties', () => {
      const error = new JwtError('Test error', 'INVALID_TOKEN');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('INVALID_TOKEN');
      expect(error.name).toBe('JwtError');
    });

    it('should support different error codes', () => {
      expect(new JwtError('msg', 'INVALID_TOKEN').code).toBe('INVALID_TOKEN');
      expect(new JwtError('msg', 'INVALID_SIGNATURE').code).toBe('INVALID_SIGNATURE');
      expect(new JwtError('msg', 'TOKEN_EXPIRED').code).toBe('TOKEN_EXPIRED');
      expect(new JwtError('msg', 'MALFORMED_TOKEN').code).toBe('MALFORMED_TOKEN');
    });
  });
});
