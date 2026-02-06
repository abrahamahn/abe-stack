// shared/src/utils/security.test.ts

import { describe, expect, it } from 'vitest';

import {
  decryptToken,
  encryptToken,
  generateToken,
  signToken,
  validateCsrfToken,
  verifyToken,
  type CsrfValidationOptions,
} from './security';

describe('generateToken', () => {
  it('should return a non-empty string', () => {
    const token = generateToken();
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('should generate different tokens on each call', () => {
    const token1 = generateToken();
    const token2 = generateToken();
    const token3 = generateToken();

    expect(token1).not.toBe(token2);
    expect(token2).not.toBe(token3);
    expect(token1).not.toBe(token3);
  });

  it('should return a base64url-encoded string', () => {
    const token = generateToken();
    // base64url should not contain +, /, or = characters
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('signToken', () => {
  const testToken = 'test-token-123';
  const testSecret = 'test-secret-key';

  it('should return a string in "token.signature" format', () => {
    const signed = signToken(testToken, testSecret);

    expect(signed).toContain('.');
    expect(signed.split('.').length).toBe(2);
    expect(signed.startsWith(testToken)).toBe(true);
  });

  it('should be deterministic for same inputs', () => {
    const signed1 = signToken(testToken, testSecret);
    const signed2 = signToken(testToken, testSecret);

    expect(signed1).toBe(signed2);
  });

  it('should produce different signatures for different secrets', () => {
    const signed1 = signToken(testToken, 'secret1');
    const signed2 = signToken(testToken, 'secret2');

    expect(signed1).not.toBe(signed2);
  });

  it('should produce different signatures for different tokens', () => {
    const signed1 = signToken('token1', testSecret);
    const signed2 = signToken('token2', testSecret);

    expect(signed1).not.toBe(signed2);
  });
});

describe('verifyToken', () => {
  const testToken = 'test-token-abc';
  const testSecret = 'verification-secret';

  describe('when given a valid signed token', () => {
    it('should return { valid: true, token }', () => {
      const signed = signToken(testToken, testSecret);
      const result = verifyToken(signed, testSecret);

      expect(result.valid).toBe(true);
      expect(result.token).toBe(testToken);
    });
  });

  describe('when given a tampered signature', () => {
    it('should return { valid: false, token: null }', () => {
      const signed = signToken(testToken, testSecret);
      const tampered = signed.slice(0, -5) + 'XXXXX';

      const result = verifyToken(tampered, testSecret);

      expect(result.valid).toBe(false);
      expect(result.token).toBe(null);
    });
  });

  describe('when given a token without dot separator', () => {
    it('should return { valid: false, token: null }', () => {
      const result = verifyToken('no-separator-token', testSecret);

      expect(result.valid).toBe(false);
      expect(result.token).toBe(null);
    });
  });

  describe('when given wrong secret', () => {
    it('should return { valid: false, token: null }', () => {
      const signed = signToken(testToken, testSecret);
      const result = verifyToken(signed, 'wrong-secret');

      expect(result.valid).toBe(false);
      expect(result.token).toBe(null);
    });
  });

  describe('when given a token with tampered body', () => {
    it('should return { valid: false, token: null }', () => {
      const signed = signToken(testToken, testSecret);
      const dotIndex = signed.indexOf('.');
      const signature = signed.slice(dotIndex);
      const tampered = 'tampered-token' + signature;

      const result = verifyToken(tampered, testSecret);

      expect(result.valid).toBe(false);
      expect(result.token).toBe(null);
    });
  });

  describe('edge cases', () => {
    it('should handle tokens with multiple dots correctly', () => {
      const tokenWithDots = 'token.with.dots';
      const signed = signToken(tokenWithDots, testSecret);
      const result = verifyToken(signed, testSecret);

      expect(result.valid).toBe(true);
      expect(result.token).toBe(tokenWithDots);
    });

    it('should handle invalid base64url in signature', () => {
      const malformed = `${testToken}.!!!invalid!!!`;
      const result = verifyToken(malformed, testSecret);

      expect(result.valid).toBe(false);
      expect(result.token).toBe(null);
    });
  });
});

describe('encryptToken and decryptToken', () => {
  const testToken = 'secret-token-data';
  const testSecret = 'encryption-secret-key';

  describe('roundtrip encryption and decryption', () => {
    it('should successfully encrypt and decrypt a token', () => {
      const encrypted = encryptToken(testToken, testSecret);
      const decrypted = decryptToken(encrypted, testSecret);

      expect(decrypted).toBe(testToken);
    });

    it('should produce different encrypted values on each call due to random IV', () => {
      const encrypted1 = encryptToken(testToken, testSecret);
      const encrypted2 = encryptToken(testToken, testSecret);

      expect(encrypted1).not.toBe(encrypted2);

      // But both should decrypt to the same value
      expect(decryptToken(encrypted1, testSecret)).toBe(testToken);
      expect(decryptToken(encrypted2, testSecret)).toBe(testToken);
    });
  });

  describe('encryptToken', () => {
    it('should return a string in "iv.encrypted.authTag" format', () => {
      const encrypted = encryptToken(testToken, testSecret);

      expect(encrypted).toContain('.');
      const parts = encrypted.split('.');
      expect(parts.length).toBe(3);
      expect(parts[0].length).toBeGreaterThan(0); // IV
      expect(parts[1].length).toBeGreaterThan(0); // Encrypted data
      expect(parts[2].length).toBeGreaterThan(0); // Auth tag
    });
  });

  describe('decryptToken with wrong secret', () => {
    it('should return null', () => {
      const encrypted = encryptToken(testToken, testSecret);
      const decrypted = decryptToken(encrypted, 'wrong-secret');

      expect(decrypted).toBe(null);
    });
  });

  describe('decryptToken with malformed input', () => {
    it('should return null for non-standard format', () => {
      const decrypted = decryptToken('not-encrypted-at-all', testSecret);
      expect(decrypted).toBe(null);
    });

    it('should return null for wrong number of parts (too few)', () => {
      const decrypted = decryptToken('part1.part2', testSecret);
      expect(decrypted).toBe(null);
    });

    it('should return null for wrong number of parts (too many)', () => {
      const decrypted = decryptToken('part1.part2.part3.part4', testSecret);
      expect(decrypted).toBe(null);
    });

    it('should return null for empty parts', () => {
      expect(decryptToken('..', testSecret)).toBe(null);
      expect(decryptToken('.part2.part3', testSecret)).toBe(null);
      expect(decryptToken('part1..part3', testSecret)).toBe(null);
      expect(decryptToken('part1.part2.', testSecret)).toBe(null);
    });

    it('should return null for invalid base64url encoding', () => {
      const decrypted = decryptToken('!!!.invalid.data', testSecret);
      expect(decrypted).toBe(null);
    });

    it('should return null for tampered auth tag', () => {
      const encrypted = encryptToken(testToken, testSecret);
      const parts = encrypted.split('.');
      expect(parts[0]).toBeDefined();
      expect(parts[1]).toBeDefined();
      const tampered = [parts[0], parts[1], 'XXXXXXXXXX'].join('.');

      const decrypted = decryptToken(tampered, testSecret);
      expect(decrypted).toBe(null);
    });
  });
});

describe('validateCsrfToken', () => {
  const secret = 'csrf-validation-secret';
  const rawToken = 'csrf-token-value';

  describe('when tokens are empty or undefined', () => {
    it('should return false for undefined cookieToken', () => {
      const options: CsrfValidationOptions = { secret, signed: true };
      const result = validateCsrfToken(undefined, rawToken, options);
      expect(result).toBe(false);
    });

    it('should return false for empty cookieToken', () => {
      const options: CsrfValidationOptions = { secret, signed: true };
      const result = validateCsrfToken('', rawToken, options);
      expect(result).toBe(false);
    });

    it('should return false for undefined requestToken', () => {
      const options: CsrfValidationOptions = { secret, signed: true };
      const result = validateCsrfToken(rawToken, undefined, options);
      expect(result).toBe(false);
    });

    it('should return false for empty requestToken', () => {
      const options: CsrfValidationOptions = { secret, signed: true };
      const result = validateCsrfToken(rawToken, '', options);
      expect(result).toBe(false);
    });

    it('should return false for both empty', () => {
      const options: CsrfValidationOptions = { secret, signed: true };
      const result = validateCsrfToken('', '', options);
      expect(result).toBe(false);
    });
  });

  describe('signed mode (default)', () => {
    it('should validate matching signed tokens', () => {
      const signedCookie = signToken(rawToken, secret);
      const options: CsrfValidationOptions = { secret, signed: true };

      const result = validateCsrfToken(signedCookie, rawToken, options);
      expect(result).toBe(true);
    });

    it('should reject mismatched tokens', () => {
      const signedCookie = signToken(rawToken, secret);
      const options: CsrfValidationOptions = { secret, signed: true };

      const result = validateCsrfToken(signedCookie, 'different-token', options);
      expect(result).toBe(false);
    });

    it('should reject tampered cookie signature', () => {
      const signedCookie = signToken(rawToken, secret);
      const tampered = signedCookie.slice(0, -5) + 'XXXXX';
      const options: CsrfValidationOptions = { secret, signed: true };

      const result = validateCsrfToken(tampered, rawToken, options);
      expect(result).toBe(false);
    });

    it('should reject wrong secret', () => {
      const signedCookie = signToken(rawToken, 'different-secret');
      const options: CsrfValidationOptions = { secret, signed: true };

      const result = validateCsrfToken(signedCookie, rawToken, options);
      expect(result).toBe(false);
    });
  });

  describe('encrypted and signed mode', () => {
    it('should validate matching encrypted and signed tokens', () => {
      const signedToken = signToken(rawToken, secret);
      const encryptedCookie = encryptToken(signedToken, secret);
      const options: CsrfValidationOptions = { secret, encrypted: true, signed: true };

      const result = validateCsrfToken(encryptedCookie, rawToken, options);
      expect(result).toBe(true);
    });

    it('should reject tampered encrypted data', () => {
      const signedToken = signToken(rawToken, secret);
      const encryptedCookie = encryptToken(signedToken, secret);
      const tampered = encryptedCookie.slice(0, -5) + 'XXXXX';
      const options: CsrfValidationOptions = { secret, encrypted: true, signed: true };

      const result = validateCsrfToken(tampered, rawToken, options);
      expect(result).toBe(false);
    });

    it('should reject wrong decryption secret', () => {
      const signedToken = signToken(rawToken, secret);
      const encryptedCookie = encryptToken(signedToken, 'wrong-secret');
      const options: CsrfValidationOptions = { secret, encrypted: true, signed: true };

      const result = validateCsrfToken(encryptedCookie, rawToken, options);
      expect(result).toBe(false);
    });

    it('should reject mismatched request token', () => {
      const signedToken = signToken(rawToken, secret);
      const encryptedCookie = encryptToken(signedToken, secret);
      const options: CsrfValidationOptions = { secret, encrypted: true, signed: true };

      const result = validateCsrfToken(encryptedCookie, 'wrong-token', options);
      expect(result).toBe(false);
    });
  });

  describe('encrypted but not signed mode', () => {
    it('should validate matching encrypted (unsigned) tokens', () => {
      const encryptedCookie = encryptToken(rawToken, secret);
      const options: CsrfValidationOptions = { secret, encrypted: true, signed: false };

      const result = validateCsrfToken(encryptedCookie, rawToken, options);
      expect(result).toBe(true);
    });

    it('should reject tampered encrypted data', () => {
      const encryptedCookie = encryptToken(rawToken, secret);
      const tampered = encryptedCookie.slice(0, -5) + 'XXXXX';
      const options: CsrfValidationOptions = { secret, encrypted: true, signed: false };

      const result = validateCsrfToken(tampered, rawToken, options);
      expect(result).toBe(false);
    });
  });

  describe('neither signed nor encrypted mode', () => {
    it('should validate matching plain tokens', () => {
      const options: CsrfValidationOptions = { secret, signed: false };

      const result = validateCsrfToken(rawToken, rawToken, options);
      expect(result).toBe(true);
    });

    it('should reject mismatched plain tokens', () => {
      const options: CsrfValidationOptions = { secret, signed: false };

      const result = validateCsrfToken(rawToken, 'different-token', options);
      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle invalid encrypted format gracefully', () => {
      const options: CsrfValidationOptions = { secret, encrypted: true, signed: true };
      const result = validateCsrfToken('malformed-data', rawToken, options);
      expect(result).toBe(false);
    });

    it('should handle tokens with different lengths using timing-safe comparison', () => {
      const signedCookie = signToken(rawToken, secret);
      const options: CsrfValidationOptions = { secret, signed: true };

      const result = validateCsrfToken(signedCookie, rawToken + 'extra', options);
      expect(result).toBe(false);
    });
  });
});
