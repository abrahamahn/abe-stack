// main/server/engine/src/security/token.test.ts
import { describe, expect, it } from 'vitest';

import {
  decryptToken,
  encryptToken,
  generateToken,
  signToken,
  validateCsrfToken,
  verifyToken,
} from './token';

describe('security/token', () => {
  it('generates base64url tokens', () => {
    const t = generateToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(t.length).toBeGreaterThan(10);
  });

  it('signs and verifies tokens', () => {
    const secret = 's3cr3t';
    const t = 'token';
    const signed = signToken(t, secret);
    const ok = verifyToken(signed, secret);
    expect(ok).toEqual({ valid: true, token: t });

    const bad = verifyToken(`${signed}x`, secret);
    expect(bad.valid).toBe(false);
  });

  it('encrypts and decrypts tokens', () => {
    const secret = 'encrypt-secret';
    const payload = 'hello.token.sig';
    const enc = encryptToken(payload, secret);
    expect(decryptToken(enc, secret)).toBe(payload);
    expect(decryptToken(enc, 'wrong-secret')).toBeNull();
    expect(decryptToken('bad', secret)).toBeNull();
  });

  it('validates CSRF token pairs (signed and optionally encrypted)', () => {
    const secret = 'csrf-secret';
    const base = generateToken();
    const signed = signToken(base, secret);

    // signed-only cookie token
    expect(
      validateCsrfToken(signed, base, {
        secret,
        signed: true,
        encrypted: false,
      }),
    ).toBe(true);

    // encrypted + signed cookie token
    const encryptedCookie = encryptToken(signed, secret);
    expect(
      validateCsrfToken(encryptedCookie, base, {
        secret,
        signed: true,
        encrypted: true,
      }),
    ).toBe(true);

    // mismatch request token
    expect(
      validateCsrfToken(signed, 'nope', {
        secret,
        signed: true,
        encrypted: false,
      }),
    ).toBe(false);
  });
});
