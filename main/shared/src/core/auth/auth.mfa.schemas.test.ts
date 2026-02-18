// main/shared/src/core/auth/auth.mfa.schemas.test.ts
/**
 * @file Auth MFA Schemas Tests
 * @description Adversarial unit tests for MFA request/response validation schemas.
 * @module Core/Auth/Tests
 */

import { describe, expect, it } from 'vitest';

import {
  invalidateSessionsResponseSchema,
  removePhoneResponseSchema,
  setPhoneRequestSchema,
  setPhoneResponseSchema,
  smsChallengeRequestSchema,
  smsVerifyRequestSchema,
  totpLoginChallengeResponseSchema,
  totpLoginVerifyRequestSchema,
  totpSetupResponseSchema,
  totpStatusResponseSchema,
  totpVerifyRequestSchema,
  totpVerifyResponseSchema,
  verifyPhoneRequestSchema,
  verifyPhoneResponseSchema,
} from './auth.mfa.schemas';

// ============================================================================
// totpVerifyRequestSchema
// ============================================================================

describe('totpVerifyRequestSchema', () => {
  describe('valid inputs', () => {
    it('should accept a 6-character code (exact minimum)', () => {
      const result = totpVerifyRequestSchema.parse({ code: '123456' });
      expect(result).toEqual({ code: '123456' });
    });

    it('should accept codes longer than 6 characters', () => {
      const result = totpVerifyRequestSchema.parse({ code: '1234567890' });
      expect(result).toEqual({ code: '1234567890' });
    });

    it('should accept alphanumeric codes at minimum length', () => {
      const result = totpVerifyRequestSchema.parse({ code: 'abc123' });
      expect(result).toEqual({ code: 'abc123' });
    });
  });

  describe('boundary: 5-char code rejected, 6-char accepted', () => {
    it('should reject a 5-character code (one below minimum)', () => {
      expect(() => totpVerifyRequestSchema.parse({ code: '12345' })).toThrow(
        'code must be at least 6 characters',
      );
    });

    it('should reject a 1-character code', () => {
      expect(() => totpVerifyRequestSchema.parse({ code: '1' })).toThrow(
        'code must be at least 6 characters',
      );
    });

    it('should reject an empty string code', () => {
      expect(() => totpVerifyRequestSchema.parse({ code: '' })).toThrow(
        'code must be at least 6 characters',
      );
    });
  });

  describe('invalid inputs', () => {
    it('should reject null code', () => {
      expect(() => totpVerifyRequestSchema.parse({ code: null })).toThrow('code must be a string');
    });

    it('should reject numeric code (not a string)', () => {
      expect(() => totpVerifyRequestSchema.parse({ code: 123456 })).toThrow(
        'code must be a string',
      );
    });

    it('should reject undefined code', () => {
      expect(() => totpVerifyRequestSchema.parse({ code: undefined })).toThrow(
        'code must be a string',
      );
    });

    it('should treat non-object input as missing field and reject', () => {
      expect(() => totpVerifyRequestSchema.parse(null)).toThrow('code must be a string');
      expect(() => totpVerifyRequestSchema.parse('123456')).toThrow('code must be a string');
      expect(() => totpVerifyRequestSchema.parse(42)).toThrow('code must be a string');
    });

    it('should reject boolean code', () => {
      expect(() => totpVerifyRequestSchema.parse({ code: true })).toThrow('code must be a string');
    });
  });

  describe('safeParse', () => {
    it('should return success false for 5-char code without throwing', () => {
      const result = totpVerifyRequestSchema.safeParse({ code: '12345' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('code must be at least 6 characters');
      }
    });

    it('should return success true for valid code', () => {
      const result = totpVerifyRequestSchema.safeParse({ code: '123456' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe('123456');
      }
    });
  });
});

// ============================================================================
// totpLoginVerifyRequestSchema
// ============================================================================

describe('totpLoginVerifyRequestSchema', () => {
  describe('valid inputs', () => {
    it('should accept valid challengeToken and 6-char code', () => {
      const result = totpLoginVerifyRequestSchema.parse({
        challengeToken: 'token-abc',
        code: '123456',
      });
      expect(result).toEqual({ challengeToken: 'token-abc', code: '123456' });
    });
  });

  describe('invalid inputs', () => {
    it('should reject missing challengeToken', () => {
      expect(() => totpLoginVerifyRequestSchema.parse({ code: '123456' })).toThrow(
        'challengeToken must be a string',
      );
    });

    it('should reject empty challengeToken (min:1)', () => {
      expect(() =>
        totpLoginVerifyRequestSchema.parse({ challengeToken: '', code: '123456' }),
      ).toThrow('challengeToken must be at least 1 characters');
    });

    it('should reject 5-char code (one below minimum)', () => {
      expect(() =>
        totpLoginVerifyRequestSchema.parse({ challengeToken: 'tok', code: '12345' }),
      ).toThrow('code must be at least 6 characters');
    });

    it('should reject missing code', () => {
      expect(() => totpLoginVerifyRequestSchema.parse({ challengeToken: 'token-abc' })).toThrow(
        'code must be a string',
      );
    });

    it('should reject both fields missing', () => {
      expect(() => totpLoginVerifyRequestSchema.parse({})).toThrow();
    });

    it('should reject non-string challengeToken', () => {
      expect(() =>
        totpLoginVerifyRequestSchema.parse({ challengeToken: 42, code: '123456' }),
      ).toThrow('challengeToken must be a string');
    });
  });
});

// ============================================================================
// setPhoneRequestSchema
// ============================================================================

describe('setPhoneRequestSchema', () => {
  describe('valid inputs', () => {
    it('should accept a 7-character phone number (exact minimum)', () => {
      const result = setPhoneRequestSchema.parse({ phone: '1234567' });
      expect(result).toEqual({ phone: '1234567' });
    });

    it('should accept a standard international phone number', () => {
      const result = setPhoneRequestSchema.parse({ phone: '+1-800-555-0199' });
      expect(result).toEqual({ phone: '+1-800-555-0199' });
    });

    it('should trim whitespace before validation', () => {
      // trim:true means leading/trailing spaces are stripped before min check
      const result = setPhoneRequestSchema.parse({ phone: '  1234567  ' });
      expect(result).toEqual({ phone: '1234567' });
    });

    it('should trim and keep a 7-char phone that started with surrounding spaces', () => {
      const result = setPhoneRequestSchema.parse({ phone: ' 1234567 ' });
      expect(result.phone).toBe('1234567');
    });
  });

  describe('boundary: 6-char rejected, 7-char accepted (after trim)', () => {
    it('should reject a 6-character phone number (one below minimum)', () => {
      expect(() => setPhoneRequestSchema.parse({ phone: '123456' })).toThrow(
        'phone must be at least 7 characters',
      );
    });

    it('should reject whitespace-padded input that trims to 6 chars', () => {
      expect(() => setPhoneRequestSchema.parse({ phone: '  123456  ' })).toThrow(
        'phone must be at least 7 characters',
      );
    });

    it('should reject an empty phone number', () => {
      expect(() => setPhoneRequestSchema.parse({ phone: '' })).toThrow(
        'phone must be at least 7 characters',
      );
    });

    it('should reject a whitespace-only phone (trims to empty)', () => {
      expect(() => setPhoneRequestSchema.parse({ phone: '       ' })).toThrow(
        'phone must be at least 7 characters',
      );
    });
  });

  describe('invalid inputs', () => {
    it('should reject null phone', () => {
      expect(() => setPhoneRequestSchema.parse({ phone: null })).toThrow('phone must be a string');
    });

    it('should reject numeric phone', () => {
      expect(() => setPhoneRequestSchema.parse({ phone: 1234567 })).toThrow(
        'phone must be a string',
      );
    });

    it('should reject missing phone field', () => {
      expect(() => setPhoneRequestSchema.parse({})).toThrow('phone must be a string');
    });
  });
});

// ============================================================================
// verifyPhoneRequestSchema
// ============================================================================

describe('verifyPhoneRequestSchema', () => {
  describe('valid inputs', () => {
    it('should accept a 6-character code', () => {
      const result = verifyPhoneRequestSchema.parse({ code: '654321' });
      expect(result).toEqual({ code: '654321' });
    });
  });

  describe('boundary', () => {
    it('should reject a 5-character code', () => {
      expect(() => verifyPhoneRequestSchema.parse({ code: '12345' })).toThrow(
        'code must be at least 6 characters',
      );
    });
  });

  describe('invalid inputs', () => {
    it('should reject null', () => {
      expect(() => verifyPhoneRequestSchema.parse({ code: null })).toThrow('code must be a string');
    });

    it('should reject missing code', () => {
      expect(() => verifyPhoneRequestSchema.parse({})).toThrow('code must be a string');
    });
  });
});

// ============================================================================
// smsChallengeRequestSchema
// ============================================================================

describe('smsChallengeRequestSchema', () => {
  describe('valid inputs', () => {
    it('should accept a non-empty challengeToken', () => {
      const result = smsChallengeRequestSchema.parse({ challengeToken: 'tok' });
      expect(result).toEqual({ challengeToken: 'tok' });
    });

    it('should accept a single-character challengeToken (exact minimum)', () => {
      const result = smsChallengeRequestSchema.parse({ challengeToken: 'x' });
      expect(result).toEqual({ challengeToken: 'x' });
    });
  });

  describe('invalid inputs', () => {
    it('should reject empty challengeToken (min:1)', () => {
      expect(() => smsChallengeRequestSchema.parse({ challengeToken: '' })).toThrow(
        'challengeToken must be at least 1 characters',
      );
    });

    it('should reject null challengeToken', () => {
      expect(() => smsChallengeRequestSchema.parse({ challengeToken: null })).toThrow(
        'challengeToken must be a string',
      );
    });

    it('should reject missing challengeToken', () => {
      expect(() => smsChallengeRequestSchema.parse({})).toThrow('challengeToken must be a string');
    });

    it('should reject numeric challengeToken', () => {
      expect(() => smsChallengeRequestSchema.parse({ challengeToken: 12345 })).toThrow(
        'challengeToken must be a string',
      );
    });
  });
});

// ============================================================================
// smsVerifyRequestSchema
// ============================================================================

describe('smsVerifyRequestSchema', () => {
  describe('valid inputs', () => {
    it('should accept valid challengeToken and 6-char code', () => {
      const result = smsVerifyRequestSchema.parse({
        challengeToken: 'challenge-xyz',
        code: '987654',
      });
      expect(result).toEqual({ challengeToken: 'challenge-xyz', code: '987654' });
    });
  });

  describe('boundary: both fields are required', () => {
    it('should reject when only challengeToken is provided', () => {
      expect(() => smsVerifyRequestSchema.parse({ challengeToken: 'tok' })).toThrow(
        'code must be a string',
      );
    });

    it('should reject when only code is provided', () => {
      expect(() => smsVerifyRequestSchema.parse({ code: '123456' })).toThrow(
        'challengeToken must be a string',
      );
    });

    it('should reject empty input', () => {
      expect(() => smsVerifyRequestSchema.parse({})).toThrow();
    });

    it('should reject 5-char code even with valid challengeToken', () => {
      expect(() => smsVerifyRequestSchema.parse({ challengeToken: 'tok', code: '12345' })).toThrow(
        'code must be at least 6 characters',
      );
    });

    it('should reject empty challengeToken', () => {
      expect(() => smsVerifyRequestSchema.parse({ challengeToken: '', code: '123456' })).toThrow(
        'challengeToken must be at least 1 characters',
      );
    });
  });

  describe('invalid inputs', () => {
    it('should reject null input (treated as missing fields)', () => {
      expect(() => smsVerifyRequestSchema.parse(null)).toThrow();
    });

    it('should reject non-string challengeToken', () => {
      expect(() => smsVerifyRequestSchema.parse({ challengeToken: true, code: '123456' })).toThrow(
        'challengeToken must be a string',
      );
    });

    it('should reject non-string code', () => {
      expect(() => smsVerifyRequestSchema.parse({ challengeToken: 'tok', code: 123456 })).toThrow(
        'code must be a string',
      );
    });
  });
});

// ============================================================================
// totpSetupResponseSchema
// ============================================================================

describe('totpSetupResponseSchema', () => {
  describe('valid inputs', () => {
    it('should parse a valid setup response with backup codes', () => {
      const result = totpSetupResponseSchema.parse({
        secret: 'JBSWY3DPEHPK3PXP',
        otpauthUrl: 'otpauth://totp/issuer:user@example.com?secret=JBSWY3DPEHPK3PXP',
        backupCodes: ['code-a', 'code-b', 'code-c'],
      });
      expect(result.secret).toBe('JBSWY3DPEHPK3PXP');
      expect(result.otpauthUrl).toContain('otpauth://');
      expect(result.backupCodes).toEqual(['code-a', 'code-b', 'code-c']);
    });

    it('should parse with an empty backup codes array', () => {
      const result = totpSetupResponseSchema.parse({
        secret: 'SECRET',
        otpauthUrl: 'otpauth://totp/app:user?secret=SECRET',
        backupCodes: [],
      });
      expect(result.backupCodes).toEqual([]);
    });

    it('should parse each backup code as a string', () => {
      const codes = ['aaa111', 'bbb222', 'ccc333'];
      const result = totpSetupResponseSchema.parse({
        secret: 'S',
        otpauthUrl: 'U',
        backupCodes: codes,
      });
      expect(result.backupCodes).toHaveLength(3);
      expect(result.backupCodes[0]).toBe('aaa111');
    });
  });

  describe('invalid inputs: backupCodes must be an array', () => {
    it('should throw when backupCodes is absent', () => {
      expect(() => totpSetupResponseSchema.parse({ secret: 'S', otpauthUrl: 'U' })).toThrow(
        'backupCodes must be an array',
      );
    });

    it('should throw when backupCodes is null', () => {
      expect(() =>
        totpSetupResponseSchema.parse({ secret: 'S', otpauthUrl: 'U', backupCodes: null }),
      ).toThrow('backupCodes must be an array');
    });

    it('should throw when backupCodes is a string', () => {
      expect(() =>
        totpSetupResponseSchema.parse({ secret: 'S', otpauthUrl: 'U', backupCodes: 'code1' }),
      ).toThrow('backupCodes must be an array');
    });

    it('should throw when backupCodes is an object (not array)', () => {
      expect(() =>
        totpSetupResponseSchema.parse({
          secret: 'S',
          otpauthUrl: 'U',
          backupCodes: { 0: 'code' },
        }),
      ).toThrow('backupCodes must be an array');
    });

    it('should throw when a backup code element is not a string', () => {
      expect(() =>
        totpSetupResponseSchema.parse({
          secret: 'S',
          otpauthUrl: 'U',
          backupCodes: ['valid', 42, 'valid2'],
        }),
      ).toThrow('backupCodes[1] must be a string');
    });

    it('should throw when a backup code element is null', () => {
      expect(() =>
        totpSetupResponseSchema.parse({
          secret: 'S',
          otpauthUrl: 'U',
          backupCodes: [null, 'valid'],
        }),
      ).toThrow('backupCodes[0] must be a string');
    });

    it('should throw when a backup code element is a boolean', () => {
      expect(() =>
        totpSetupResponseSchema.parse({
          secret: 'S',
          otpauthUrl: 'U',
          backupCodes: [true],
        }),
      ).toThrow('backupCodes[0] must be a string');
    });

    it('should reject missing secret', () => {
      expect(() => totpSetupResponseSchema.parse({ otpauthUrl: 'U', backupCodes: [] })).toThrow(
        'secret must be a string',
      );
    });

    it('should reject missing otpauthUrl', () => {
      expect(() => totpSetupResponseSchema.parse({ secret: 'S', backupCodes: [] })).toThrow(
        'otpauthUrl must be a string',
      );
    });
  });
});

// ============================================================================
// totpLoginChallengeResponseSchema
// ============================================================================

describe('totpLoginChallengeResponseSchema', () => {
  describe('valid inputs', () => {
    it('should parse when requiresTotp is literal true', () => {
      const result = totpLoginChallengeResponseSchema.parse({
        requiresTotp: true,
        challengeToken: 'challenge-token-abc',
        message: 'TOTP required',
      });
      expect(result.requiresTotp).toBe(true);
      expect(result.challengeToken).toBe('challenge-token-abc');
      expect(result.message).toBe('TOTP required');
    });
  });

  describe('requiresTotp must be literal true (not merely truthy)', () => {
    it('should reject requiresTotp = 1 (truthy number)', () => {
      expect(() =>
        totpLoginChallengeResponseSchema.parse({
          requiresTotp: 1,
          challengeToken: 'tok',
          message: 'msg',
        }),
      ).toThrow('Expected literal true');
    });

    it('should reject requiresTotp = "true" (truthy string)', () => {
      expect(() =>
        totpLoginChallengeResponseSchema.parse({
          requiresTotp: 'true',
          challengeToken: 'tok',
          message: 'msg',
        }),
      ).toThrow('Expected literal true');
    });

    it('should reject requiresTotp = false', () => {
      expect(() =>
        totpLoginChallengeResponseSchema.parse({
          requiresTotp: false,
          challengeToken: 'tok',
          message: 'msg',
        }),
      ).toThrow('Expected literal true');
    });

    it('should reject requiresTotp = null', () => {
      expect(() =>
        totpLoginChallengeResponseSchema.parse({
          requiresTotp: null,
          challengeToken: 'tok',
          message: 'msg',
        }),
      ).toThrow('Expected literal true');
    });

    it('should reject missing requiresTotp (undefined)', () => {
      expect(() =>
        totpLoginChallengeResponseSchema.parse({
          challengeToken: 'tok',
          message: 'msg',
        }),
      ).toThrow('Expected literal true');
    });

    it('should reject requiresTotp = {} (truthy object)', () => {
      expect(() =>
        totpLoginChallengeResponseSchema.parse({
          requiresTotp: {},
          challengeToken: 'tok',
          message: 'msg',
        }),
      ).toThrow('Expected literal true');
    });
  });

  describe('other field validation', () => {
    it('should accept empty challengeToken (no min constraint on response field)', () => {
      // The response schema does not enforce min length on challengeToken —
      // that constraint exists only on request schemas. Verify this boundary.
      const result = totpLoginChallengeResponseSchema.parse({
        requiresTotp: true,
        challengeToken: '',
        message: 'msg',
      });
      expect(result.challengeToken).toBe('');
    });

    it('should reject non-string challengeToken', () => {
      expect(() =>
        totpLoginChallengeResponseSchema.parse({
          requiresTotp: true,
          challengeToken: 99,
          message: 'msg',
        }),
      ).toThrow('challengeToken must be a string');
    });

    it('should reject missing message', () => {
      expect(() =>
        totpLoginChallengeResponseSchema.parse({
          requiresTotp: true,
          challengeToken: 'tok',
        }),
      ).toThrow('message must be a string');
    });
  });
});

// ============================================================================
// totpStatusResponseSchema
// ============================================================================

describe('totpStatusResponseSchema', () => {
  describe('valid inputs', () => {
    it('should accept enabled = true', () => {
      const result = totpStatusResponseSchema.parse({ enabled: true });
      expect(result).toEqual({ enabled: true });
    });

    it('should accept enabled = false', () => {
      const result = totpStatusResponseSchema.parse({ enabled: false });
      expect(result).toEqual({ enabled: false });
    });
  });

  describe('truthy values are not booleans and must be rejected', () => {
    it('should reject enabled = 1 (truthy number)', () => {
      expect(() => totpStatusResponseSchema.parse({ enabled: 1 })).toThrow(
        'enabled must be a boolean',
      );
    });

    it('should reject enabled = 0 (falsy number)', () => {
      expect(() => totpStatusResponseSchema.parse({ enabled: 0 })).toThrow(
        'enabled must be a boolean',
      );
    });

    it('should reject enabled = "true" (truthy string)', () => {
      expect(() => totpStatusResponseSchema.parse({ enabled: 'true' })).toThrow(
        'enabled must be a boolean',
      );
    });

    it('should reject enabled = "" (empty string)', () => {
      expect(() => totpStatusResponseSchema.parse({ enabled: '' })).toThrow(
        'enabled must be a boolean',
      );
    });

    it('should reject enabled = null', () => {
      expect(() => totpStatusResponseSchema.parse({ enabled: null })).toThrow(
        'enabled must be a boolean',
      );
    });

    it('should reject missing enabled', () => {
      expect(() => totpStatusResponseSchema.parse({})).toThrow('enabled must be a boolean');
    });
  });
});

// ============================================================================
// verifyPhoneResponseSchema
// ============================================================================

describe('verifyPhoneResponseSchema', () => {
  describe('valid inputs', () => {
    it('should accept verified = true', () => {
      const result = verifyPhoneResponseSchema.parse({ verified: true });
      expect(result).toEqual({ verified: true });
    });

    it('should accept verified = false', () => {
      const result = verifyPhoneResponseSchema.parse({ verified: false });
      expect(result).toEqual({ verified: false });
    });
  });

  describe('truthy values are not booleans and must be rejected', () => {
    it('should reject verified = 1 (truthy number)', () => {
      expect(() => verifyPhoneResponseSchema.parse({ verified: 1 })).toThrow(
        'verified must be a boolean',
      );
    });

    it('should reject verified = "yes" (truthy string)', () => {
      expect(() => verifyPhoneResponseSchema.parse({ verified: 'yes' })).toThrow(
        'verified must be a boolean',
      );
    });

    it('should reject verified = null', () => {
      expect(() => verifyPhoneResponseSchema.parse({ verified: null })).toThrow(
        'verified must be a boolean',
      );
    });

    it('should reject missing verified', () => {
      expect(() => verifyPhoneResponseSchema.parse({})).toThrow('verified must be a boolean');
    });
  });
});

// ============================================================================
// Simple response schemas (message-only)
// ============================================================================

describe('totpVerifyResponseSchema', () => {
  it('should parse a valid message string', () => {
    const result = totpVerifyResponseSchema.parse({ message: 'TOTP verified successfully.' });
    expect(result).toEqual({ message: 'TOTP verified successfully.' });
  });

  it('should reject missing message', () => {
    expect(() => totpVerifyResponseSchema.parse({})).toThrow('message must be a string');
  });

  it('should reject null message', () => {
    expect(() => totpVerifyResponseSchema.parse({ message: null })).toThrow(
      'message must be a string',
    );
  });

  it('should treat non-object input as missing field', () => {
    expect(() => totpVerifyResponseSchema.parse(null)).toThrow('message must be a string');
  });
});

describe('setPhoneResponseSchema', () => {
  it('should parse a valid message', () => {
    const result = setPhoneResponseSchema.parse({ message: 'Phone set.' });
    expect(result).toEqual({ message: 'Phone set.' });
  });

  it('should reject numeric message', () => {
    expect(() => setPhoneResponseSchema.parse({ message: 200 })).toThrow(
      'message must be a string',
    );
  });
});

describe('removePhoneResponseSchema', () => {
  it('should parse a valid message', () => {
    const result = removePhoneResponseSchema.parse({ message: 'Phone removed.' });
    expect(result).toEqual({ message: 'Phone removed.' });
  });

  it('should reject missing message', () => {
    expect(() => removePhoneResponseSchema.parse({})).toThrow('message must be a string');
  });
});

describe('invalidateSessionsResponseSchema', () => {
  it('should parse a valid message', () => {
    const result = invalidateSessionsResponseSchema.parse({ message: 'Sessions invalidated.' });
    expect(result).toEqual({ message: 'Sessions invalidated.' });
  });

  it('should reject missing message', () => {
    expect(() => invalidateSessionsResponseSchema.parse({})).toThrow('message must be a string');
  });

  it('should treat non-object as empty and reject', () => {
    expect(() => invalidateSessionsResponseSchema.parse(undefined)).toThrow(
      'message must be a string',
    );
  });
});
