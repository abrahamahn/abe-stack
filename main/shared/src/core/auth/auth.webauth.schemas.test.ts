// main/shared/src/core/auth/auth.webauth.schemas.test.ts
/**
 * @file Auth WebAuthn Schemas Tests
 * @description Adversarial unit tests for WebAuthn request/response validation schemas.
 * @module Core/Auth/Tests
 */

import { describe, expect, it } from 'vitest';

import {
  webauthnLoginOptionsRequestSchema,
  webauthnLoginVerifyRequestSchema,
  webauthnOptionsResponseSchema,
  webauthnRegisterVerifyRequestSchema,
  webauthnRegisterVerifyResponseSchema,
} from './auth.webauth.schemas';

// ============================================================================
// webauthnOptionsResponseSchema
// ============================================================================

describe('webauthnOptionsResponseSchema', () => {
  describe('valid inputs', () => {
    it('should accept an empty options object', () => {
      const result = webauthnOptionsResponseSchema.parse({ options: {} });
      expect(result.options).toEqual({});
    });

    it('should accept a populated options object', () => {
      const opts = { challenge: 'abc123', timeout: 60000, rpId: 'example.com' };
      const result = webauthnOptionsResponseSchema.parse({ options: opts });
      expect(result.options).toEqual(opts);
    });

    it('should accept a nested options object', () => {
      const opts = { rp: { name: 'ACME', id: 'acme.com' }, user: { id: 'u1', name: 'alice' } };
      const result = webauthnOptionsResponseSchema.parse({ options: opts });
      expect(result.options).toEqual(opts);
    });

    it('should strip unrecognised top-level fields and preserve options', () => {
      const result = webauthnOptionsResponseSchema.parse({
        options: { challenge: 'x' },
        extra: 'ignored',
      });
      expect(result.options).toEqual({ challenge: 'x' });
    });

    it('should coerce a non-object top-level to {} then reject missing options', () => {
      // primitive top-level → treated as {}, so options is undefined → should throw
      expect(() => webauthnOptionsResponseSchema.parse('string')).toThrow(
        'options must be an object',
      );
    });
  });

  describe('invalid inputs — options field', () => {
    it('should reject when options is null', () => {
      expect(() => webauthnOptionsResponseSchema.parse({ options: null })).toThrow(
        'options must be an object',
      );
    });

    it('should reject when options is undefined (field missing)', () => {
      expect(() => webauthnOptionsResponseSchema.parse({})).toThrow('options must be an object');
    });

    it('should reject when options is a string', () => {
      expect(() => webauthnOptionsResponseSchema.parse({ options: 'string' })).toThrow(
        'options must be an object',
      );
    });

    it('should reject when options is a number', () => {
      expect(() => webauthnOptionsResponseSchema.parse({ options: 42 })).toThrow(
        'options must be an object',
      );
    });

    it('should reject when options is a boolean', () => {
      expect(() => webauthnOptionsResponseSchema.parse({ options: true })).toThrow(
        'options must be an object',
      );
    });

    it('should accept when options is an array (typeof [] === "object" and not null)', () => {
      // The schema checks typeof !== 'object' but does NOT guard Array.isArray —
      // an array passes the type check so it is accepted as Record<string, unknown>.
      const result = webauthnOptionsResponseSchema.parse({ options: [1, 2, 3] });
      expect(Array.isArray(result.options)).toBe(true);
    });
  });

  describe('safeParse', () => {
    it('should return success:true for valid data', () => {
      const result = webauthnOptionsResponseSchema.safeParse({ options: {} });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.options).toEqual({});
    });

    it('should return success:false with error for invalid data', () => {
      const result = webauthnOptionsResponseSchema.safeParse({ options: null });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.message).toBe('options must be an object');
    });
  });
});

// ============================================================================
// webauthnRegisterVerifyRequestSchema
// ============================================================================

