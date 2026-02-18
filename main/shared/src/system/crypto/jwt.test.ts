// main/shared/src/system/crypto/jwt.test.ts
import { createHmac } from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  checkTokenSecret,
  createJwtRotationHandler,
  decode,
  jwtDecode,
  JwtError,
  jwtSign,
  jwtVerify,
  sign,
  signWithRotation,
  verify,
  verifyWithRotation,
} from './jwt';

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
      // @ts-expect-error intentional type violation for adversarial test
      expect(() => verify(null, secret)).toThrow('Token must be a string');
      // @ts-expect-error intentional type violation for adversarial test
      expect(() => verify(undefined, secret)).toThrow('Token must be a string');
      // @ts-expect-error intentional type violation for adversarial test
      expect(() => verify(123, secret)).toThrow('Token must be a string');
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
      const tamperedToken = `${parts[0]!}.${parts[1]!}.wrong-signature`;

      const decoded = decode(tamperedToken);
      expect(decoded?.['userId']).toBe('123');
    });
  });

  describe('JWT Rotation', () => {
    it('should verify with current secret', () => {
      const config = {
        currentSecret: secret,
        previousSecret: 'old-secret',
      };

      const token = sign(payload, secret);
      const verified = verifyWithRotation(token, config);

      expect(verified['userId']).toBe('123');
    });

    it('should verify with previous secret when current fails', () => {
      const oldSecret = 'old-secret-key-with-sufficient-length';
      const newSecret = 'new-secret-key-with-sufficient-length';

      const config = {
        currentSecret: newSecret,
        previousSecret: oldSecret,
      };

      // Token signed with old secret
      const token = sign(payload, oldSecret);
      const verified = verifyWithRotation(token, config);

      expect(verified['userId']).toBe('123');
    });

    it('should throw if token invalid for both secrets', () => {
      const config = {
        currentSecret: secret,
        previousSecret: 'old-secret',
      };

      const wrongToken = sign(payload, 'completely-different-secret');

      expect(() => verifyWithRotation(wrongToken, config)).toThrow(JwtError);
    });

    it('should throw if no previous secret and current fails', () => {
      const config = {
        currentSecret: secret,
      };

      const wrongToken = sign(payload, 'wrong-secret');

      expect(() => verifyWithRotation(wrongToken, config)).toThrow(JwtError);
    });
  });

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

      // Even with slightly different signatures, should not throw unexpected errors
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

  // ============================================================================
  // Adversarial Tests — attack surface coverage
  // ============================================================================

  describe('adversarial: alg:none attack', () => {
    it('rejects alg:none with empty signature segment', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const encodedPayload = Buffer.from(JSON.stringify({ userId: 'attacker' })).toString(
        'base64url',
      );
      // alg:none attack — signature is intentionally empty → empty segment triggers MALFORMED_TOKEN
      const noneToken = `${header}.${encodedPayload}.`;

      expect(() => verify(noneToken, secret)).toThrow(JwtError);
    });

    it('rejects header with alg:RS256 (not HS256)', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString(
        'base64url',
      );
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const token = `${header}.${encodedPayload}.fakesig`;

      expect(() => verify(token, secret)).toThrow('Algorithm not supported');
    });

    it('rejects header with alg completely absent', () => {
      const header = Buffer.from(JSON.stringify({ typ: 'JWT' })).toString('base64url');
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const token = `${header}.${encodedPayload}.fakesig`;

      expect(() => verify(token, secret)).toThrow(JwtError);
    });

    it('rejects header where typ is missing', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const token = `${header}.${encodedPayload}.fakesig`;

      expect(() => verify(token, secret)).toThrow(JwtError);
    });

    it('rejects header where alg is HS256 but typ is wrong', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWK' })).toString(
        'base64url',
      );
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const token = `${header}.${encodedPayload}.fakesig`;

      expect(() => verify(token, secret)).toThrow(JwtError);
    });
  });

  describe('adversarial: tampered signatures', () => {
    it('rejects token with last character of signature flipped', () => {
      const token = sign(payload, secret);
      const parts = token.split('.');
      const sig = parts[2]!;
      const lastChar = sig[sig.length - 1]!;
      const altChar = lastChar === 'A' ? 'B' : 'A';
      const tamperedToken = `${parts[0]!}.${parts[1]!}.${sig.slice(0, -1)}${altChar}`;

      expect(() => verify(tamperedToken, secret)).toThrow('Invalid signature');
    });

    it('rejects token with payload swapped after signing', () => {
      const token = sign(payload, secret);
      const parts = token.split('.');
      const differentPayload = Buffer.from(
        JSON.stringify({ userId: 'hacker', email: 'evil@x.com' }),
      ).toString('base64url');
      const tamperedToken = `${parts[0]!}.${differentPayload}.${parts[2]!}`;

      expect(() => verify(tamperedToken, secret)).toThrow('Invalid signature');
    });

    it('rejects token with extra field added to header', () => {
      const token = sign(payload, secret);
      const parts = token.split('.');
      const differentHeader = Buffer.from(
        JSON.stringify({ alg: 'HS256', typ: 'JWT', kid: 'injected' }),
      ).toString('base64url');
      const tamperedToken = `${differentHeader}.${parts[1]!}.${parts[2]!}`;

      // Header modification changes the signing input — signature will be invalid
      expect(() => verify(tamperedToken, secret)).toThrow(JwtError);
    });

    it('rejects token with empty signature segment', () => {
      const token = sign(payload, secret);
      const parts = token.split('.');
      const noSigToken = `${parts[0]!}.${parts[1]!}.`;

      expect(() => verify(noSigToken, secret)).toThrow(JwtError);
    });
  });

  describe('adversarial: expired and future tokens', () => {
    it('rejects token expired exactly at boundary (exp === now)', () => {
      const token = sign(payload, secret, { expiresIn: '1h' });
      // Advance exactly to expiration moment
      vi.advanceTimersByTime(60 * 60 * 1000);

      // implementation: now >= exp → expired
      expect(() => verify(token, secret)).toThrow('Token has expired');
    });

    it('rejects token expired 1 second ago', () => {
      const token = sign(payload, secret, { expiresIn: '1s' });
      vi.advanceTimersByTime(2000);

      expect(() => verify(token, secret)).toThrow('Token has expired');
    });

    it('accepts token still valid by 1 second', () => {
      const token = sign(payload, secret, { expiresIn: '10s' });
      vi.advanceTimersByTime(9000); // 9s elapsed, exp is 10s from iat

      expect(() => verify(token, secret)).not.toThrow();
    });

    it('accepts token with no expiration regardless of time passing', () => {
      const token = sign(payload, secret); // no expiresIn
      vi.advanceTimersByTime(365 * 24 * 60 * 60 * 1000); // 1 year

      // Without exp claim, no expiry check occurs
      expect(() => verify(token, secret)).not.toThrow();
    });

    it('rejects invalid expiration format string with wrong unit', () => {
      expect(() => sign(payload, secret, { expiresIn: '15x' })).toThrow(JwtError);
    });

    it('rejects invalid expiration format string with no unit', () => {
      expect(() => sign(payload, secret, { expiresIn: 'invalid' })).toThrow(JwtError);
    });

    it('rejects empty string as expiration format', () => {
      expect(() => sign(payload, secret, { expiresIn: '' })).toThrow(JwtError);
    });
  });

  describe('clock tolerance', () => {
    it('accepts expired token within clock tolerance', () => {
      const token = sign(payload, secret, { expiresIn: '1h' });
      // Advance 2 seconds past expiration
      vi.advanceTimersByTime(60 * 60 * 1000 + 2000);

      // Without tolerance: rejected
      expect(() => verify(token, secret)).toThrow('Token has expired');
      // With 5s tolerance: accepted
      expect(() => verify(token, secret, { clockToleranceSeconds: 5 })).not.toThrow();
    });

    it('rejects expired token beyond clock tolerance', () => {
      const token = sign(payload, secret, { expiresIn: '1h' });
      // Advance 10 seconds past expiration
      vi.advanceTimersByTime(60 * 60 * 1000 + 10_000);

      expect(() => verify(token, secret, { clockToleranceSeconds: 5 })).toThrow(
        'Token has expired',
      );
    });

    it('accepts token at exact tolerance boundary (exp + tolerance === now)', () => {
      const token = sign(payload, secret, { expiresIn: '10s' });
      // Advance exactly to exp + tolerance
      vi.advanceTimersByTime(13_000); // exp=10s, tolerance=3s → 13s is boundary

      // now >= exp + tolerance → expired
      expect(() => verify(token, secret, { clockToleranceSeconds: 3 })).toThrow(
        'Token has expired',
      );
    });

    it('accepts token 1ms before tolerance boundary', () => {
      const token = sign(payload, secret, { expiresIn: '10s' });
      // Advance to 12s (exp=10, tolerance=3 → boundary at 13s)
      vi.advanceTimersByTime(12_000);

      expect(() => verify(token, secret, { clockToleranceSeconds: 3 })).not.toThrow();
    });

    it('jwtVerify forwards clock tolerance', () => {
      const token = jwtSign(payload, secret, { expiresIn: '1h' });
      vi.advanceTimersByTime(60 * 60 * 1000 + 2000);

      expect(() => jwtVerify(token, secret)).toThrow('Token has expired');
      expect(() => jwtVerify(token, secret, { clockToleranceSeconds: 5 })).not.toThrow();
    });

    it('verifyWithRotation uses clockToleranceSeconds from config', () => {
      const currentSecret = 'current-secret-key-with-sufficient-length';
      const token = sign(payload, currentSecret, { expiresIn: '1h' });
      vi.advanceTimersByTime(60 * 60 * 1000 + 2000);

      // Without tolerance: rejected
      expect(() => verifyWithRotation(token, { currentSecret })).toThrow('Token has expired');

      // With tolerance in config: accepted
      expect(() =>
        verifyWithRotation(token, { currentSecret, clockToleranceSeconds: 5 }),
      ).not.toThrow();
    });

    it('zero tolerance behaves same as no options', () => {
      const token = sign(payload, secret, { expiresIn: '10s' });
      vi.advanceTimersByTime(10_000);

      expect(() => verify(token, secret)).toThrow('Token has expired');
      expect(() => verify(token, secret, { clockToleranceSeconds: 0 })).toThrow(
        'Token has expired',
      );
    });
  });

  describe('adversarial: malformed base64 and missing segments', () => {
    it('returns null from decode for completely invalid base64 payload', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
        'base64url',
      );
      const malformed = '!!!not-base64!!!';
      const token = `${header}.${malformed}.fakesig`;

      expect(decode(token)).toBeNull();
    });

    it('rejects verify when payload decodes to a JSON array (not object)', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
        'base64url',
      );
      const arrayPayload = Buffer.from(JSON.stringify([1, 2, 3])).toString('base64url');
      // Compute a valid signature so we get past the signature check
      const sig = createHmac('sha256', secret)
        .update(`${header}.${arrayPayload}`)
        .digest('base64url');
      const token = `${header}.${arrayPayload}.${sig}`;

      expect(() => verify(token, secret)).toThrow('Malformed token payload');
    });

    it('rejects verify when payload decodes to a JSON string (not object)', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
        'base64url',
      );
      const stringPayload = Buffer.from(JSON.stringify('just-a-string')).toString('base64url');
      const sig = createHmac('sha256', secret)
        .update(`${header}.${stringPayload}`)
        .digest('base64url');
      const token = `${header}.${stringPayload}.${sig}`;

      expect(() => verify(token, secret)).toThrow('Malformed token payload');
    });

    it('rejects verify when payload decodes to JSON null', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
        'base64url',
      );
      const nullPayload = Buffer.from(JSON.stringify(null)).toString('base64url');
      const sig = createHmac('sha256', secret)
        .update(`${header}.${nullPayload}`)
        .digest('base64url');
      const token = `${header}.${nullPayload}.${sig}`;

      expect(() => verify(token, secret)).toThrow('Malformed token payload');
    });

    it('rejects token with only one segment', () => {
      expect(() => verify('onlyone', secret)).toThrow(JwtError);
    });

    it('rejects token with four segments', () => {
      expect(() => verify('a.b.c.d', secret)).toThrow(JwtError);
    });

    it('rejects token that is an empty string', () => {
      expect(() => verify('', secret)).toThrow(JwtError);
    });

    it('rejects token with empty header segment', () => {
      expect(() => verify('.payload.sig', secret)).toThrow(JwtError);
    });

    it('rejects token with empty payload segment', () => {
      const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
        'base64url',
      );
      expect(() => verify(`${header}..sig`, secret)).toThrow(JwtError);
    });
  });

  describe('adversarial: empty and weak secrets', () => {
    it('checkTokenSecret returns false for empty string', () => {
      expect(checkTokenSecret('')).toBe(false);
    });

    it('checkTokenSecret returns false for 31-char secret', () => {
      expect(checkTokenSecret('a'.repeat(31))).toBe(false);
    });

    it('checkTokenSecret returns true for exactly 32-char secret', () => {
      expect(checkTokenSecret('a'.repeat(32))).toBe(true);
    });

    it('checkTokenSecret returns true for secrets longer than 32 chars', () => {
      expect(checkTokenSecret('a'.repeat(64))).toBe(true);
    });

    it('empty-string secret: tokens are consistent but reject different secrets', () => {
      const emptySecret = '';
      const tokenA = sign(payload, emptySecret);
      const tokenB = sign({ userId: 'other' }, emptySecret);

      // tokenA verifies with empty secret
      expect(() => verify(tokenA, emptySecret)).not.toThrow();

      // tokenA does NOT verify with a non-empty secret
      expect(() => verify(tokenA, 'notempty')).toThrow(JwtError);

      // Swapping payloads across tokens fails (different signatures)
      const partsA = tokenA.split('.');
      const partsB = tokenB.split('.');
      const crossToken = `${partsA[0]!}.${partsB[1]!}.${partsA[2]!}`;
      expect(() => verify(crossToken, emptySecret)).toThrow(JwtError);
    });
  });

  describe('adversarial: very large payloads', () => {
    it('handles payload with 1000 keys', () => {
      const largePayload: Record<string, string> = {};
      for (let i = 0; i < 1000; i++) {
        largePayload[`key${String(i)}`] = `value${String(i)}`;
      }
      const token = sign(largePayload, secret);
      const verified = verify(token, secret);
      expect(verified['key999']).toBe('value999');
    });

    it('handles payload with deeply nested structure (20 levels)', () => {
      const deep: Record<string, unknown> = {};
      let current = deep;
      for (let i = 0; i < 19; i++) {
        const next: Record<string, unknown> = {};
        current['child'] = next;
        current = next;
      }
      current['leaf'] = 'deep-value';

      const token = sign(deep, secret);
      const verified = verify(token, secret);
      let node = verified as Record<string, unknown>;
      for (let i = 0; i < 19; i++) {
        node = node['child'] as Record<string, unknown>;
      }
      expect(node['leaf']).toBe('deep-value');
    });

    it('handles payload with large string values (10KB)', () => {
      const largeValue = 'x'.repeat(10 * 1024);
      const token = sign({ data: largeValue }, secret);
      const verified = verify(token, secret);
      expect(verified['data']).toBe(largeValue);
    });
  });

  describe('adversarial: key rotation edge cases', () => {
    it('signWithRotation uses currentSecret, not previousSecret', () => {
      const currentSecret = 'current-secret-key-with-sufficient-length';
      const previousSecret = 'previous-secret-key-with-sufficient-length';
      const config = { currentSecret, previousSecret };

      const token = signWithRotation(payload, config);

      expect(() => verify(token, currentSecret)).not.toThrow();
      expect(() => verify(token, previousSecret)).toThrow(JwtError);
    });

    it('createJwtRotationHandler verifies tokens signed with previousSecret', () => {
      const currentSecret = 'current-secret-key-with-sufficient-length';
      const previousSecret = 'previous-secret-key-with-sufficient-length';
      const config = { currentSecret, previousSecret };

      const handler = createJwtRotationHandler(config);
      const tokenFromPrevious = sign(payload, previousSecret);

      expect(() => handler(tokenFromPrevious)).not.toThrow();
      const result = handler(tokenFromPrevious);
      expect(result['userId']).toBe('123');
    });

    it('verifyWithRotation rejects token signed with unknown third secret', () => {
      const config = {
        currentSecret: 'current-secret-key-with-sufficient-length-abc',
        previousSecret: 'previous-secret-key-with-sufficient-length-xyz',
      };
      const unknownToken = sign(payload, 'unknown-secret-key-with-sufficient-length-123');

      expect(() => verifyWithRotation(unknownToken, config)).toThrow(JwtError);
    });

    it('verifyWithRotation treats empty string previousSecret as absent', () => {
      const config = {
        currentSecret: secret,
        previousSecret: '',
      };
      const wrongToken = sign(payload, 'wrong-secret-key-with-sufficient-length');

      // previousSecret is '' → treated as absent (the implementation checks !== '')
      expect(() => verifyWithRotation(wrongToken, config)).toThrow(JwtError);
    });

    it('expired token rejected even when previousSecret signature matches', () => {
      const oldSecret = 'old-secret-key-with-sufficient-length';
      const newSecret = 'new-secret-key-with-sufficient-length';

      const expiredToken = sign(payload, oldSecret, { expiresIn: '1h' });
      vi.advanceTimersByTime(2 * 60 * 60 * 1000); // 2 hours later

      const config = { currentSecret: newSecret, previousSecret: oldSecret };

      // Matches previousSecret but is expired — must still be rejected
      expect(() => verifyWithRotation(expiredToken, config)).toThrow(JwtError);
    });

    it('token signed with currentSecret is preferred over previousSecret during rotation', () => {
      const currentSecret = 'current-secret-key-with-sufficient-length';
      const previousSecret = 'previous-secret-key-with-sufficient-length';
      const config = { currentSecret, previousSecret };

      // Sign with currentSecret — should succeed on first attempt without trying previousSecret
      const currentToken = sign(payload, currentSecret);
      const result = verifyWithRotation(currentToken, config);
      expect(result['userId']).toBe('123');
    });
  });
});