describe('webauthnRegisterVerifyRequestSchema', () => {
  describe('valid inputs', () => {
    it('should parse with credential only (name omitted)', () => {
      const result = webauthnRegisterVerifyRequestSchema.parse({ credential: { id: 'cred-1' } });
      expect(result.credential).toEqual({ id: 'cred-1' });
      expect(result.name).toBeUndefined();
    });

    it('should parse with credential and a string name', () => {
      const result = webauthnRegisterVerifyRequestSchema.parse({
        credential: { id: 'cred-1', type: 'public-key' },
        name: 'My YubiKey',
      });
      expect(result.credential).toEqual({ id: 'cred-1', type: 'public-key' });
      expect(result.name).toBe('My YubiKey');
    });

    it('should parse with an empty string name (still a string)', () => {
      const result = webauthnRegisterVerifyRequestSchema.parse({
        credential: {},
        name: '',
      });
      expect(result.name).toBe('');
    });

    it('should accept an array as credential (typeof [] === "object", not null)', () => {
      // Same behaviour as options above: array passes the object type guard
      const result = webauthnRegisterVerifyRequestSchema.parse({ credential: ['a', 'b'] });
      expect(Array.isArray(result.credential)).toBe(true);
    });

    it('should accept a nested credential object', () => {
      const cred = {
        id: 'id',
        response: { clientDataJSON: 'base64', attestationObject: 'base64' },
      };
      const result = webauthnRegisterVerifyRequestSchema.parse({ credential: cred });
      expect(result.credential).toEqual(cred);
    });
  });

  describe('invalid inputs — credential field', () => {
    it('should reject when credential is null', () => {
      expect(() => webauthnRegisterVerifyRequestSchema.parse({ credential: null })).toThrow(
        'credential must be an object',
      );
    });

    it('should reject when credential is undefined (field missing)', () => {
      expect(() => webauthnRegisterVerifyRequestSchema.parse({})).toThrow(
        'credential must be an object',
      );
    });

    it('should reject when credential is a string', () => {
      expect(() => webauthnRegisterVerifyRequestSchema.parse({ credential: 'bad' })).toThrow(
        'credential must be an object',
      );
    });

    it('should reject when credential is a number', () => {
      expect(() => webauthnRegisterVerifyRequestSchema.parse({ credential: 0 })).toThrow(
        'credential must be an object',
      );
    });

    it('should reject when credential is a boolean', () => {
      expect(() => webauthnRegisterVerifyRequestSchema.parse({ credential: false })).toThrow(
        'credential must be an object',
      );
    });

    it('should reject entirely null input', () => {
      // null top-level → coerced to {}, so credential is missing
      expect(() => webauthnRegisterVerifyRequestSchema.parse(null)).toThrow(
        'credential must be an object',
      );
    });
  });

  describe('name field coercion', () => {
    it('should omit name when value is a number', () => {
      const result = webauthnRegisterVerifyRequestSchema.parse({
        credential: {},
        name: 123,
      });
      expect(result.name).toBeUndefined();
    });

    it('should omit name when value is null', () => {
      const result = webauthnRegisterVerifyRequestSchema.parse({
        credential: {},
        name: null,
      });
      expect(result.name).toBeUndefined();
    });

    it('should omit name when value is an object', () => {
      const result = webauthnRegisterVerifyRequestSchema.parse({
        credential: {},
        name: { nested: true },
      });
      expect(result.name).toBeUndefined();
    });

    it('should omit name when value is a boolean', () => {
      const result = webauthnRegisterVerifyRequestSchema.parse({
        credential: {},
        name: true,
      });
      expect(result.name).toBeUndefined();
    });
  });

  describe('safeParse', () => {
    it('should return success:false for missing credential', () => {
      const result = webauthnRegisterVerifyRequestSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.message).toBe('credential must be an object');
    });

    it('should return success:true for minimal valid input', () => {
      const result = webauthnRegisterVerifyRequestSchema.safeParse({ credential: {} });
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// webauthnRegisterVerifyResponseSchema
// ============================================================================

describe('webauthnRegisterVerifyResponseSchema', () => {
  describe('valid inputs', () => {
    it('should parse with both credentialId and message', () => {
      const result = webauthnRegisterVerifyResponseSchema.parse({
        credentialId: 'cred-abc',
        message: 'Registration successful',
      });
      expect(result.credentialId).toBe('cred-abc');
      expect(result.message).toBe('Registration successful');
    });

    it('should accept long credentialId strings', () => {
      const longId = 'a'.repeat(512);
      const result = webauthnRegisterVerifyResponseSchema.parse({
        credentialId: longId,
        message: 'ok',
      });
      expect(result.credentialId).toBe(longId);
    });
  });

  describe('invalid inputs — credentialId', () => {
    it('should reject when credentialId is missing', () => {
      expect(() => webauthnRegisterVerifyResponseSchema.parse({ message: 'ok' })).toThrow(
        'credentialId must be a string',
      );
    });

    it('should reject when credentialId is null', () => {
      expect(() =>
        webauthnRegisterVerifyResponseSchema.parse({ credentialId: null, message: 'ok' }),
      ).toThrow('credentialId must be a string');
    });

    it('should reject when credentialId is a number', () => {
      expect(() =>
        webauthnRegisterVerifyResponseSchema.parse({ credentialId: 42, message: 'ok' }),
      ).toThrow('credentialId must be a string');
    });

    it('should reject when credentialId is an object', () => {
      expect(() =>
        webauthnRegisterVerifyResponseSchema.parse({ credentialId: {}, message: 'ok' }),
      ).toThrow('credentialId must be a string');
    });

    it('should reject when credentialId is an array', () => {
      expect(() =>
        webauthnRegisterVerifyResponseSchema.parse({ credentialId: [], message: 'ok' }),
      ).toThrow('credentialId must be a string');
    });
  });

  describe('invalid inputs — message', () => {
    it('should reject when message is missing', () => {
      expect(() => webauthnRegisterVerifyResponseSchema.parse({ credentialId: 'cred-1' })).toThrow(
        'message must be a string',
      );
    });

    it('should reject when message is null', () => {
      expect(() =>
        webauthnRegisterVerifyResponseSchema.parse({ credentialId: 'cred-1', message: null }),
      ).toThrow('message must be a string');
    });

    it('should reject when message is a number', () => {
      expect(() =>
        webauthnRegisterVerifyResponseSchema.parse({ credentialId: 'cred-1', message: 0 }),
      ).toThrow('message must be a string');
    });

    it('should reject when message is a boolean', () => {
      expect(() =>
        webauthnRegisterVerifyResponseSchema.parse({ credentialId: 'cred-1', message: false }),
      ).toThrow('message must be a string');
    });
  });

  describe('invalid inputs — non-object top-level', () => {
    it('should reject null top-level (both fields missing)', () => {
      // null → coerced to {}, credentialId is undefined → parseString throws
      expect(() => webauthnRegisterVerifyResponseSchema.parse(null)).toThrow(
        'credentialId must be a string',
      );
    });

    it('should reject primitive top-level', () => {
      expect(() => webauthnRegisterVerifyResponseSchema.parse(42)).toThrow(
        'credentialId must be a string',
      );
    });
  });

  describe('safeParse', () => {
    it('should return success:false with error when message is missing', () => {
      const result = webauthnRegisterVerifyResponseSchema.safeParse({ credentialId: 'c' });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.message).toBe('message must be a string');
    });
  });
});

// ============================================================================
// webauthnLoginOptionsRequestSchema
// ============================================================================

describe('webauthnLoginOptionsRequestSchema', () => {
  describe('valid inputs', () => {
    it('should parse with no fields (fully optional)', () => {
      const result = webauthnLoginOptionsRequestSchema.parse({});
      expect(result.email).toBeUndefined();
    });

    it('should parse with a valid email string', () => {
      const result = webauthnLoginOptionsRequestSchema.parse({ email: 'alice@example.com' });
      expect(result.email).toBe('alice@example.com');
    });

    it('should parse with an empty string email', () => {
      // No minimum length constraint — empty string is accepted
      const result = webauthnLoginOptionsRequestSchema.parse({ email: '' });
      expect(result.email).toBe('');
    });

    it('should coerce null top-level to empty object, returning no email', () => {
      const result = webauthnLoginOptionsRequestSchema.parse(null);
      expect(result.email).toBeUndefined();
    });

    it('should coerce primitive top-level to empty object, returning no email', () => {
      const result = webauthnLoginOptionsRequestSchema.parse(99);
      expect(result.email).toBeUndefined();
    });
  });

  describe('email field coercion — only strings are included', () => {
    it('should omit email when value is a number', () => {
      const result = webauthnLoginOptionsRequestSchema.parse({ email: 42 });
      expect(result.email).toBeUndefined();
    });

    it('should omit email when value is null', () => {
      const result = webauthnLoginOptionsRequestSchema.parse({ email: null });
      expect(result.email).toBeUndefined();
    });

    it('should omit email when value is undefined', () => {
      const result = webauthnLoginOptionsRequestSchema.parse({ email: undefined });
      expect(result.email).toBeUndefined();
    });

    it('should omit email when value is an object', () => {
      const result = webauthnLoginOptionsRequestSchema.parse({ email: { address: 'x@y.com' } });
      expect(result.email).toBeUndefined();
    });

    it('should omit email when value is an array', () => {
      const result = webauthnLoginOptionsRequestSchema.parse({ email: ['x@y.com'] });
      expect(result.email).toBeUndefined();
    });

    it('should omit email when value is a boolean', () => {
      const result = webauthnLoginOptionsRequestSchema.parse({ email: true });
      expect(result.email).toBeUndefined();
    });
  });

  describe('safeParse', () => {
    it('should return success:true for empty input', () => {
      const result = webauthnLoginOptionsRequestSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.email).toBeUndefined();
    });

    it('should return success:true for valid email', () => {
      const result = webauthnLoginOptionsRequestSchema.safeParse({ email: 'bob@example.com' });
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// webauthnLoginVerifyRequestSchema
// ============================================================================

describe('webauthnLoginVerifyRequestSchema', () => {
  describe('valid inputs', () => {
    it('should parse with credential object and non-empty sessionKey', () => {
      const result = webauthnLoginVerifyRequestSchema.parse({
        credential: { id: 'cred-1', type: 'public-key' },
        sessionKey: 'sk-abc123',
      });
      expect(result.credential).toEqual({ id: 'cred-1', type: 'public-key' });
      expect(result.sessionKey).toBe('sk-abc123');
    });

    it('should accept an empty credential object', () => {
      const result = webauthnLoginVerifyRequestSchema.parse({
        credential: {},
        sessionKey: 'sk-1',
      });
      expect(result.credential).toEqual({});
    });

    it('should accept a single-character sessionKey (min:1)', () => {
      const result = webauthnLoginVerifyRequestSchema.parse({
        credential: {},
        sessionKey: 'x',
      });
      expect(result.sessionKey).toBe('x');
    });

    it('should accept a deeply nested credential', () => {
      const cred = { response: { clientDataJSON: 'data', signature: 'sig', userHandle: null } };
      const result = webauthnLoginVerifyRequestSchema.parse({ credential: cred, sessionKey: 'sk' });
      expect(result.credential).toEqual(cred);
    });

    it('should accept an array as credential (passes object type check)', () => {
      const result = webauthnLoginVerifyRequestSchema.parse({
        credential: [1, 2, 3],
        sessionKey: 'sk',
      });
      expect(Array.isArray(result.credential)).toBe(true);
    });
  });

  describe('invalid inputs — credential field', () => {
    it('should reject when credential is null', () => {
      expect(() =>
        webauthnLoginVerifyRequestSchema.parse({ credential: null, sessionKey: 'sk' }),
      ).toThrow('credential must be an object');
    });

    it('should reject when credential is undefined (field missing)', () => {
      expect(() => webauthnLoginVerifyRequestSchema.parse({ sessionKey: 'sk' })).toThrow(
        'credential must be an object',
      );
    });

    it('should reject when credential is a string', () => {
      expect(() =>
        webauthnLoginVerifyRequestSchema.parse({ credential: 'raw', sessionKey: 'sk' }),
      ).toThrow('credential must be an object');
    });

    it('should reject when credential is a number', () => {
      expect(() =>
        webauthnLoginVerifyRequestSchema.parse({ credential: 1, sessionKey: 'sk' }),
      ).toThrow('credential must be an object');
    });

    it('should reject when credential is a boolean', () => {
      expect(() =>
        webauthnLoginVerifyRequestSchema.parse({ credential: true, sessionKey: 'sk' }),
      ).toThrow('credential must be an object');
    });

    it('should reject null top-level (credential and sessionKey both missing)', () => {
      expect(() => webauthnLoginVerifyRequestSchema.parse(null)).toThrow(
        'credential must be an object',
      );
    });
  });

  describe('invalid inputs — sessionKey field', () => {
    it('should reject when sessionKey is missing', () => {
      expect(() => webauthnLoginVerifyRequestSchema.parse({ credential: {} })).toThrow(
        'sessionKey must be a string',
      );
    });

    it('should reject when sessionKey is null', () => {
      expect(() =>
        webauthnLoginVerifyRequestSchema.parse({ credential: {}, sessionKey: null }),
      ).toThrow('sessionKey must be a string');
    });

    it('should reject when sessionKey is a number', () => {
      expect(() =>
        webauthnLoginVerifyRequestSchema.parse({ credential: {}, sessionKey: 123 }),
      ).toThrow('sessionKey must be a string');
    });

    it('should reject when sessionKey is an empty string (min:1 violated)', () => {
      expect(() =>
        webauthnLoginVerifyRequestSchema.parse({ credential: {}, sessionKey: '' }),
      ).toThrow('sessionKey must be at least 1 characters');
    });

    it('should reject when sessionKey is an object', () => {
      expect(() =>
        webauthnLoginVerifyRequestSchema.parse({ credential: {}, sessionKey: {} }),
      ).toThrow('sessionKey must be a string');
    });

    it('should reject when sessionKey is an array', () => {
      expect(() =>
        webauthnLoginVerifyRequestSchema.parse({ credential: {}, sessionKey: ['sk'] }),
      ).toThrow('sessionKey must be a string');
    });

    it('should reject when sessionKey is a boolean', () => {
      expect(() =>
        webauthnLoginVerifyRequestSchema.parse({ credential: {}, sessionKey: false }),
      ).toThrow('sessionKey must be a string');
    });
  });

  describe('safeParse', () => {
    it('should return success:false for empty sessionKey', () => {
      const result = webauthnLoginVerifyRequestSchema.safeParse({
        credential: {},
        sessionKey: '',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('sessionKey');
      }
    });

    it('should return success:false for missing credential', () => {
      const result = webauthnLoginVerifyRequestSchema.safeParse({ sessionKey: 'sk' });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.message).toBe('credential must be an object');
    });

    it('should return success:true for valid input', () => {
      const result = webauthnLoginVerifyRequestSchema.safeParse({
        credential: { id: 'cred' },
        sessionKey: 'session-key-1',
      });
      expect(result.success).toBe(true);
    });
  });
});
